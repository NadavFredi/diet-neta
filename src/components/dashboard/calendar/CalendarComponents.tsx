import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { format } from 'date-fns';
import { GripVertical } from 'lucide-react';
import { Meeting } from '@/hooks/useMeetings';
import { getMeetingCustomer, getMeetingTimeDisplayValue } from './utils';

export const DraggableMeetingCard = ({ 
  meeting, 
  date, 
  isTimeBased = false,
  onClick
}: { 
  meeting: Meeting; 
  date: Date; 
  isTimeBased?: boolean;
  onClick?: () => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: meeting.id,
  });

  const style = transform ? {
    transform: CSS.Translate.toString(transform),
  } : undefined;

  const customer = getMeetingCustomer(meeting);
  const time = getMeetingTimeDisplayValue(meeting);
  const customerName = customer?.full_name;

  if (isTimeBased) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
        className={cn(
          "bg-gray-100 border-l-2 border-gray-400 rounded-sm px-2 py-1.5 cursor-pointer hover:bg-gray-200 transition-colors shadow-sm h-full",
          isDragging && "opacity-50 z-50"
        )}
      >
        {customerName && (
          <div className="text-sm font-medium text-gray-900 truncate">
            {customerName}
          </div>
        )}
        {time && (
          <div className="text-xs text-gray-600 mt-0.5">
            {time}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "text-xs text-gray-600 bg-gray-100 rounded px-1 py-0.5 cursor-grab active:cursor-grabbing flex items-center gap-1",
        isDragging && "opacity-50"
      )}
    >
      <GripVertical className="h-3 w-3 text-gray-400" />
      {time && <span>{time}</span>}
      {customerName && <span className="font-medium">{customerName}</span>}
    </div>
  );
};

interface DroppableDateCellProps {
  date: Date;
  children: React.ReactNode;
  isCurrentMonth: boolean;
  isToday: boolean;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export const DroppableDateCell = forwardRef<HTMLDivElement, DroppableDateCellProps>(
  ({ date, children, isCurrentMonth, isToday, className, onClick }, ref) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const { setNodeRef, isOver } = useDroppable({
      id: `date-${dateKey}`,
    });

    const setRefs = (node: HTMLDivElement) => {
      setNodeRef(node);
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    };

    return (
      <div
        ref={setRefs}
        onClick={onClick}
        className={cn(
          "bg-white transition-colors h-full",
          isOver && "bg-primary/20",
          !isOver && "hover:bg-primary/50",
          className
        )}
      >
        {children}
      </div>
    );
  }
);

DroppableDateCell.displayName = 'DroppableDateCell';

interface DroppableTimeSlotProps {
  date: Date;
  hour: number;
  isEven: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
}

export const DroppableTimeSlot = forwardRef<HTMLDivElement, DroppableTimeSlotProps>(
  ({ date, hour, isEven, onClick, children }, ref) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const id = `slot:${dateKey}:${hour}`;
    const { setNodeRef, isOver } = useDroppable({ id });

    const setRefs = (node: HTMLDivElement) => {
      setNodeRef(node);
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    };

    return (
      <div
        ref={setRefs}
        onClick={onClick}
        className={cn(
          "h-16 border-b border-gray-100 cursor-pointer transition-colors",
          isOver ? "bg-primary/30 ring-inset ring-2 ring-primary" : (isEven ? "bg-gray-50" : "bg-white"),
          !isOver && "hover:bg-primary/50"
        )}
      >
        {children}
      </div>
    );
  }
);

DroppableTimeSlot.displayName = 'DroppableTimeSlot';