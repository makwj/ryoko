/**
 * CustomCursor Component
 * 
 * Enhanced cursor display component with visual effects and styling.
 * Features cursor trail effects, custom styling, and improved visual feedback.
 * Used by the RealtimeCursors system for better user experience during collaboration.
 */

"use client";

import { MousePointer2 } from "lucide-react";

interface CustomCursorProps {
  color: string;
  name: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function CustomCursor({ color, name, className = "", style }: CustomCursorProps) {
  return (
    <div className={`absolute pointer-events-none flex flex-col items-start ${className}`} style={style}>
      {/* Cursor trail effect */}
      <div 
        className="absolute w-3 h-3 rounded-full opacity-40"
        style={{ 
          backgroundColor: color,
          transform: 'translate(-50%, -50%)',
          filter: 'blur(3px)'
        }}
      />
      
      {/* Cursor icon */}
      <div style={{ color }}>
        <MousePointer2 strokeWidth={1.5} size={24} className="drop-shadow-md" />
      </div>
      
      {/* Username label */}
      <div
        className="mt-2 px-2 py-1 rounded text-xs whitespace-nowrap"
        style={{ 
          backgroundColor: color,
          color: '#fff',
          fontWeight: 500,
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
        }}
      >
        {name}
      </div>
    </div>
  );
}
