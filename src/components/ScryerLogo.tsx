import React from 'react';

interface ScryerLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

export function ScryerLogo({ size = 28, className = '', showText = true }: ScryerLogoProps) {
  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-transform duration-200 hover:scale-105 drop-shadow-[0_2px_10px_rgba(255,255,255,0.2)]"
      >
        <path
          d="M 86 14 C 62 17 38 23 26 38 C 15 51 19 64 34 72 C 48 79 70 78 76 86 C 81 93 68 98 20 96 C 44 94 62 89 62 81 C 62 73 38 69 24 59 C 11 49 10 35 24 23 C 38 11 65 11 86 14 Z"
          fill="#FFFFFF"
        />
      </svg>
      {showText && (
        <span className="text-[16px] font-black tracking-[0.08em] text-white">
          SCRYER
        </span>
      )}
    </div>
  );
}
