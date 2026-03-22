"use client";
import { motion } from "framer-motion";
import { AGENT_CONFIGS } from "@/lib/constants";

type AgentName = keyof typeof AGENT_CONFIGS;

interface Props {
  agent: string;
  size?: "sm" | "md" | "lg";
  pulse?: boolean;
}

const SIZES = { sm: 32, md: 44, lg: 64 };

export function AgentAvatar({ agent, size = "md", pulse = false }: Props) {
  const config = AGENT_CONFIGS[agent as AgentName] ?? AGENT_CONFIGS.MoodAgent;
  const px = SIZES[size];

  return (
    <motion.div
      className="relative flex-shrink-0 flex items-center justify-center rounded-full font-bold"
      style={{
        width: px,
        height: px,
        background: `${config.color}22`,
        border: `1px solid ${config.color}66`,
        fontSize: px * 0.45,
        boxShadow: pulse ? `0 0 12px ${config.color}88` : undefined,
      }}
      animate={pulse ? { boxShadow: [`0 0 8px ${config.color}44`, `0 0 20px ${config.color}99`, `0 0 8px ${config.color}44`] } : {}}
      transition={{ duration: 1.5, repeat: Infinity }}
    >
      {config.emoji}
    </motion.div>
  );
}
