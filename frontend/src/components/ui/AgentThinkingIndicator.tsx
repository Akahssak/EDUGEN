import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const phases = [
  { text: "Detecting Intent...", color: "text-accent-glow" },
  { text: "Retrieving Context...", color: "text-accent-primary" },
  { text: "Generating...", color: "text-accent-secondary" }
];

const AgentThinkingIndicator: React.FC = () => {
  const [phaseIndex, setPhaseIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPhaseIndex((prev) => (prev + 1) % phases.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-bg-elevated/80 border border-border-subtle shadow-[0_0_15px_rgba(56,189,248,0.1)] w-fit">
      <div className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-glow opacity-75"></span>
        <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-glow"></span>
      </div>
      
      <div className="h-4 overflow-hidden min-w-[140px]">
        <AnimatePresence mode="wait">
          <motion.span
            key={phaseIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className={`text-xs font-mono font-medium block ${phases[phaseIndex].color}`}
          >
            {phases[phaseIndex].text}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AgentThinkingIndicator;
