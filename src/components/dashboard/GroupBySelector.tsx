/**
 * GroupBySelector Component
 * 
 * Multi-level group-by selector with drag & drop for reordering levels
 * Supports up to 2 levels with sorting controls
 */

import { useState, useEffect } from 'react';
import { GripVertical, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import type { DataTableColumn } from '@/components/ui/DataTable';

interface GroupBySelectorProps {
  columns: DataTableColumn<any>[];
  groupByKeys: [string | null, string | null];
  groupSorting: { level1: 'asc' | 'desc' | null; level2: 'asc' | 'desc' | null };
  onGroupByKeysChange: (keys: [string | null, string | null]) => void;
  onGroupSortingChange: (level: 1 | 2, direction: 'asc' | 'desc' | null) => void;
  onClose: () => void;
}

interface SortableGroupLevelProps {
  id: string;
  level: 1 | 2;
  columnId: string | null;
  columns: DataTableColumn<any>[];
  sorting: 'asc' | 'desc' | null;
  onColumnChange: (level: 1 | 2, columnId: string | null) => void;
  onSortingChange: (level: 1 | 2, direction: 'asc' | 'desc' | null) => void;
  onRemove: (level: 1 | 2) => void;
}

function SortableGroupLevel({
  id,
  level,
  columnId,
  columns,
  onColumnChange,
  onRemove,
}: SortableGroupLevelProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getColumnHeader = (colId: string | null): string => {
    if (!colId) return '';
    const column = columns.find((c) => c.id === colId);
    if (!column) return colId;
    return typeof column.header === 'string' ? column.header : colId;
  };

  const getGroupableColumns = () => {
    return columns.filter((col) => {
      const excludeIds = ['actions'];
      return !excludeIds.includes(col.id) && col.enableHiding !== false;
    });
  };

  const availableColumns = getGroupableColumns();

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border',
        'bg-white border-slate-200',
        isDragging && 'shadow-md'
      )}
      dir="rtl"
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="flex-shrink-0 cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600"
      >
        <GripVertical className="h-4 w-4" />
      </div>

      {/* Level Label */}
      <span className="flex-shrink-0 text-xs font-semibold text-slate-500 w-12">
        רמה {level}:
      </span>

      {/* Column Selector */}
      <Select
        value={columnId || undefined}
        onValueChange={(value) => onColumnChange(level, value || null)}
      >
        <SelectTrigger 
          className={cn(
            "flex-1 h-8 text-sm",
            "border-2 border-slate-300 bg-white",
            "focus:border-[#5B6FB9] focus:ring-2 focus:ring-[#5B6FB9]/20",
            "transition-all duration-200",
            "hover:border-slate-400"
          )}
          dir="rtl"
        >
          <SelectValue placeholder="בחר עמודה..." />
        </SelectTrigger>
        <SelectContent dir="rtl" className="max-h-[300px]">
          {availableColumns.length > 0 ? (
            availableColumns.map((col) => {
              const headerText = typeof col.header === 'string' ? col.header : col.id;
              return (
                <SelectItem key={col.id} value={col.id} className="text-right cursor-pointer">
                  {headerText}
                </SelectItem>
              );
            })
          ) : (
            <SelectItem value="__no_columns__" disabled>
              אין עמודות זמינות
            </SelectItem>
          )}
        </SelectContent>
      </Select>

      {/* Remove Button */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRemove(level);
        }}
        className="flex-shrink-0 p-1.5 rounded hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
        title="הסר"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export const GroupBySelector: React.FC<GroupBySelectorProps> = ({
  columns,
  groupByKeys,
  groupSorting,
  onGroupByKeysChange,
  onGroupSortingChange,
  onClose,
}) => {
  const [localKeys, setLocalKeys] = useState<[string | null, string | null]>(groupByKeys);

  // Sync localKeys when groupByKeys prop changes
  useEffect(() => {
    setLocalKeys(groupByKeys);
  }, [groupByKeys]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px of movement before activating drag
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Show levels: always show level 1 (even if empty), show level 2 only if level 1 has a value
  const activeLevels = [
    { id: 'level1', level: 1 as const, columnId: localKeys[0] },
  ];
  
  // Show level 2 if level 1 has a value (even if level 2 is empty)
  if (localKeys[0] !== null) {
    activeLevels.push({ id: 'level2', level: 2 as const, columnId: localKeys[1] });
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = activeLevels.findIndex((item) => item.id === active.id);
      const newIndex = activeLevels.findIndex((item) => item.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const reordered = arrayMove(activeLevels, oldIndex, newIndex);
        // Update localKeys based on new order - swap the column IDs
        const newKeys: [string | null, string | null] = [null, null];
        reordered.forEach((item, index) => {
          if (index < 2) {
            newKeys[index] = item.columnId;
          }
        });
        setLocalKeys(newKeys);
        // Immediately update parent state so table reflects the change
        onGroupByKeysChange(newKeys);
      }
    }
  };

  const handleColumnChange = (level: 1 | 2, columnId: string | null) => {
    const newKeys: [string | null, string | null] = [...localKeys];
    newKeys[level - 1] = columnId;
    setLocalKeys(newKeys);
    onGroupByKeysChange(newKeys);
  };

  const handleRemove = (level: 1 | 2) => {
    const newKeys: [string | null, string | null] = [...localKeys];
    newKeys[level - 1] = null;
    // If removing level 1, also clear level 2
    if (level === 1) {
      newKeys[1] = null;
    }
    setLocalKeys(newKeys);
    onGroupByKeysChange(newKeys);
  };

  return (
    <div className="w-96 p-4" dir="rtl">
      <div className="flex items-center justify-between mb-4 relative">
        <h4 className="font-semibold text-sm text-slate-900 flex-1">קיבוץ לפי</h4>
        <button
          onClick={onClose}
          className="p-1.5 rounded hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600 flex-shrink-0 ml-2"
          title="סגור"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-3">
        {activeLevels.length > 0 ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={activeLevels.map((item) => item.id)}
              strategy={verticalListSortingStrategy}
            >
              {activeLevels.map((item) => (
                <SortableGroupLevel
                  key={item.id}
                  id={item.id}
                  level={item.level}
                  columnId={item.columnId}
                  columns={columns}
                  onColumnChange={handleColumnChange}
                  onRemove={handleRemove}
                />
              ))}
            </SortableContext>
          </DndContext>
        ) : null}

        {/* Remove All Button */}
        {(localKeys[0] || localKeys[1]) && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setLocalKeys([null, null]);
              onGroupByKeysChange([null, null]);
            }}
            className="w-full"
          >
            הסר כל הקיבוצים
          </Button>
        )}
      </div>
    </div>
  );
};
