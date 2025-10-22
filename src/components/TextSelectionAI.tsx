/**
 * TextSelectionAI Component
 * 
 * An AI-powered chat interface that appears when users select text in the trip planning interface.
 * Provides contextual assistance and recommendations based on selected content.
 * Integrates with Google Gemini API to offer intelligent suggestions for activities, places, and planning.
 * Features a floating chat bubble with conversation history and real-time AI responses.
 */

"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, X, Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface HoveredLocation {
  text: string;
  rect: DOMRect;
  context: string; // 'itinerary', 'ideas', 'recommendations'
}

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  selectedText: string;
  timestamp: Date;
}

interface TextSelectionAIProps {
  children: React.ReactNode;
  context: 'itinerary' | 'ideas' | 'recommendations';
  tripData?: {
    destination: string;
    interests: string[];
    numberOfDays: number;
    numberOfParticipants: number;
    startDate: string;
  };
}

const PREDEFINED_QUESTIONS = [
  {
    id: 'nearby',
    text: "What's there to do around here?",
    icon: '📍'
  },
  {
    id: 'food',
    text: 'Where should I eat nearby?',
    icon: '🍽️'
  },
  {
    id: 'transport',
    text: 'How do I get around this area?',
    icon: '🚌'
  },
  {
    id: 'timing',
    text: 'What are the best times to visit?',
    icon: '⏰'
  },
  {
    id: 'tips',
    text: 'Any insider tips for this place?',
    icon: '💡'
  },
  {
    id: 'cost',
    text: 'What are the typical costs here?',
    icon: '💰'
  },
  {
    id: 'weather',
    text: 'What is the weather like?',
    icon: '🌤️'
  },
  {
    id: 'culture',
    text: 'What should I know about local culture?',
    icon: '🎭'
  }
];

export default function TextSelectionAI({ 
  children, 
  context, 
  tripData 
}: TextSelectionAIProps) {
  const [hoveredLocation, setHoveredLocation] = useState<HoveredLocation | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarPosition, setSidebarPosition] = useState({ top: 0, right: 0 });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Handle mouse hover on location elements
  const handleMouseOver = useCallback((event: MouseEvent) => {
    // Don't interfere with sidebar if it's open
    if (showSidebar) {
      return;
    }

    const target = event.target as HTMLElement;
    if (!target) return;

    // Check if the hovered element has location data
    const locationText = target.getAttribute('data-location');
    
    if (locationText) {
      const rect = target.getBoundingClientRect();
      
      setHoveredLocation({
        text: locationText,
        rect,
        context
      });
      setShowTooltip(true);
    } else {
      setHoveredLocation(null);
      setShowTooltip(false);
    }
  }, [context, showSidebar]);

  const handleMouseOut = useCallback((event: MouseEvent) => {
    // Don't hide if moving to tooltip
    if (tooltipRef.current && tooltipRef.current.contains(event.relatedTarget as Node)) {
      return;
    }
    
    setHoveredLocation(null);
    setShowTooltip(false);
  }, []);

  // Handle click outside to hide tooltip
  const handleClickOutside = useCallback((event: MouseEvent) => {
    // Don't hide if clicking inside the sidebar
    if (sidebarRef.current && sidebarRef.current.contains(event.target as Node)) {
      return;
    }
    
    // Don't hide if clicking inside the tooltip
    if (tooltipRef.current && tooltipRef.current.contains(event.target as Node)) {
      return;
    }
    
    // Hide tooltip if clicking outside both tooltip and sidebar
    if (showTooltip && tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
      setShowTooltip(false);
      setHoveredLocation(null);
    }
  }, [showTooltip]);

  // Position tooltip
  useEffect(() => {
    if (hoveredLocation && showTooltip) {
      const tooltip = tooltipRef.current;
      if (tooltip) {
        const tooltipRect = tooltip.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Position directly above the location element
        let left = hoveredLocation.rect.left + hoveredLocation.rect.width / 2 - tooltipRect.width / 2;
        let top = hoveredLocation.rect.top - tooltipRect.height - 12;
        
        // Adjust if tooltip goes off screen horizontally
        if (left < 8) left = 8;
        if (left + tooltipRect.width > viewportWidth - 8) {
          left = viewportWidth - tooltipRect.width - 8;
        }
        
        // If tooltip would go off screen above, position it below
        if (top < 8) {
          top = hoveredLocation.rect.bottom + 12;
        }
        
        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
      }
    }
  }, [hoveredLocation, showTooltip]);

  // Position sidebar
  useEffect(() => {
    if (showSidebar) {
      const sidebar = sidebarRef.current;
      if (sidebar) {
        const sidebarRect = sidebar.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        
        const top = Math.max(20, (viewportHeight - sidebarRect.height) / 2);
        const right = 20;
        
        setSidebarPosition({ top, right });
      }
    }
  }, [showSidebar]);

  // Event listeners
  useEffect(() => {
    console.log('Setting up hover listeners'); // Debug log
    const container = containerRef.current;
    if (container) {
      container.addEventListener('mouseover', handleMouseOver);
      container.addEventListener('mouseout', handleMouseOut);
    }
    document.addEventListener('click', handleClickOutside);
    
    return () => {
      console.log('Cleaning up hover listeners'); // Debug log
      if (container) {
        container.removeEventListener('mouseover', handleMouseOver);
        container.removeEventListener('mouseout', handleMouseOut);
      }
      document.removeEventListener('click', handleClickOutside);
    };
  }, [handleMouseOver, handleMouseOut, handleClickOutside]);

  // Send message to AI
  const sendMessage = async (question: string) => {
    if (!hoveredLocation || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: question,
      selectedText: hoveredLocation.text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat-recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripData,
          question,
          selectedPlace: {
            name: hoveredLocation.text,
            location: hoveredLocation.text,
            description: `Selected from ${context} section`
          }
        })
      });

      const data = await response.json();

      if (data.success) {
        const aiMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          content: data.response,
          selectedText: hoveredLocation.text,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiMessage]);
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: 'Sorry, I encountered an error. Please try again.',
        selectedText: hoveredLocation.text,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAskAIClick = () => {
    if (hoveredLocation) {
      setShowTooltip(false);
      setShowSidebar(true);
      // Keep hovered location for sidebar context
    }
  };

  const closeSidebar = () => {
    setShowSidebar(false);
    setMessages([]);
    setHoveredLocation(null);
  };

  const startNewChat = () => {
    setMessages([]);
  };

  return (
    <>
      <div ref={containerRef} className="relative">
        {children}
      </div>

      {/* AI Chat Sidebar */}
      {showSidebar && hoveredLocation && (
        <div
          ref={sidebarRef}
          className="fixed z-[9998] w-80 bg-white border border-gray-200 rounded-lg shadow-xl"
          style={{
            top: `${sidebarPosition.top}px`,
            right: `${sidebarPosition.right}px`,
            height: '600px',
            maxHeight: '80vh'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-3 h-3 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 text-sm">
                    Ask about "{hoveredLocation.text}"
                  </h4>
                  <p className="text-xs text-gray-500">
                    From {context} section
                  </p>
                </div>
              </div>
              <button
                onClick={closeSidebar}
                className="p-1 hover:bg-gray-100 rounded-md transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 flex-1 overflow-hidden flex flex-col">
            {messages.length === 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-600 mb-4">
                  Ask questions about <strong>"{hoveredLocation.text}"</strong>
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {PREDEFINED_QUESTIONS.map((question) => (
                    <button
                      key={question.id}
                      onClick={() => sendMessage(question.text)}
                      className="text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{question.icon}</span>
                        <span>{question.text}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col">
                <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                          message.type === 'user'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{message.content}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {message.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}

                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-3 h-3 animate-spin text-gray-500" />
                          <span className="text-xs text-gray-500">Thinking...</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* New Chat Button */}
                <div className="border-t border-gray-200 pt-3">
                  <button
                    onClick={startNewChat}
                    className="w-full py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm"
                  >
                    Start New Chat
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
