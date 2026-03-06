"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import ReactConfetti from "react-confetti";
import { Button } from "@/components/ui/button";

interface ChampionRevealProps {
  championName: string;
  onClose: () => void;
}

export default function ChampionReveal({ championName, onClose }: ChampionRevealProps) {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [confettiActive, setConfettiActive] = useState(true);

  useEffect(() => {
    function updateSize() {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Stop generating new confetti pieces after 5 seconds, but let existing ones fall
  useEffect(() => {
    const timer = setTimeout(() => setConfettiActive(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      {/* Confetti layer */}
      {dimensions.width > 0 && (
        <ReactConfetti
          width={dimensions.width}
          height={dimensions.height}
          numberOfPieces={confettiActive ? 250 : 0}
          recycle={confettiActive}
          colors={["#f59e0b", "#fbbf24", "#fde68a", "#d97706", "#ffffff", "#6366f1"]}
          style={{ position: "fixed", top: 0, left: 0, pointerEvents: "none" }}
        />
      )}

      {/* Champion card */}
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.6, opacity: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        className="relative mx-4 max-w-md w-full rounded-2xl shadow-2xl overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #78350f 0%, #b45309 30%, #f59e0b 60%, #fde68a 80%, #f59e0b 100%)",
        }}
      >
        {/* Inner content */}
        <div className="px-8 py-10 flex flex-col items-center gap-4 text-center">
          {/* Trophy emoji */}
          <motion.div
            initial={{ rotate: -15, scale: 0.8 }}
            animate={{ rotate: [0, -8, 8, -8, 8, 0], scale: 1 }}
            transition={{ delay: 0.3, duration: 1, ease: "easeInOut" }}
            className="text-6xl leading-none select-none"
          >
            &#x1F3C6;
          </motion.div>

          {/* Title */}
          <h2 className="text-2xl font-extrabold text-amber-900 uppercase tracking-widest drop-shadow-sm">
            Tournament Champion!
          </h2>

          {/* Champion name */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-4xl font-black tracking-tight drop-shadow-md"
            style={{
              color: "#1c0a00",
              textShadow: "0 2px 8px rgba(251,191,36,0.6)",
            }}
          >
            {championName}
          </motion.p>

          {/* Decorative stars */}
          <div className="flex gap-2 text-2xl select-none">
            <span>&#x2B50;</span>
            <span>&#x2B50;</span>
            <span>&#x2B50;</span>
          </div>

          {/* Close button */}
          <Button
            onClick={onClose}
            className="mt-2 bg-amber-900 hover:bg-amber-800 text-amber-100 font-bold px-8 py-2 rounded-full shadow-lg transition-colors"
          >
            Close
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
