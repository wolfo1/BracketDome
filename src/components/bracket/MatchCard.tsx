"use client";

import { motion } from "framer-motion";
import { MatchData } from "@/types/index";

interface MatchCardProps {
  match: MatchData;
  roundColor: string;
  onClick: () => void;
}

function getVoteCount(match: MatchData, contestantId: string): number {
  return match.votes.filter((v) => v.votedForId === contestantId).length;
}

export default function MatchCard({ match, roundColor, onClick }: MatchCardProps) {
  const { contestant1, contestant2, winner, votes } = match;

  const hasAnyContestant = contestant1 !== null || contestant2 !== null;
  const isBye =
    (contestant1 !== null && contestant2 === null) ||
    (contestant1 === null && contestant2 !== null);
  const byeContestant = contestant1 ?? contestant2;

  const isWinner1 = winner !== null && contestant1 !== null && winner.id === contestant1.id;
  const isWinner2 = winner !== null && contestant2 !== null && winner.id === contestant2.id;

  const votes1 = contestant1 ? getVoteCount(match, contestant1.id) : 0;
  const votes2 = contestant2 ? getVoteCount(match, contestant2.id) : 0;

  if (!hasAnyContestant) {
    return (
      <motion.div
        whileHover={{ scale: 1.03 }}
        onClick={onClick}
        className="cursor-pointer rounded-lg border border-gray-700 bg-gray-900 p-3 w-48 select-none"
      >
        <div className="flex flex-col gap-1">
          <div className="rounded px-2 py-1 text-sm text-gray-500 bg-gray-800">TBD</div>
          <div className="rounded px-2 py-1 text-sm text-gray-500 bg-gray-800">TBD</div>
        </div>
      </motion.div>
    );
  }

  if (isBye && byeContestant) {
    return (
      <motion.div
        whileHover={{ scale: 1.03 }}
        onClick={onClick}
        className="cursor-pointer rounded-lg border border-gray-700 bg-gray-900 p-3 w-48 select-none"
      >
        <div className="flex flex-col gap-1">
          <div
            className="rounded px-2 py-1 text-sm font-semibold text-white flex items-center justify-between"
            style={{ backgroundColor: roundColor }}
          >
            <span>{byeContestant.name}</span>
            <span className="text-xs ml-1">&#x1F451;</span>
          </div>
          <div className="rounded px-2 py-1 text-sm text-gray-400 bg-gray-800 flex items-center justify-between">
            <span>BYE</span>
            <span className="text-xs text-gray-500 ml-1">auto-advance</span>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      onClick={onClick}
      className="cursor-pointer rounded-lg border border-gray-700 bg-gray-900 p-3 w-48 select-none"
    >
      <div className="flex flex-col gap-1">
        {/* Contestant 1 */}
        <div
          className={`rounded px-2 py-1 text-sm font-semibold flex items-center justify-between transition-colors`}
          style={
            isWinner1
              ? { backgroundColor: roundColor, color: "#fff" }
              : { backgroundColor: "#1f2937", color: "#f9fafb" }
          }
        >
          <span className="truncate max-w-[7rem]">
            {contestant1 ? contestant1.name : "TBD"}
          </span>
          <span className="flex items-center gap-1 ml-1 shrink-0">
            {isWinner1 && <span>&#x1F451;</span>}
            {votes.length > 0 && contestant1 && (
              <span className="text-xs font-normal opacity-80">
                {votes1}v
              </span>
            )}
          </span>
        </div>

        {/* Divider */}
        <div className="text-center text-xs text-gray-600 leading-none">vs</div>

        {/* Contestant 2 */}
        <div
          className={`rounded px-2 py-1 text-sm font-semibold flex items-center justify-between transition-colors`}
          style={
            isWinner2
              ? { backgroundColor: roundColor, color: "#fff" }
              : { backgroundColor: "#1f2937", color: "#f9fafb" }
          }
        >
          <span className="truncate max-w-[7rem]">
            {contestant2 ? contestant2.name : "TBD"}
          </span>
          <span className="flex items-center gap-1 ml-1 shrink-0">
            {isWinner2 && <span>&#x1F451;</span>}
            {votes.length > 0 && contestant2 && (
              <span className="text-xs font-normal opacity-80">
                {votes2}v
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Vote summary footer */}
      {votes.length > 0 && (
        <div className="mt-2 text-xs text-gray-500 text-center">
          {votes.length} vote{votes.length !== 1 ? "s" : ""}
        </div>
      )}
    </motion.div>
  );
}
