import React, { forwardRef } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { format } from 'date-fns';
import { GripVertical, Pencil } from 'lucide-react';
import { Meeting } from '@/hooks/useMeetings';
import { 
  getMeetingCustomer, 
  getMeetingTimeDisplayValue, 
  getMeetingStatusValue, 
  getMeetingTypeValue 
} from './utils';
import { RootState } from '@/store/store';
import { Badge } from '@/components/ui/badge';

export const DraggableMeetingCard = ({ 
  meeting, 
  date, 
  isTimeBased = false,
  onClick,
  onEdit
}: { 
  meeting: Meeting; 
  date: Date; 
  isTimeBased?: boolean;
  onClick?: () => void;
  onEdit?: (meeting: Meeting) => void;
}) => {
  const navigate = useNavigate();
  const { visibleFields } = useSelector((state: RootState) => state.calendar);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: meeting.id,
  });

  const style = transform ? {
    transform: CSS.Translate.toString(transform),
  } : undefined;

  const customer = getMeetingCustomer(meeting);
  const time = getMeetingTimeDisplayValue(meeting);
  const status = getMeetingStatusValue(meeting);
  const type = getMeetingTypeValue(meeting);
  const customerName = customer?.full_name;
  const phone = customer?.phone;
  const email = customer?.email;

  const getStatusColor = (status: string) => {
    if (status.includes('בוטל') || status.includes('מבוטל')) return 'bg-red-100 text-red-700 border-red-200';
    if (status.includes('הושלם')) return 'bg-green-100 text-green-700 border-green-200';
    if (status.includes('מתוכנן') || status.includes('תוכנן')) return 'bg-blue-100 text-blue-700 border-blue-200';
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

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
          "bg-[#E8EBF7] border-r-4 border-primary rounded-sm px-2 py-1.5 cursor-pointer hover:bg-[#D9DDF0] transition-colors shadow-sm h-full overflow-hidden group/card relative",
          isDragging && "opacity-50 z-50"
        )}
      >
        <button
          className="absolute left-1 top-1 p-1 rounded-full bg-white/80 opacity-0 group-hover/card:opacity-100 transition-opacity hover:bg-white z-20"
          onClick={(e) => {
            e.stopPropagation();
            if (onEdit) {
              onEdit(meeting);
            } else {
              navigate(`/dashboard/meetings/${meeting.id}`);
            }
          }}
        >
          <Pencil className="h-3 w-3 text-primary" />
        </button>
        <div className="flex flex-col gap-0.5 h-full">
          {visibleFields.customer_name && customerName && (
            <div className="text-sm font-semibold text-primary truncate">
              {customerName}
            </div>
          )}
          {visibleFields.time && time && (
            <div className="text-xs text-primary/80 font-medium">
              {time}
            </div>
          )}
          <div className="flex flex-wrap gap-1 mt-0.5">
            {visibleFields.status && (
              <Badge variant="outline" className={cn("text-[10px] px-1 py-0 h-4 leading-none", getStatusColor(status))}>
                {status}
              </Badge>
            )}
            {visibleFields.type && type && (
              <span className="text-[10px] text-primary/60 truncate">{type}</span>
            )}
          </div>
          {(visibleFields.phone || visibleFields.email) && (
            <div className="flex flex-col gap-0.5 mt-1">
              {visibleFields.phone && phone && (
                <div className="text-[10px] text-primary/70">{phone}</div>
              )}
              {visibleFields.email && email && (
                <div className="text-[10px] text-primary/70 truncate">{email}</div>
              )}
            </div>
          )}
        </div>
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
        "text-xs text-primary bg-[#E8EBF7] border-r-2 border-primary rounded px-1 py-0.5 cursor-grab active:cursor-grabbing flex flex-col gap-0.5 group/card relative",
        isDragging && "opacity-50"
      )}
    >
      <button
        className="absolute left-0.5 top-0.5 p-0.5 rounded-full bg-white/80 opacity-0 group-hover/card:opacity-100 transition-opacity hover:bg-white z-20"
        onClick={(e) => {
          e.stopPropagation();
          if (onEdit) {
            onEdit(meeting);
          } else {
            navigate(`/dashboard/meetings/${meeting.id}`);
          }
        }}
      >
        <Pencil className="h-2.5 w-2.5 text-primary" />
      </button>
      <div className="flex items-center gap-1 min-w-0">
        <GripVertical className="h-3 w-3 text-primary/60 shrink-0" />
        {visibleFields.time && time && <span className="font-medium shrink-0">{time}</span>}
        {visibleFields.customer_name && customerName && <span className="truncate">{customerName}</span>}
      </div>
      <div className="flex flex-wrap gap-1 items-center mr-4">
        {visibleFields.status && (
          <span className={cn("text-[9px] px-1 rounded-sm border", getStatusColor(status))}>
            {status}
          </span>
        )}
        {visibleFields.type && type && (
          <span className="text-[9px] text-primary/60 truncate max-w-[60px]">{type}</span>
        )}
        {visibleFields.phone && phone && (
          <span className="text-[9px] text-primary/60">{phone}</span>
        )}
      </div>
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
