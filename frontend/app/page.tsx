"use client";
import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useVibeState } from "@/hooks/useVibeState";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useTTS } from "@/hooks/useTTS";
import { VibeCanvas } from "@/components/VibeCanvas";
import { VibeMeter } from "@/components/VibeMeter";
import { MusicPanel } from "@/components/MusicPanel";
import { SocialCard } from "@/components/SocialCard";
import { AgentFeed } from "@/components/AgentFeed";
import { VoiceInterface } from "@/components/VoiceInterface";
import { VIBE_COLORS, VIBE_LABELS } from "@/lib/constants";

// Map display agent name → ElevenLabs voice slot
const AGENT_VOICE: Record<string, string> = {
  MoodAgent: "mood",
  DJAgent: "dj",
  CrowdAgent: "crowd",
  VisualAgent: "visual",
  SocialAgent: "social",
};

export default function Home() {
  const { vibe, agentLogs, visual, lastAgentLine, handleEvent } = useVibeState();
  const { connected } = useWebSocket(handleEvent);
  const { speak } = useTTS();

  // Speak agent lines as they arrive from the WebSocket
  useEffect(() => {
    if (!lastAgentLine?.line) return;
    const voiceSlot = AGENT_VOICE[lastAgentLine.agent] ?? "mood";
    speak(voiceSlot, lastAgentLine.line);
  }, [lastAgentLine, speak]);
  const colors = VIBE_COLORS[vibe.mood];

  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#07040F" }}>

      {/* ── Full-screen particle canvas ── */}
      <div className="absolute inset-0 scanlines">
        <VibeCanvas mood={vibe.mood} energy={vibe.energy} visual={visual} />
      </div>

      {/* ── Radial ambient glow that follows mood ── */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{ opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        style={{
          background: `radial-gradient(ellipse 60% 50% at 50% 50%, ${colors.primary}1A 0%, transparent 70%)`,
        }}
      />

      {/* ════════════════════════════════════════
          HEADER
      ════════════════════════════════════════ */}
      <header
        className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-6 py-3"
        style={{
          background: "rgba(7,4,15,0.80)",
          backdropFilter: "blur(20px)",
          borderBottom: `1px solid ${colors.primary}22`,
          boxShadow: `0 1px 0 ${colors.primary}15`,
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-4">
          <motion.div
            animate={{ textShadow: [`0 0 16px ${colors.primary}`, `0 0 32px ${colors.primary}`, `0 0 16px ${colors.primary}`] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-2xl font-black tracking-[0.3em]"
            style={{ color: colors.primary }}
          >
            VIBECHECK
          </motion.div>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-mono"
            style={{ background: `${colors.primary}22`, color: colors.primary, border: `1px solid ${colors.primary}44` }}
          >
            BeachHacks 9.0
          </span>
        </div>

        {/* Agent quip */}
        <AnimatePresence mode="wait">
          {lastAgentLine && (
            <motion.div
              key={lastAgentLine.line}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              className="hidden md:flex items-center gap-2 text-xs text-slate-400 italic max-w-sm"
            >
              <span style={{ color: colors.secondary }}>{lastAgentLine.agent}:</span>
              <span className="truncate">&ldquo;{lastAgentLine.line}&rdquo;</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Status */}
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ opacity: connected ? [1, 0.4, 1] : 1 }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-2 h-2 rounded-full"
            style={{ background: connected ? "#34D399" : "#EF4444", boxShadow: connected ? "0 0 8px #34D399" : "none" }}
          />
          <span className="text-xs font-mono" style={{ color: connected ? "#34D399" : "#EF4444" }}>
            {connected ? "LIVE" : "OFFLINE"}
          </span>
        </div>
      </header>

      {/* ════════════════════════════════════════
          MAIN LAYOUT (below header, above bottom bar)
      ════════════════════════════════════════ */}
      <div
        className="absolute left-0 right-0 flex gap-4 px-4"
        style={{ top: 60, bottom: 110 }}
      >
        {/* ── LEFT COLUMN ── */}
        <div className="flex flex-col gap-3 w-72 flex-shrink-0">
          <MusicPanel
            trackName={vibe.music.track_name}
            artist={vibe.music.artist}
            bpm={vibe.music.bpm}
            djComment={vibe.music.dj_comment}
            energyLevel={vibe.music.energy_level}
            youtubeId={vibe.music.youtube_id}
            thumbnailUrl={vibe.music.thumbnail_url}
            mood={vibe.mood}
          />
          <SocialCard
            content={vibe.social.content}
            promptType={vibe.social.prompt_type}
            mood={vibe.mood}
          />
        </div>

        {/* ── CENTER ── VibeMeter + Mood tag */}
        <div className="flex-1 flex flex-col items-center justify-center gap-2 pointer-events-none select-none">
          <motion.div
            key={vibe.mood}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, type: "spring" }}
            className="text-xs tracking-[0.55em] font-bold px-6 py-1.5 rounded-full mb-2"
            style={{
              color: colors.primary,
              background: `${colors.primary}18`,
              border: `1px solid ${colors.primary}50`,
              boxShadow: `0 0 20px ${colors.primary}30`,
            }}
          >
            {VIBE_LABELS[vibe.mood]}
          </motion.div>

          <VibeMeter energy={vibe.energy} mood={vibe.mood} />
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="flex flex-col w-72 flex-shrink-0">
          <AgentFeed logs={agentLogs} mood={vibe.mood} />
        </div>
      </div>

      {/* ════════════════════════════════════════
          BOTTOM COMMAND BAR
      ════════════════════════════════════════ */}
      <div
        className="absolute bottom-0 left-0 right-0 z-30 px-4 py-3"
        style={{
          background: "rgba(7,4,15,0.88)",
          backdropFilter: "blur(20px)",
          borderTop: `1px solid ${colors.primary}22`,
        }}
      >
        <VoiceInterface mood={vibe.mood} />
      </div>
    </div>
  );
}
