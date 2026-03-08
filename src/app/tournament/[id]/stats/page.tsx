import Link from "next/link";
import { redirect } from "next/navigation";
import { computeStats } from "@/lib/stats";
import { AwardCard } from "@/components/stats/AwardCard";
import { IndividualScoresChart } from "@/components/stats/IndividualScoresChart";
import { RoundBreakdownChart } from "@/components/stats/RoundBreakdownChart";
import { RoundData } from "@/types";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isTournamentAdmin } from "@/lib/tournamentAuth";

async function fetchTournament(id: string) {
  try {
    return await prisma.tournament.findUnique({
      where: { id },
      include: {
        contestants: true,
        participants: true,
        viewers: { select: { email: true } },
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
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

interface StatsPageProps {
  params: Promise<{ id: string }>;
}

export default async function StatsPage({ params }: StatsPageProps) {
  const { id } = await params;
  const tournament = await fetchTournament(id);

  if (tournament?.isPrivate) {
    const session = await auth();
    const userId = session?.user?.id;
    const userEmail = session?.user?.email;
    const adminAccess = userId && await isTournamentAdmin(id, userId);
    const viewerAccess = userEmail && tournament.viewers.some((v: { email: string }) => v.email === userEmail);
    if (!adminAccess && !viewerAccess) redirect("/login");
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-gray-400 text-lg">Tournament not found.</p>
          <Link
            href="/"
            className="text-indigo-400 hover:text-indigo-300 underline text-sm transition-colors"
          >
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  // Build flat vote list for computeStats
  const votes = tournament.rounds.flatMap((round) =>
    round.matches.flatMap((match) =>
      match.votes.map((vote) => ({
        matchId: match.id,
        participantId: vote.participantId,
        participantName: vote.participant.name,
        votedForId: vote.votedForId,
      }))
    )
  );

  const hasVotes = votes.length > 0;

  // Build match context for True Believer / Clutch awards
  const matchContexts = tournament.rounds.flatMap((round) =>
    round.matches.map((match) => ({
      matchId: match.id,
      contestant1Id: match.contestant1?.id ?? null,
      contestant2Id: match.contestant2?.id ?? null,
      winnerId: match.winner?.id ?? null,
      roundNumber: round.number,
    }))
  );

  // Compute stats (safe to call even with empty votes — returns empty arrays)
  const { individualScores, awards } =
    computeStats(votes, matchContexts);

  // Build RoundData[] compatible with RoundBreakdownChart
  const rounds: RoundData[] = tournament.rounds.map((round) => ({
    id: round.id,
    number: round.number,
    name: round.name,
    matches: round.matches.map((match) => ({
      id: match.id,
      position: match.position,
      contestant1: match.contestant1 ? { ...match.contestant1, links: match.contestant1.links.map((l) => ({ id: l.id, url: l.url })) } : null,
      contestant2: match.contestant2 ? { ...match.contestant2, links: match.contestant2.links.map((l) => ({ id: l.id, url: l.url })) } : null,
      winner: match.winner ? { ...match.winner, links: match.winner.links.map((l) => ({ id: l.id, url: l.url })) } : null,
      resolvedAt: match.resolvedAt?.toISOString() ?? null,
      votes: match.votes.map((vote) => ({
        participantId: vote.participantId,
        participantName: vote.participant.name,
        votedForId: vote.votedForId,
        votedForName: vote.votedFor.name,
      })),
    })),
  }));

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-6xl mx-auto px-4 py-10 space-y-10">

        {/* ----------------------------------------------------------------
            Header
        ---------------------------------------------------------------- */}
        <div className="space-y-3">
          <Link
            href={`/tournament/${id}`}
            className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-200 transition-colors"
          >
            <span aria-hidden="true">&#8592;</span>
            Back to bracket
          </Link>

          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              📊 Stats &amp; Awards
            </h1>
            <p className="mt-1 text-gray-400 text-lg">{tournament.title}</p>
          </div>
        </div>

        {/* ----------------------------------------------------------------
            Empty state
        ---------------------------------------------------------------- */}
        {!hasVotes && (
          <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-10 text-center">
            <p className="text-gray-400 text-base">
              No votes recorded yet. Enter match results from the admin panel.
            </p>
          </div>
        )}

        {/* ----------------------------------------------------------------
            Awards
        ---------------------------------------------------------------- */}
        {hasVotes && awards.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight">Awards</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {awards.map((award) => (
                <AwardCard key={award.title} award={award} />
              ))}
            </div>
          </section>
        )}

        {/* ----------------------------------------------------------------
            Individual Scores
        ---------------------------------------------------------------- */}
        {hasVotes && individualScores.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight">
              Individual Scores
            </h2>
            <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-6">
              <IndividualScoresChart
                scores={individualScores}
                awards={awards}
              />
            </div>
          </section>
        )}

        {/* ----------------------------------------------------------------
            Round Breakdown
        ---------------------------------------------------------------- */}
        {hasVotes && (
          <section className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight">
              Round Breakdown
            </h2>
            <RoundBreakdownChart rounds={rounds} />
          </section>
        )}

      </div>
    </div>
  );
}
