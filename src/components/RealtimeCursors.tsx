/**
 * RealtimeCursors Component
 * 
 * Displays live cursors of other users collaborating on the same trip in real-time.
 * Uses Supabase Realtime to track cursor positions and movements across users.
 * Converts normalized coordinates to pixel positions for accurate cursor display.
 * Provides visual feedback for collaborative editing sessions.
 */

'use client'

import { useRealtimeCursors } from '@/hooks/use-realtime-cursors'
import { useEffect, useMemo } from 'react'
import CustomCursor from '@/components/CustomCursor'

const THROTTLE_MS = 50

export const RealtimeCursors = ({ 
  roomName, 
  username, 
  userId 
}: { 
  roomName: string
  username: string
  userId?: string
}) => {
  const { cursors } = useRealtimeCursors({ 
    roomName, 
    username, 
    userId,
    throttleMs: THROTTLE_MS
  })

  // Debug: Log cursor state
  useEffect(() => {
    if (Object.keys(cursors).length > 0) {
      console.log('[RealtimeCursors] Active cursors:', Object.keys(cursors).length, cursors)
    }
  }, [cursors])

  // Calculate pixel positions from canvas-normalized coordinates
  const adjustedCursors = useMemo(() => {
    const mainContent = document.querySelector('[data-main-content]') as HTMLElement
    if (!mainContent) return []

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
      // Use the canvas dimensions from the cursor payload if available, otherwise use current dimensions
      const canvasWidth = cursor.canvas?.scrollWidth || mainContent.scrollWidth || mainContent.clientWidth
      const canvasHeight = cursor.canvas?.scrollHeight || mainContent.scrollHeight || mainContent.clientHeight
      
      const docX = cursor.position.xNorm * canvasWidth
      const docY = cursor.position.yNorm * canvasHeight
      
      // Convert to coordinates relative to the cursor container
      // The container is `absolute inset-0` relative to mainContent, so coordinates are relative to mainContent
      // We need to account for scroll position
      const adjustedX = docX - mainContent.scrollLeft
      const adjustedY = docY - mainContent.scrollTop

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
