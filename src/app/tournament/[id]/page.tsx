import Link from "next/link";
import { redirect } from "next/navigation";
import BracketView from "@/components/bracket/BracketView";
import { TournamentData } from "@/types/index";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isTournamentAdmin } from "@/lib/tournamentAuth";

async function getTournament(id: string): Promise<TournamentData | null> {
  try {
    const t = await prisma.tournament.findUnique({
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
    if (!t) return null;
    return {
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      isPrivate: t.isPrivate,
      startDate: t.startDate?.toISOString() ?? null,
      maxParticipants: t.maxParticipants,
      createdBy: t.createdBy,
      contestants: t.contestants.map((c) => ({ ...c, links: c.links.map((l) => ({ id: l.id, url: l.url })) })),
      participants: t.participants,
      admins: t.admins.map((a) => ({ userId: a.user.id, email: a.user.email, name: a.user.name })),
      viewers: t.viewers.map((v) => ({ id: v.id, email: v.email })),
      rounds: t.rounds.map((r) => ({
        id: r.id,
        number: r.number,
        name: r.name,
        matches: r.matches.map((m) => ({
          id: m.id,
          position: m.position,
          contestant1: m.contestant1 ? { ...m.contestant1, links: m.contestant1.links.map((l) => ({ id: l.id, url: l.url })) } : null,
          contestant2: m.contestant2 ? { ...m.contestant2, links: m.contestant2.links.map((l) => ({ id: l.id, url: l.url })) } : null,
          winner: m.winner ? { ...m.winner, links: m.winner.links.map((l) => ({ id: l.id, url: l.url })) } : null,
          resolvedAt: m.resolvedAt?.toISOString() ?? null,
          votes: m.votes.map((v) => ({
            participantId: v.participantId,
            participantName: v.participant.name,
            votedForId: v.votedForId,
            votedForName: v.votedFor.name,
          })),
        })),
      })),
    } as TournamentData;
  } catch {
    return null;
  }
}

export default async function TournamentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tournament = await getTournament(id);

  if (!tournament) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-4 px-4">
        <div className="text-6xl">🏟️</div>
        <h1 className="text-3xl font-black text-white">Tournament Not Found</h1>
        <p className="text-gray-400 text-center max-w-sm">
          The tournament you&apos;re looking for doesn&apos;t exist or has been removed.
        </p>
        <Link href="/" className="mt-2 inline-flex items-center gap-2 rounded-xl bg-indigo-600/20 px-5 py-2.5 text-sm font-semibold text-indigo-300 ring-1 ring-indigo-600/40 transition-colors hover:bg-indigo-600/40 hover:text-indigo-100">
          Back to Home
        </Link>
      </div>
    );
  }

  // Private tournament access check
  if (tournament.isPrivate) {
    const session = await auth();
    const userId = session?.user?.id;
    const userEmail = session?.user?.email;
    const adminAccess = userId && await isTournamentAdmin(id, userId);
    const viewerAccess = userEmail && tournament.viewers.some((v) => v.email === userEmail);
    if (!adminAccess && !viewerAccess) {
      redirect("/login");
    }
  }

  const session = await auth();
  const isAdmin = session?.user?.id
    ? await isTournamentAdmin(id, session.user.id)
    : false;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="sticky top-0 z-10 border-b border-gray-800/60 bg-gray-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/" className="shrink-0 text-sm font-semibold text-gray-500 hover:text-gray-300 transition-colors">
              BracketDome
            </Link>
            <span className="text-gray-700">/</span>
            <h1 className="truncate text-sm font-semibold text-white">{tournament.title}</h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={`/tournament/${id}/stats`}
              className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs font-semibold text-gray-300 transition-colors hover:border-gray-500 hover:text-white"
            >
              Stats
            </Link>
            {isAdmin && (
              <Link
                href={`/tournament/${id}/admin`}
                className="rounded-lg bg-indigo-600/20 border border-indigo-700/50 px-3 py-1.5 text-xs font-semibold text-indigo-300 transition-colors hover:bg-indigo-600/40 hover:text-indigo-100"
              >
                Admin
              </Link>
            )}
          </div>
        </div>
      </header>

      {(tournament.description || tournament.startDate) && (
        <div className="mx-auto max-w-7xl px-4 pt-6 pb-2 flex flex-wrap items-center gap-4">
          {tournament.description && (
            <p className="text-sm text-gray-400 max-w-2xl">{tournament.description}</p>
          )}
          {tournament.startDate && (
            <span className="text-xs text-gray-500 shrink-0">
              Started{" "}
              {new Date(tournament.startDate).toLocaleDateString(undefined, {
                year: "numeric", month: "long", day: "numeric",
              })}
            </span>
          )}
        </div>
      )}

      <BracketView tournament={tournament} />
    </div>
  );
}
