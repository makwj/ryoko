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
    <div className={`absolute pointer-events-none ${className}`} style={style}>
      {/* Cursor icon */}
      <div style={{ color, position: 'relative' }}>
        <MousePointer2 
          strokeWidth={2} 
          size={20} 
          className="drop-shadow-md"
          style={{ fill: color }}
        />
      </div>
      
      {/* Username label - positioned at bottom right of cursor */}
      <div
        className="absolute px-2 py-1 rounded text-xs whitespace-nowrap"
        style={{ 
          backgroundColor: color,
          color: '#fff',
          fontWeight: 500,
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
          top: '16px',
          left: '12px',
          transform: 'translate(0, 0)'
        }}
      >
        {name}
      </div>
    </div>
  );
}
