/**
 * RealtimeCursors Component
 * 
 * Displays live cursors of other users collaborating on the same trip in real-time.
 * Uses Supabase Realtime to track cursor positions and movements across users.
 * Converts normalized coordinates to pixel positions for accurate cursor display.
 * Provides visual feedback for collaborative editing sessions.
 */

'use client'

import { Cursor } from '@/components/Cursor'
import { useRealtimeCursors } from '@/hooks/use-realtime-cursors'
import { useMemo } from 'react'
import CustomCursor from '@/components/CustomCursor'

const THROTTLE_MS = 50

export const RealtimeCursors = ({ roomName, username }: { roomName: string; username: string }) => {
  const { cursors } = useRealtimeCursors({ roomName, username, throttleMs: THROTTLE_MS })

  // Calculate pixel positions from canvas-normalized coordinates
  const adjustedCursors = useMemo(() => {
    const mainContent = document.querySelector('[data-main-content]') as HTMLElement
    const canvas = mainContent || document.documentElement
    const rect = canvas.getBoundingClientRect()

    return Object.keys(cursors).map((id) => {
      const cursor = cursors[id]

      // Fallback for cursors without normalized position info (backward compatibility)
      if (!cursor.position || typeof cursor.position.xNorm === 'undefined') {
        return {
          id,
          ...cursor,
          adjustedPosition: {
            x: 0,
            y: 0,
          },
        }
      }

      // Reconstruct absolute canvas coordinates from normalized values
      const docX = cursor.position.xNorm * canvas.scrollWidth
      const docY = cursor.position.yNorm * canvas.scrollHeight
      
      // Convert to viewport coordinates for positioning
      const adjustedX = docX - canvas.scrollLeft
      const adjustedY = docY - canvas.scrollTop

      return {
        id,
        ...cursor,
        adjustedPosition: {
          x: adjustedX,
          y: adjustedY,
        },
      }
    })
  }, [cursors])

  return (
    <div className="absolute inset-0 pointer-events-none z-50">
      {adjustedCursors.map((cursor) => (
        <CustomCursor
          key={cursor.id}
          className="absolute transition-transform ease-in-out"
          style={{
            transitionDuration: '20ms',
            left: `${cursor.adjustedPosition.x}px`,
            top: `${cursor.adjustedPosition.y}px`,
            transform: 'translate(-50%, -50%)',
          }}
          color={cursor.color}
          name={cursor.user.name}
        />
      ))}
    </div>
  )
}
