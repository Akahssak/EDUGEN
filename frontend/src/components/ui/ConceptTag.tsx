import React from 'react';
import { motion } from 'framer-motion';

export const ConceptTag: React.FC<{ text: string }> = ({ text }) => {
  return (
    <motion.div
      whileHover={{ scale: 1.05, borderColor: 'rgba(79, 142, 247, 0.5)' }}
      className="inline-flex items-center px-3 py-1 bg-bg-elevated/50 border border-border-subtle rounded-full text-[11px] font-mono text-accent-primary cursor-default transition-colors"
    >
      <span className="mr-1.5 w-1.5 h-1.5 bg-accent-primary rounded-full shadow-[0_0_8px_rgba(79,142,247,0.8)]"></span>
      {text}
    </motion.div>
  );
};

export const PulsingDot: React.FC<{ color?: string }> = ({ color = "bg-success" }) => {
  const glowVariants: Record<string, string> = {
    "bg-success": "shadow-[0_0_8px_rgba(16,185,129,0.8)]",
    "bg-accent-glow": "shadow-[0_0_8px_rgba(56,189,248,0.8)]",
    "bg-warning": "shadow-[0_0_8px_rgba(245,158,11,0.8)]"
  };

  return (
    <div className="relative flex h-2 w-2">
      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${color} opacity-75`}></span>
      <span className={`relative inline-flex h-2 w-2 rounded-full ${color} ${glowVariants[color] || ""}`}></span>
    </div>
  );
};
