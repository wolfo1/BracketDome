import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
              votes: {
                include: {
                  participant: true,
                  votedFor: true,
                },
              },
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
}
