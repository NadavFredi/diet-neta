import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { X, Plus, FolderPlus } from 'lucide-react';
import { TableFilter, type ActiveFilter, type FilterField, type FilterGroup, OPERATOR_LABELS } from '@/components/dashboard/TableFilter';
import {
  addFilterToGroup,
  addGroupToGroup,
  flattenFilterGroup,
  isFilterGroup,
  removeFilterFromGroup,
  removeGroupFromGroup,
  updateFilterInGroup,
  updateGroupInGroup,
} from '@/utils/filterGroupUtils';
import { cn } from '@/lib/utils';

interface FilterGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filterGroup: FilterGroup;
  fields: FilterField[];
  onChange: (group: FilterGroup) => void;
}

const createEmptyGroup = (): FilterGroup => ({
  id: `group-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  operator: 'and',
  children: [],
});

export const FilterGroupDialog = ({
  open,
  onOpenChange,
  filterGroup,
  fields,
  onChange,
}: FilterGroupDialogProps) => {
  const [editingFilter, setEditingFilter] = useState<ActiveFilter | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);

  const handleAddFilter = (filter: ActiveFilter, parentGroupId: string) => {
    onChange(addFilterToGroup(filterGroup, filter, parentGroupId));
  };

  const handleUpdateFilter = (filter: ActiveFilter) => {
    onChange(updateFilterInGroup(filterGroup, filter));
  };

  const handleRemoveFilter = (filterId: string) => {
    onChange(removeFilterFromGroup(filterGroup, filterId));
    if (editingFilter?.id === filterId) {
      setEditingFilter(null);
      setEditingGroupId(null);
    }
  };

  const handleAddGroup = (parentGroupId: string) => {
    onChange(addGroupToGroup(filterGroup, createEmptyGroup(), parentGroupId));
  };

  const handleRemoveGroup = (groupId: string) => {
    onChange(removeGroupFromGroup(filterGroup, groupId));
  };

  const handleUpdateGroup = (groupId: string, updates: Partial<FilterGroup>) => {
    onChange(updateGroupInGroup(filterGroup, groupId, updates));
  };

  const renderGroup = (group: FilterGroup, depth: number) => {
    const directFilters = group.children.filter((child) => !isFilterGroup(child)) as ActiveFilter[];
    const childGroups = group.children.filter((child) => isFilterGroup(child)) as FilterGroup[];
    const allowRemove = depth > 0;

    const groupFilters = flattenFilterGroup(group);

    return (
      <div
        key={group.id}
        className={cn(
          'rounded-lg border border-slate-200 bg-white p-3 space-y-3',
          depth > 0 && 'bg-slate-50'
        )}
      >
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            <Select
              value={group.operator}
              onValueChange={(value) => handleUpdateGroup(group.id, { operator: value as FilterGroup['operator'] })}
            >
              <SelectTrigger className="h-9 w-36">
                <SelectValue placeholder="בחר תנאי" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="and">וגם (הכל)</SelectItem>
                <SelectItem value="or">או (לפחות אחד)</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Switch
                checked={!!group.not}
                onCheckedChange={(value) => handleUpdateGroup(group.id, { not: value })}
              />
              <span>לא</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleAddGroup(group.id)}
              className="h-9"
            >
              <FolderPlus className="h-4 w-4 ml-2" />
              קבוצה
            </Button>
            {allowRemove && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveGroup(group.id)}
                className="h-9 text-slate-500 hover:text-red-600"
              >
                <X className="h-4 w-4 ml-1" />
                הסר קבוצה
              </Button>
            )}
          </div>
        </div>

        {directFilters.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {directFilters.map((filter) => (
              <Badge
                key={filter.id}
                variant="secondary"
                className="px-3 py-1.5 bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 transition-colors cursor-pointer"
                onClick={() => {
                  setEditingFilter(filter);
                  setEditingGroupId(group.id);
                }}
              >
                <span className="font-medium">{filter.fieldLabel}</span>
                <span className="mx-1 text-indigo-600">{OPERATOR_LABELS[filter.operator]}</span>
                <span className="font-semibold">{filter.values.join(', ')}</span>
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    handleRemoveFilter(filter.id);
                  }}
                  className="mr-2 hover:bg-indigo-200 rounded-full p-0.5 transition-colors"
                  aria-label="הסר סינון"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        <TableFilter
          fields={fields}
          activeFilters={groupFilters}
          allowDuplicateFields
          buttonLabel="הוסף תנאי"
          onFilterAdd={(filter) => handleAddFilter(filter, group.id)}
          onFilterUpdate={handleUpdateFilter}
          onFilterRemove={() => undefined}
          onFilterClear={() => undefined}
          editFilter={editingGroupId === group.id ? editingFilter : null}
          onEditApplied={() => {
            setEditingFilter(null);
            setEditingGroupId(null);
          }}
          className="justify-start"
        />

        {childGroups.length > 0 && (
          <div className="space-y-3">
            {childGroups.map((childGroup) => renderGroup(childGroup, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>סינון מתקדם</DialogTitle>
          <DialogDescription>בנה קבוצות AND/OR עם NOT, בצורה נקייה וברורה.</DialogDescription>
        </DialogHeader>
        <Separator />
        {renderGroup(filterGroup, 0)}
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onChange(createEmptyGroup());
            }}
          >
            <Plus className="h-4 w-4 ml-2" />
            קבוצה חדשה
          </Button>
          <Button type="button" onClick={() => onOpenChange(false)}>
            סגור
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
