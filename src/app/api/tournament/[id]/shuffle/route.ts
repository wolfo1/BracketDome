import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isTournamentAdmin } from "@/lib/tournamentAuth";

function fisherYates<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    if (!(await isTournamentAdmin(id, session.user.id)))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const round1 = await prisma.round.findFirst({
      where: { tournamentId: id, number: 1 },
      include: { matches: { orderBy: { position: "asc" } } },
    });
    if (!round1) return NextResponse.json({ error: "No round 1 found" }, { status: 404 });

    const voteCount = await prisma.vote.count({ where: { match: { roundId: round1.id } } });
    if (voteCount > 0)
      return NextResponse.json({ error: "Cannot shuffle after votes have been cast" }, { status: 400 });

    // Collect all contestant ID slots (preserving null BYE positions)
    const slots: (string | null)[] = round1.matches.flatMap((m) => [m.contestant1Id, m.contestant2Id]);
    const nonNullIndices = slots.reduce<number[]>((acc, s, i) => (s ? [...acc, i] : acc), []);
    const shuffled = fisherYates(nonNullIndices.map((i) => slots[i]!));
    const newSlots = [...slots];
    nonNullIndices.forEach((slotIdx, k) => { newSlots[slotIdx] = shuffled[k]; });

    // Update round 1 matches
    await Promise.all(
      round1.matches.map((match, i) => {
        const c1 = newSlots[i * 2];
        const c2 = newSlots[i * 2 + 1];
        const winnerId = c1 && !c2 ? c1 : c2 && !c1 ? c2 : null;
        return prisma.match.update({
          where: { id: match.id },
          data: { contestant1Id: c1, contestant2Id: c2, winnerId },
        });
      })
    );

    // Re-apply BYE prefills to round 2
    const round2 = await prisma.round.findFirst({
      where: { tournamentId: id, number: 2 },
      include: { matches: { orderBy: { position: "asc" } } },
    });
    if (round2) {
      // Clear round 2 contestant slots
      await prisma.match.updateMany({
        where: { roundId: round2.id },
        data: { contestant1Id: null, contestant2Id: null },
      });
      // Re-prefill from new BYE winners
      const updatedRound1 = await prisma.match.findMany({
        where: { roundId: round1.id },
        orderBy: { position: "asc" },
      });
      for (const m of updatedRound1) {
        if (!m.winnerId) continue;
        const r2pos = Math.floor(m.position / 2);
        const field = m.position % 2 === 0 ? "contestant1Id" : "contestant2Id";
        const r2match = round2.matches.find((r) => r.position === r2pos);
        if (r2match) {
          await prisma.match.update({
            where: { id: r2match.id },
            data: { [field]: m.winnerId },
          });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[POST /api/tournament/[id]/shuffle]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
