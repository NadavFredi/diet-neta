/**
 * ResizableNotesPanel Component
 * 
 * Wrapper component that adds resizing functionality to the Notes panel.
 * Includes a drag handle on the left edge (RTL) for resizing.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { KnowledgeBasePanel } from './KnowledgeBasePanel';
import { cn } from '@/lib/utils';
import { useSidebarWidth } from '@/hooks/useSidebarWidth';

interface LeadOption {
  id: string;
  created_at: string;
  fitness_goal?: string | null;
  status_main?: string | null;
}

interface ResizableNotesPanelProps {
  customerId: string | null;
  leads?: LeadOption[]; // All leads for this customer
  activeLeadId?: string | null; // Currently selected lead from LeadHistorySidebar
}

const STORAGE_KEY = 'notesPanelWidth';
const DEFAULT_WIDTH = 450;
const MIN_WIDTH = 250;
const MAX_WIDTH_PERCENT = 50; // Maximum 50% of viewport width

export const ResizableNotesPanel: React.FC<ResizableNotesPanelProps> = ({
  customerId,
  leads = [],
  activeLeadId = null,
}) => {
  const sidebarWidth = useSidebarWidth();
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(DEFAULT_WIDTH);

  // Load saved width from localStorage on mount
  useEffect(() => {
    const savedWidth = localStorage.getItem(STORAGE_KEY);
    if (savedWidth) {
      const parsedWidth = parseInt(savedWidth, 10);
      if (!isNaN(parsedWidth) && parsedWidth >= MIN_WIDTH) {
        setWidth(parsedWidth);
      }
    }
  }, []);

  // Calculate max width based on viewport and sidebar
  const getMaxWidth = useCallback(() => {
    if (typeof window === 'undefined') return DEFAULT_WIDTH * 2;
    const viewportWidth = window.innerWidth;
    const availableWidth = viewportWidth - sidebarWidth.width;
    // Ensure main content always has at least 400px (min-w-[400px])
    const minMainContentWidth = 400;
    const maxWidth = Math.min(
      (viewportWidth * MAX_WIDTH_PERCENT) / 100,
      availableWidth - minMainContentWidth - 50 // Leave space for main content + padding
    );
    return Math.max(maxWidth, MIN_WIDTH);
  }, [sidebarWidth.width]);

  // Save width to localStorage and dispatch custom event
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, width.toString());
    // Dispatch custom event so PageLayout can update its margin
    window.dispatchEvent(new CustomEvent('notesPanelResize'));
  }, [width]);

  // Handle mouse down on resize handle
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = width;
    
    // Prevent text selection during drag
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
  }, [width]);

  // Handle mouse move during resize
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Handle is on left edge (touches body), dragging left decreases width, dragging right increases
      // In RTL: clientX increases when moving right, so we need to invert
      const deltaX = startXRef.current - e.clientX; // Inverted for left-edge handle in RTL
      const newWidth = Math.max(
        MIN_WIDTH,
        Math.min(getMaxWidth(), startWidthRef.current + deltaX)
      );
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isResizing, getMaxWidth]);

  return (
    <div
      ref={panelRef}
      className="relative flex-shrink-0 overflow-hidden transition-none bg-white border-l border-gray-200 flex flex-col"
      style={{ 
        width: `${width}px`,
        height: '100%', // Use 100% of parent container height
        // Disable transition during resize for smooth dragging
        transition: isResizing ? 'none' : 'width 0.2s ease-out',
        backgroundColor: '#FFFFFF',
        zIndex: 10
      }}
      dir="rtl"
    >
      {/* Resize Handle - On the left edge (touches body) - Visible border */}
      <div
        className={cn(
          'absolute left-0 top-0 bottom-0 w-1 cursor-col-resize z-10 group',
          'transition-all duration-200',
          isResizing && 'bg-[#5B6FB9]/30'
        )}
        onMouseDown={handleMouseDown}
        style={{
          marginLeft: '-2px', // Extend beyond border for easier grabbing
        }}
        title="גרור לשינוי גודל"
      >
        {/* Visible border line - always visible, more prominent on hover */}
        <div
          className={cn(
            'absolute left-0 top-0 bottom-0 w-0.5',
            'bg-gray-300 transition-colors duration-200',
            'group-hover:bg-[#5B6FB9] group-hover:w-1',
            isResizing && 'bg-[#5B6FB9] w-1'
          )}
        />
        {/* Hover area indicator - dots pattern */}
        <div
          className={cn(
            'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
            'flex flex-col gap-1',
            'opacity-0 group-hover:opacity-100 transition-opacity duration-200',
            isResizing && 'opacity-100'
          )}
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={cn(
                'w-1 h-1 rounded-full',
                'bg-[#5B6FB9] transition-colors duration-200'
              )}
            />
          ))}
        </div>
      </div>

      {/* Knowledge Base Panel Content - Scrollable, starts at top */}
      <div className="flex-1 overflow-hidden" style={{ minHeight: 0 }}>
        <KnowledgeBasePanel 
          customerId={customerId} 
          leads={leads} 
          activeLeadId={activeLeadId}
        />
      </div>
    </div>
  );
};
