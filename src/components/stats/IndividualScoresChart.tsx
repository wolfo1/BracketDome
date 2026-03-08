"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { ParticipantScore, Award } from "@/lib/stats";

interface IndividualScoresChartProps {
  scores: ParticipantScore[];
  awards: Award[];
}

// Build a lookup: participantId -> array of emojis they hold
function buildAwardEmojiMap(awards: Award[]): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const award of awards) {
    for (const id of award.participantIds) {
      if (!map[id]) map[id] = [];
      map[id].push(award.emoji);
    }
  }
  return map;
}

// Interpolate a colour along the purple->pink gradient based on the bar index
function barColor(index: number, total: number): string {
  // purple #a855f7 → pink #ec4899
  const t = total <= 1 ? 0 : index / (total - 1);
  const r = Math.round(168 + t * (236 - 168));
  const g = Math.round(85 + t * (72 - 85));
  const b = Math.round(247 + t * (153 - 247));
  return `rgb(${r},${g},${b})`;
}

interface CustomLabelProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  value?: number;
}

function CustomLabel({ x = 0, y = 0, width = 0, height = 0, value = 0 }: CustomLabelProps) {
  const pct = `${Math.round(value * 100)}%`;
  return (
    <text
      x={x + width + 6}
      y={y + height / 2}
      fill="#d1d5db"
      fontSize={12}
      fontWeight={600}
      dominantBaseline="middle"
    >
      {pct}
    </text>
  );
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: { participantName: string; agreementCount: number; totalVotes: number } }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-xl border border-gray-700 bg-gray-900/95 px-3 py-2 shadow-xl text-sm">
      <p className="font-semibold text-white">{d.participantName}</p>
      <p className="text-gray-400">
        {d.agreementCount} / {d.totalVotes} with majority
      </p>
      <p className="text-purple-300 font-bold">
        {Math.round(payload[0].value * 100)}%
      </p>
    </div>
  );
}

export function IndividualScoresChart({ scores, awards }: IndividualScoresChartProps) {
  const awardEmojis = buildAwardEmojiMap(awards);

  // Sort descending by score (highest first) and build chart data
  const sorted = [...scores].sort((a, b) => b.score - a.score);
  const data = sorted.map((s) => ({
    ...s,
    // Append award emojis to the displayed name
    displayName: [s.participantName, ...(awardEmojis[s.participantId] ?? [])].join(" "),
  }));

  // Approximate height: at least 300px, 48px per row
  const chartHeight = Math.max(300, data.length * 52);

  // Reserve space on the left for the longest name; cap tighter so it fits on mobile
  const longestName = data.reduce((max, d) => Math.max(max, d.displayName.length), 0);
  const yAxisWidth = Math.min(Math.max(longestName * 7, 60), 130);

  return (
    <div className="w-full" style={{ height: chartHeight }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 8, right: 44, left: 8, bottom: 8 }}
        >
          <defs>
            <linearGradient id="scoreGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
          </defs>

          <CartesianGrid
            horizontal={false}
            stroke="#374151"
            strokeDasharray="3 3"
          />

          <XAxis
            type="number"
            domain={[0, 1]}
            tickCount={6}
            tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
            tick={{ fill: "#9ca3af", fontSize: 11 }}
            axisLine={{ stroke: "#374151" }}
            tickLine={false}
          />

          <YAxis
            type="category"
            dataKey="displayName"
            width={yAxisWidth}
            tick={{ fill: "#e5e7eb", fontSize: 12, fontWeight: 500 }}
            axisLine={false}
            tickLine={false}
          />

          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />

          <Bar
            dataKey="score"
            radius={[0, 6, 6, 0]}
            isAnimationActive
            label={<CustomLabel />}
          >
            {data.map((_, index) => (
              <Cell
                key={index}
                fill={barColor(index, data.length)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
