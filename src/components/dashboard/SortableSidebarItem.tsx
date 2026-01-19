/**
 * SortableSidebarItem Component
 * 
 * Wrapper for SidebarItem that makes it draggable in the interface list.
 */

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SidebarItem, type SidebarItemProps } from './SidebarItem';

interface SortableSidebarItemProps extends SidebarItemProps {
  isSortable?: boolean;
}

export const SortableSidebarItem: React.FC<SortableSidebarItemProps> = ({
  item,
  isSortable = false,
  ...props
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
    disabled: !isSortable || props.isCollapsed, // Disable drag in collapsed mode
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  if (!isSortable) {
    return <SidebarItem item={item} {...props} />;
  }

  return (
    <div ref={setNodeRef} style={style} className="relative group/item">
      <SidebarItem 
        item={item} 
        {...props} 
        isSortable={isSortable}
        dragHandleProps={isSortable ? { attributes, listeners } : undefined}
      />
    </div>
  );
};
