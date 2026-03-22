"use client";
import { useEffect, useRef } from "react";
import { VIBE_COLORS } from "@/lib/constants";
import type { VibeMood, VisualParams } from "@/lib/types";

interface Props {
  mood: VibeMood;
  energy: number;
  visual: VisualParams | null;
}

// ── Shared particle type ──────────────────────────────────────────────────────
interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  radius: number;
  opacity: number;
  color: string;
  life: number; maxLife: number;
  trail?: Array<{ x: number; y: number }>;
  [key: string]: unknown;
}

// ── Per-mood renderers ────────────────────────────────────────────────────────

function drawAurora(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  t: number,
  energy: number,
  colors: { primary: string; secondary: string; glow: string },
) {
  // Fade
  ctx.fillStyle = "rgba(7, 4, 15, 0.18)";
  ctx.fillRect(0, 0, w, h);

  const bands = 5;
  for (let b = 0; b < bands; b++) {
    const yBase = h * 0.3 + b * h * 0.1;
    const amp = (energy * 60 + 20) * (1 + b * 0.3);
    const freq = 0.004 + b * 0.001;
    const phase = t * (0.3 + b * 0.12) + b * 1.2;
    const alpha = (0.06 + energy * 0.06) * (1 - b * 0.15);

    ctx.beginPath();
    ctx.moveTo(0, yBase);
    for (let x = 0; x <= w; x += 4) {
      const y = yBase + Math.sin(x * freq + phase) * amp
               + Math.sin(x * freq * 2.3 + phase * 1.7) * amp * 0.4;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();

    const col = b % 2 === 0 ? colors.primary : colors.secondary;
    const grd = ctx.createLinearGradient(0, yBase - amp, 0, yBase + amp * 2);
    grd.addColorStop(0, col + "00");
    grd.addColorStop(0.5, col + Math.floor(alpha * 255).toString(16).padStart(2, "0"));
    grd.addColorStop(1, col + "00");
    ctx.fillStyle = grd;
    ctx.fill();
  }

  // Soft floating orbs
  const orbCount = 6;
  for (let i = 0; i < orbCount; i++) {
    const ox = w * (0.1 + (i / orbCount) * 0.85) + Math.sin(t * 0.4 + i * 1.3) * 40;
    const oy = h * 0.4 + Math.sin(t * 0.6 + i * 2.1) * h * 0.15;
    const r = 40 + energy * 40 + Math.sin(t * 0.8 + i) * 10;
    const grd = ctx.createRadialGradient(ox, oy, 0, ox, oy, r);
    const col = i % 2 === 0 ? colors.primary : colors.secondary;
    grd.addColorStop(0, col + "22");
    grd.addColorStop(1, col + "00");
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(ox, oy, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawNeuralWeb(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  t: number,
  energy: number,
  particles: Particle[],
  colors: { primary: string; secondary: string; glow: string },
) {
  ctx.fillStyle = "rgba(7, 4, 15, 0.20)";
  ctx.fillRect(0, 0, w, h);

  // Spawn
  const maxP = Math.floor(100 + energy * 120);
  while (particles.length < maxP) {
    const angle = Math.random() * Math.PI * 2;
    const speed = energy * 1.2 + 0.3;
    const col = Math.random() > 0.5 ? colors.primary : colors.secondary;
    particles.push({
      x: w / 2 + (Math.random() - 0.5) * w * 0.8,
      y: h / 2 + (Math.random() - 0.5) * h * 0.8,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: Math.random() * 2.5 + 1,
      opacity: Math.random() * 0.7 + 0.3,
      color: col,
      life: 0,
      maxLife: 120 + Math.random() * 180,
    });
  }

  // Update + draw
  const alive: Particle[] = [];
  for (const p of particles) {
    p.life++;
    if (p.life >= p.maxLife || p.x < -20 || p.x > w + 20 || p.y < -20 || p.y > h + 20) continue;

    // Gentle attraction to center
    const dx = w / 2 - p.x; const dy = h / 2 - p.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    p.vx += (dx / dist) * 0.006;
    p.vy += (dy / dist) * 0.006;
    p.vx *= 0.98; p.vy *= 0.98;
    p.x += p.vx; p.y += p.vy;

    const prog = p.life / p.maxLife;
    const alpha = prog < 0.15 ? prog / 0.15 : prog > 0.75 ? (1 - prog) / 0.25 : 1;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = p.color + Math.floor(alpha * p.opacity * 255).toString(16).padStart(2, "0");
    ctx.fill();
    alive.push(p);
  }
  particles.length = 0;
  particles.push(...alive);

  // Web connections
  const pts = particles.slice(0, 100);
  const threshold = 70 + energy * 30;
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      const dx = pts[i].x - pts[j].x;
      const dy = pts[i].y - pts[j].y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < threshold) {
        ctx.beginPath();
        ctx.moveTo(pts[i].x, pts[i].y);
        ctx.lineTo(pts[j].x, pts[j].y);
        const lineAlpha = Math.floor((1 - d / threshold) * (energy * 60 + 25));
        ctx.strokeStyle = colors.primary + lineAlpha.toString(16).padStart(2, "0");
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }
    }
  }

  // Central pulse
  const pulseR = (energy * 80 + 30) * (1 + Math.sin(t * 4) * 0.15);
  const grd = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, pulseR);
  grd.addColorStop(0, colors.primary + "30");
  grd.addColorStop(0.6, colors.primary + "10");
  grd.addColorStop(1, "transparent");
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, pulseR, 0, Math.PI * 2);
  ctx.fill();
}

function drawPeakExplosion(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  t: number,
  energy: number,
  particles: Particle[],
  colors: { primary: string; secondary: string; glow: string },
  shockwaves: Array<{ r: number; alpha: number }>,
) {
  ctx.fillStyle = "rgba(7, 4, 15, 0.12)";
  ctx.fillRect(0, 0, w, h);

  // Spawn explosive particles
  const spawn = Math.floor(energy * 14) + 2;
  for (let i = 0; i < spawn; i++) {
    if (particles.length >= 400) break;
    const angle = Math.random() * Math.PI * 2;
    const speed = energy * 6 + 1 + Math.random() * 4;
    const col = [colors.primary, colors.secondary, "#ffffff", "#FFD700"][Math.floor(Math.random() * 4)];
    particles.push({
      x: w / 2 + (Math.random() - 0.5) * 40,
      y: h / 2 + (Math.random() - 0.5) * 40,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: Math.random() * 3 + 1,
      opacity: 1,
      color: col,
      life: 0,
      maxLife: 60 + Math.random() * 80,
      trail: [],
    });
  }

  // Lightning bolts every ~1.5s
  if (Math.floor(t * 60) % 90 < 3 && energy > 0.5) {
    const bolts = 3 + Math.floor(energy * 4);
    for (let b = 0; b < bolts; b++) {
      const startX = w / 2; const startY = h / 2;
      const angle = (b / bolts) * Math.PI * 2 + t;
      const endX = startX + Math.cos(angle) * (w * 0.45);
      const endY = startY + Math.sin(angle) * (h * 0.45);
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      let cx = startX; let cy = startY;
      const segments = 8;
      for (let s = 0; s < segments; s++) {
        const px = cx + (endX - startX) / segments + (Math.random() - 0.5) * 30;
        const py = cy + (endY - startY) / segments + (Math.random() - 0.5) * 30;
        ctx.lineTo(px, py);
        cx = px; cy = py;
      }
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = colors.primary + "CC";
      ctx.lineWidth = 1.5;
      ctx.shadowColor = colors.primary;
      ctx.shadowBlur = 12;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }

  // Shockwave rings
  if (Math.floor(t * 60) % 45 < 2 && energy > 0.6) {
    shockwaves.push({ r: 10, alpha: 0.9 });
  }
  for (const sw of shockwaves) {
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, sw.r, 0, Math.PI * 2);
    ctx.strokeStyle = colors.primary + Math.floor(sw.alpha * 200).toString(16).padStart(2, "0");
    ctx.lineWidth = 2;
    ctx.stroke();
    sw.r += energy * 8 + 3;
    sw.alpha *= 0.93;
  }
  shockwaves.splice(0, shockwaves.findIndex(sw => sw.alpha > 0.03) === -1
    ? shockwaves.length
    : shockwaves.findIndex(sw => sw.alpha < 0.03));

  // Big central corona
  const coronaR = energy * 120 + 60 + Math.sin(t * 8) * 20;
  const grd = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, coronaR);
  grd.addColorStop(0, colors.primary + "50");
  grd.addColorStop(0.3, colors.secondary + "25");
  grd.addColorStop(1, "transparent");
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, coronaR, 0, Math.PI * 2);
  ctx.fill();

  // Update + draw particles with trails
  const alive: Particle[] = [];
  for (const p of particles) {
    p.life++;
    if (p.life >= p.maxLife) continue;
    if (p.trail && p.trail.length > 8) p.trail.shift();
    p.trail?.push({ x: p.x, y: p.y });

    p.vy += 0.06; // gravity
    p.vx *= 0.985; p.vy *= 0.985;
    p.x += p.vx; p.y += p.vy;

    const prog = p.life / p.maxLife;
    const alpha = 1 - prog;

    // Draw trail
    if (p.trail && p.trail.length > 1) {
      for (let i = 1; i < p.trail.length; i++) {
        const ta = (i / p.trail.length) * alpha * 0.6;
        ctx.beginPath();
        ctx.moveTo(p.trail[i - 1].x, p.trail[i - 1].y);
        ctx.lineTo(p.trail[i].x, p.trail[i].y);
        ctx.strokeStyle = p.color + Math.floor(ta * 255).toString(16).padStart(2, "0");
        ctx.lineWidth = p.radius * 0.7;
        ctx.stroke();
      }
    }

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius * (1 - prog * 0.5), 0, Math.PI * 2);
    ctx.fillStyle = p.color + Math.floor(alpha * 255).toString(16).padStart(2, "0");
    ctx.fill();
    if (p.x > -100 && p.x < w + 100 && p.y > -100 && p.y < h + 100) alive.push(p);
  }
  particles.length = 0;
  particles.push(...alive);
}

function drawWindingDown(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  t: number,
  energy: number,
  particles: Particle[],
  colors: { primary: string; secondary: string; glow: string },
) {
  ctx.fillStyle = "rgba(7, 4, 15, 0.22)";
  ctx.fillRect(0, 0, w, h);

  // Spawn falling stars
  const spawnRate = Math.floor(energy * 4) + 1;
  for (let i = 0; i < spawnRate; i++) {
    if (particles.length >= 150) break;
    const col = Math.random() > 0.5 ? colors.primary : colors.secondary;
    const speed = energy * 2 + 0.8 + Math.random() * 1.5;
    particles.push({
      x: Math.random() * w,
      y: -10,
      vx: (Math.random() - 0.5) * 0.5,
      vy: speed,
      radius: Math.random() * 2 + 0.5,
      opacity: Math.random() * 0.7 + 0.3,
      color: col,
      life: 0,
      maxLife: h / speed + 30,
      trail: [],
    });
  }

  // Static star field
  const starSeed = 42;
  for (let i = 0; i < 80; i++) {
    const sx = (((i * 137.5 + starSeed) % 1000) / 1000) * w;
    const sy = (((i * 293.7 + starSeed) % 1000) / 1000) * h * 0.8;
    const sa = 0.15 + Math.sin(t * 0.5 + i) * 0.08 + energy * 0.1;
    ctx.beginPath();
    ctx.arc(sx, sy, 0.8, 0, Math.PI * 2);
    ctx.fillStyle = colors.secondary + Math.floor(sa * 255).toString(16).padStart(2, "0");
    ctx.fill();
  }

  // Gentle moon glow
  const moonX = w * 0.8 + Math.sin(t * 0.1) * 10;
  const moonY = h * 0.15;
  const moonR = 30 + energy * 20;
  const grd = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, moonR * 3);
  grd.addColorStop(0, colors.primary + "35");
  grd.addColorStop(0.4, colors.primary + "12");
  grd.addColorStop(1, "transparent");
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(moonX, moonY, moonR * 3, 0, Math.PI * 2);
  ctx.fill();
  // Moon disc
  ctx.beginPath();
  ctx.arc(moonX, moonY, moonR * 0.6, 0, Math.PI * 2);
  ctx.fillStyle = colors.primary + "55";
  ctx.fill();

  // Update falling stars
  const alive: Particle[] = [];
  for (const p of particles) {
    p.life++;
    if (p.y > h + 20 || p.life >= p.maxLife) continue;
    if (p.trail && p.trail.length > 12) p.trail.shift();
    p.trail?.push({ x: p.x, y: p.y });
    p.x += p.vx; p.y += p.vy;

    // Draw streak
    if (p.trail && p.trail.length > 1) {
      const len = p.trail.length;
      for (let i = 1; i < len; i++) {
        const ta = (i / len) * p.opacity * 0.9;
        ctx.beginPath();
        ctx.moveTo(p.trail[i - 1].x, p.trail[i - 1].y);
        ctx.lineTo(p.trail[i].x, p.trail[i].y);
        ctx.strokeStyle = p.color + Math.floor(ta * 255).toString(16).padStart(2, "0");
        ctx.lineWidth = p.radius;
        ctx.stroke();
      }
    }
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = p.color + Math.floor(p.opacity * 255).toString(16).padStart(2, "0");
    ctx.fill();
    alive.push(p);
  }
  particles.length = 0;
  particles.push(...alive);

  // Soft ground fog
  const fogGrd = ctx.createLinearGradient(0, h * 0.75, 0, h);
  fogGrd.addColorStop(0, "transparent");
  fogGrd.addColorStop(1, colors.primary + "08");
  ctx.fillStyle = fogGrd;
  ctx.fillRect(0, h * 0.75, w, h * 0.25);
}

// ── Main component ────────────────────────────────────────────────────────────

export function VibeCanvas({ mood, energy, visual }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const shockwavesRef = useRef<Array<{ r: number; alpha: number }>>([]);
  const frameRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  const stateRef = useRef({ mood, energy, visual });
  stateRef.current = { mood, energy, visual };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const draw = () => {
      timeRef.current += 0.016;
      const t = timeRef.current;
      const { mood, energy } = stateRef.current;
      const colors = VIBE_COLORS[mood];
      const w = canvas.width;
      const h = canvas.height;

      switch (mood) {
        case "chill":
          // Reset particles (not needed for aurora)
          particlesRef.current = [];
          drawAurora(ctx, w, h, t, energy, colors);
          break;
        case "building":
          drawNeuralWeb(ctx, w, h, t, energy, particlesRef.current, colors);
          break;
        case "peak":
          drawPeakExplosion(ctx, w, h, t, energy, particlesRef.current, colors, shockwavesRef.current);
          break;
        case "winding_down":
          drawWindingDown(ctx, w, h, t, energy, particlesRef.current, colors);
          break;
      }

      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frameRef.current);
      ro.disconnect();
    };
  }, []);

  // Clear particles on mood switch
  useEffect(() => {
    particlesRef.current = [];
    shockwavesRef.current = [];
  }, [mood]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ display: "block" }}
    />
  );
}
