"use client";
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { API_BASE } from "@/lib/constants";
import type { VibeMood, ReactionEmoji } from "@/lib/types";

const REACTIONS: { emoji: ReactionEmoji; label: string; color: string }[] = [
  { emoji: "🔥", label: "HYPE",  color: "#F97316" },
  { emoji: "⚡", label: "PEAK",  color: "#FACC15" },
  { emoji: "🎉", label: "PARTY", color: "#A78BFA" },
  { emoji: "❄️", label: "CHILL", color: "#67E8F9" },
  { emoji: "💀", label: "DEAD",  color: "#94A3B8" },
];

interface FloatingEmoji {
  id: number;
  emoji: string;
  x: number;
}

interface Props {
  mood?: VibeMood;
  onReaction?: (emoji: ReactionEmoji) => void;
}

let _id = 0;

export function CrowdReactions({ mood = "chill", onReaction }: Props) {
  const [floating, setFloating] = useState<FloatingEmoji[]>([]);
  const [pressed, setPressed] = useState<ReactionEmoji | null>(null);

  const fire = useCallback(async (emoji: ReactionEmoji) => {
    // Spawn 3 floating particles at random x positions
    const newFloaters: FloatingEmoji[] = Array.from({ length: 3 }, () => ({
      id: _id++,
      emoji,
      x: 10 + Math.random() * 80, // percent
    }));
    setFloating((prev) => [...prev, ...newFloaters]);
    setPressed(emoji);
    setTimeout(() => setPressed(null), 200);

    // Remove after animation completes
    setTimeout(() => {
      setFloating((prev) =>
        prev.filter((f) => !newFloaters.some((n) => n.id === f.id))
      );
    }, 1800);

    // Send to backend
    try {
      await fetch(`${API_BASE}/reaction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });
    } catch {/* non-blocking */}

    onReaction?.(emoji);
  }, [onReaction]);

  return (
    <div className="relative flex items-center justify-center gap-2 py-1">
      {/* Floating emoji particles */}
      <AnimatePresence>
        {floating.map((f) => (
          <motion.div
            key={f.id}
            className="pointer-events-none fixed text-2xl select-none z-50"
            style={{ left: `${f.x}vw`, bottom: "5rem" }}
            initial={{ opacity: 1, y: 0, scale: 1 }}
            animate={{ opacity: 0, y: -180, scale: 1.6 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.6, ease: "easeOut" }}
          >
            {f.emoji}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Reaction buttons */}
      {REACTIONS.map(({ emoji, label, color }) => (
        <motion.button
          key={emoji}
          onClick={() => fire(emoji as ReactionEmoji)}
          whileHover={{ scale: 1.15, y: -2 }}
          whileTap={{ scale: 0.88 }}
          animate={pressed === emoji ? { scale: [1, 1.3, 0.9, 1] } : {}}
          transition={{ duration: 0.18 }}
          suppressHydrationWarning
          className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl cursor-pointer select-none"
          style={{
            background: pressed === emoji ? `${color}28` : "rgba(255,255,255,0.04)",
            border: `1px solid ${pressed === emoji ? color + "66" : "rgba(255,255,255,0.08)"}`,
            transition: "background 0.15s, border 0.15s",
          }}
        >
          <span className="text-xl leading-none">{emoji}</span>
          <span
            className="text-[9px] font-bold tracking-widest"
            style={{ color: pressed === emoji ? color : "rgba(148,163,184,0.6)" }}
          >
            {label}
          </span>
        </motion.button>
      ))}
    </div>
  );
}
