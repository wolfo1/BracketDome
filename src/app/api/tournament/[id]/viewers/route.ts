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

    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

    const viewer = await prisma.tournamentViewer.upsert({
      where: { tournamentId_email: { tournamentId: id, email } },
      create: { tournamentId: id, email },
      update: {},
    });

    return NextResponse.json({ id: viewer.id, email: viewer.email });
  } catch (err) {
    console.error("[POST /api/tournament/[id]/viewers]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
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

    const { viewerId } = await req.json();
    if (!viewerId) return NextResponse.json({ error: "viewerId required" }, { status: 400 });

    await prisma.tournamentViewer.delete({ where: { id: viewerId } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/tournament/[id]/viewers]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
