import React from 'react';
import { motion } from 'framer-motion';

const EduGenLogo = ({ size = "md", className = "" }: { size?: "sm" | "md" | "lg", className?: string }) => {
  const sizes = {
    sm: { text: "text-lg", icon: 20 },
    md: { text: "text-2xl", icon: 32 },
    lg: { text: "text-4xl", icon: 48 }
  };

  const { text, icon } = sizes[size];

  return (
    <div className={`flex items-center gap-3 cursor-pointer group ${className}`}>
      {/* Orbital Icon */}
      <div className="relative" style={{ width: icon, height: icon }}>
        {/* Outer Ring */}
        <motion.div 
          className="absolute inset-0 border-[1.5px] border-accent-primary/40 rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        />
        {/* Core Pulsing Dot */}
        <motion.div 
          className="absolute inset-[30%] bg-accent-primary rounded-full shadow-[0_0_12px_rgba(79,142,247,0.8)]"
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.8, 1, 0.8]
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Orbital Electron */}
        <motion.div 
          className="absolute top-0 left-1/2 -ml-[3px] w-[6px] h-[6px] bg-accent-glow rounded-full"
          animate={{ rotate: 360 }}
          style={{ transformOrigin: `0 ${icon/2}px` }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        />
      </div>

      {/* Brand Text */}
      <div className={`${text} tracking-tight select-none`}>
        <span className="font-extralight text-text-muted">Edu</span>
        <span className="font-bold text-white transition-colors group-hover:text-accent-primary">Gen</span>
      </div>
    </div>
  );
};

export default EduGenLogo;
