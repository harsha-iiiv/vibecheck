"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AGENT_CONFIGS, VIBE_COLORS, MOOD_DESCRIPTIONS } from "@/lib/constants";
import type { VibeMood, NegotiationEntry, AgentLogEntry } from "@/lib/types";

// ─── Layout ────────────────────────────────────────────────────────────────
const VIEW = 420;
const CX = 210;
const CY = 210;
const R_PEN = 140;  // pentagon radius
const R_NODE = 30;  // node circle radius

const AGENT_ORDER = [
  "MoodAgent",
  "DJAgent",
  "SocialAgent",
  "CrowdAgent",
  "VisualAgent",
] as const;

function pentagonXY(i: number) {
  const rad = ((i * 72 - 90) * Math.PI) / 180;
  return { x: CX + R_PEN * Math.cos(rad), y: CY + R_PEN * Math.sin(rad) };
}

const NODE_POS: Record<string, { x: number; y: number }> = Object.fromEntries(
  AGENT_ORDER.map((n, i) => [n, pentagonXY(i)])
);

// All 10 edges between 5 nodes
const EDGES: [string, string][] = [];
for (let i = 0; i < AGENT_ORDER.length; i++)
  for (let j = i + 1; j < AGENT_ORDER.length; j++)
    EDGES.push([AGENT_ORDER[i], AGENT_ORDER[j]]);

function edgeKey(a: string, b: string) {
  return [a, b].sort().join("↔");
}

// ─── Types ─────────────────────────────────────────────────────────────────
interface Particle {
  id: string;
  from: string;
  to: string;
  color: string;
  size: number;
  dur: number; // seconds
}

interface Props {
  mood: VibeMood;
  energy: number;
  negotiations: NegotiationEntry[];
  agentLogs: AgentLogEntry[];
  speakingAgent: string | null; // full agent name e.g. "MoodAgent"
  lastAgentLine: { agent: string; line: string } | null;
}

// ─── Waveform bars (SVG rects, pre-defined heights to avoid jitter) ────────
const WAVE_DEFS = [
  { h1: 4,  h2: 14, h3: 6,  delay: 0.00 },
  { h1: 8,  h2: 5,  h3: 14, delay: 0.09 },
  { h1: 12, h2: 8,  h3: 4,  delay: 0.18 },
  { h1: 5,  h2: 12, h3: 9,  delay: 0.27 },
  { h1: 10, h2: 4,  h3: 13, delay: 0.36 },
];

function WaveformBars({ cx, cy, color }: { cx: number; cy: number; color: string }) {
  const BAR_W = 3;
  const GAP = 2;
  const totalW = WAVE_DEFS.length * BAR_W + (WAVE_DEFS.length - 1) * GAP;
  const baseY = cy + R_NODE + 10;
  return (
    <>
      {WAVE_DEFS.map((d, i) => {
        const bx = cx - totalW / 2 + i * (BAR_W + GAP);
        return (
          <motion.rect
            key={i}
            x={bx}
            width={BAR_W}
            height={d.h1}
            y={baseY + 14 - d.h1}
            rx={1}
            fill={color}
            animate={{
              height: [d.h1, d.h2, d.h3, d.h2, d.h1],
              y: [baseY + 14 - d.h1, baseY + 14 - d.h2, baseY + 14 - d.h3, baseY + 14 - d.h2, baseY + 14 - d.h1],
            }}
            transition={{ duration: 0.55, repeat: Infinity, delay: d.delay, ease: "easeInOut" }}
          />
        );
      })}
    </>
  );
}

// ─── Expanding rings when speaking ────────────────────────────────────────
function SpeakingRings({ cx, cy, color }: { cx: number; cy: number; color: string }) {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <motion.circle
          key={i}
          cx={cx}
          cy={cy}
          fill="none"
          stroke={color}
          strokeWidth={2 - i * 0.4}
          initial={{ r: R_NODE + 2, opacity: 0.9 }}
          animate={{ r: R_NODE + 30 + i * 14, opacity: 0 }}
          transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.37, ease: "easeOut" }}
        />
      ))}
    </>
  );
}

// ─── Main component ────────────────────────────────────────────────────────
export function AgentNetwork({
  mood,
  energy,
  negotiations,
  agentLogs,
  speakingAgent,
  lastAgentLine,
}: Props) {
  const colors = VIBE_COLORS[mood];
  const [particles, setParticles] = useState<Particle[]>([]);
  const [activeEdges, setActiveEdges] = useState<Set<string>>(new Set());
  const [recentAgents, setRecentAgents] = useState<Set<string>>(new Set());
  const prevNegLen = useRef(0);
  const prevLogLen = useRef(0);

  // ── Spawn particles for new negotiations ──────────────────────────────
  useEffect(() => {
    if (negotiations.length <= prevNegLen.current) {
      prevNegLen.current = negotiations.length;
      return;
    }
    const newNegs = negotiations.slice(0, negotiations.length - prevNegLen.current);
    prevNegLen.current = negotiations.length;

    newNegs.forEach((neg) => {
      if (!neg.from_agent || !neg.to_agent) return;
      const cfg = AGENT_CONFIGS[neg.from_agent as keyof typeof AGENT_CONFIGS];
      if (!cfg || !NODE_POS[neg.from_agent] || !NODE_POS[neg.to_agent]) return;

      const pid = `neg-${neg.timestamp}-${Math.random()}`;
      const color = neg.agreed ? cfg.color : "#64748B";
      const p: Particle = { id: pid, from: neg.from_agent, to: neg.to_agent, color, size: neg.agreed ? 8 : 5, dur: 1.4 };
      setParticles((prev) => [...prev, p]);

      const ekey = edgeKey(neg.from_agent, neg.to_agent);
      setActiveEdges((prev) => new Set([...prev, ekey]));

      setTimeout(() => setParticles((prev) => prev.filter((x) => x.id !== pid)), 1600);
      setTimeout(() => setActiveEdges((prev) => { const s = new Set(prev); s.delete(ekey); return s; }), 3500);
    });
  }, [negotiations]);

  // ── Track recently active agents from logs ────────────────────────────
  useEffect(() => {
    if (agentLogs.length <= prevLogLen.current) {
      prevLogLen.current = agentLogs.length;
      return;
    }
    prevLogLen.current = agentLogs.length;
    const name = agentLogs[0]?.agent;
    if (!name) return;
    setRecentAgents((prev) => new Set([...prev, name]));
    setTimeout(() => setRecentAgents((prev) => { const s = new Set(prev); s.delete(name); return s; }), 2500);
  }, [agentLogs]);

  // ── Ambient idle pulses every 3s to keep network alive ───────────────
  useEffect(() => {
    const fire = () => {
      const [a, b] = EDGES[Math.floor(Math.random() * EDGES.length)];
      const cfg = AGENT_CONFIGS[a as keyof typeof AGENT_CONFIGS];
      if (!cfg) return;
      const pid = `idle-${Date.now()}`;
      const p: Particle = { id: pid, from: a, to: b, color: colors.primary + "55", size: 3, dur: 2.0 };
      setParticles((prev) => [...prev, p]);
      setTimeout(() => setParticles((prev) => prev.filter((x) => x.id !== pid)), 2200);
    };
    const id = setInterval(fire, 3200);
    fire(); // immediate first pulse
    return () => clearInterval(id);
  }, [colors.primary]);

  const e = Math.max(0, Math.min(1, energy));
  const energyPct = Math.round(e * 100);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center select-none">
      {/* ── Network SVG ───────────────────────────────────────────────── */}
      <svg
        viewBox={`0 0 ${VIEW} ${VIEW}`}
        className="w-full max-w-[420px]"
        style={{ filter: "drop-shadow(0 0 30px rgba(0,0,0,0.6))" }}
      >
        <defs>
          {/* Per-agent glow filters */}
          {AGENT_ORDER.map((name) => {
            const cfg = AGENT_CONFIGS[name as keyof typeof AGENT_CONFIGS];
            return (
              <filter key={name} id={`nglow-${name}`} x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            );
          })}
          {/* Edge glow */}
          <filter id="nglow-edge" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Central hub glow */}
          <radialGradient id="hub-gradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={colors.primary} stopOpacity="0.25" />
            <stop offset="100%" stopColor={colors.primary} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* ── Background glow ring ────────────────────────────────────── */}
        <circle cx={CX} cy={CY} r={R_PEN + 20} fill="url(#hub-gradient)" />

        {/* ── All 10 edges ────────────────────────────────────────────── */}
        {EDGES.map(([a, b]) => {
          const pa = NODE_POS[a];
          const pb = NODE_POS[b];
          const key = edgeKey(a, b);
          const active = activeEdges.has(key);
          const isMoodEdge = a === "MoodAgent" || b === "MoodAgent";
          return (
            <motion.line
              key={key}
              x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y}
              animate={{
                stroke: active ? colors.primary : (isMoodEdge ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.05)"),
                strokeWidth: active ? 2.5 : isMoodEdge ? 1 : 0.5,
                opacity: active ? 1 : 0.6,
              }}
              transition={{ duration: 0.4 }}
              filter={active ? "url(#nglow-edge)" : undefined}
            />
          );
        })}

        {/* ── Particles (negotiation messages + idle) ─────────────────── */}
        {particles.map((p) => {
          const from = NODE_POS[p.from];
          const to = NODE_POS[p.to];
          if (!from || !to) return null;
          const pathD = `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
          return (
            <g key={p.id}>
              {/* Glow halo */}
              <circle r={p.size + 4} fill={p.color} opacity={0.3}
                style={{ filter: `blur(4px)` }}>
                <animateMotion dur={`${p.dur}s`} path={pathD} begin="0s" fill="freeze" />
              </circle>
              {/* Core */}
              <circle r={p.size} fill={p.color} opacity={0.95}
                style={{ filter: `drop-shadow(0 0 4px ${p.color})` }}>
                <animateMotion dur={`${p.dur}s`} path={pathD} begin="0s" fill="freeze" />
              </circle>
            </g>
          );
        })}

        {/* ── Central hub ─────────────────────────────────────────────── */}
        {/* Outer pulse ring driven by energy */}
        <motion.circle
          cx={CX} cy={CY}
          fill="none"
          stroke={colors.primary}
          strokeWidth={1}
          animate={{ r: [26, 26 + e * 14, 26], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Hub background */}
        <circle cx={CX} cy={CY} r={26}
          fill={`${colors.primary}15`}
          stroke={`${colors.primary}50`}
          strokeWidth={1.5}
        />
        {/* Energy number */}
        <text x={CX} y={CY + 5} textAnchor="middle"
          fill={colors.primary} fontSize="18" fontWeight="900" fontFamily="monospace"
          style={{ filter: `drop-shadow(0 0 8px ${colors.primary})` }}
        >
          {energyPct}
        </text>
        <text x={CX} y={CY + 16} textAnchor="middle"
          fill={colors.secondary} fontSize="6" letterSpacing="2" fontFamily="monospace"
        >
          ENERGY
        </text>

        {/* ── Agent nodes ─────────────────────────────────────────────── */}
        {AGENT_ORDER.map((name) => {
          const pos = NODE_POS[name];
          const cfg = AGENT_CONFIGS[name as keyof typeof AGENT_CONFIGS];
          const isSpeaking = speakingAgent === name;
          const isRecentlyActive = recentAgents.has(name) || lastAgentLine?.agent === name;

          return (
            <g key={name}>
              {/* Outer halo */}
              <circle
                cx={pos.x} cy={pos.y} r={R_NODE + 10}
                fill={`${cfg.color}08`}
                filter={`url(#nglow-${name})`}
              />

              {/* Speaking rings */}
              {isSpeaking && <SpeakingRings cx={pos.x} cy={pos.y} color={cfg.color} />}

              {/* Active ping (when agent just sent a message) */}
              {isRecentlyActive && !isSpeaking && (
                <motion.circle
                  cx={pos.x} cy={pos.y}
                  fill="none"
                  stroke={cfg.color}
                  strokeWidth={1.5}
                  initial={{ r: R_NODE + 2, opacity: 0.7 }}
                  animate={{ r: R_NODE + 20, opacity: 0 }}
                  transition={{ duration: 0.9, repeat: 2 }}
                />
              )}

              {/* Node circle */}
              <motion.circle
                cx={pos.x} cy={pos.y} r={R_NODE}
                fill={isSpeaking ? `${cfg.color}40` : `${cfg.color}1A`}
                stroke={cfg.color}
                strokeWidth={isSpeaking ? 2.5 : 1.5}
                animate={{
                  r: isSpeaking ? [R_NODE, R_NODE + 3, R_NODE] : R_NODE,
                  strokeWidth: isSpeaking ? [2.5, 3.5, 2.5] : isRecentlyActive ? 2 : 1.5,
                }}
                transition={{ duration: 0.7, repeat: isSpeaking ? Infinity : 0 }}
                style={isSpeaking ? { filter: `drop-shadow(0 0 10px ${cfg.color})` } : undefined}
              />

              {/* Emoji */}
              <text x={pos.x} y={pos.y + 8} textAnchor="middle" fontSize="20">{cfg.emoji}</text>

              {/* Agent name */}
              <text
                x={pos.x} y={pos.y + R_NODE + 16}
                textAnchor="middle"
                fill={isSpeaking ? cfg.color : isRecentlyActive ? "#CBD5E1" : "#64748B"}
                fontSize="9" fontWeight={isSpeaking ? "bold" : "600"}
                fontFamily="monospace" letterSpacing="1"
                style={isSpeaking ? { filter: `drop-shadow(0 0 6px ${cfg.color})` } : undefined}
              >
                {name.replace("Agent", "").toUpperCase()}
              </text>

              {/* Role */}
              <text
                x={pos.x} y={pos.y + R_NODE + 26}
                textAnchor="middle"
                fill="#334155" fontSize="7" fontFamily="monospace"
              >
                {cfg.role}
              </text>

              {/* Speaking waveform */}
              {isSpeaking && <WaveformBars cx={pos.x} cy={pos.y} color={cfg.color} />}

              {/* Speaking mic badge */}
              {isSpeaking && (
                <motion.circle
                  cx={pos.x + R_NODE - 4} cy={pos.y - R_NODE + 4} r={8}
                  fill={cfg.color}
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                />
              )}
              {isSpeaking && (
                <text x={pos.x + R_NODE - 4} y={pos.y - R_NODE + 8}
                  textAnchor="middle" fontSize="9">🎙</text>
              )}
            </g>
          );
        })}
      </svg>

      {/* ── Mood label ──────────────────────────────────────────────────── */}
      <motion.div
        key={mood}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="mt-1 text-[10px] tracking-[0.4em] font-bold px-4 py-1 rounded-full"
        style={{
          color: colors.primary,
          background: `${colors.primary}14`,
          border: `1px solid ${colors.primary}44`,
          boxShadow: `0 0 16px ${colors.primary}25`,
        }}
      >
        {mood.replace("_", " ").toUpperCase()}
      </motion.div>

      {/* ── Last spoken agent line ──────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {lastAgentLine && (
          <motion.div
            key={lastAgentLine.line}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.3 }}
            className="mt-2 text-center px-6 max-w-[380px]"
          >
            {(() => {
              const cfg = AGENT_CONFIGS[lastAgentLine.agent as keyof typeof AGENT_CONFIGS];
              const col = cfg?.color ?? "#94A3B8";
              return (
                <span className="text-[11px] font-mono" style={{ color: col }}>
                  {lastAgentLine.agent.replace("Agent", "")}
                  {speakingAgent === lastAgentLine.agent && (
                    <span className="ml-1 text-[9px] opacity-60">🔊</span>
                  )}
                  <span className="text-slate-500 italic ml-1.5 font-normal">
                    &ldquo;{lastAgentLine.line.slice(0, 90)}{lastAgentLine.line.length > 90 ? "…" : ""}&rdquo;
                  </span>
                </span>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Mood description ────────────────────────────────────────────── */}
      <motion.p
        key={mood + "-desc"}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mt-1 text-[10px] text-center"
        style={{ color: "rgba(255,255,255,0.2)", letterSpacing: "0.08em" }}
      >
        {MOOD_DESCRIPTIONS[mood]}
      </motion.p>
    </div>
  );
}
