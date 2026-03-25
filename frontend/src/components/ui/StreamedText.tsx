import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface StreamedTextProps {
  text: string;
  speed?: number;
  className?: string;
  onComplete?: () => void;
}

const StreamedText: React.FC<StreamedTextProps> = ({ 
  text, 
  speed = 15, 
  className = "", 
  onComplete 
}) => {
  const [displayedText, setDisplayedText] = useState("");
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    let index = 0;
    setDisplayedText("");
    setIsComplete(false);

    const timer = setInterval(() => {
      setDisplayedText(text.slice(0, index + 1));
      index++;
      if (index >= text.length) {
        clearInterval(timer);
        setIsComplete(true);
        if (onComplete) onComplete();
      }
    }, speed);

    return () => clearInterval(timer);
  }, [text, speed, onComplete]);

  return (
    <span className={className}>
      {displayedText}
      {!isComplete && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.8, repeat: Infinity }}
          className="inline-block w-1 h-[1.1em] bg-accent-glow ml-1 align-middle shadow-[0_0_8px_rgba(56,189,248,0.6)]"
        />
      )}
    </span>
  );
};

export default StreamedText;
