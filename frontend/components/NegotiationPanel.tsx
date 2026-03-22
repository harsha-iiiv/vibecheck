"use client";
import { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AGENT_CONFIGS, VIBE_COLORS } from "@/lib/constants";
import type { NegotiationEntry, VibeMood } from "@/lib/types";

interface Props {
  negotiations: NegotiationEntry[];
  mood?: VibeMood;
}

const AGENT_EMOJIS: Record<string, string> = {
  MoodAgent:   "🧠",
  DJAgent:     "🎧",
  CrowdAgent:  "📡",
  VisualAgent: "🎨",
  SocialAgent: "🤝",
};

function agentColor(name: string): string {
  return AGENT_CONFIGS[name as keyof typeof AGENT_CONFIGS]?.color ?? "#64748B";
}

function formatTime(ts: number): string {
  return new Date(ts * 1000).toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit" });
}

export function NegotiationPanel({ negotiations, mood = "chill" }: Props) {
  const colors = VIBE_COLORS[mood];
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [negotiations.length]);

  return (
    <div
      className="rounded-2xl flex flex-col overflow-hidden"
      style={{
        background: "rgba(13,8,32,0.82)",
        backdropFilter: "blur(16px)",
        border: `1px solid ${colors.primary}20`,
        height: "100%",
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-2.5 flex items-center gap-2 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
      >
        <motion.span
          animate={{ rotate: [0, 15, -15, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="text-sm"
        >
          🤝
        </motion.span>
        <span className="text-xs tracking-[0.3em] font-bold" style={{ color: colors.primary }}>
          AGENT DRAMA
        </span>
        <span
          className="ml-auto text-xs px-1.5 py-0.5 rounded-full"
          style={{ background: `${colors.primary}18`, color: colors.primary }}
        >
          {negotiations.length}
        </span>
      </div>

      {/* Negotiations list */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
        <AnimatePresence initial={false}>
          {negotiations.slice(0, 10).map((neg, idx) => {
            const fromColor = agentColor(neg.from_agent);
            const toColor = agentColor(neg.to_agent);
            const fromEmoji = AGENT_EMOJIS[neg.from_agent] ?? "🤖";
            const toEmoji = AGENT_EMOJIS[neg.to_agent] ?? "🤖";

            return (
              <motion.div
                key={`${neg.timestamp}-${idx}`}
                initial={{ opacity: 0, y: -12, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.25 }}
                className="space-y-1.5"
              >
                {/* FROM bubble */}
                <div className="flex items-start gap-2">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-sm"
                    style={{ background: `${fromColor}22`, border: `1px solid ${fromColor}44` }}
                  >
                    {fromEmoji}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-xs font-bold" style={{ color: fromColor }}>
                        {neg.from_agent}
                      </span>
                      <span className="text-xs text-slate-600 font-mono">{formatTime(neg.timestamp)}</span>
                    </div>
                    <div
                      className="rounded-xl rounded-tl-none px-3 py-2 text-xs leading-snug"
                      style={{
                        background: `${fromColor}15`,
                        border: `1px solid ${fromColor}30`,
                        color: "rgba(226,232,240,0.85)",
                      }}
                    >
                      {neg.proposal}
                    </div>
                  </div>
                </div>

                {/* TO reply indicator */}
                <div className="flex items-center gap-2 pl-9">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs"
                    style={{ background: `${toColor}22`, border: `1px solid ${toColor}44` }}
                  >
                    {toEmoji}
                  </div>
                  <div
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs"
                    style={{
                      background: neg.agreed ? "#34D39918" : "#EF444418",
                      border: `1px solid ${neg.agreed ? "#34D39944" : "#EF444444"}`,
                      color: neg.agreed ? "#34D399" : "#EF4444",
                    }}
                  >
                    <span>{neg.agreed ? "✓" : "✗"}</span>
                    <span className="font-bold">{neg.to_agent}</span>
                    <span className="opacity-70">{neg.agreed ? "agrees" : "overrides"}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {negotiations.length === 0 && (
          <div className="text-center py-6 text-xs text-slate-600">
            <div className="text-2xl mb-2">🕊️</div>
            No drama yet...
          </div>
        )}
      </div>
    </div>
  );
}
