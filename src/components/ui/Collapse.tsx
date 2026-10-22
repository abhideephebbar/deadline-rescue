import React from 'react';
import { AnimatePresence, m } from 'motion/react';

interface CollapseProps {
  isOpen: boolean;
  children: React.ReactNode;
  className?: string;
  duration?: number;
}

export const Collapse: React.FC<CollapseProps> = ({
  isOpen,
  children,
  className = '',
  duration = 0.24,
}) => {
  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <m.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration, ease: [0.22, 1, 0.36, 1] }}
          style={{ overflow: 'hidden' }}
          className={className}
        >
          {children}
        </m.div>
      )}
    </AnimatePresence>
  );
};
