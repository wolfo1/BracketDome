import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Only the creator can manage admins

async function getCreatorSession(tournamentId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized", status: 401 };
  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId }, select: { createdBy: true } });
  if (!tournament) return { error: "Not found", status: 404 };
  if (tournament.createdBy !== session.user.id) return { error: "Forbidden", status: 403 };
  return { ok: true };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const check = await getCreatorSession(id);
    if ("error" in check) return NextResponse.json({ error: check.error }, { status: check.status });

    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return NextResponse.json({ error: "No user found with that email" }, { status: 404 });

    const admin = await prisma.tournamentAdmin.upsert({
      where: { tournamentId_userId: { tournamentId: id, userId: user.id } },
      create: { tournamentId: id, userId: user.id },
      update: {},
      include: { user: { select: { id: true, email: true, name: true } } },
    });

    return NextResponse.json({ userId: admin.user.id, email: admin.user.email, name: admin.user.name });
  } catch (err) {
    console.error("[POST /api/tournament/[id]/admins]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const check = await getCreatorSession(id);
    if ("error" in check) return NextResponse.json({ error: check.error }, { status: check.status });

    const { userId } = await req.json();
    if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

    await prisma.tournamentAdmin.deleteMany({ where: { tournamentId: id, userId } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/tournament/[id]/admins]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
