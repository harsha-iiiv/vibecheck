"use client";
import { motion, AnimatePresence } from "framer-motion";
import { VIBE_COLORS } from "@/lib/constants";
import type { VibeMood } from "@/lib/types";

interface Props {
  content: string;
  promptType: string;
  mood?: VibeMood;
}

const TYPE_COLORS: Record<string, string> = {
  icebreaker: "#A78BFA",
  challenge:  "#F472B6",
  poll:       "#22D3EE",
  announcement: "#FCD34D",
};

const TYPE_LABELS: Record<string, string> = {
  icebreaker:   "ICE BREAKER",
  challenge:    "CROWD CHALLENGE",
  poll:         "CROWD POLL",
  announcement: "ANNOUNCEMENT",
};

const TYPE_ICONS: Record<string, string> = {
  icebreaker:   "🧊",
  challenge:    "⚡",
  poll:         "📊",
  announcement: "📢",
};

export function SocialCard({ content, promptType, mood = "chill" }: Props) {
  const color = TYPE_COLORS[promptType] ?? VIBE_COLORS[mood].primary;
  const label = TYPE_LABELS[promptType] ?? promptType.toUpperCase();
  const icon = TYPE_ICONS[promptType] ?? "✨";

  return (
    <div
      className="rounded-2xl overflow-hidden flex-1"
      style={{
        background: "rgba(13,8,32,0.78)",
        backdropFilter: "blur(16px)",
        border: `1px solid ${color}28`,
        boxShadow: `0 0 20px ${color}14, inset 0 0 20px ${color}06`,
      }}
    >
      <div className="p-4">
        {/* Type badge */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-base">{icon}</span>
          <span
            className="text-xs tracking-[0.25em] font-black"
            style={{ color }}
          >
            {label}
          </span>
        </div>

        <AnimatePresence mode="wait">
          <motion.p
            key={content}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.4 }}
            className="text-sm leading-relaxed"
            style={{ color: "#E2E8F0" }}
          >
            {content || "Warming up the crowd..."}
          </motion.p>
        </AnimatePresence>

        {/* Decorative line */}
        <motion.div
          className="mt-3 h-px"
          style={{ background: `linear-gradient(to right, ${color}44, transparent)` }}
          animate={{ scaleX: [0.3, 1, 0.3] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    </div>
  );
}
