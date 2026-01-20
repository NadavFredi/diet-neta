/**
 * SortableViewItem Component
 * 
 * Wrapper for view items that makes them draggable within a resource section.
 */

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SavedView } from '@/hooks/useSavedViews';

interface SortableViewItemProps {
  view: SavedView;
  children: React.ReactNode;
  isActive: boolean;
  isDefaultView: boolean;
}

export const SortableViewItem: React.FC<SortableViewItemProps> = ({
  view,
  children,
  isActive,
  isDefaultView,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: view.id,
    disabled: isDefaultView, // Disable dragging for default view
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  if (isDefaultView) {
    return <>{children}</>;
  }

  return (
    <div ref={setNodeRef} style={style} className="relative group/view-item-drag">
      <div
        {...attributes}
        {...listeners}
        className={cn(
          'absolute right-0 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing',
          'p-1 rounded opacity-0 group-hover/view-item-drag:opacity-100 transition-opacity',
          'flex items-center justify-center z-10',
          isActive
            ? 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
            : 'text-white/60 hover:text-white hover:bg-white/20'
        )}
        style={{ marginLeft: '8px' }}
        title="גרור לשינוי סדר"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </div>
      {children}
    </div>
  );
};
