"use client";

import React, { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';

interface LocationTooltipProps {
  children: React.ReactNode;
  locationText: string;
  onAskAI: () => void;
}

export default function LocationTooltip({ children, locationText, onAskAI }: LocationTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={8} className="p-0">
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-2 text-sm font-medium"
            onClick={onAskAI}
          >
            <MessageCircle className="h-4 w-4" />
            Ask AI about {locationText}
          </Button>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
