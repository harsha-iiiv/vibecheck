"use client";
import { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AGENT_CONFIGS, VIBE_COLORS } from "@/lib/constants";
import type { AgentLogEntry, VibeMood } from "@/lib/types";

interface Props {
  logs: AgentLogEntry[];
  mood?: VibeMood;
}

function formatTime(ts: number): string {
  return new Date(ts * 1000).toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function getAgentColor(agent: string): string {
  const key = agent as keyof typeof AGENT_CONFIGS;
  return AGENT_CONFIGS[key]?.color ?? "#64748B";
}

const AGENT_EMOJIS: Record<string, string> = {
  MoodAgent:   "🧠",
  DJAgent:     "🎧",
  CrowdAgent:  "📡",
  VisualAgent: "🎨",
  SocialAgent: "🤝",
};

export function AgentFeed({ logs, mood = "chill" }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const colors = VIBE_COLORS[mood];

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = 0;
  }, [logs.length]);

  return (
    <div
      className="rounded-2xl flex flex-col h-full overflow-hidden"
      style={{
        background: "rgba(13,8,32,0.78)",
        backdropFilter: "blur(16px)",
        border: `1px solid ${colors.primary}20`,
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center gap-2 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
      >
        <motion.div
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: colors.primary }}
        />
        <span className="text-xs tracking-[0.3em] font-bold" style={{ color: colors.primary }}>
          AGENT FEED
        </span>
        <span
          className="ml-auto text-xs px-1.5 py-0.5 rounded-full"
          style={{ background: `${colors.primary}18`, color: colors.primary }}
        >
          {logs.length}
        </span>
      </div>

      {/* Log list */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5"
      >
        <AnimatePresence initial={false}>
          {logs.map((log) => {
            const color = getAgentColor(log.agent);
            const emoji = AGENT_EMOJIS[log.agent] ?? "🤖";
            return (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: 16, height: 0 }}
                animate={{ opacity: 1, x: 0, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="rounded-lg p-2.5"
                style={{
                  background: `${color}0C`,
                  borderLeft: `2px solid ${color}55`,
                }}
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs">{emoji}</span>
                  <span className="text-xs font-bold" style={{ color }}>
                    {log.agent}
                  </span>
                  {log.event_type === "negotiation" && (
                    <span
                      className="text-xs px-1.5 rounded-full"
                      style={{ background: "#F472B622", color: "#F472B6", fontSize: "0.6rem" }}
                    >
                      DEAL
                    </span>
                  )}
                  <span className="text-xs text-slate-600 ml-auto font-mono">{formatTime(log.timestamp)}</span>
                </div>
                <p className="text-xs leading-snug break-words" style={{ color: "rgba(226,232,240,0.7)" }}>
                  {log.message}
                </p>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {logs.length === 0 && (
          <div className="text-center py-8 text-xs text-slate-600">
            <div className="text-2xl mb-2">👁️</div>
            Awaiting agent activity...
          </div>
        )}
      </div>
    </div>
  );
}
