import React from 'react';
import { motion } from 'framer-motion';

interface GlowButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  className?: string;
}

const GlowButton: React.FC<GlowButtonProps> = ({ 
  children, 
  variant = 'primary', 
  className = "", 
  onClick,
  ...props 
}) => {
  const baseStyles = "relative overflow-hidden font-display font-semibold transition-all duration-300 rounded-full active:scale-95";
  
  const variants = {
    primary: "bg-accent-primary text-white shadow-[0_0_20px_rgba(79,142,247,0.3)] hover:shadow-[0_0_30px_rgba(79,142,247,0.5)]",
    secondary: "bg-accent-secondary text-white shadow-[0_0_20px_rgba(124,58,237,0.3)] hover:shadow-[0_0_30px_rgba(124,58,237,0.5)]",
    ghost: "bg-bg-elevated/50 text-text-muted border border-border-subtle hover:bg-bg-elevated hover:text-white"
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.98 }}
      className={`${baseStyles} ${variants[variant]} ${className}`}
      onClick={onClick}
      {...(props as any)}
    >
      <div className="relative z-10 flex items-center justify-center gap-2 px-8 py-3">
        {children}
      </div>
      
      {/* Shimmer Sweep Effect */}
      <motion.div 
        className="absolute top-0 -left-[100%] w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-[25deg]"
        initial={{ left: '-100%' }}
        whileHover={{ left: '150%' }}
        transition={{ duration: 1, ease: "easeInOut" }}
      />
    </motion.button>
  );
};

export default GlowButton;
