import { useState, useMemo } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { getColumnLabel, COLUMN_ORDER } from '@/utils/dashboard';
import type { ColumnVisibility } from '@/utils/dashboard';

interface ColumnSettingsProps {
  columnVisibility: ColumnVisibility;
  onToggleColumn: (key: keyof ColumnVisibility) => void;
}

export const ColumnSettings = ({
  columnVisibility,
  onToggleColumn,
}: ColumnSettingsProps) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter columns based on search query
  const filteredColumns = useMemo(() => {
    if (!searchQuery.trim()) {
      return COLUMN_ORDER;
    }

    const query = searchQuery.toLowerCase().trim();
    return COLUMN_ORDER.filter((key) => {
      const label = getColumnLabel(key);
      return label.toLowerCase().includes(query) || key.toLowerCase().includes(query);
    });
  }, [searchQuery]);

  return (
    <div className="space-y-4">
      <h4 className="font-medium text-sm">הצגת עמודות</h4>
      
      {/* Search Input */}
      <Input
        placeholder="חיפוש עמודות..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full h-9 text-sm bg-white text-gray-900 border border-gray-200 hover:bg-white focus:bg-white focus:border-indigo-400"
        dir="rtl"
      />

      <div className="space-y-3 max-h-[400px] overflow-y-auto">
        {filteredColumns.length > 0 ? (
          filteredColumns.map((key) => (
            <div key={key} className="flex items-center gap-2">
              <Checkbox
                id={key}
                checked={columnVisibility[key]}
                onCheckedChange={() => onToggleColumn(key)}
              />
              <Label
                htmlFor={key}
                className="text-sm font-normal cursor-pointer flex-1"
              >
                {getColumnLabel(key)}
              </Label>
            </div>
          ))
        ) : (
          <div className="text-sm text-gray-500 text-center py-4">
            לא נמצאו עמודות התואמות לחיפוש
          </div>
        )}
      </div>
    </div>
  );
};





























