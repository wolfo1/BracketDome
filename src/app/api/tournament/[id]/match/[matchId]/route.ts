import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface VoteInput {
  participantId: string;
  votedForId: string;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; matchId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { matchId } = await params;
  const { votes, winnerId }: { votes: VoteInput[]; winnerId: string } =
    await req.json();

  if (!winnerId || !votes?.length) {
    return NextResponse.json({ error: "Missing votes or winner" }, { status: 400 });
  }

  // Get match with round info
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      round: {
        include: {
          tournament: {
            include: {
              rounds: {
                orderBy: { number: "asc" },
                include: {
                  matches: { orderBy: { position: "asc" } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    // Upsert votes
    for (const vote of votes) {
      await tx.vote.upsert({
        where: {
          matchId_participantId: {
            matchId,
            participantId: vote.participantId,
          },
        },
        create: {
          matchId,
          participantId: vote.participantId,
          votedForId: vote.votedForId,
        },
        update: { votedForId: vote.votedForId },
      });
    }

    // Set winner
    await tx.match.update({
      where: { id: matchId },
      data: { winnerId },
    });

    // Advance winner to next round
    const currentRound = match.round;
    const tournament = currentRound.tournament;
    const nextRound = tournament.rounds.find(
      (r) => r.number === currentRound.number + 1
    );

    if (nextRound) {
      // Determine which next-round match slot this winner fills
      // Each pair of current-round positions feeds into one next-round position
      const nextMatchPosition = Math.floor(match.position / 2);
      const isFirstSlot = match.position % 2 === 0;

      const nextMatch = nextRound.matches.find(
        (m) => m.position === nextMatchPosition
      );

      if (nextMatch) {
        await tx.match.update({
          where: { id: nextMatch.id },
          data: isFirstSlot
            ? { contestant1Id: winnerId }
            : { contestant2Id: winnerId },
        });
      }
    }

    // Check if this was the final match — mark tournament complete
    const allRounds = tournament.rounds;
    const lastRound = allRounds[allRounds.length - 1];
    if (currentRound.id === lastRound.id) {
      await tx.tournament.update({
        where: { id: tournament.id },
        data: { status: "COMPLETED" },
      });
    }
  });

  return NextResponse.json({ success: true });
}
