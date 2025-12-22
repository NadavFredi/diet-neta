/**
 * ResizableNotesPanel Component
 * 
 * Wrapper component that adds resizing functionality to the Notes panel.
 * Includes a drag handle on the left edge (RTL) for resizing.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CustomerNotesSidebar } from './CustomerNotesSidebar';
import { cn } from '@/lib/utils';
import { useSidebarWidth } from '@/hooks/useSidebarWidth';

interface ResizableNotesPanelProps {
  customerId: string | null;
}

const STORAGE_KEY = 'notesPanelWidth';
const DEFAULT_WIDTH = 450;
const MIN_WIDTH = 250;
const MAX_WIDTH_PERCENT = 50; // Maximum 50% of viewport width

export const ResizableNotesPanel: React.FC<ResizableNotesPanelProps> = ({
  customerId,
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
    const maxWidth = Math.min(
      (viewportWidth * MAX_WIDTH_PERCENT) / 100,
      availableWidth - 100 // Leave some space for main content
    );
    return Math.max(maxWidth, MIN_WIDTH);
  }, [sidebarWidth.width]);

  // Save width to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, width.toString());
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
      const deltaX = startXRef.current - e.clientX; // Inverted for RTL
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
      className="relative flex-shrink-0 overflow-hidden transition-none"
      style={{ 
        width: `${width}px`,
        // Disable transition during resize for smooth dragging
        transition: isResizing ? 'none' : 'width 0.2s ease-out'
      }}
      dir="rtl"
    >
      {/* Resize Handle - On the left edge (RTL) */}
      <div
        className={cn(
          'absolute left-0 top-0 bottom-0 w-2 cursor-col-resize z-10 group',
          'transition-all duration-200',
          isResizing && 'bg-[#5B6FB9]/20'
        )}
        onMouseDown={handleMouseDown}
        style={{
          marginLeft: '-4px', // Extend beyond border for easier grabbing
        }}
        title="גרור לשינוי גודל"
      >
        {/* Visual indicator line - appears on hover */}
        <div
          className={cn(
            'absolute left-1/2 top-0 bottom-0 w-0.5 -translate-x-1/2',
            'bg-transparent transition-colors duration-200',
            'group-hover:bg-[#5B6FB9]',
            isResizing && 'bg-[#5B6FB9]'
          )}
        />
        {/* Hover area indicator */}
        <div
          className={cn(
            'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
            'w-1 h-12 rounded-full',
            'bg-transparent transition-colors duration-200',
            'group-hover:bg-[#5B6FB9]/60',
            isResizing && 'bg-[#5B6FB9]'
          )}
        />
      </div>

      {/* Notes Panel Content */}
      <div className="w-full h-full">
        <CustomerNotesSidebar customerId={customerId} />
      </div>
    </div>
  );
};
