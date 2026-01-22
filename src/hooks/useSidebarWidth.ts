/**
 * useSidebarWidth Hook
 * 
 * Provides the current sidebar width for dynamic content margin adjustment.
 * Uses custom width from DB if available, otherwise falls back to defaults.
 */

import { useAppSelector } from '@/store/hooks';
import { useSidebarWidthPreference } from './useSidebarWidthPreference';

const EXPANDED_WIDTH = 256; // w-64 = 256px (default)
const COLLAPSED_WIDTH = 64; // w-16 = 64px

export const useSidebarWidth = () => {
  const { isCollapsed } = useAppSelector((state) => state.sidebar);
  const { width: customWidth } = useSidebarWidthPreference();
  
  // Use custom width if available and sidebar is expanded, otherwise use defaults
  const expandedWidth = customWidth || EXPANDED_WIDTH;
  
  return {
    width: isCollapsed ? COLLAPSED_WIDTH : expandedWidth,
    isCollapsed,
    expandedWidth,
    collapsedWidth: COLLAPSED_WIDTH,
    defaultExpandedWidth: EXPANDED_WIDTH,
  };
};

