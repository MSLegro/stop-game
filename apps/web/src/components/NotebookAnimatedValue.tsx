import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface NotebookAnimatedValueProps {
  value: number | string;
  suffix?: string;
  className?: string;
}

export const NotebookAnimatedValue: React.FC<NotebookAnimatedValueProps> = ({
  value,
  suffix = '',
  className = '',
}) => {
  const [displayValue, setDisplayValue] = useState(value);
  const [prevValue, setPrevValue] = useState<number | string | null>(null);
  const isInitial = useRef(true);

  useEffect(() => {
    if (isInitial.current) {
      isInitial.current = false;
      setDisplayValue(value);
      return;
    }

    if (value !== displayValue) {
      setPrevValue(displayValue);
      // Wait for the strike-through line animation before writing the new number
      const timer = setTimeout(() => {
        setDisplayValue(value);
        setPrevValue(null);
      }, 260);
      return () => clearTimeout(timer);
    }
  }, [value, displayValue]);

  return (
    <div className={`inline-flex items-center gap-1.5 font-hand font-black ${className}`}>
      <div className="relative inline-block px-1">
        <AnimatePresence mode="popLayout">
          {prevValue !== null ? (
            <motion.div
              key={`prev-${prevValue}`}
              initial={{ opacity: 1, scale: 1 }}
              animate={{ opacity: 0.6, scale: 0.95 }}
              exit={{ opacity: 0 }}
              className="relative inline-block text-ink-500"
            >
              <span>{prevValue}</span>
              {/* Línea de tachado con bolígrafo rojo */}
              <motion.svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
              >
                <motion.line
                  x1="0"
                  y1="65"
                  x2="100"
                  y2="35"
                  stroke="#ef4444"
                  strokeWidth="10"
                  strokeLinecap="round"
                />
              </motion.svg>
            </motion.div>
          ) : (
            <motion.span
              key={`curr-${displayValue}`}
              initial={{ scale: 1.4, rotate: -6, opacity: 0, filter: 'blur(2px)' }}
              animate={{ scale: 1, rotate: [-6, 3, 0], opacity: 1, filter: 'blur(0px)' }}
              transition={{ type: 'spring', stiffness: 450, damping: 18 }}
              className="inline-block text-blue-900 drop-shadow-[1px_1px_0px_#93c5fd]"
            >
              {displayValue}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      {suffix && <span className="font-hand font-bold text-ink-700">{suffix}</span>}
    </div>
  );
};
