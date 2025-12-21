/**
 * useSidebarWidth Hook
 * 
 * Provides the current sidebar width for dynamic content margin adjustment.
 */

import { useAppSelector } from '@/store/hooks';

const EXPANDED_WIDTH = 256; // w-64 = 256px
const COLLAPSED_WIDTH = 64; // w-16 = 64px

export const useSidebarWidth = () => {
  const { isCollapsed } = useAppSelector((state) => state.sidebar);
  
  return {
    width: isCollapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH,
    isCollapsed,
    expandedWidth: EXPANDED_WIDTH,
    collapsedWidth: COLLAPSED_WIDTH,
  };
};
