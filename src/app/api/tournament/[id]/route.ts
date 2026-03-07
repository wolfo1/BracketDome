import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        contestants: { orderBy: { seed: "asc" } },
        participants: { orderBy: { createdAt: "asc" } },
        rounds: {
          orderBy: { number: "asc" },
          include: {
            matches: {
              orderBy: { position: "asc" },
              include: {
                contestant1: true,
                contestant2: true,
                winner: true,
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

    return NextResponse.json(tournament);
  } catch (err) {
    console.error("[GET /api/tournament/[id]]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
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
