import React from 'react';

export interface GlassProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  className?: string;
  variant?: 'blur' | 'solid';
  interactive?: boolean;
}

export const Glass: React.FC<GlassProps> = ({
  children,
  className = '',
  variant = 'blur',
  interactive = false,
  style,
  ...props
}) => {
  const isBlur = variant === 'blur';

  return (
    <div
      className={`rounded-[24px] border border-white/[0.12] shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] text-zinc-100 ${
        isBlur
          ? 'bg-[rgba(10,10,14,0.55)] backdrop-blur-[20px] backdrop-saturate-[140%] supports-[not(backdrop-filter:blur(20px))]:bg-[#131317]'
          : 'bg-[#15151a] border-white/[0.08]'
      } ${
        interactive
          ? 'transition-all duration-200 hover:border-white/[0.22] hover:shadow-[0_12px_40px_0_rgba(0,0,0,0.45)]'
          : ''
      } ${className}`}
      style={style}
      {...props}
    >
      {children}
    </div>
  );
};
