import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { TournamentSummary, TournamentStatus } from "@/types";
import { prisma } from "@/lib/prisma";

async function getTournaments(userId?: string, userEmail?: string): Promise<TournamentSummary[]> {
  try {
    const tournaments = await prisma.tournament.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { contestants: true, participants: true } },
        admins: { select: { userId: true } },
        viewers: { select: { email: true } },
      },
    });
    return tournaments
      .filter((t) => {
        if (!t.isPrivate) return true;
        if (userId && (t.createdBy === userId || t.admins.some((a) => a.userId === userId))) return true;
        if (userEmail && t.viewers.some((v) => v.email === userEmail)) return true;
        return false;
      })
      .map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        status: t.status as TournamentSummary["status"],
        createdAt: t.createdAt.toISOString(),
        contestantCount: t._count.contestants,
        participantCount: t._count.participants,
      }));
  } catch {
    return [];
  }
}

function StatusBadge({ status }: { status: TournamentStatus }) {
  const styles: Record<TournamentStatus, string> = {
    SETUP: "bg-gray-700 text-gray-300 border border-gray-600",
    ACTIVE: "bg-emerald-900/60 text-emerald-300 border border-emerald-600",
    COMPLETED: "bg-purple-900/60 text-purple-300 border border-purple-600",
  };
  const labels: Record<TournamentStatus, string> = {
    SETUP: "Setup",
    ACTIVE: "Active",
    COMPLETED: "Completed",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function TournamentCard({ tournament }: { tournament: TournamentSummary }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-gray-800 bg-gray-900/70 p-5 shadow-lg transition-all hover:border-indigo-700/60 hover:shadow-indigo-900/30 hover:shadow-xl">
      <div className="flex items-start justify-between gap-2">
        <h2 className="line-clamp-2 text-lg font-bold text-white leading-snug">
          {tournament.title}
        </h2>
        <StatusBadge status={tournament.status} />
      </div>

      {tournament.description && (
        <p className="line-clamp-2 text-sm text-gray-400">
          {tournament.description}
        </p>
      )}

      <div className="mt-auto flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="text-indigo-400 font-semibold">
            {tournament.contestantCount}
          </span>{" "}
          contestants
        </span>
        <span className="flex items-center gap-1">
          <span className="text-pink-400 font-semibold">
            {tournament.participantCount}
          </span>{" "}
          voters
        </span>
      </div>

      <Link
        href={`/tournament/${tournament.id}`}
        className="mt-1 inline-flex w-full items-center justify-center rounded-xl bg-indigo-600/20 px-4 py-2 text-sm font-semibold text-indigo-300 ring-1 ring-indigo-600/40 transition-colors hover:bg-indigo-600/40 hover:text-indigo-100"
      >
        View Bracket
      </Link>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-gray-700 bg-gray-900/40 py-20 text-center">
      <div className="text-5xl">🏟️</div>
      <h3 className="text-xl font-semibold text-gray-300">No tournaments yet</h3>
      <p className="max-w-xs text-sm text-gray-500">
        Once a tournament is created it will appear here. Log in to create the
        first one!
      </p>
    </div>
  );
}

export default async function HomePage() {
  const session = await auth();
  const tournaments = await getTournaments(session?.user?.id ?? undefined, session?.user?.email ?? undefined);

  const isLoggedIn = !!session?.user;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-gray-800/60 bg-gray-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/" className="text-xl font-black tracking-tight text-white">
            BracketDome
          </Link>

          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <>
                <span className="hidden text-sm text-gray-400 sm:block">
                  {session.user?.name ?? session.user?.email}
                </span>
                <form
                  action={async () => {
                    "use server";
                    await signOut({ redirectTo: "/" });
                  }}
                >
                  <button
                    type="submit"
                    className="rounded-lg border border-gray-700 px-3 py-1.5 text-sm font-medium text-gray-300 transition-colors hover:border-gray-500 hover:text-white"
                  >
                    Log out
                  </button>
                </form>
              </>
            ) : (
              <Link
                href="/login"
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
              >
                Log in
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-12">
        {/* Hero */}
        <div className="mb-12 text-center">
          <h1 className="mb-3 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-5xl font-black tracking-tight text-transparent sm:text-6xl">
            🏆 BracketDome
          </h1>
          <p className="text-lg text-gray-400">
            Tournament brackets for your WhatsApp group
          </p>

          {isLoggedIn && (
            <Link
              href="/tournament/create"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-900/40 transition-all hover:from-indigo-500 hover:to-purple-500 hover:shadow-indigo-800/60"
            >
              + Create Tournament
            </Link>
          )}
        </div>

        {/* Tournament grid */}
        {tournaments.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <h2 className="mb-5 text-sm font-semibold uppercase tracking-widest text-gray-500">
              All Tournaments
            </h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {tournaments.map((t) => (
                <TournamentCard key={t.id} tournament={t} />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
