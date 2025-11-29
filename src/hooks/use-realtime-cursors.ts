/**
 * useRealtimeCursors Hook
 * 
 * Custom React hook for managing real-time cursor tracking in collaborative sessions.
 * Uses Supabase Realtime to track cursor positions and movements across users.
 * Includes throttling to prevent excessive updates and coordinate normalization.
 * Provides cursor data for the RealtimeCursors component to display live cursors.
 */

import { supabase } from '@/lib/supabase'
import { RealtimeChannel } from '@supabase/supabase-js'
import { useCallback, useEffect, useRef, useState } from 'react'

// Throttle a callback to a certain delay, It will only call the callback if the delay has passed,
// with the arguments from the last call
// This is used to prevent the cursor from being updated too frequently
const useThrottleCallback = <Params extends unknown[], Return>(
  callback: (...args: Params) => Return,
  delay: number
) => {
  const lastCall = useRef(0)
  const timeout = useRef<NodeJS.Timeout | null>(null)

  return useCallback(
    (...args: Params) => {
      const now = Date.now()
      const remainingTime = delay - (now - lastCall.current)

      if (remainingTime <= 0) {
        if (timeout.current) {
          clearTimeout(timeout.current)
          timeout.current = null
        }
        lastCall.current = now
        callback(...args)
      } else if (!timeout.current) {
        timeout.current = setTimeout(() => {
          lastCall.current = Date.now()
          timeout.current = null
          callback(...args)
        }, remainingTime)
      }
    },
    [callback, delay]
  )
}

// Generate a random color for the cursor (darker colors for better visibility)
const generateRandomColor = () => `hsl(${Math.floor(Math.random() * 360)}, 100%, 45%)`

// Generate a unique ID from a string (like user ID)
const generateIdFromString = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// The event name for the cursor move
const EVENT_NAME = 'realtime-cursor-move'

// The payload for the cursor move event
type CursorEventPayload = {
  position: {
    xNorm: number
    yNorm: number
  }
  canvas: {
    scrollWidth: number
    scrollHeight: number
  }
  user: {
    id: number
    name: string
  }
  color: string
  timestamp: number
}

// The hook for the realtime cursors
export const useRealtimeCursors = ({
  roomName,
  username,
  userId: providedUserId,
  throttleMs,
}: {
  roomName: string
  username: string
  userId?: string
  throttleMs: number
}) => {
  const [color] = useState(generateRandomColor())
  // Use provided user ID or generate from username
  const [userId] = useState(() => {
    if (providedUserId) {
      return generateIdFromString(providedUserId)
    }
    return generateIdFromString(username + Date.now())
  })
  const [cursors, setCursors] = useState<Record<string, CursorEventPayload>>({})

  const channelRef = useRef<RealtimeChannel | null>(null)

  const callback = useCallback(
    (event: MouseEvent) => {
      const { clientX, clientY } = event
      
      // Store the last mouse event for scroll/resize rebroadcasting
      ;(window as any).lastMouseEvent = event
      
      // Use the main content area as the shared canvas
      const mainContent = document.querySelector('[data-main-content]') as HTMLElement
      const canvas = mainContent || document.documentElement
      const rect = canvas.getBoundingClientRect()
      
      // Calculate absolute canvas coordinates (including scroll)
      const docX = canvas.scrollLeft + (clientX - rect.left)
      const docY = canvas.scrollTop + (clientY - rect.top)
      
      // Normalize to [0..1] based on canvas scroll dimensions
      const xNorm = Math.max(0, Math.min(1, docX / canvas.scrollWidth))
      const yNorm = Math.max(0, Math.min(1, docY / canvas.scrollHeight))

      const payload: CursorEventPayload = {
        position: {
          xNorm,
          yNorm,
        },
        canvas: {
          scrollWidth: canvas.scrollWidth,
          scrollHeight: canvas.scrollHeight,
        },
        user: {
          id: userId,
          name: username,
        },
        color: color,
        timestamp: new Date().getTime(),
      }

      if (channelRef.current) {
        const channelState = channelRef.current.state
        if (channelState !== 'joined') {
          console.warn('[useRealtimeCursors] Channel not in joined state:', channelState, 'room:', roomName)
        }
        
        channelRef.current.send({
          type: 'broadcast',
          event: EVENT_NAME,
          payload: payload,
        }).then((status) => {
          if (status === 'error') {
            console.error('[useRealtimeCursors] Broadcast error, channel state:', channelRef.current?.state)
          } else {
            // Log first few broadcasts to verify they're working
            if (Math.random() < 0.1) {
              console.log('[useRealtimeCursors] Broadcast sent successfully, status:', status)
            }
          }
        }).catch((error) => {
          console.error('[useRealtimeCursors] Broadcast exception:', error, 'channel state:', channelRef.current?.state)
        })
      } else {
        console.warn('[useRealtimeCursors] Channel not available for broadcast')
      }
    },
    [color, userId, username]
  )

  // The callback for the mouse move event
  const handleMouseMove = useThrottleCallback(callback, throttleMs)

  useEffect(() => {
    // Unsubscribe from previous channel if room changed
    if (channelRef.current) {
      console.log('[useRealtimeCursors] Unsubscribing previous channel:', roomName)
      channelRef.current.unsubscribe()
      channelRef.current = null
    }

    // Clear cursors when room changes to prevent showing stale cursors
    setCursors({})
    
    console.log('[useRealtimeCursors] Setting up channel:', roomName, 'userId:', userId)
    const channel = supabase.channel(roomName)
    channelRef.current = channel

    // Track active users in this room
    const activeUsers = new Set<string>()

    let subscribed = false

    channel
      .on('broadcast', { event: EVENT_NAME }, (data: { payload: CursorEventPayload }) => {
        const { user } = data.payload
        console.log('[useRealtimeCursors] Received cursor broadcast:', {
          receivedUserId: user.id,
          ownUserId: userId,
          username: user.name,
          roomName
        })
        
        // Don't render your own cursor
        if (user.id === userId) {
          console.log('[useRealtimeCursors] Ignoring own cursor')
          return
        }

        activeUsers.add(user.id.toString())

        setCursors((prev) => {
          // Remove own cursor if it exists (shouldn't happen, but safety check)
          const updated = { ...prev }
          if (updated[userId]) {
            delete updated[userId]
          }

          // Add/update the other user's cursor
          const newCursors = {
            ...updated,
            [user.id]: data.payload,
          }
          console.log('[useRealtimeCursors] Updated cursors:', Object.keys(newCursors))
          return newCursors
        })
      })
      .subscribe((status) => {
        console.log('[useRealtimeCursors] Channel subscription status:', status, roomName)
        if (status === 'SUBSCRIBED') {
          subscribed = true
          console.log('[useRealtimeCursors] Channel subscribed successfully:', roomName)
          // Send an initial cursor position to announce presence
          const mainContent = document.querySelector('[data-main-content]') as HTMLElement
          if (mainContent) {
            const event = new MouseEvent('mousemove', {
              clientX: window.innerWidth / 2,
              clientY: window.innerHeight / 2,
            })
            callback(event)
          }
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[useRealtimeCursors] Channel error:', roomName)
        } else if (status === 'TIMED_OUT') {
          console.error('[useRealtimeCursors] Channel timeout:', roomName)
        } else if (status === 'CLOSED') {
          console.warn('[useRealtimeCursors] Channel closed:', roomName, 'subscribed was:', subscribed)
          // Note: Channel closing is normal when component unmounts or room changes
          // We don't need to resubscribe here as the effect will handle it
        }
      })

    // Cleanup stale cursors periodically
    const cleanupInterval = setInterval(() => {
      setCursors((prev) => {
        const updated = { ...prev }
        let hasChanges = false

        // Remove cursors for users who haven't sent updates recently
        Object.keys(updated).forEach(cursorUserId => {
          const cursor = updated[cursorUserId]
          const now = Date.now()
          const timeSinceUpdate = now - cursor.timestamp
          
          // Remove cursor if no update in last 2 seconds
          if (timeSinceUpdate > 2000) {
            delete updated[cursorUserId]
            hasChanges = true
          }
        })

        return hasChanges ? updated : prev
      })
    }, 1000) // Check every second

    return () => {
      console.log('[useRealtimeCursors] Cleaning up channel:', roomName)
      if (channelRef.current === channel) {
        channel.unsubscribe()
        channelRef.current = null
      }
      clearInterval(cleanupInterval)
    }
  }, [roomName, userId])

  useEffect(() => {
    console.log('[useRealtimeCursors] Setting up mouse tracking, channel available:', !!channelRef.current)
    
    // Add event listener for mousemove
    const mainContent = document.querySelector('[data-main-content]') as HTMLElement
    const targetElement = mainContent || window
    
    const mouseMoveHandler = (event: MouseEvent) => {
      if (channelRef.current) {
        handleMouseMove(event)
      }
    }
    
    targetElement.addEventListener('mousemove', mouseMoveHandler)

    // Handle window resize to update viewport info (debounced)
    let resizeTimeout: NodeJS.Timeout
    const handleResize = () => {
      clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(() => {
        // Trigger a cursor update with current position to broadcast new viewport size
        const event = new MouseEvent('mousemove', {
          clientX: window.innerWidth / 2,
          clientY: window.innerHeight / 2,
        })
        handleMouseMove(event)
      }, 100) // Debounce resize events
    }

    // Handle scroll to update cursor position (debounced)
    let scrollTimeout: NodeJS.Timeout
    const handleScroll = () => {
      clearTimeout(scrollTimeout)
      scrollTimeout = setTimeout(() => {
        // Get current mouse position and rebroadcast with new scroll context
        const lastMouseEvent = (window as any).lastMouseEvent
        if (lastMouseEvent) {
          handleMouseMove(lastMouseEvent)
        }
      }, 50) // Debounce scroll events
    }

    window.addEventListener('resize', handleResize)
    
    // Listen to scroll on the main content element if it exists
    const scrollElement = mainContent || window
    scrollElement.addEventListener('scroll', handleScroll, true)

    // Cleanup on unmount
    return () => {
      targetElement.removeEventListener('mousemove', mouseMoveHandler)
      window.removeEventListener('resize', handleResize)
      scrollElement.removeEventListener('scroll', handleScroll, true)
      clearTimeout(resizeTimeout)
      clearTimeout(scrollTimeout)
    }
  }, [handleMouseMove])

  return { cursors }
}

