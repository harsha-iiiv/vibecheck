"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { VIBE_COLORS, API_BASE } from "@/lib/constants";
import type { VibeMood, TrackQueueItem } from "@/lib/types";
import { SolanaMint } from "./SolanaMint";

interface Props {
  trackName: string;
  artist: string;
  bpm: number;
  djComment?: string;
  energyLevel?: number;
  youtubeId?: string;
  thumbnailUrl?: string;
  mood?: VibeMood;
  queue?: TrackQueueItem[];
}

type PlayMode = "youtube" | "generated" | "idle";

export function MusicPanel({ trackName, artist, bpm, djComment, energyLevel, youtubeId, thumbnailUrl, mood = "chill", queue = [] }: Props) {
  const [playerOpen, setPlayerOpen] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const [playMode, setPlayMode] = useState<PlayMode>("youtube");
  const [generating, setGenerating] = useState(false);
  const [genAudioUrl, setGenAudioUrl] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevGenUrl = useRef<string | null>(null);
  const colors = VIBE_COLORS[mood];

  const hasTrack = !!trackName && trackName !== "Waiting for the vibe...";

  // Clean up generated audio object URL on unmount / new generation
  useEffect(() => {
    return () => {
      if (prevGenUrl.current) URL.revokeObjectURL(prevGenUrl.current);
    };
  }, []);

  // Auto-play generated audio when URL is set
  useEffect(() => {
    if (!genAudioUrl || playMode !== "generated") return;
    const audio = new Audio(genAudioUrl);
    audio.loop = true;
    audio.volume = 0.65;
    audioRef.current = audio;
    audio.play().catch(() => {/* autoplay blocked — user must click */});
    return () => {
      audio.pause();
      audio.src = "";
    };
  }, [genAudioUrl, playMode]);

  const generateBeats = useCallback(async () => {
    setGenerating(true);
    setGenError(null);
    // Stop any existing generated audio
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    if (prevGenUrl.current) { URL.revokeObjectURL(prevGenUrl.current); prevGenUrl.current = null; }
    setGenAudioUrl(null);

    try {
      const res = await fetch(`${API_BASE}/music/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mood, energy: energyLevel ?? 0.5, genre_hint: "" }),
      });

      if (res.status === 204) {
        // Backend fell back — switch to YouTube
        setGenError("Generation timed out — switched to YouTube");
        setPlayMode("youtube");
        if (!playerOpen) setPlayerOpen(true);
        return;
      }

      if (!res.ok) {
        setGenError("Generation failed — try YouTube");
        setPlayMode("youtube");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      prevGenUrl.current = url;
      setGenAudioUrl(url);
      setPlayMode("generated");
    } catch {
      setGenError("Backend offline");
      setPlayMode("youtube");
    } finally {
      setGenerating(false);
    }
  }, [mood, energyLevel, playerOpen]);

  function stopGenerated() {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    if (prevGenUrl.current) { URL.revokeObjectURL(prevGenUrl.current); prevGenUrl.current = null; }
    setGenAudioUrl(null);
    setPlayMode("youtube");
  }

  async function handleSkip() {
    if (skipping || queue.length === 0) return;
    setSkipping(true);
    try {
      await fetch(`${API_BASE}/skip`, { method: "POST" });
    } catch {/* non-blocking */}
    setTimeout(() => setSkipping(false), 1500);
  }

  return (
    <div
      className="rounded-2xl overflow-hidden flex-shrink-0"
      style={{
        background: "rgba(13,8,32,0.78)",
        backdropFilter: "blur(16px)",
        border: `1px solid ${colors.primary}28`,
        boxShadow: `0 0 24px ${colors.primary}18, inset 0 0 24px ${colors.primary}06`,
      }}
    >
      {/* Generated audio playing indicator */}
      <AnimatePresence>
        {playMode === "generated" && genAudioUrl && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 48, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden flex items-center gap-3 px-4"
            style={{ background: `${colors.primary}14`, borderBottom: `1px solid ${colors.primary}22` }}
          >
            {/* Waveform animation */}
            <div className="flex items-end gap-0.5 h-6">
              {[4, 8, 12, 6, 10, 14, 7, 11, 5, 9].map((h, i) => (
                <motion.div
                  key={i}
                  className="w-1 rounded-full"
                  style={{ background: colors.primary, height: h }}
                  animate={{ scaleY: [1, 2.2, 0.6, 1.8, 1], opacity: [0.6, 1, 0.7, 1, 0.6] }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.07, ease: "easeInOut" }}
                />
              ))}
            </div>
            <span className="text-xs font-bold tracking-widest" style={{ color: colors.primary }}>
              AI BEATS
            </span>
            <span className="text-[10px] text-slate-500 flex-1">22s loop • ElevenLabs</span>
            <motion.button
              onClick={stopGenerated}
              className="text-[10px] px-2 py-0.5 rounded-full cursor-pointer"
              style={{ background: "rgba(255,255,255,0.08)", color: "#94A3B8", border: "1px solid rgba(255,255,255,0.1)" }}
              whileHover={{ color: "#EF4444", borderColor: "#EF4444" }}
              suppressHydrationWarning
            >
              STOP
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* YouTube embed */}
      <AnimatePresence>
        {playerOpen && youtubeId && playMode !== "generated" && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 160 }}
            exit={{ height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <iframe
              src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=0&controls=1&modestbranding=1`}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-4">
        {/* Header row */}
        <div className="flex items-center gap-1.5 mb-3">
          <motion.div
            animate={{ opacity: hasTrack ? [1, 0.4, 1] : 1 }}
            transition={{ duration: 1.2, repeat: Infinity }}
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: colors.primary }}
          />
          <span className="text-xs tracking-[0.3em] font-bold flex-1" style={{ color: colors.primary }}>
            NOW PLAYING
          </span>
          {/* Mode badges */}
          <div className="flex gap-1">
            <motion.button
              onClick={generateBeats}
              disabled={generating}
              className="text-[9px] px-2 py-0.5 rounded-full font-bold tracking-wider cursor-pointer"
              style={{
                background: playMode === "generated" ? `${colors.primary}30` : "rgba(255,255,255,0.06)",
                border: `1px solid ${playMode === "generated" ? colors.primary + "66" : "rgba(255,255,255,0.12)"}`,
                color: playMode === "generated" ? colors.primary : "#94A3B8",
                opacity: generating ? 0.6 : 1,
              }}
              whileTap={{ scale: 0.9 }}
              title="Generate AI beats"
              suppressHydrationWarning
            >
              {generating ? "⏳ GEN…" : "🤖 BEATS"}
            </motion.button>
            {youtubeId && (
              <motion.button
                onClick={() => { stopGenerated(); setPlayerOpen(v => !v); }}
                className="text-[9px] px-2 py-0.5 rounded-full font-bold tracking-wider cursor-pointer"
                style={{
                  background: playMode === "youtube" && playerOpen ? `${colors.secondary}30` : "rgba(255,255,255,0.06)",
                  border: `1px solid ${playMode === "youtube" && playerOpen ? colors.secondary + "66" : "rgba(255,255,255,0.12)"}`,
                  color: playMode === "youtube" && playerOpen ? colors.secondary : "#94A3B8",
                }}
                whileTap={{ scale: 0.9 }}
                title="Open YouTube player"
                suppressHydrationWarning
              >
                📺 YT
              </motion.button>
            )}
          </div>
        </div>

        {/* Generation error */}
        <AnimatePresence>
          {genError && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="text-[10px] text-amber-400 mb-2 pl-2"
              style={{ borderLeft: "2px solid rgba(251,191,36,0.4)" }}
            >
              {genError}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Album art + info */}
        <div className="flex gap-3 items-start">
          {/* Thumbnail */}
          <div
            className="relative flex-shrink-0 rounded-xl overflow-hidden"
            style={{
              width: 72, height: 72,
              border: `1px solid ${colors.primary}33`,
              boxShadow: `0 0 16px ${colors.primary}33`,
            }}
          >
            {thumbnailUrl && hasTrack ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumbnailUrl} alt={trackName} className="w-full h-full object-cover" />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-3xl"
                style={{ background: `${colors.primary}18` }}
              >
                {playMode === "generated" ? "🤖" : "🎧"}
              </div>
            )}
            {/* Play overlay on thumbnail (YouTube only) */}
            {youtubeId && playMode !== "generated" && (
              <motion.button
                className="absolute inset-0 flex items-center justify-center cursor-pointer"
                style={{ background: playerOpen ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.25)" }}
                whileHover={{ background: "rgba(0,0,0,0.55)" }}
                onClick={() => { stopGenerated(); setPlayerOpen(v => !v); }}
                title={playerOpen ? "Close player" : "Play on YouTube"}
              >
                <AnimatePresence mode="wait">
                  {playerOpen ? (
                    <motion.div key="pause" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <rect x="4" y="3" width="4" height="14" rx="1"/>
                        <rect x="12" y="3" width="4" height="14" rx="1"/>
                      </svg>
                    </motion.div>
                  ) : (
                    <motion.div key="play" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <svg className="w-6 h-6 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M6.3 2.841A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"/>
                      </svg>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            )}
          </div>

          {/* Track info */}
          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={trackName}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div
                  className="font-black text-sm leading-tight truncate"
                  style={{ color: colors.primary, textShadow: `0 0 10px ${colors.primary}88` }}
                >
                  {trackName || "Waiting for the vibe..."}
                </div>
                <div className="text-xs text-slate-400 truncate mt-0.5">{artist || "—"}</div>
              </motion.div>
            </AnimatePresence>

            {bpm > 0 && (
              <div
                className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-xs font-bold"
                style={{ background: `${colors.secondary}22`, color: colors.secondary, border: `1px solid ${colors.secondary}44` }}
              >
                <span>{bpm}</span>
                <span className="font-normal opacity-60">BPM</span>
              </div>
            )}
          </div>
        </div>

        {/* DJ comment */}
        {djComment && hasTrack && (
          <motion.div
            key={djComment}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 text-xs italic text-slate-400 pl-2"
            style={{ borderLeft: `2px solid ${colors.primary}44` }}
          >
            &ldquo;{djComment}&rdquo;
          </motion.div>
        )}

        {/* BPM pulse bars */}
        {bpm > 0 && (
          <div className="mt-3 flex gap-0.5 items-end h-6">
            {Array.from({ length: 24 }).map((_, i) => (
              <motion.div
                key={i}
                className="flex-1 rounded-sm"
                style={{ background: `${colors.primary}`, originY: 1 }}
                animate={{
                  scaleY: [
                    Math.random() * 0.6 + 0.2,
                    Math.random() * 0.6 + 0.4,
                    Math.random() * 0.6 + 0.2,
                  ],
                  opacity: (energyLevel ?? 0.5) * 0.7 + 0.2,
                }}
                transition={{
                  duration: 60 / (bpm || 120) * 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.04,
                }}
              />
            ))}
          </div>
        )}

        {/* Solana NFT mint — show when AI beats are playing */}
        {playMode === "generated" && (
          <SolanaMint
            trackName={trackName || "AI Beat"}
            bpm={bpm}
            energyLevel={energyLevel ?? 0.5}
            mood={mood}
          />
        )}

        {/* Up next queue */}
        {queue.length > 0 && (
          <div className="mt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "0.75rem" }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] tracking-[0.25em] font-bold text-slate-500">UP NEXT</span>
              <motion.button
                onClick={handleSkip}
                disabled={skipping}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.93 }}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                style={{
                  background: skipping ? `${colors.primary}18` : "rgba(255,255,255,0.06)",
                  border: `1px solid ${skipping ? colors.primary + "55" : "rgba(255,255,255,0.1)"}`,
                  color: skipping ? colors.primary : "rgba(148,163,184,0.7)",
                  cursor: skipping ? "default" : "pointer",
                }}
              >
                {skipping ? "⏭ SKIPPING..." : "⏭ SKIP"}
              </motion.button>
            </div>
            <div className="space-y-1.5">
              {queue.slice(0, 3).map((item, i) => (
                <motion.div
                  key={`${item.youtube_id}-${i}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className="flex items-center gap-2"
                >
                  <span className="text-[10px] text-slate-600 w-3 flex-shrink-0">{i + 1}</span>
                  {item.thumbnail_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.thumbnail_url} alt={item.track_name} className="w-7 h-7 rounded-md object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 text-sm" style={{ background: `${colors.primary}18` }}>
                      🎵
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-semibold text-slate-300 truncate">{item.track_name}</div>
                    <div className="text-[10px] text-slate-500 truncate">{item.artist}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
