"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { VIBE_COLORS } from "@/lib/constants";
import type { VibeMood } from "@/lib/types";

interface Props {
  trackName: string;
  artist: string;
  bpm: number;
  djComment?: string;
  energyLevel?: number;
  youtubeId?: string;
  thumbnailUrl?: string;
  mood?: VibeMood;
}

export function MusicPanel({ trackName, artist, bpm, djComment, energyLevel, youtubeId, thumbnailUrl, mood = "chill" }: Props) {
  const [playerOpen, setPlayerOpen] = useState(false);
  const colors = VIBE_COLORS[mood];
  const hasTrack = !!trackName && trackName !== "Waiting for the vibe...";

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
      {/* YouTube embed */}
      <AnimatePresence>
        {playerOpen && youtubeId && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 160 }}
            exit={{ height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <iframe
              src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&controls=1&modestbranding=1`}
              className="w-full h-full"
              allow="autoplay; encrypted-media"
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
          <span className="text-xs tracking-[0.3em] font-bold" style={{ color: colors.primary }}>
            NOW PLAYING
          </span>
        </div>

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
                🎧
              </div>
            )}
            {/* Play overlay on thumbnail */}
            {youtubeId && (
              <motion.button
                className="absolute inset-0 flex items-center justify-center cursor-pointer"
                style={{ background: playerOpen ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0)" }}
                whileHover={{ background: "rgba(0,0,0,0.55)" }}
                onClick={() => setPlayerOpen(v => !v)}
                title={playerOpen ? "Close player" : "Play track"}
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
                      <svg className="w-6 h-6 text-white opacity-0 group-hover:opacity-100" fill="currentColor" viewBox="0 0 20 20">
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
      </div>
    </div>
  );
}
