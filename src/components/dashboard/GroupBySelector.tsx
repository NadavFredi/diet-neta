/**
 * GroupBySelector Component
 * 
 * Multi-level group-by selector with drag & drop for reordering levels
 * Supports up to 2 levels with sorting controls
 */

import { useState } from 'react';
import { GripVertical, ArrowUpDown, X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  sorting,
  onColumnChange,
  onSortingChange,
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
      const excludeIds = ['id', 'actions'];
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
      <select
        value={columnId || ''}
        onChange={(e) => onColumnChange(level, e.target.value || null)}
        className="flex-1 px-3 py-1.5 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#5B6FB9] focus:border-transparent"
        dir="rtl"
      >
        <option value="">בחר עמודה...</option>
        {availableColumns.map((col) => {
          const headerText = typeof col.header === 'string' ? col.header : col.id;
          return (
            <option key={col.id} value={col.id}>
              {headerText}
            </option>
          );
        })}
      </select>

      {/* Sorting Controls */}
      {columnId && (
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => {
              const nextSort =
                sorting === null
                  ? 'asc'
                  : sorting === 'asc'
                  ? 'desc'
                  : null;
              onSortingChange(level, nextSort);
            }}
            className={cn(
              'p-1.5 rounded hover:bg-slate-100 transition-colors',
              sorting && 'bg-slate-100'
            )}
            title={
              sorting === 'asc'
                ? 'מיין עולה'
                : sorting === 'desc'
                ? 'מיין יורד'
                : 'מיין'
            }
          >
            <ArrowUpDown
              className={cn(
                'h-4 w-4',
                sorting === 'asc' && 'text-[#5B6FB9]',
                sorting === 'desc' && 'text-[#5B6FB9] rotate-180',
                !sorting && 'text-slate-400'
              )}
            />
          </button>
        </div>
      )}

      {/* Remove Button */}
      <button
        onClick={() => onRemove(level)}
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

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const activeLevels = [
    { id: 'level1', level: 1 as const, columnId: localKeys[0] },
    { id: 'level2', level: 2 as const, columnId: localKeys[1] },
  ].filter((item) => item.columnId !== null);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = activeLevels.findIndex((item) => item.id === active.id);
      const newIndex = activeLevels.findIndex((item) => item.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(activeLevels, oldIndex, newIndex);
        // Update localKeys based on new order
        const newKeys: [string | null, string | null] = [null, null];
        reordered.forEach((item, index) => {
          if (index < 2) {
            newKeys[index] = item.columnId;
          }
        });
        setLocalKeys(newKeys);
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

  const handleAddLevel = () => {
    if (!localKeys[0]) {
      // Add level 1
      const newKeys: [string | null, string | null] = [null, localKeys[1]];
      setLocalKeys(newKeys);
    } else if (!localKeys[1]) {
      // Add level 2
      const newKeys: [string | null, string | null] = [localKeys[0], null];
      setLocalKeys(newKeys);
    }
  };

  const canAddLevel = !localKeys[0] || (!localKeys[1] && localKeys[0]);

  return (
    <div className="w-96" dir="rtl">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold text-sm text-slate-900">קיבוץ לפי</h4>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
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
                  sorting={
                    item.level === 1 ? groupSorting.level1 : groupSorting.level2
                  }
                  onColumnChange={handleColumnChange}
                  onSortingChange={onGroupSortingChange}
                  onRemove={handleRemove}
                />
              ))}
            </SortableContext>
          </DndContext>
        ) : (
          <div className="text-center py-8 text-sm text-slate-500">
            אין קיבוץ פעיל
          </div>
        )}

        {/* Add Level Button */}
        {canAddLevel && (
          <button
            onClick={handleAddLevel}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm border border-dashed border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-slate-600"
          >
            <Plus className="h-4 w-4" />
            <span>הוסף רמת קיבוץ</span>
          </button>
        )}

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
