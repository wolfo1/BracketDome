"use client";

import { useState } from "react";
import { PairwiseCorrelation, Award } from "@/lib/stats";

interface CorrelationHeatmapProps {
  correlations: PairwiseCorrelation[];
  awards: Award[];
}

// HSL interpolation: red (0°) → yellow (60°) → green (120°)
function correlationToColor(value: number): string {
  const hue = Math.round(value * 120); // 0 = red, 120 = green
  return `hsl(${hue}, 72%, 38%)`;
}

function correlationToTextColor(value: number): string {
  // Light text for dark cells (low/mid), darker for bright cells (high)
  return value > 0.75 ? "#052e16" : "#f9fafb";
}

// Build a canonical pair key (always smaller index first)
function pairKey(a: string, b: string): string {
  return a < b ? `${a}||${b}` : `${b}||${a}`;
}

// Determine the award title for the dynamic duo / mismatch pairs
function buildSpecialPairs(awards: Award[]): {
  dynamicDuoPair: string | null;
  mismatchPair: string | null;
} {
  let dynamicDuoPair: string | null = null;
  let mismatchPair: string | null = null;

  for (const award of awards) {
    if (award.title === "Dynamic Duo" && award.participantIds.length === 2) {
      dynamicDuoPair = pairKey(award.participantIds[0], award.participantIds[1]);
    }
    if (award.title === "The Mismatch" && award.participantIds.length === 2) {
      mismatchPair = pairKey(award.participantIds[0], award.participantIds[1]);
    }
  }

  return { dynamicDuoPair, mismatchPair };
}

interface TooltipState {
  text: string;
  x: number;
  y: number;
}

export function CorrelationHeatmap({ correlations, awards }: CorrelationHeatmapProps) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  // Collect all unique participants, preserving encounter order
  const participantMap = new Map<string, string>(); // id -> name
  for (const c of correlations) {
    if (!participantMap.has(c.participant1Id)) {
      participantMap.set(c.participant1Id, c.participant1Name);
    }
    if (!participantMap.has(c.participant2Id)) {
      participantMap.set(c.participant2Id, c.participant2Name);
    }
  }
  const participants = Array.from(participantMap.entries()); // [id, name][]

  // Build correlation lookup by pair key
  const corrMap = new Map<string, PairwiseCorrelation>();
  for (const c of correlations) {
    corrMap.set(pairKey(c.participant1Id, c.participant2Id), c);
  }

  const { dynamicDuoPair, mismatchPair } = buildSpecialPairs(awards);

  if (participants.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
        Not enough data to display a heatmap.
      </div>
    );
  }

  const n = participants.length;
  // Cell size adapts to number of participants
  const cellSize = n <= 6 ? 64 : n <= 10 ? 48 : 36;
  const labelWidth = 120;
  const fontSize = cellSize >= 48 ? 13 : 11;

  return (
    <div className="relative w-full overflow-x-auto">
      {/* Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none fixed z-50 rounded-lg border border-gray-700 bg-gray-900/95 px-3 py-1.5 text-xs text-white shadow-xl whitespace-nowrap"
          style={{ left: tooltip.x + 12, top: tooltip.y - 36 }}
        >
          {tooltip.text}
        </div>
      )}

      <div className="inline-block min-w-full">
        {/* Column headers */}
        <div
          className="flex"
          style={{ paddingLeft: labelWidth }}
        >
          {participants.map(([, name]) => (
            <div
              key={name}
              style={{ width: cellSize, minWidth: cellSize }}
              className="flex items-end justify-center pb-1"
            >
              <span
                className="text-gray-400 font-medium truncate block"
                style={{
                  fontSize: fontSize - 1,
                  writingMode: "vertical-rl",
                  transform: "rotate(180deg)",
                  maxHeight: 80,
                }}
              >
                {name}
              </span>
            </div>
          ))}
        </div>

        {/* Rows */}
        {participants.map(([rowId, rowName], rowIdx) => (
          <div key={rowId} className="flex items-center">
            {/* Row label */}
            <div
              style={{ width: labelWidth, minWidth: labelWidth }}
              className="pr-2 text-right"
            >
              <span
                className="text-gray-300 font-medium truncate block"
                style={{ fontSize }}
              >
                {rowName}
              </span>
            </div>

            {/* Cells */}
            {participants.map(([colId, colName], colIdx) => {
              const isDiagonal = rowIdx === colIdx;

              if (isDiagonal) {
                return (
                  <div
                    key={colId}
                    style={{ width: cellSize, height: cellSize, minWidth: cellSize }}
                    className="flex items-center justify-center rounded-sm m-px bg-gray-800 text-gray-600 text-xs font-semibold select-none"
                  >
                    —
                  </div>
                );
              }

              const key = pairKey(rowId, colId);
              const corr = corrMap.get(key);

              if (!corr) {
                return (
                  <div
                    key={colId}
                    style={{ width: cellSize, height: cellSize, minWidth: cellSize }}
                    className="flex items-center justify-center rounded-sm m-px bg-gray-800/50 text-gray-700 text-xs select-none"
                  >
                    N/A
                  </div>
                );
              }

              const isDD = key === dynamicDuoPair;
              const isMM = key === mismatchPair;
              const pct = Math.round(corr.correlation * 100);
              const bg = correlationToColor(corr.correlation);
              const textColor = correlationToTextColor(corr.correlation);

              return (
                <div
                  key={colId}
                  style={{
                    width: cellSize,
                    height: cellSize,
                    minWidth: cellSize,
                    backgroundColor: bg,
                    color: textColor,
                    fontSize,
                    outline: isDD
                      ? "2px solid #f472b6"
                      : isMM
                      ? "2px solid #f97316"
                      : "none",
                    outlineOffset: "-2px",
                  }}
                  className="flex items-center justify-center rounded-sm m-px font-semibold cursor-default select-none transition-opacity hover:opacity-90"
                  onMouseMove={(e) =>
                    setTooltip({
                      text: `${rowName} & ${colName}: ${pct}% agreement${isDD ? " ❤️ Dynamic Duo" : ""}${isMM ? " ⚡ Mismatch" : ""}`,
                      x: e.clientX,
                      y: e.clientY,
                    })
                  }
                  onMouseLeave={() => setTooltip(null)}
                >
                  {pct}%
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-3 text-xs text-gray-400">
        <span>Agreement:</span>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: correlationToColor(0) }} />
          <span>0%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: correlationToColor(0.5) }} />
          <span>50%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: correlationToColor(1) }} />
          <span>100%</span>
        </div>
        <span className="ml-2 border-l border-l-pink-500 pl-2">❤️ Dynamic Duo</span>
        <span className="border-l border-l-orange-500 pl-2">⚡ Mismatch</span>
      </div>
    </div>
  );
}
