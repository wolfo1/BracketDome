import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateBracketStructure, generateFirstRoundMatchups } from "@/lib/bracket";

export async function GET() {
  const tournaments = await prisma.tournament.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { contestants: true, participants: true } },
    },
  });

  return NextResponse.json(
    tournaments.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      createdAt: t.createdAt.toISOString(),
      contestantCount: t._count.contestants,
      participantCount: t._count.participants,
    }))
  );
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { title, description, contestants, participants } = body;

  if (!title || !contestants?.length || !participants?.length) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { rounds, bracketSize } = generateBracketStructure(contestants.length);

  // Pad contestants to bracket size with BYE slots (null)
  const seededContestants: { name: string; seed: number }[] = contestants.map(
    (c: { name: string; seed?: number }, i: number) => ({
      name: c.name,
      seed: c.seed ?? i + 1,
    })
  );

  const tournament = await prisma.$transaction(async (tx) => {
    const t = await tx.tournament.create({
      data: {
        title,
        description,
        createdBy: session.user!.id!,
        status: "ACTIVE",
      },
    });

    // Create contestants
    const createdContestants = await Promise.all(
      seededContestants.map((c) =>
        tx.contestant.create({
          data: { name: c.name, seed: c.seed, tournamentId: t.id },
        })
      )
    );

    // Sort by seed
    const sortedContestants = [...createdContestants].sort(
      (a, b) => a.seed - b.seed
    );

    // Create participants
    await Promise.all(
      (participants as string[]).map((name) =>
        tx.participant.create({ data: { name, tournamentId: t.id } })
      )
    );

    // Create rounds and first-round matches
    const firstRound = rounds[0];
    const round = await tx.round.create({
      data: {
        number: firstRound.number,
        name: firstRound.name,
        tournamentId: t.id,
      },
    });

    // Generate seeded matchups (1 vs last, 2 vs second-to-last, etc.)
    const matchupIndices = generateFirstRoundMatchups(
      Array.from({ length: bracketSize }, (_, i) => i + 1)
    );

    await Promise.all(
      matchupIndices.map(([s1, s2], position) => {
        const c1 = sortedContestants[s1 - 1] ?? null;
        const c2 = sortedContestants[s2 - 1] ?? null;
        return tx.match.create({
          data: {
            roundId: round.id,
            contestant1Id: c1?.id ?? null,
            contestant2Id: c2?.id ?? null,
            position,
          },
        });
      })
    );

    // Create remaining round shells (no matches yet — unlocked as winners advance)
    for (let i = 1; i < rounds.length; i++) {
      const r = rounds[i];
      const createdRound = await tx.round.create({
        data: {
          number: r.number,
          name: r.name,
          tournamentId: t.id,
        },
      });
      // Create empty match slots
      for (let pos = 0; pos < r.matchCount; pos++) {
        await tx.match.create({
          data: { roundId: createdRound.id, position: pos },
        });
      }
    }

    return t;
  });

  return NextResponse.json({ id: tournament.id }, { status: 201 });
}
