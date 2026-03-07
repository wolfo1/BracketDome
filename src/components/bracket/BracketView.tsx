"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import MatchCard from "./MatchCard";
import { TournamentData, MatchData, RoundData } from "@/types/index";

const ROUND_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#3b82f6",
];

function getRoundColor(roundNumber: number): string {
  return ROUND_COLORS[(roundNumber - 1) % ROUND_COLORS.length];
}

// ─── Platform detection & link icons ─────────────────────────────────────────

function detectPlatform(url: string): "youtube" | "spotify" | "applemusic" | "other" {
  try {
    const host = new URL(url).hostname.replace("www.", "");
    if (host.includes("youtube.com") || host.includes("youtu.be")) return "youtube";
    if (host.includes("spotify.com")) return "spotify";
    if (host.includes("music.apple.com")) return "applemusic";
  } catch {}
  return "other";
}

function PlatformIcon({ url }: { url: string }) {
  const platform = detectPlatform(url);

  const base = "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80";

  if (platform === "youtube") return (
    <a href={url} target="_blank" rel="noopener noreferrer" className={`${base} bg-red-600 text-white`}>
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.7 15.5V8.5l6.3 3.5-6.3 3.5z"/>
      </svg>
      YouTube
    </a>
  );

  if (platform === "spotify") return (
    <a href={url} target="_blank" rel="noopener noreferrer" className={`${base} bg-[#1DB954] text-white`}>
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
      </svg>
      Spotify
    </a>
  );

  if (platform === "applemusic") return (
    <a href={url} target="_blank" rel="noopener noreferrer" className={`${base} bg-gradient-to-r from-pink-500 to-rose-500 text-white`}>
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.994 6.124a9.23 9.23 0 0 0-.24-2.19c-.317-1.31-1.062-2.31-2.18-3.043a5.022 5.022 0 0 0-1.877-.726 10.496 10.496 0 0 0-1.564-.15c-.04-.003-.083-.01-.124-.013H5.986c-.152.01-.303.017-.455.026C4.786.07 4.043.15 3.34.428 2.004.958 1.04 1.88.475 3.208a5.01 5.01 0 0 0-.37 1.548c-.06.34-.087.682-.1 1.025L0 6.124v11.754l.006.54c.01.28.028.56.054.837.063.676.23 1.33.507 1.947.485 1.07 1.24 1.866 2.28 2.405.5.26 1.044.42 1.612.5.62.088 1.252.12 1.885.124h11.28c.64-.004 1.28-.036 1.91-.128a5.59 5.59 0 0 0 1.897-.6c.85-.47 1.516-1.13 1.99-1.98.31-.558.5-1.156.593-1.785.088-.615.12-1.237.122-1.86V6.124zm-9.502 1.378l-4.5 2.598v5.196l-2.25-1.298V8.2L12 5.602l2.492 1.9z"/>
      </svg>
      Apple Music
    </a>
  );

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className={`${base} bg-gray-700 text-gray-200`}>
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
      </svg>
      Link
    </a>
  );
}

function ContestantLinks({ contestant }: { contestant: { name: string; links: { id: string; url: string }[] } }) {
  if (!contestant.links.length) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-gray-400">{contestant.name}</span>
      <div className="flex flex-wrap gap-2">
        {contestant.links.map((link) => (
          <PlatformIcon key={link.id} url={link.url} />
        ))}
      </div>
    </div>
  );
}

interface VoteBreakdownProps {
  match: MatchData;
  roundColor: string;
}

function VoteBreakdown({ match, roundColor }: VoteBreakdownProps) {
  const { contestant1, contestant2, winner, votes } = match;

  if (votes.length === 0) {
    return (
      <p className="text-gray-400 text-sm mt-4">No votes have been cast yet.</p>
    );
  }

  return (
    <div className="mt-4 flex flex-col gap-2">
      {votes.map((vote, i) => {
        const votedForWinner =
          winner !== null && vote.votedForId === winner.id;
        const dotColor = votedForWinner ? roundColor : "#6b7280";

        return (
          <div
            key={i}
            className="flex items-center justify-between rounded-md bg-gray-800 px-3 py-2 text-sm"
          >
            <span className="text-gray-200 font-medium">
              {vote.participantName}
            </span>
            <span className="flex items-center gap-2 text-gray-400">
              <span>voted for</span>
              <span className="font-semibold text-white">
                {vote.votedForName}
              </span>
              <span
                className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: dotColor }}
              />
            </span>
          </div>
        );
      })}
    </div>
  );
}

interface MatchDetailSheetProps {
  match: MatchData | null;
  round: RoundData | null;
  open: boolean;
  onClose: () => void;
}

function MatchDetailSheet({ match, round, open, onClose }: MatchDetailSheetProps) {
  if (!match || !round) return null;

  const roundColor = getRoundColor(round.number);
  const c1 = match.contestant1;
  const c2 = match.contestant2;
  const title =
    c1 && c2
      ? `${c1.name} vs ${c2.name}`
      : c1
      ? c1.name
      : c2
      ? c2.name
      : "TBD vs TBD";

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="bg-gray-900 border-gray-700 text-white w-full max-w-md"
      >
        <SheetHeader>
          <SheetTitle className="text-white text-lg">{title}</SheetTitle>
          <p className="text-sm" style={{ color: roundColor }}>
            {round.name}
          </p>
        </SheetHeader>

        {match.winner && (
          <div
            className="mt-4 rounded-lg px-4 py-3 text-white font-semibold flex items-center gap-2"
            style={{ backgroundColor: roundColor }}
          >
            <span>&#x1F451;</span>
            <span>Winner: {match.winner.name}</span>
          </div>
        )}

        {(c1?.links.length || c2?.links.length) ? (
          <div className="mt-5 flex flex-col gap-3">
            <h4 className="text-gray-300 text-sm font-semibold uppercase tracking-wide">Listen</h4>
            {c1 && <ContestantLinks contestant={c1} />}
            {c2 && <ContestantLinks contestant={c2} />}
          </div>
        ) : null}

        <div className="mt-6">
          <h4 className="text-gray-300 text-sm font-semibold uppercase tracking-wide mb-1">
            Vote Breakdown
          </h4>
          <VoteBreakdown match={match} roundColor={roundColor} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function BracketView({ tournament }: { tournament: TournamentData }) {
  const [selectedMatch, setSelectedMatch] = useState<MatchData | null>(null);
  const [selectedRound, setSelectedRound] = useState<RoundData | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const champion: string | null =
    tournament.status === "COMPLETED" && tournament.rounds.length > 0
      ? (() => {
          const lastRound = tournament.rounds[tournament.rounds.length - 1];
          const finalMatch = lastRound?.matches?.[0];
          return finalMatch?.winner?.name ?? null;
        })()
      : null;

  function handleMatchClick(match: MatchData, round: RoundData) {
    setSelectedMatch(match);
    setSelectedRound(round);
    setSheetOpen(true);
  }

  function handleShare() {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Champion Banner */}
      {champion && (
        <div className="w-full py-4 px-6 flex items-center justify-center gap-3 bg-gradient-to-r from-yellow-600 via-amber-400 to-yellow-600 text-gray-950 font-bold text-lg shadow-lg">
          <span>&#x1F3C6;</span>
          <span>Champion: {champion}</span>
          <span>&#x1F3C6;</span>
        </div>
      )}

      {/* Header row */}
      <div className="flex items-center justify-between px-6 pt-4 pb-2">
        <h2 className="text-xl font-bold text-white">{tournament.title}</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={handleShare}
          className="border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white"
        >
          {copied ? "Copied!" : "Share"}
        </Button>
      </div>

      {/* Bracket scroll area */}
      <div className="overflow-x-auto px-6 pb-8">
        <div className="flex gap-8 pt-2" style={{ minWidth: "max-content" }}>
          {tournament.rounds.map((round, roundIdx) => {
            const color = getRoundColor(round.number);
            return (
              <div key={round.id} className="flex flex-col" style={{ minWidth: "12rem" }}>
                {/* Round header */}
                <div
                  className="mb-4 rounded-md px-3 py-1.5 text-center text-sm font-semibold text-white"
                  style={{ backgroundColor: color }}
                >
                  {round.name}
                </div>

                {/* Matches column with connector lines */}
                <div className="flex flex-col gap-4 relative">
                  {round.matches.map((match, matchIdx) => {
                    const isLastRound = roundIdx === tournament.rounds.length - 1;
                    return (
                      <div key={match.id} className="flex items-center">
                        {/* Match card */}
                        <motion.div
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: roundIdx * 0.08 + matchIdx * 0.05 }}
                        >
                          <MatchCard
                            match={match}
                            roundColor={color}
                            onClick={() => handleMatchClick(match, round)}
                          />
                        </motion.div>

                        {/* Right connector line (not on last round) */}
                        {!isLastRound && (
                          <div className="flex flex-col items-start ml-0" style={{ width: "2rem" }}>
                            {/* Horizontal line going right */}
                            <div
                              className="border-t border-gray-600"
                              style={{ width: "2rem", marginTop: "1.25rem" }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Match detail sheet */}
      <MatchDetailSheet
        match={selectedMatch}
        round={selectedRound}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
      />
    </div>
  );
}
