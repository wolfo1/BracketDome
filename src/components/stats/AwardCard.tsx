"use client";

import { motion } from "framer-motion";
import { Award } from "@/lib/stats";

interface AwardCardProps {
  award: Award;
}

const GRADIENT_PRESETS: Record<string, { border: string; bg: string; title: string }> = {
  "🥇": {
    border: "from-yellow-400 via-amber-400 to-orange-400",
    bg: "from-yellow-950/60 to-amber-950/40",
    title: "text-yellow-300",
  },
  "🥈": {
    border: "from-slate-300 via-gray-300 to-zinc-400",
    bg: "from-slate-900/60 to-zinc-900/40",
    title: "text-slate-300",
  },
  "🙃": {
    border: "from-orange-500 via-red-500 to-pink-500",
    bg: "from-orange-950/60 to-red-950/40",
    title: "text-orange-300",
  },
  "❤️": {
    border: "from-pink-500 via-rose-400 to-red-400",
    bg: "from-pink-950/60 to-rose-950/40",
    title: "text-pink-300",
  },
  "🤝": {
    border: "from-emerald-500 via-teal-400 to-cyan-400",
    bg: "from-emerald-950/60 to-teal-950/40",
    title: "text-emerald-300",
  },
  "⚡": {
    border: "from-violet-500 via-purple-500 to-fuchsia-500",
    bg: "from-violet-950/60 to-purple-950/40",
    title: "text-violet-300",
  },
  "🤔": {
    border: "from-sky-500 via-blue-400 to-indigo-400",
    bg: "from-sky-950/60 to-blue-950/40",
    title: "text-sky-300",
  },
  "🤷": {
    border: "from-fuchsia-500 via-purple-400 to-indigo-400",
    bg: "from-fuchsia-950/60 to-purple-950/40",
    title: "text-fuchsia-300",
  },
};

const DEFAULT_PRESET = {
  border: "from-indigo-500 via-purple-500 to-pink-500",
  bg: "from-indigo-950/60 to-purple-950/40",
  title: "text-indigo-300",
};

export function AwardCard({ award }: AwardCardProps) {
  const preset = GRADIENT_PRESETS[award.emoji] ?? DEFAULT_PRESET;

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className="relative w-full max-w-xs"
    >
      {/* Gradient border via pseudo-wrapper */}
      <div
        className={`rounded-2xl p-px bg-gradient-to-br ${preset.border} shadow-lg`}
      >
        <div
          className={`rounded-2xl bg-gradient-to-br ${preset.bg} backdrop-blur-sm bg-gray-900/80 p-4 flex flex-col gap-2`}
        >
          {/* Emoji */}
          <div className="text-4xl leading-none select-none">{award.emoji}</div>

          {/* Title */}
          <h3 className={`text-sm font-bold tracking-wide ${preset.title}`}>
            {award.title}
          </h3>

          {/* Description */}
          <p className="text-xs text-gray-400 leading-relaxed">
            {award.description}
          </p>

          {/* Participants */}
          <div className="flex flex-wrap gap-1.5 mt-1">
            {award.participantNames.map((name, i) => (
              <span
                key={i}
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-gradient-to-r ${preset.border} text-white shadow-sm`}
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
