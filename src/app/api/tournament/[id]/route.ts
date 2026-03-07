import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isTournamentAdmin } from "@/lib/tournamentAuth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        contestants: { orderBy: { seed: "asc" }, include: { links: true } },
        participants: { orderBy: { createdAt: "asc" } },
        admins: { include: { user: { select: { id: true, email: true, name: true } } } },
        viewers: true,
        rounds: {
          orderBy: { number: "asc" },
          include: {
            matches: {
              orderBy: { position: "asc" },
              include: {
                contestant1: { include: { links: true } },
                contestant2: { include: { links: true } },
                winner: { include: { links: true } },
                votes: { include: { participant: true, votedFor: true } },
              },
            },
          },
        },
      },
    });

    if (!tournament) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Private tournament: only creator, admins, and viewers can see it
    if (tournament.isPrivate) {
      const session = await auth();
      const userId = session?.user?.id;
      const userEmail = session?.user?.email;
      const isAdmin = userId && await isTournamentAdmin(id, userId);
      const isViewer = userEmail && tournament.viewers.some((v) => v.email === userEmail);
      if (!isAdmin && !isViewer) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    return NextResponse.json({
      ...tournament,
      admins: tournament.admins.map((a) => ({
        userId: a.user.id,
        email: a.user.email,
        name: a.user.name,
      })),
      viewers: tournament.viewers.map((v) => ({ id: v.id, email: v.email })),
    });
  } catch (err) {
    console.error("[GET /api/tournament/[id]]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
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

    const { title, description, startDate, isPrivate } = await req.json();

    const updated = await prisma.tournament.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description: description || null }),
        ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(isPrivate !== undefined && { isPrivate }),
      },
    });

    return NextResponse.json({ id: updated.id });
  } catch (err) {
    console.error("[PATCH /api/tournament/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Only the creator can delete (not just admins)
    const tournament = await prisma.tournament.findUnique({ where: { id } });
    if (!tournament) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (tournament.createdBy !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.tournament.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/tournament/[id]]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
