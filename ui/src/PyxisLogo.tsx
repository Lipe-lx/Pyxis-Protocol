import React from 'react';

export const PyxisLogo = ({ size = 32, color = 'var(--accent-color)' }: { size?: number, color?: string }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      style={{ filter: 'drop-shadow(0 0 8px rgba(0, 242, 255, 0.4))' }}
    >
      {/* Outer Ring (The Box Frame) */}
      <rect x="10" y="10" width="80" height="80" rx="4" stroke={color} strokeWidth="2" opacity="0.3" />
      <rect x="5" y="5" width="90" height="90" rx="6" stroke={color} strokeWidth="1" opacity="0.1" />
      
      {/* Compass Outer Circle */}
      <circle cx="50" cy="50" r="35" stroke={color} strokeWidth="3" />
      
      {/* Compass Marks (N, S, E, W) */}
      <path d="M50 15V22M50 78V85M15 50H22M78 50H85" stroke={color} strokeWidth="2" strokeLinecap="round" />
      
      {/* The Compass Needle (The North Star Alignment) */}
      <path d="M50 25L58 50L50 75L42 50L50 25Z" fill={color} />
      <path d="M50 25L50 75" stroke="black" strokeWidth="0.5" opacity="0.3" />
      
      {/* Magic Box Glow / Constellation Stars */}
      <circle cx="25" cy="25" r="1.5" fill={color} opacity="0.8">
        <animate attributeName="opacity" values="0.2;1;0.2" dur="3s" repeatCount="indefinite" />
      </circle>
      <circle cx="75" cy="25" r="1.5" fill={color} opacity="0.6">
        <animate attributeName="opacity" values="0.2;1;0.2" dur="2.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="75" cy="75" r="1.5" fill={color} opacity="0.7">
        <animate attributeName="opacity" values="0.2;1;0.2" dur="4s" repeatCount="indefinite" />
      </circle>
      <circle cx="25" cy="75" r="1.5" fill={color} opacity="0.5">
        <animate attributeName="opacity" values="0.2;1;0.2" dur="3.5s" repeatCount="indefinite" />
      </circle>
      
      {/* Center Pivot */}
      <circle cx="50" cy="50" r="3" fill="black" stroke={color} strokeWidth="1" />
    </svg>
  );
};
