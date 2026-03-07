import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isTournamentAdmin } from "@/lib/tournamentAuth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    if (!await isTournamentAdmin(id, session.user.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { name } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

    const tournament = await prisma.tournament.findUnique({
      where: { id },
      select: { maxParticipants: true, _count: { select: { participants: true } } },
    });
    if (!tournament) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (tournament._count.participants >= tournament.maxParticipants) {
      return NextResponse.json(
        { error: `Participant limit reached (${tournament.maxParticipants})` },
        { status: 400 }
      );
    }

    const participant = await prisma.participant.create({
      data: { name: name.trim(), tournamentId: id },
    });

    return NextResponse.json({ id: participant.id, name: participant.name });
  } catch (err) {
    console.error("[POST /api/tournament/[id]/participant]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
