"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { RoundData } from "@/types";

interface RoundBreakdownChartProps {
  rounds: RoundData[];
}

// For each match, compute how many votes each contestant received
interface MatchBarDatum {
  matchLabel: string;
  contestant1Name: string;
  contestant2Name: string;
  contestant1Votes: number;
  contestant2Votes: number;
  totalVotes: number;
}

function buildMatchData(rounds: RoundData[]): {
  roundName: string;
  matches: MatchBarDatum[];
}[] {
  return rounds
    .filter((r) => r.matches.some((m) => m.votes.length > 0))
    .map((round) => ({
      roundName: round.name,
      matches: round.matches
        .filter((m) => m.contestant1 || m.contestant2)
        .map((match) => {
          const c1Name = match.contestant1?.name ?? "TBD";
          const c2Name = match.contestant2?.name ?? "TBD";

          let c1Votes = 0;
          let c2Votes = 0;
          for (const vote of match.votes) {
            if (match.contestant1 && vote.votedForId === match.contestant1.id) {
              c1Votes++;
            } else if (
              match.contestant2 &&
              vote.votedForId === match.contestant2.id
            ) {
              c2Votes++;
            }
          }

          return {
            matchLabel: `#${match.position + 1}`,
            contestant1Name: c1Name,
            contestant2Name: c2Name,
            contestant1Votes: c1Votes,
            contestant2Votes: c2Votes,
            totalVotes: c1Votes + c2Votes,
          };
        }),
    }));
}

const C1_COLOR = "#818cf8"; // indigo-400
const C2_COLOR = "#f472b6"; // pink-400

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: MatchBarDatum }>;
  label?: string;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const match = payload[0].payload as MatchBarDatum;

  return (
    <div className="rounded-xl border border-gray-700 bg-gray-900/95 px-3 py-2 shadow-xl text-sm space-y-1">
      <p className="font-bold text-white text-xs uppercase tracking-wide">
        Match {match.matchLabel}
      </p>
      <div className="flex items-center gap-2">
        <span
          className="inline-block w-2.5 h-2.5 rounded-sm"
          style={{ backgroundColor: C1_COLOR }}
        />
        <span className="text-gray-300">{match.contestant1Name}</span>
        <span className="ml-auto font-bold text-indigo-300">
          {match.contestant1Votes}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span
          className="inline-block w-2.5 h-2.5 rounded-sm"
          style={{ backgroundColor: C2_COLOR }}
        />
        <span className="text-gray-300">{match.contestant2Name}</span>
        <span className="ml-auto font-bold text-pink-300">
          {match.contestant2Votes}
        </span>
      </div>
      <p className="text-gray-500 text-xs pt-0.5 border-t border-gray-800">
        {match.totalVotes} total votes
      </p>
    </div>
  );
}

interface RoundChartProps {
  roundName: string;
  matches: MatchBarDatum[];
}

function RoundChart({ roundName, matches }: RoundChartProps) {
  const chartHeight = Math.max(220, matches.length * 80);

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-4">
      <h3 className="text-sm font-semibold text-gray-300 mb-4 uppercase tracking-widest">
        {roundName}
      </h3>
      <div style={{ height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={matches}
            margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
            barCategoryGap="28%"
            barGap={3}
          >
            <CartesianGrid
              vertical={false}
              stroke="#374151"
              strokeDasharray="3 3"
            />
            <XAxis
              dataKey="matchLabel"
              tick={{ fill: "#9ca3af", fontSize: 12 }}
              axisLine={{ stroke: "#374151" }}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: "#9ca3af", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={28}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
            />
            <Legend
              formatter={(value: string) =>
                value === "contestant1Votes" ? "Contestant 1" : "Contestant 2"
              }
              wrapperStyle={{ fontSize: 12, color: "#9ca3af" }}
            />
            <Bar
              dataKey="contestant1Votes"
              name="contestant1Votes"
              fill={C1_COLOR}
              radius={[4, 4, 0, 0]}
              isAnimationActive
            />
            <Bar
              dataKey="contestant2Votes"
              name="contestant2Votes"
              fill={C2_COLOR}
              radius={[4, 4, 0, 0]}
              isAnimationActive
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Match key: show who is in each match slot */}
      <div className="mt-3 grid grid-cols-1 gap-1">
        {matches.map((m) => (
          <div key={m.matchLabel} className="flex items-center gap-2 text-xs text-gray-500">
            <span className="font-mono text-gray-600 w-6 shrink-0">
              {m.matchLabel}
            </span>
            <span className="text-indigo-400">{m.contestant1Name}</span>
            <span className="text-gray-700">vs</span>
            <span className="text-pink-400">{m.contestant2Name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RoundBreakdownChart({ rounds }: RoundBreakdownChartProps) {
  const [selectedRound, setSelectedRound] = useState<string | null>(null);

  const roundsData = buildMatchData(rounds);

  if (roundsData.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
        No voted matches to display yet.
      </div>
    );
  }

  const displayedRounds =
    selectedRound === null
      ? roundsData
      : roundsData.filter((r) => r.roundName === selectedRound);

  return (
    <div className="space-y-4">
      {/* Round filter tabs */}
      {roundsData.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedRound(null)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              selectedRound === null
                ? "bg-indigo-600 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200"
            }`}
          >
            All Rounds
          </button>
          {roundsData.map((r) => (
            <button
              key={r.roundName}
              onClick={() =>
                setSelectedRound(
                  selectedRound === r.roundName ? null : r.roundName
                )
              }
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                selectedRound === r.roundName
                  ? "bg-purple-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200"
              }`}
            >
              {r.roundName}
            </button>
          ))}
        </div>
      )}

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {displayedRounds.map((r) => (
          <RoundChart key={r.roundName} roundName={r.roundName} matches={r.matches} />
        ))}
      </div>
    </div>
  );
}
