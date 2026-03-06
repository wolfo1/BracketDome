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
