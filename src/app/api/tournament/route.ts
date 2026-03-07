import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateBracketStructure, generateFirstRoundMatchups } from "@/lib/bracket";

export async function GET() {
  try {
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
  } catch (err) {
    console.error("[GET /api/tournament]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
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

    const seededContestants: { name: string; seed: number }[] = contestants.map(
      (c: { name: string; seed?: number }, i: number) => ({
        name: c.name,
        seed: c.seed ?? i + 1,
      })
    );

    // 1 query: create tournament
    const t = await prisma.tournament.create({
      data: { title, description, createdBy: session.user!.id!, status: "ACTIVE" },
    });

    // 1 query: bulk-create contestants, get IDs back
    const createdContestants = await prisma.contestant.createManyAndReturn({
      data: seededContestants.map((c) => ({
        name: c.name, seed: c.seed, tournamentId: t.id,
      })),
    });
    const sortedContestants = [...createdContestants].sort((a, b) => a.seed - b.seed);

    // 1 query: bulk-create participants
    await prisma.participant.createMany({
      data: (participants as string[]).map((name) => ({ name, tournamentId: t.id })),
    });

    // For each round: 1 query to create round + 1 query to bulk-create its matches
    const matchupIndices = generateFirstRoundMatchups(
      Array.from({ length: bracketSize }, (_, i) => i + 1)
    );

    for (let i = 0; i < rounds.length; i++) {
      const r = rounds[i];
      const createdRound = await prisma.round.create({
        data: { number: r.number, name: r.name, tournamentId: t.id },
      });

      if (i === 0) {
        // First round: seeded matchups with contestant IDs
        await prisma.match.createMany({
          data: matchupIndices.map(([s1, s2], position) => ({
            roundId: createdRound.id,
            contestant1Id: sortedContestants[s1 - 1]?.id ?? null,
            contestant2Id: sortedContestants[s2 - 1]?.id ?? null,
            position,
          })),
        });
      } else {
        // Later rounds: empty slots
        await prisma.match.createMany({
          data: Array.from({ length: r.matchCount }, (_, pos) => ({
            roundId: createdRound.id,
            position: pos,
          })),
        });
      }
    }

    return NextResponse.json({ id: t.id }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/tournament]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
