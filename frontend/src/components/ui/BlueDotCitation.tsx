import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface BlueDotCitationProps {
  number?: number;
  sourceText?: string;
  onClick?: () => void;
}

const BlueDotCitation: React.FC<BlueDotCitationProps> = ({ number, sourceText, onClick }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative inline-block mx-1 align-middle">
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.2 }}
        onClick={onClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="w-5 h-5 rounded-full bg-accent-primary flex items-center justify-center text-[10px] font-bold text-white shadow-[0_0_8px_rgba(79,142,247,0.6)] cursor-pointer hover:bg-accent-glow transition-colors"
      >
        {number || "·"}
      </motion.button>

      <AnimatePresence>
        {showTooltip && sourceText && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-bg-surface border border-accent-primary/30 rounded-lg shadow-2xl z-50 backdrop-blur-xl pointer-events-none"
          >
            <p className="text-[11px] font-mono text-text-muted leading-relaxed">
              <span className="text-accent-primary font-bold">Source Excerpt:</span><br/>
              "{sourceText}"
            </p>
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-bg-surface"></div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BlueDotCitation;
