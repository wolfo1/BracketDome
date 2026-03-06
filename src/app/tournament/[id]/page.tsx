import Link from "next/link";
import { notFound } from "next/navigation";
import BracketView from "@/components/bracket/BracketView";
import { TournamentData } from "@/types/index";

async function getTournament(id: string): Promise<TournamentData | null> {
  const base =
    process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const res = await fetch(`${base}/api/tournament/${id}`, {
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
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
          The tournament you&apos;re looking for doesn&apos;t exist or has been
          removed.
        </p>
        <Link
          href="/"
          className="mt-2 inline-flex items-center gap-2 rounded-xl bg-indigo-600/20 px-5 py-2.5 text-sm font-semibold text-indigo-300 ring-1 ring-indigo-600/40 transition-colors hover:bg-indigo-600/40 hover:text-indigo-100"
        >
          Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Page header */}
      <header className="sticky top-0 z-10 border-b border-gray-800/60 bg-gray-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          {/* Left: breadcrumb + title */}
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/"
              className="shrink-0 text-sm font-semibold text-gray-500 hover:text-gray-300 transition-colors"
            >
              BracketDome
            </Link>
            <span className="text-gray-700">/</span>
            <h1 className="truncate text-sm font-semibold text-white">
              {tournament.title}
            </h1>
          </div>

          {/* Right: action links */}
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={`/tournament/${id}/stats`}
              className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs font-semibold text-gray-300 transition-colors hover:border-gray-500 hover:text-white"
            >
              Stats
            </Link>
            <Link
              href={`/tournament/${id}/admin`}
              className="rounded-lg bg-indigo-600/20 border border-indigo-700/50 px-3 py-1.5 text-xs font-semibold text-indigo-300 transition-colors hover:bg-indigo-600/40 hover:text-indigo-100"
            >
              Admin
            </Link>
          </div>
        </div>
      </header>

      {/* Title / description block */}
      {tournament.description && (
        <div className="mx-auto max-w-7xl px-4 pt-6 pb-2">
          <p className="text-sm text-gray-400 max-w-2xl">
            {tournament.description}
          </p>
        </div>
      )}

      {/* Bracket */}
      <BracketView tournament={tournament} />
    </div>
  );
}
