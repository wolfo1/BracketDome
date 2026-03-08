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
    const { title, description, contestants, participants, isPrivate, startDate, maxParticipants } = body;

    if (!title || !contestants?.length || !participants?.length) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { rounds, bracketSize } = generateBracketStructure(contestants.length);

    const seededContestants: { name: string; seed: number; links: string[] }[] = contestants.map(
      (c: { name: string; seed?: number; links?: string[] }, i: number) => ({
        name: c.name,
        seed: c.seed ?? i + 1,
        links: c.links ?? [],
      })
    );

    // 1 query: create tournament
    const t = await prisma.tournament.create({
      data: {
        title,
        description,
        createdBy: session.user!.id!,
        status: "ACTIVE",
        isPrivate: isPrivate ?? false,
        startDate: startDate ? new Date(startDate) : null,
        maxParticipants: maxParticipants ?? 50,
      },
    });

    // 1 query: bulk-create contestants, get IDs back
    const createdContestants = await prisma.contestant.createManyAndReturn({
      data: seededContestants.map((c) => ({
        name: c.name, seed: c.seed, tournamentId: t.id,
      })),
    });
    const sortedContestants = [...createdContestants].sort((a, b) => a.seed - b.seed);

    // Bulk-create contestant links
    const linkData = sortedContestants.flatMap((c) => {
      const original = seededContestants.find((s) => s.name === c.name);
      return (original?.links ?? []).map((url) => ({ url, contestantId: c.id }));
    });
    if (linkData.length > 0) {
      await prisma.contestantLink.createMany({ data: linkData });
    }

    // 1 query: bulk-create participants
    await prisma.participant.createMany({
      data: (participants as string[]).map((name) => ({ name, tournamentId: t.id })),
    });

    // Pre-compute round 1 matchups and BYE winners
    const matchupIndices = generateFirstRoundMatchups(
      Array.from({ length: bracketSize }, (_, i) => i + 1)
    );

    // For each round 1 match, determine if it's a BYE and who advances
    type Round1Match = { position: number; c1Id: string | null; c2Id: string | null; winnerId: string | null };
    const rawRound1: Round1Match[] = matchupIndices.map(([s1, s2], position) => {
      const c1Id = sortedContestants[s1 - 1]?.id ?? null;
      const c2Id = sortedContestants[s2 - 1]?.id ?? null;
      let winnerId: string | null = null;
      if (c1Id && !c2Id) winnerId = c1Id;
      else if (c2Id && !c1Id) winnerId = c2Id;
      return { position, c1Id, c2Id, winnerId };
    });

    // Reorder so real matches appear at the top of the bracket (lower positions)
    // and BYE matches at the bottom. Must keep pairs [2k, 2k+1] together since
    // both feed into the same round 2 slot.
    const pairs: [Round1Match, Round1Match][] = [];
    for (let i = 0; i < rawRound1.length; i += 2) {
      pairs.push([rawRound1[i], rawRound1[i + 1]]);
    }
    // Sort pairs: most real matches (winnerId===null) first
    pairs.sort((a, b) => {
      const realA = a.filter((m) => m.winnerId === null).length;
      const realB = b.filter((m) => m.winnerId === null).length;
      return realB - realA;
    });
    // Within each pair, put real match first
    for (const pair of pairs) {
      if (pair[0].winnerId !== null && pair[1].winnerId === null) {
        [pair[0], pair[1]] = [pair[1], pair[0]];
      }
    }
    // Flatten and assign final positions
    const round1Matches: Round1Match[] = pairs.flat().map((m, i) => ({ ...m, position: i }));

    // Pre-compute round 2 contestant slots from BYE winners
    // Position P in round 1 → round 2 slot floor(P/2); even P → contestant1, odd P → contestant2
    const round2Prefill = new Map<number, { contestant1Id?: string; contestant2Id?: string }>();
    for (const m of round1Matches) {
      if (m.winnerId) {
        const r2pos = Math.floor(m.position / 2);
        const entry = round2Prefill.get(r2pos) ?? {};
        if (m.position % 2 === 0) entry.contestant1Id = m.winnerId;
        else entry.contestant2Id = m.winnerId;
        round2Prefill.set(r2pos, entry);
      }
    }

    for (let i = 0; i < rounds.length; i++) {
      const r = rounds[i];
      const createdRound = await prisma.round.create({
        data: { number: r.number, name: r.name, tournamentId: t.id },
      });

      if (i === 0) {
        await prisma.match.createMany({
          data: round1Matches.map((m) => ({
            roundId: createdRound.id,
            contestant1Id: m.c1Id,
            contestant2Id: m.c2Id,
            winnerId: m.winnerId,
            position: m.position,
          })),
        });
      } else if (i === 1) {
        // Round 2: pre-fill slots where BYE winners already advanced
        await prisma.match.createMany({
          data: Array.from({ length: r.matchCount }, (_, pos) => {
            const prefill = round2Prefill.get(pos);
            return {
              roundId: createdRound.id,
              position: pos,
              contestant1Id: prefill?.contestant1Id ?? null,
              contestant2Id: prefill?.contestant2Id ?? null,
            };
          }),
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
