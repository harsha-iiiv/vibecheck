"use client";
import { motion } from "framer-motion";
import { VIBE_COLORS, MOOD_DESCRIPTIONS } from "@/lib/constants";
import type { VibeMood } from "@/lib/types";

interface Props {
  energy: number;
  mood: VibeMood;
}

export function VibeMeter({ energy, mood }: Props) {
  const colors = VIBE_COLORS[mood];
  const e = Math.max(0, Math.min(1, energy));

  // Larger SVG arc
  const r = 110;
  const cx = 150;
  const cy = 150;
  const sw = 14;           // stroke width
  const circumference = Math.PI * r;
  const offset = circumference * (1 - e);

  // Tick marks every 10%
  const ticks = Array.from({ length: 11 }, (_, i) => {
    const angle = Math.PI + (i / 10) * Math.PI; // 180° → 360°
    const innerR = r - sw - 6;
    const outerR = r - sw - (i % 5 === 0 ? 0 : 6);
    const round = (n: number) => Math.round(n * 1e4) / 1e4;
    return {
      x1: round(cx + Math.cos(angle) * innerR),
      y1: round(cy + Math.sin(angle) * innerR),
      x2: round(cx + Math.cos(angle) * outerR),
      y2: round(cy + Math.sin(angle) * outerR),
      major: i % 5 === 0,
    };
  });

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: 300, height: 180 }}>
        <svg width="300" height="180" viewBox="0 0 300 180">
          {/* Outer glow ring */}
          <defs>
            <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Track arc */}
          <path
            d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={sw}
            strokeLinecap="round"
          />

          {/* Filled energy arc */}
          <motion.path
            d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
            fill="none"
            stroke={colors.primary}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeDasharray={circumference}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: "easeOut" }}
            filter="url(#glow)"
            style={{ filter: `drop-shadow(0 0 10px ${colors.primary})` }}
          />

          {/* Secondary softer arc */}
          <motion.path
            d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
            fill="none"
            stroke={colors.secondary}
            strokeWidth={sw * 1.8}
            strokeLinecap="round"
            strokeDasharray={circumference}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            style={{ opacity: 0.12 }}
          />

          {/* Tick marks */}
          {ticks.map((t, i) => (
            <line
              key={i}
              x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
              stroke={t.major ? colors.primary : "rgba(255,255,255,0.15)"}
              strokeWidth={t.major ? 2 : 1}
              style={{ opacity: t.major ? 0.8 : 0.4 }}
            />
          ))}

          {/* Big energy number */}
          <text
            x="150" y="135"
            textAnchor="middle"
            fill={colors.primary}
            fontSize="58"
            fontWeight="900"
            fontFamily="monospace"
            style={{ filter: `drop-shadow(0 0 12px ${colors.primary})` }}
          >
            {Math.round(e * 100)}
          </text>
          <text
            x="150" y="158"
            textAnchor="middle"
            fill="rgba(255,255,255,0.3)"
            fontSize="11"
            letterSpacing="6"
            fontFamily="monospace"
          >
            ENERGY
          </text>
        </svg>

        {/* Description below meter */}
        <motion.div
          key={mood}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="absolute bottom-0 left-0 right-0 text-center text-xs"
          style={{ color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em" }}
        >
          {MOOD_DESCRIPTIONS[mood]}
        </motion.div>
      </div>
    </div>
  );
}
