import { supabase } from '@/lib/supabase'
import { RealtimeChannel } from '@supabase/supabase-js'
import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Throttle a callback to a certain delay, It will only call the callback if the delay has passed, with the arguments
 * from the last call
 */
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

const generateRandomColor = () => `hsl(${Math.floor(Math.random() * 360)}, 100%, 70%)`

const generateRandomNumber = () => Math.floor(Math.random() * 100)

const EVENT_NAME = 'realtime-cursor-move'

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

export const useRealtimeCursors = ({
  roomName,
  username,
  throttleMs,
}: {
  roomName: string
  username: string
  throttleMs: number
}) => {
  const [color] = useState(generateRandomColor())
  const [userId] = useState(generateRandomNumber())
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

      channelRef.current?.send({
        type: 'broadcast',
        event: EVENT_NAME,
        payload: payload,
      })
    },
    [color, userId, username]
  )

  const handleMouseMove = useThrottleCallback(callback, throttleMs)

  useEffect(() => {
    // Clear cursors when room changes to prevent showing stale cursors
    setCursors({})
    
    const channel = supabase.channel(roomName)
    channelRef.current = channel

    // Track active users in this room
    const activeUsers = new Set<string>()

    channel
      .on('broadcast', { event: EVENT_NAME }, (data: { payload: CursorEventPayload }) => {
        const { user } = data.payload
        // Don't render your own cursor
        if (user.id === userId) return

        activeUsers.add(user.id.toString())

        setCursors((prev) => {
          if (prev[userId]) {
            delete prev[userId]
          }

          return {
            ...prev,
            [user.id]: data.payload,
          }
        })
      })
      .subscribe()

    // Cleanup stale cursors periodically
    const cleanupInterval = setInterval(() => {
      setCursors((prev) => {
        const updated = { ...prev }
        let hasChanges = false

        // Remove cursors for users who haven't sent updates recently
        Object.keys(updated).forEach(userId => {
          const cursor = updated[userId]
          const now = Date.now()
          const timeSinceUpdate = now - cursor.timestamp
          
          // Remove cursor if no update in last 2 seconds
          if (timeSinceUpdate > 2000) {
            delete updated[userId]
            hasChanges = true
          }
        })

        return hasChanges ? updated : prev
      })
    }, 1000) // Check every second

    return () => {
      channel.unsubscribe()
      clearInterval(cleanupInterval)
    }
  }, [roomName, userId])

  useEffect(() => {
    // Add event listener for mousemove
    window.addEventListener('mousemove', handleMouseMove)

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
    window.addEventListener('scroll', handleScroll)

    // Cleanup on unmount
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('scroll', handleScroll)
      clearTimeout(resizeTimeout)
      clearTimeout(scrollTimeout)
    }
  }, [handleMouseMove])

  return { cursors }
}
