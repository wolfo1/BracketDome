import { prisma } from "@/lib/prisma";

/** Returns true if userId is the creator or an added admin of the tournament. */
export async function isTournamentAdmin(tournamentId: string, userId: string): Promise<boolean> {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: {
      createdBy: true,
      admins: { select: { userId: true } },
    },
  });
  if (!tournament) return false;
  if (tournament.createdBy === userId) return true;
  return tournament.admins.some((a) => a.userId === userId);
}
