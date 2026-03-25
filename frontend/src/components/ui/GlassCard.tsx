import React from 'react';
import { motion } from 'framer-motion';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

const GlassCard: React.FC<GlassCardProps> = ({ children, className = "", delay = 0 }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ 
        y: -5,
        borderColor: 'rgba(79, 142, 247, 0.4)',
        boxShadow: '0 0 30px rgba(79, 142, 247, 0.15)'
      }}
      className={`bg-bg-surface/70 backdrop-blur-xl border border-border-subtle rounded-2xl p-6 transition-colors duration-300 ${className}`}
    >
      {children}
    </motion.div>
  );
};

export default GlassCard;
