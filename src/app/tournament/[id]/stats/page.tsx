import Link from "next/link";
import { computeStats } from "@/lib/stats";
import { AwardCard } from "@/components/stats/AwardCard";
import { IndividualScoresChart } from "@/components/stats/IndividualScoresChart";
import { CorrelationHeatmap } from "@/components/stats/CorrelationHeatmap";
import { RoundBreakdownChart } from "@/components/stats/RoundBreakdownChart";
import { RoundData } from "@/types";

// ---------------------------------------------------------------------------
// Types that reflect the raw shape returned by /api/tournament/[id]
// (votes include nested participant and votedFor objects from Prisma)
// ---------------------------------------------------------------------------

interface RawVote {
  id: string;
  participantId: string;
  votedForId: string;
  participant: { id: string; name: string };
  votedFor: { id: string; name: string; seed: number };
}

interface RawMatch {
  id: string;
  position: number;
  winnerId: string | null;
  contestant1: { id: string; name: string; seed: number } | null;
  contestant2: { id: string; name: string; seed: number } | null;
  winner: { id: string; name: string; seed: number } | null;
  votes: RawVote[];
}

interface RawRound {
  id: string;
  number: number;
  name: string;
  matches: RawMatch[];
}

interface RawTournament {
  id: string;
  title: string;
  description: string | null;
  status: string;
  contestants: { id: string; name: string; seed: number }[];
  participants: { id: string; name: string }[];
  rounds: RawRound[];
}

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

async function fetchTournament(id: string): Promise<RawTournament | null> {
  const baseUrl =
    process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  const res = await fetch(`${baseUrl}/api/tournament/${id}`, {
    cache: "no-store",
  });

  if (!res.ok) return null;
  return res.json() as Promise<RawTournament>;
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

  // Compute stats (safe to call even with empty votes — returns empty arrays)
  const { individualScores, pairwiseCorrelations, awards } =
    computeStats(votes);

  // Build RoundData[] compatible with RoundBreakdownChart
  const rounds: RoundData[] = tournament.rounds.map((round) => ({
    id: round.id,
    number: round.number,
    name: round.name,
    matches: round.matches.map((match) => ({
      id: match.id,
      position: match.position,
      contestant1: match.contestant1,
      contestant2: match.contestant2,
      winner: match.winner,
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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
            Pairwise Correlation
        ---------------------------------------------------------------- */}
        {hasVotes && pairwiseCorrelations.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight">
              Pairwise Agreement Heatmap
            </h2>
            <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-6">
              <CorrelationHeatmap
                correlations={pairwiseCorrelations}
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
