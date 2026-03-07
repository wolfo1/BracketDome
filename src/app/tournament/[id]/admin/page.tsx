"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { TournamentData, MatchData, RoundData, ParticipantData, ContestantData, AdminData, ViewerData } from "@/types/index";

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
  return contestant1.id;
}

function getStatusColor(status: string) {
  if (status === "ACTIVE") return "bg-emerald-900/60 text-emerald-300 border-emerald-600";
  if (status === "COMPLETED") return "bg-purple-900/60 text-purple-300 border-purple-600";
  return "bg-gray-700 text-gray-300 border-gray-600";
}

// ─── Match form card ──────────────────────────────────────────────────────────

interface MatchFormCardProps {
  match: MatchData;
  participants: ParticipantData[];
  tournamentId: string;
  onSaved: () => void;
}

function MatchFormCard({ match, participants, tournamentId, onSaved }: MatchFormCardProps) {
  const [votes, setVotes] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const v of match.votes) initial[v.participantId] = v.votedForId;
    return initial;
  });
  const [saving, setSaving] = useState(false);
  const { contestant1, contestant2 } = match;

  useEffect(() => {
    const initial: Record<string, string> = {};
    for (const v of match.votes) initial[v.participantId] = v.votedForId;
    setVotes(initial);
  }, [match]);

  function handleVoteChange(participantId: string, votedForId: string) {
    setVotes((prev) => ({ ...prev, [participantId]: votedForId }));
  }

  async function handleSave() {
    const winnerId = computeWinnerId(votes, contestant1, contestant2);
    if (!winnerId) { toast.error("No votes have been cast — cannot determine a winner."); return; }
    const voteEntries = Object.entries(votes).map(([participantId, votedForId]) => ({ participantId, votedForId }));
    if (voteEntries.length === 0) { toast.error("No votes recorded for this match."); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/tournament/${tournamentId}/match/${match.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ votes: voteEntries, winnerId }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to save match result."); return; }
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
        <p className="text-sm text-gray-500 italic">Contestants not yet determined for this match.</p>
      </div>
    );
  }

  const voteCount = Object.keys(votes).length;
  const pendingCount = participants.length - voteCount;
  const winnerId = computeWinnerId(votes, contestant1, contestant2);
  const winner = winnerId === contestant1.id ? contestant1 : winnerId === contestant2.id ? contestant2 : null;

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/70 p-5 shadow-lg flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-sm font-bold text-white min-w-0">
          <span className="truncate">{contestant1.name}</span>
          <span className="text-gray-500 font-normal shrink-0">vs</span>
          <span className="truncate">{contestant2.name}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          {pendingCount > 0 && <span className="text-amber-500">{pendingCount} pending</span>}
          <span>{voteCount}/{participants.length} voted</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {participants.map((p) => {
          const votedFor = votes[p.id];
          return (
            <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-800 bg-gray-800/50 px-3 py-2">
              <span className="text-sm font-medium text-gray-200 truncate max-w-[8rem]">{p.name}</span>
              <div className="flex items-center gap-2 shrink-0">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="radio" name={`match-${match.id}-participant-${p.id}`} value={contestant1.id} checked={votedFor === contestant1.id} onChange={() => handleVoteChange(p.id, contestant1.id)} className="accent-indigo-500" />
                  <span className="text-xs text-gray-300 max-w-[6rem] truncate">{contestant1.name}</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="radio" name={`match-${match.id}-participant-${p.id}`} value={contestant2.id} checked={votedFor === contestant2.id} onChange={() => handleVoteChange(p.id, contestant2.id)} className="accent-pink-500" />
                  <span className="text-xs text-gray-300 max-w-[6rem] truncate">{contestant2.name}</span>
                </label>
              </div>
            </div>
          );
        })}
      </div>

      {winner && (
        <div className="flex items-center gap-2 rounded-lg bg-indigo-900/30 border border-indigo-700/40 px-3 py-2 text-sm">
          <span className="text-indigo-400 font-semibold">Projected winner:</span>
          <span className="text-white font-bold">{winner.name}</span>
        </div>
      )}

      <div className="flex justify-end pt-1">
        <Button onClick={handleSave} disabled={saving || voteCount === 0} className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 disabled:opacity-50 disabled:cursor-not-allowed">
          {saving ? "Saving…" : "Save Results"}
        </Button>
      </div>
    </div>
  );
}

// ─── Admin management panel ───────────────────────────────────────────────────

function AdminsPanel({ tournamentId, admins, isCreator, onRefresh }: {
  tournamentId: string;
  admins: AdminData[];
  isCreator: boolean;
  onRefresh: () => void;
}) {
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);

  async function handleAdd() {
    if (!email.trim()) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/tournament/${tournamentId}/admins`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to add admin."); return; }
      toast.success(`${data.name} added as admin.`);
      setEmail("");
      onRefresh();
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(userId: string, name: string) {
    if (!confirm(`Remove ${name} as admin?`)) return;
    try {
      const res = await fetch(`/api/tournament/${tournamentId}/admins`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) { toast.error("Failed to remove admin."); return; }
      toast.success(`${name} removed.`);
      onRefresh();
    } catch {
      toast.error("Something went wrong.");
    }
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4 flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-gray-300">Admins</h3>
      <div className="flex flex-col gap-1.5">
        {admins.length === 0 && <p className="text-xs text-gray-600 italic">No extra admins added.</p>}
        {admins.map((a) => (
          <div key={a.userId} className="flex items-center justify-between rounded-lg bg-gray-800/50 px-3 py-1.5">
            <div>
              <span className="text-sm text-white">{a.name}</span>
              <span className="text-xs text-gray-500 ml-2">{a.email}</span>
            </div>
            {isCreator && (
              <button onClick={() => handleRemove(a.userId, a.name)} className="text-xs text-red-500 hover:text-red-400 ml-2">Remove</button>
            )}
          </div>
        ))}
      </div>
      {isCreator && (
        <div className="flex gap-2">
          <Input value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAdd()} placeholder="user@email.com" className="h-8 text-sm bg-gray-800 border-gray-700" />
          <Button onClick={handleAdd} disabled={adding || !email.trim()} className="h-8 px-3 text-xs bg-indigo-600 hover:bg-indigo-500">
            {adding ? "Adding…" : "Add"}
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Viewers management panel ─────────────────────────────────────────────────

function ViewersPanel({ tournamentId, viewers, isPrivate, onRefresh }: {
  tournamentId: string;
  viewers: ViewerData[];
  isPrivate: boolean;
  onRefresh: () => void;
}) {
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);

  async function handleAdd() {
    if (!email.trim()) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/tournament/${tournamentId}/viewers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to add viewer."); return; }
      toast.success(`${data.email} can now view this tournament.`);
      setEmail("");
      onRefresh();
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(viewerId: string, viewerEmail: string) {
    try {
      const res = await fetch(`/api/tournament/${tournamentId}/viewers`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ viewerId }),
      });
      if (!res.ok) { toast.error("Failed to remove viewer."); return; }
      toast.success(`${viewerEmail} removed.`);
      onRefresh();
    } catch {
      toast.error("Something went wrong.");
    }
  }

  if (!isPrivate) return null;

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4 flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-gray-300">Allowed Viewers <span className="text-xs text-amber-500 font-normal ml-1">(private tournament)</span></h3>
      <div className="flex flex-col gap-1.5">
        {viewers.length === 0 && <p className="text-xs text-gray-600 italic">No viewers added yet.</p>}
        {viewers.map((v) => (
          <div key={v.id} className="flex items-center justify-between rounded-lg bg-gray-800/50 px-3 py-1.5">
            <span className="text-sm text-white">{v.email}</span>
            <button onClick={() => handleRemove(v.id, v.email)} className="text-xs text-red-500 hover:text-red-400 ml-2">Remove</button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Input value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAdd()} placeholder="viewer@email.com" className="h-8 text-sm bg-gray-800 border-gray-700" />
        <Button onClick={handleAdd} disabled={adding || !email.trim()} className="h-8 px-3 text-xs bg-indigo-600 hover:bg-indigo-500">
          {adding ? "Adding…" : "Add"}
        </Button>
      </div>
    </div>
  );
}

// ─── Add participant panel ────────────────────────────────────────────────────

function AddParticipantPanel({ tournamentId, participantCount, maxParticipants, onRefresh }: {
  tournamentId: string;
  participantCount: number;
  maxParticipants: number;
  onRefresh: () => void;
}) {
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);

  async function handleAdd() {
    if (!name.trim()) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/tournament/${tournamentId}/participant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to add participant."); return; }
      toast.success(`${data.name} added!`);
      setName("");
      onRefresh();
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-300">Participants</h3>
        <span className="text-xs text-gray-500">{participantCount}/{maxParticipants}</span>
      </div>
      <div className="flex gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="New participant name"
          className="h-8 text-sm bg-gray-800 border-gray-700"
          disabled={participantCount >= maxParticipants}
        />
        <Button
          onClick={handleAdd}
          disabled={adding || !name.trim() || participantCount >= maxParticipants}
          className="h-8 px-3 text-xs bg-emerald-700 hover:bg-emerald-600"
        >
          {adding ? "Adding…" : "Add"}
        </Button>
      </div>
      {participantCount >= maxParticipants && (
        <p className="text-xs text-amber-500">Participant limit reached ({maxParticipants}).</p>
      )}
    </div>
  );
}

// ─── Main admin page ──────────────────────────────────────────────────────────

export default function AdminPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [tournament, setTournament] = useState<TournamentData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const fetchTournament = useCallback(async () => {
    try {
      const res = await fetch(`/api/tournament/${id}`, { cache: "no-store" });
      if (res.status === 403) { setLoadError("forbidden"); return; }
      if (!res.ok) { setLoadError("error"); return; }
      const data: TournamentData = await res.json();
      setTournament(data);
    } catch {
      setLoadError("error");
      toast.error("Failed to load tournament data.");
    }
  }, [id]);

  // Get current user session
  useEffect(() => {
    fetch("/api/auth/session").then((r) => r.json()).then((s) => {
      setCurrentUserId(s?.user?.id ?? null);
    });
  }, []);

  useEffect(() => { fetchTournament(); }, [fetchTournament]);

  async function handleDelete() {
    if (!confirm(`Delete "${tournament?.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/tournament/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to delete tournament."); return; }
      toast.success("Tournament deleted.");
      router.push("/");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  // ── Derived state ───────────────────────────────────────────────────────────

  const isCreator = tournament?.createdBy === currentUserId;

  const currentRound: RoundData | null = (() => {
    if (!tournament) return null;
    return tournament.rounds.find((r) =>
      r.matches.some((m) => m.winner === null && (m.contestant1 !== null || m.contestant2 !== null))
    ) ?? null;
  })();

  const pendingMatches: MatchData[] = (() => {
    if (!currentRound) return [];
    return currentRound.matches.filter((m) => m.winner === null && m.contestant1 !== null && m.contestant2 !== null);
  })();

  const allRoundsComplete = tournament !== null &&
    tournament.rounds.every((r) => r.matches.every((m) => m.winner !== null || (m.contestant1 === null && m.contestant2 === null)));

  const currentRoundComplete = !allRoundsComplete && currentRound === null && tournament !== null && tournament.status !== "COMPLETED";

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loadError === "forbidden") {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-4 px-4">
        <div className="text-5xl">🔒</div>
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-gray-400 text-sm">You don&apos;t have admin access to this tournament.</p>
        <Link href={`/tournament/${id}`} className="text-sm text-indigo-400 hover:text-indigo-300 underline underline-offset-2">View Bracket</Link>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-4 px-4">
        <div className="text-5xl">⚠️</div>
        <h1 className="text-2xl font-bold">Failed to load tournament</h1>
        <p className="text-gray-400 text-sm">Check your connection and try refreshing.</p>
        <Link href="/" className="text-sm text-indigo-400 hover:text-indigo-300 underline underline-offset-2">Back to Home</Link>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <svg className="w-8 h-8 animate-spin text-indigo-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <p className="text-sm">Loading tournament…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="sticky top-0 z-10 border-b border-gray-800/60 bg-gray-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link href={`/tournament/${id}`} className="shrink-0 text-sm font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
              Back to Bracket
            </Link>
            <span className="text-gray-700">/</span>
            <span className="truncate text-sm font-semibold text-white">Admin</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide border ${getStatusColor(tournament.status)}`}>
              {tournament.status}
            </span>
            {isCreator && (
              <Button onClick={handleDelete} disabled={deleting} className="h-7 px-3 text-xs bg-red-900/40 hover:bg-red-800/60 text-red-400 hover:text-red-300 border border-red-800/50 disabled:opacity-50">
                {deleting ? "Deleting…" : "Delete"}
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 flex flex-col gap-8">
        {/* Tournament title */}
        <div>
          <h1 className="text-2xl font-black text-white mb-1">{tournament.title}</h1>
          {tournament.description && <p className="text-sm text-gray-400">{tournament.description}</p>}
          {tournament.startDate && (
            <p className="text-xs text-gray-500 mt-1">
              Started {new Date(tournament.startDate).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
            </p>
          )}
        </div>

        {/* ── Management panels ─────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3">
          <AddParticipantPanel
            tournamentId={id}
            participantCount={tournament.participants.length}
            maxParticipants={tournament.maxParticipants}
            onRefresh={fetchTournament}
          />
          <AdminsPanel
            tournamentId={id}
            admins={tournament.admins}
            isCreator={isCreator}
            onRefresh={fetchTournament}
          />
          <ViewersPanel
            tournamentId={id}
            viewers={tournament.viewers}
            isPrivate={tournament.isPrivate}
            onRefresh={fetchTournament}
          />
        </div>

        {/* ── Tournament complete ─────────────────────────────────────────── */}
        {tournament.status === "COMPLETED" && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-amber-700/40 bg-amber-900/20 px-6 py-10 text-center">
            <div className="text-5xl">🏆</div>
            <h2 className="text-2xl font-black text-amber-300">Tournament Complete!</h2>
            {(() => {
              const lastRound = tournament.rounds[tournament.rounds.length - 1];
              const champion = lastRound?.matches?.[0]?.winner;
              return champion ? (
                <p className="text-gray-300 text-sm">Champion: <span className="font-bold text-white">{champion.name}</span></p>
              ) : null;
            })()}
            <Link href={`/tournament/${id}`} className="mt-2 inline-flex items-center gap-2 rounded-xl bg-indigo-600/20 px-5 py-2.5 text-sm font-semibold text-indigo-300 ring-1 ring-indigo-600/40 transition-colors hover:bg-indigo-600/40 hover:text-indigo-100">
              View Bracket
            </Link>
          </div>
        )}

        {/* ── All matches for current round done ──────────────────────────── */}
        {currentRoundComplete && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-indigo-700/40 bg-indigo-900/20 px-6 py-10 text-center">
            <div className="text-4xl">✅</div>
            <h2 className="text-xl font-bold text-indigo-300">All matches done</h2>
            <p className="text-sm text-gray-400">The next round will be unlocked automatically as winners advance.</p>
          </div>
        )}

        {/* ── Active round ─────────────────────────────────────────────────── */}
        {currentRound && tournament.status !== "COMPLETED" && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-white">
                Current Round: <span className="text-indigo-400">{currentRound.name}</span>
              </h2>
              <Badge className="bg-emerald-900/40 text-emerald-300 border border-emerald-700/50 text-xs">
                {pendingMatches.length} match{pendingMatches.length !== 1 ? "es" : ""} remaining
              </Badge>
            </div>

            <div className="rounded-xl border border-gray-800 bg-gray-800/30 px-4 py-3 text-xs text-gray-500">
              <span className="font-semibold text-gray-400">Participants: </span>
              {tournament.participants.map((p) => p.name).join(", ")}
            </div>

            {pendingMatches.length === 0 ? (
              <p className="text-sm text-gray-500 italic">All matches in this round have results recorded.</p>
            ) : (
              pendingMatches.map((match) => (
                <MatchFormCard key={match.id} match={match} participants={tournament.participants} tournamentId={id} onSaved={fetchTournament} />
              ))
            )}
          </div>
        )}

        {/* ── Completed rounds summary ──────────────────────────────────────── */}
        {tournament.rounds.some((r) => r.matches.some((m) => m.winner !== null)) && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-600 mb-3">Completed Rounds</h3>
            <div className="flex flex-col gap-3">
              {tournament.rounds
                .filter((r) => r.matches.every((m) => m.winner !== null || (m.contestant1 === null && m.contestant2 === null)))
                .map((round) => (
                  <div key={round.id} className="rounded-xl border border-gray-800 bg-gray-800/30 px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-300">{round.name}</span>
                      <span className="text-xs text-gray-600">
                        {round.matches.filter((m) => m.winner).length} match{round.matches.filter((m) => m.winner).length !== 1 ? "es" : ""}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {round.matches.filter((m) => m.winner).map((m) => (
                        <div key={m.id} className="flex flex-col items-start gap-0.5">
                          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-900/30 border border-indigo-700/30 px-2.5 py-0.5 text-xs font-medium text-indigo-300">
                            <span className="text-amber-400 mr-0.5">&#x1F451;</span>
                            {m.winner!.name}
                          </span>
                          {m.resolvedAt && (
                            <span className="text-xs text-gray-600 px-2.5">
                              {new Date(m.resolvedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                            </span>
                          )}
                        </div>
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
