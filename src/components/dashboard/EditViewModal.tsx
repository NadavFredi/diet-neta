import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUpdateSavedView, type FilterConfig, type SavedView } from '@/hooks/useSavedViews';
import { ColumnSettings } from '@/components/dashboard/ColumnSettings';
import { TableFilter } from '@/components/dashboard/TableFilter';
import { FilterChips } from '@/components/dashboard/FilterChips';
import { Loader2, Settings, X, Columns, Filter, ArrowUpDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getColumnLabel, COLUMN_ORDER } from '@/utils/dashboard';
import type { ColumnVisibility } from '@/utils/dashboard';
import type { ActiveFilter, FilterField } from '@/components/dashboard/TableFilter';
import { LEAD_FILTER_FIELDS, CUSTOMER_FILTER_FIELDS, TEMPLATE_FILTER_FIELDS, NUTRITION_TEMPLATE_FILTER_FIELDS } from '@/hooks/useTableFilters';

interface EditViewModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  view: SavedView | null;
  currentFilterConfig: FilterConfig;
  filterFields?: FilterField[];
  onSuccess?: () => void;
}

export const EditViewModal = ({
  isOpen,
  onOpenChange,
  view,
  currentFilterConfig,
  filterFields = LEAD_FILTER_FIELDS,
  onSuccess,
}: EditViewModalProps) => {
  const [viewName, setViewName] = useState('');
  const [filterConfig, setFilterConfig] = useState<FilterConfig>(currentFilterConfig);
  const [activeTab, setActiveTab] = useState('general');
  const updateView = useUpdateSavedView();
  const { toast } = useToast();

  // Initialize form when modal opens or view changes
  useEffect(() => {
    if (isOpen && view) {
      setViewName(view.view_name);
      setSelectedIconName(view.icon_name || null);
      const savedConfig = view.filter_config as FilterConfig || currentFilterConfig;
      setFilterConfig({
        ...savedConfig,
        columnVisibility: savedConfig.columnVisibility || {},
      });
    }
  }, [isOpen, view, currentFilterConfig]);

  // Convert columnVisibility to ColumnVisibility type
  const columnVisibility: ColumnVisibility = useMemo(() => {
    const visibility: any = {};
    COLUMN_ORDER.forEach((key) => {
      visibility[key] = filterConfig.columnVisibility?.[key] !== false;
    });
    return visibility as ColumnVisibility;
  }, [filterConfig.columnVisibility]);

  // Get active filters
  const activeFilters: ActiveFilter[] = filterConfig.advancedFilters || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!viewName.trim()) {
      toast({
        title: 'שגיאה',
        description: 'אנא הזן שם לתצוגה',
        variant: 'destructive',
      });
      return;
    }

    if (!view) {
      toast({
        title: 'שגיאה',
        description: 'תצוגה לא נמצאה',
        variant: 'destructive',
      });
      return;
    }

    try {
      await updateView.mutateAsync({
        viewId: view.id,
        viewName: viewName.trim(),
        filterConfig,
      });
      
      toast({
        title: 'הצלחה',
        description: 'התצוגה עודכנה בהצלחה',
      });
      
      setViewName('');
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Failed to update view:', error);
      toast({
        title: 'שגיאה',
        description: error?.message || 'נכשל בעדכון התצוגה. אנא נסה שוב.',
        variant: 'destructive',
      });
    }
  };

  const handleClose = (open: boolean) => {
    if (!open && !updateView.isPending) {
      setViewName('');
      onOpenChange(false);
    }
  };

  const handleToggleColumn = (key: keyof ColumnVisibility) => {
    setFilterConfig(prev => ({
      ...prev,
      columnVisibility: {
        ...prev.columnVisibility,
        [key]: !columnVisibility[key],
      },
    }));
  };

  const handleAddFilter = (filter: ActiveFilter) => {
    setFilterConfig(prev => ({
      ...prev,
      advancedFilters: [...(prev.advancedFilters || []), filter],
    }));
  };

  const handleRemoveFilter = (filterId: string) => {
    setFilterConfig(prev => ({
      ...prev,
      advancedFilters: (prev.advancedFilters || []).filter(f => f.id !== filterId),
    }));
  };

  const handleClearFilters = () => {
    setFilterConfig(prev => ({
      ...prev,
      advancedFilters: [],
    }));
  };

  const handleSortChange = (sortBy: string, sortOrder: 'asc' | 'desc') => {
    setFilterConfig(prev => ({
      ...prev,
      sortBy,
      sortOrder,
    }));
  };

  const handleUpdateFromCurrent = () => {
    setFilterConfig(currentFilterConfig);
    toast({
      title: 'עודכן',
      description: 'ההגדרות עודכנו עם המצב הנוכחי של הטבלה',
    });
  };

  // Get available sort columns
  const sortableColumns = COLUMN_ORDER.filter(key => {
    // Exclude some columns from sorting
    return !['notes'].includes(key);
  });

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto" dir="rtl" onInteractOutside={(e) => {
        if (updateView.isPending) {
          e.preventDefault();
        }
      }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            ערוך תצוגה
          </DialogTitle>
          <DialogDescription>
            עדכן את שם התצוגה וההגדרות (מסננים, עמודות, מיון)
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" dir="rtl">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="general">כללי</TabsTrigger>
              <TabsTrigger value="columns">עמודות</TabsTrigger>
              <TabsTrigger value="filters">מסננים</TabsTrigger>
              <TabsTrigger value="sorting">מיון</TabsTrigger>
            </TabsList>

            {/* General Tab */}
            <TabsContent value="general" className="space-y-4 mt-4">
              <div className="grid gap-2">
                <Label htmlFor="view-name">שם התצוגה</Label>
                <Input
                  id="view-name"
                  value={viewName}
                  onChange={(e) => setViewName(e.target.value)}
                  placeholder="לדוגמה: לידים חדשים"
                  disabled={updateView.isPending}
                  dir="rtl"
                  className="text-right"
                  autoFocus
                />
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-base font-semibold">סיכום הגדרות</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleUpdateFromCurrent}
                    disabled={updateView.isPending}
                  >
                    עדכן מהמצב הנוכחי
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="font-medium text-gray-700 mb-1">מסננים פעילים</div>
                    <div className="text-2xl font-bold text-indigo-600">
                      {activeFilters.length}
                    </div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="font-medium text-gray-700 mb-1">עמודות גלויות</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {Object.values(columnVisibility).filter(Boolean).length}
                    </div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="font-medium text-gray-700 mb-1">מיון</div>
                    <div className="text-lg font-semibold text-green-600">
                      {filterConfig.sortBy ? `${getColumnLabel(filterConfig.sortBy as any)} (${filterConfig.sortOrder === 'desc' ? 'יורד' : 'עולה'})` : 'ללא'}
                    </div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="font-medium text-gray-700 mb-1">סדר עמודות</div>
                    <div className="text-lg font-semibold text-purple-600">
                      {filterConfig.columnOrder?.length || COLUMN_ORDER.length} עמודות
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Columns Tab */}
            <TabsContent value="columns" className="space-y-4 mt-4">
              <div className="flex items-center gap-2 mb-4">
                <Columns className="h-5 w-5 text-blue-600" />
                <Label className="text-base font-semibold">הצגת עמודות</Label>
              </div>
              <div className="border rounded-lg p-4 bg-gray-50 max-h-[400px] overflow-y-auto">
                <ColumnSettings
                  columnVisibility={columnVisibility}
                  onToggleColumn={handleToggleColumn}
                />
              </div>
            </TabsContent>

            {/* Filters Tab */}
            <TabsContent value="filters" className="space-y-4 mt-4">
              <div className="flex items-center gap-2 mb-4">
                <Filter className="h-5 w-5 text-indigo-600" />
                <Label className="text-base font-semibold">מסננים</Label>
              </div>
              
              {/* Active Filters */}
              {activeFilters.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium">מסננים פעילים</Label>
                  <div className="border rounded-lg p-3 bg-gray-50">
                    <FilterChips
                      filters={activeFilters}
                      onRemove={handleRemoveFilter}
                      onClearAll={handleClearFilters}
                    />
                  </div>
                </div>
              )}

              {/* Add Filter */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">הוסף מסנן חדש</Label>
                <div className="border rounded-lg p-3 bg-white">
                  <TableFilter
                    fields={filterFields}
                    activeFilters={activeFilters}
                    onFilterAdd={handleAddFilter}
                    onFilterRemove={handleRemoveFilter}
                    onFilterClear={handleClearFilters}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Sorting Tab */}
            <TabsContent value="sorting" className="space-y-4 mt-4">
              <div className="flex items-center gap-2 mb-4">
                <ArrowUpDown className="h-5 w-5 text-green-600" />
                <Label className="text-base font-semibold">מיון</Label>
              </div>
              
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="sort-by">מיין לפי</Label>
                  <Select
                    value={filterConfig.sortBy || ''}
                    onValueChange={(value) => handleSortChange(value, filterConfig.sortOrder || 'asc')}
                  >
                    <SelectTrigger id="sort-by" dir="rtl">
                      <SelectValue placeholder="בחר עמודה למיון" />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      <SelectItem value="">ללא מיון</SelectItem>
                      {sortableColumns.map((key) => (
                        <SelectItem key={key} value={key}>
                          {getColumnLabel(key)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {filterConfig.sortBy && (
                  <div className="grid gap-2">
                    <Label htmlFor="sort-order">כיוון מיון</Label>
                    <Select
                      value={filterConfig.sortOrder || 'asc'}
                      onValueChange={(value: 'asc' | 'desc') => handleSortChange(filterConfig.sortBy!, value)}
                    >
                      <SelectTrigger id="sort-order" dir="rtl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent dir="rtl">
                        <SelectItem value="asc">עולה (א-ב, 1-9)</SelectItem>
                        <SelectItem value="desc">יורד (ב-א, 9-1)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {!filterConfig.sortBy && (
                  <div className="p-4 bg-gray-50 rounded-lg text-center text-sm text-gray-600">
                    אין מיון מוגדר. בחר עמודה למיון למעלה.
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button
              type="submit"
              disabled={!viewName.trim() || updateView.isPending}
              className="bg-[#5B6FB9] hover:bg-[#5B6FB9]/90 text-white"
            >
              {updateView.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              שמור שינויים
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={updateView.isPending}
            >
              ביטול
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};





