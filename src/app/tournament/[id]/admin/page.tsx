"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TournamentData, MatchData, RoundData, ParticipantData, ContestantData } from "@/types/index";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeWinnerId(
  votes: Record<string, string>,
  contestant1: ContestantData | null,
  contestant2: ContestantData | null
): string | null {
  if (!contestant1 || !contestant2) return null;
  let count1 = 0;
  let count2 = 0;
  for (const votedForId of Object.values(votes)) {
    if (votedForId === contestant1.id) count1++;
    else if (votedForId === contestant2.id) count2++;
  }
  if (count1 === 0 && count2 === 0) return null;
  if (count1 > count2) return contestant1.id;
  if (count2 > count1) return contestant2.id;
  // Tie — prefer contestant1 as a deterministic fallback
  return contestant1.id;
}

function getStatusColor(status: string) {
  if (status === "ACTIVE")
    return "bg-emerald-900/60 text-emerald-300 border-emerald-600";
  if (status === "COMPLETED")
    return "bg-purple-900/60 text-purple-300 border-purple-600";
  return "bg-gray-700 text-gray-300 border-gray-600";
}

// ─── Match form card ──────────────────────────────────────────────────────────

interface MatchFormCardProps {
  match: MatchData;
  participants: ParticipantData[];
  tournamentId: string;
  onSaved: () => void;
}

function MatchFormCard({
  match,
  participants,
  tournamentId,
  onSaved,
}: MatchFormCardProps) {
  // votes state: Record<participantId, votedForId>
  const [votes, setVotes] = useState<Record<string, string>>(() => {
    // Pre-fill from existing votes
    const initial: Record<string, string> = {};
    for (const v of match.votes) {
      initial[v.participantId] = v.votedForId;
    }
    return initial;
  });
  const [saving, setSaving] = useState(false);

  const { contestant1, contestant2 } = match;

  // Update votes when match data changes (e.g. refresh)
  useEffect(() => {
    const initial: Record<string, string> = {};
    for (const v of match.votes) {
      initial[v.participantId] = v.votedForId;
    }
    setVotes(initial);
  }, [match]);

  function handleVoteChange(participantId: string, votedForId: string) {
    setVotes((prev) => ({ ...prev, [participantId]: votedForId }));
  }

  async function handleSave() {
    const winnerId = computeWinnerId(votes, contestant1, contestant2);
    if (!winnerId) {
      toast.error("No votes have been cast — cannot determine a winner.");
      return;
    }

    const voteEntries = Object.entries(votes).map(
      ([participantId, votedForId]) => ({ participantId, votedForId })
    );

    if (voteEntries.length === 0) {
      toast.error("No votes recorded for this match.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(
        `/api/tournament/${tournamentId}/match/${match.id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ votes: voteEntries, winnerId }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to save match result.");
        return;
      }
      toast.success("Match result saved!");
      onSaved();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!contestant1 || !contestant2) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-800/40 p-4">
        <p className="text-sm text-gray-500 italic">
          Contestants not yet determined for this match.
        </p>
      </div>
    );
  }

  const voteCount = Object.keys(votes).length;
  const pendingCount = participants.length - voteCount;
  const winnerId = computeWinnerId(votes, contestant1, contestant2);
  const winner =
    winnerId === contestant1.id
      ? contestant1
      : winnerId === contestant2.id
      ? contestant2
      : null;

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/70 p-5 shadow-lg flex flex-col gap-4">
      {/* Match header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-bold text-white">
          <span className="truncate max-w-[10rem]">{contestant1.name}</span>
          <span className="text-gray-500 font-normal shrink-0">vs</span>
          <span className="truncate max-w-[10rem]">{contestant2.name}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500 shrink-0">
          {pendingCount > 0 && (
            <span className="text-amber-500">{pendingCount} pending</span>
          )}
          <span>{voteCount}/{participants.length} voted</span>
        </div>
      </div>

      {/* Participant vote rows */}
      <div className="flex flex-col gap-2">
        {participants.map((p) => {
          const votedFor = votes[p.id];
          return (
            <div
              key={p.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-gray-800 bg-gray-800/50 px-3 py-2"
            >
              <span className="text-sm font-medium text-gray-200 truncate max-w-[8rem]">
                {p.name}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                {/* Contestant 1 radio */}
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name={`match-${match.id}-participant-${p.id}`}
                    value={contestant1.id}
                    checked={votedFor === contestant1.id}
                    onChange={() => handleVoteChange(p.id, contestant1.id)}
                    className="accent-indigo-500"
                  />
                  <span className="text-xs text-gray-300 max-w-[6rem] truncate">
                    {contestant1.name}
                  </span>
                </label>

                {/* Contestant 2 radio */}
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name={`match-${match.id}-participant-${p.id}`}
                    value={contestant2.id}
                    checked={votedFor === contestant2.id}
                    onChange={() => handleVoteChange(p.id, contestant2.id)}
                    className="accent-pink-500"
                  />
                  <span className="text-xs text-gray-300 max-w-[6rem] truncate">
                    {contestant2.name}
                  </span>
                </label>
              </div>
            </div>
          );
        })}
      </div>

      {/* Projected winner */}
      {winner && (
        <div className="flex items-center gap-2 rounded-lg bg-indigo-900/30 border border-indigo-700/40 px-3 py-2 text-sm">
          <span className="text-indigo-400 font-semibold">
            Projected winner:
          </span>
          <span className="text-white font-bold">{winner.name}</span>
        </div>
      )}

      {/* Save button */}
      <div className="flex justify-end pt-1">
        <Button
          onClick={handleSave}
          disabled={saving || voteCount === 0}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "Saving…" : "Save Results"}
        </Button>
      </div>
    </div>
  );
}

// ─── Main admin page ──────────────────────────────────────────────────────────

export default function AdminPage() {
  const { id } = useParams<{ id: string }>();
  const [tournament, setTournament] = useState<TournamentData | null>(null);
  const [loadError, setLoadError] = useState(false);

  const fetchTournament = useCallback(async () => {
    try {
      const res = await fetch(`/api/tournament/${id}`, { cache: "no-store" });
      if (!res.ok) {
        setLoadError(true);
        return;
      }
      const data: TournamentData = await res.json();
      setTournament(data);
    } catch {
      setLoadError(true);
      toast.error("Failed to load tournament data.");
    }
  }, [id]);

  useEffect(() => {
    fetchTournament();
  }, [fetchTournament]);

  // ── Derived state ───────────────────────────────────────────────────────────

  const currentRound: RoundData | null = (() => {
    if (!tournament) return null;
    // Find first round that has any match without a winner
    return (
      tournament.rounds.find((r) =>
        r.matches.some(
          (m) =>
            m.winner === null &&
            (m.contestant1 !== null || m.contestant2 !== null)
        )
      ) ?? null
    );
  })();

  const pendingMatches: MatchData[] = (() => {
    if (!currentRound) return [];
    return currentRound.matches.filter(
      (m) =>
        m.winner === null &&
        m.contestant1 !== null &&
        m.contestant2 !== null
    );
  })();

  const allRoundsComplete =
    tournament !== null &&
    tournament.rounds.every((r) =>
      r.matches.every((m) => m.winner !== null || (m.contestant1 === null && m.contestant2 === null))
    );

  const currentRoundComplete =
    !allRoundsComplete &&
    currentRound === null &&
    tournament !== null &&
    tournament.status !== "COMPLETED";

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loadError) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-4 px-4">
        <div className="text-5xl">⚠️</div>
        <h1 className="text-2xl font-bold">Failed to load tournament</h1>
        <p className="text-gray-400 text-sm">
          Check your connection and try refreshing.
        </p>
        <Link
          href="/"
          className="text-sm text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
        >
          Back to Home
        </Link>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <svg
            className="w-8 h-8 animate-spin text-indigo-500"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            />
          </svg>
          <p className="text-sm">Loading tournament…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-gray-800/60 bg-gray-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href={`/tournament/${id}`}
              className="shrink-0 text-sm font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Back to Bracket
            </Link>
            <span className="text-gray-700">/</span>
            <span className="truncate text-sm font-semibold text-white">
              Admin
            </span>
          </div>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide border ${getStatusColor(tournament.status)}`}
          >
            {tournament.status}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 flex flex-col gap-8">
        {/* Tournament title */}
        <div>
          <h1 className="text-2xl font-black text-white mb-1">
            {tournament.title}
          </h1>
          {tournament.description && (
            <p className="text-sm text-gray-400">{tournament.description}</p>
          )}
        </div>

        {/* ── Tournament complete ─────────────────────────────────────────── */}
        {tournament.status === "COMPLETED" && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-amber-700/40 bg-amber-900/20 px-6 py-10 text-center">
            <div className="text-5xl">🏆</div>
            <h2 className="text-2xl font-black text-amber-300">
              Tournament Complete!
            </h2>
            {(() => {
              const lastRound =
                tournament.rounds[tournament.rounds.length - 1];
              const champion = lastRound?.matches?.[0]?.winner;
              return champion ? (
                <p className="text-gray-300 text-sm">
                  Champion:{" "}
                  <span className="font-bold text-white">{champion.name}</span>
                </p>
              ) : null;
            })()}
            <Link
              href={`/tournament/${id}`}
              className="mt-2 inline-flex items-center gap-2 rounded-xl bg-indigo-600/20 px-5 py-2.5 text-sm font-semibold text-indigo-300 ring-1 ring-indigo-600/40 transition-colors hover:bg-indigo-600/40 hover:text-indigo-100"
            >
              View Bracket
            </Link>
          </div>
        )}

        {/* ── All matches for current round done — next round pending ──────── */}
        {currentRoundComplete && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-indigo-700/40 bg-indigo-900/20 px-6 py-10 text-center">
            <div className="text-4xl">✅</div>
            <h2 className="text-xl font-bold text-indigo-300">
              All matches done
            </h2>
            <p className="text-sm text-gray-400">
              The next round will be unlocked automatically as winners advance.
            </p>
          </div>
        )}

        {/* ── Active round ─────────────────────────────────────────────────── */}
        {currentRound && tournament.status !== "COMPLETED" && (
          <div className="flex flex-col gap-5">
            {/* Round label */}
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-white">
                Current Round:{" "}
                <span className="text-indigo-400">{currentRound.name}</span>
              </h2>
              <Badge className="bg-emerald-900/40 text-emerald-300 border border-emerald-700/50 text-xs">
                {pendingMatches.length} match
                {pendingMatches.length !== 1 ? "es" : ""} remaining
              </Badge>
            </div>

            {/* Participants reminder */}
            <div className="rounded-xl border border-gray-800 bg-gray-800/30 px-4 py-3 text-xs text-gray-500">
              <span className="font-semibold text-gray-400">Participants: </span>
              {tournament.participants.map((p) => p.name).join(", ")}
            </div>

            {/* Match forms */}
            {pendingMatches.length === 0 ? (
              <p className="text-sm text-gray-500 italic">
                All matches in this round have results recorded.
              </p>
            ) : (
              pendingMatches.map((match) => (
                <MatchFormCard
                  key={match.id}
                  match={match}
                  participants={tournament.participants}
                  tournamentId={id}
                  onSaved={fetchTournament}
                />
              ))
            )}
          </div>
        )}

        {/* ── Completed rounds summary ──────────────────────────────────────── */}
        {tournament.rounds.some((r) =>
          r.matches.some((m) => m.winner !== null)
        ) && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-600 mb-3">
              Completed Rounds
            </h3>
            <div className="flex flex-col gap-3">
              {tournament.rounds
                .filter((r) => r.matches.every((m) => m.winner !== null || (m.contestant1 === null && m.contestant2 === null)))
                .map((round) => (
                  <div
                    key={round.id}
                    className="rounded-xl border border-gray-800 bg-gray-800/30 px-4 py-3"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-300">
                        {round.name}
                      </span>
                      <span className="text-xs text-gray-600">
                        {round.matches.filter((m) => m.winner).length} match
                        {round.matches.filter((m) => m.winner).length !== 1
                          ? "es"
                          : ""}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {round.matches
                        .filter((m) => m.winner)
                        .map((m) => (
                          <span
                            key={m.id}
                            className="inline-flex items-center gap-1 rounded-full bg-indigo-900/30 border border-indigo-700/30 px-2.5 py-0.5 text-xs font-medium text-indigo-300"
                          >
                            <span className="text-amber-400 mr-0.5">&#x1F451;</span>
                            {m.winner!.name}
                          </span>
                        ))}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
