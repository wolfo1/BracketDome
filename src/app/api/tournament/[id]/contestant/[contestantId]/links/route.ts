import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isTournamentAdmin } from "@/lib/tournamentAuth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; contestantId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, contestantId } = await params;
    if (!await isTournamentAdmin(id, session.user.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { url } = await req.json();
    if (!url?.trim()) return NextResponse.json({ error: "URL required" }, { status: 400 });

    const link = await prisma.contestantLink.create({
      data: { url: url.trim(), contestantId },
    });

    return NextResponse.json({ id: link.id, url: link.url });
  } catch (err) {
    console.error("[POST contestant links]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; contestantId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    if (!await isTournamentAdmin(id, session.user.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { linkId } = await req.json();
    if (!linkId) return NextResponse.json({ error: "linkId required" }, { status: 400 });

    await prisma.contestantLink.delete({ where: { id: linkId } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE contestant link]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
