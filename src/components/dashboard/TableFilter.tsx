/**
 * Modern Table Filter Component
 * 
 * State-of-the-art filtering system with:
 * - Dynamic filter bar (no wasted space)
 * - Include/Exclude logic
 * - Multi-select support
 * - Advanced date filtering
 * - RTL support
 */

import React, { useState } from 'react';
import { Filter, X, Check, Calendar, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { DateRangePicker } from './DateRangePicker';
import { cn } from '@/lib/utils';

export type FilterOperator = 'is' | 'isNot' | 'contains' | 'notContains' | 'equals' | 'notEquals' | 'greaterThan' | 'lessThan' | 'before' | 'after' | 'between';

export type FilterType = 'select' | 'multiselect' | 'date' | 'number' | 'text';

export interface FilterField {
  id: string;
  label: string;
  type: FilterType;
  options?: string[]; // For select/multiselect
  operators?: FilterOperator[]; // Available operators for this field
}

export interface ActiveFilter {
  id: string;
  fieldId: string;
  fieldLabel: string;
  operator: FilterOperator;
  values: string[];
  type: FilterType;
}

interface TableFilterProps {
  fields: FilterField[];
  activeFilters: ActiveFilter[];
  onFilterAdd: (filter: ActiveFilter) => void;
  onFilterRemove: (filterId: string) => void;
  onFilterClear: () => void;
  className?: string;
}

export const OPERATOR_LABELS: Record<FilterOperator, string> = {
  is: 'הוא',
  isNot: 'אינו',
  contains: 'מכיל',
  notContains: 'לא מכיל',
  equals: 'שווה ל',
  notEquals: 'לא שווה ל',
  greaterThan: 'גדול מ',
  lessThan: 'קטן מ',
  before: 'לפני',
  after: 'אחרי',
  between: 'בין',
};

const DEFAULT_OPERATORS: Record<FilterType, FilterOperator[]> = {
  select: ['is', 'isNot'],
  multiselect: ['is', 'isNot'],
  date: ['equals', 'before', 'after', 'between'],
  number: ['equals', 'greaterThan', 'lessThan', 'notEquals'],
  text: ['contains', 'notContains', 'equals', 'notEquals'],
};

export const TableFilter: React.FC<TableFilterProps> = ({
  fields,
  activeFilters,
  onFilterAdd,
  onFilterRemove,
  onFilterClear,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedField, setSelectedField] = useState<FilterField | null>(null);
  const [selectedOperator, setSelectedOperator] = useState<FilterOperator | null>(null);
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date; mode?: 'single' | 'range' | 'before' | 'after' } | null>(null);

  const handleFieldSelect = (field: FilterField) => {
    setSelectedField(field);
    setSelectedOperator(null);
    setSelectedValues([]);
    setDateRange(null);
    
    // Set default operator
    const operators = field.operators || DEFAULT_OPERATORS[field.type];
    if (operators.length > 0) {
      setSelectedOperator(operators[0]);
    }
  };

  const handleOperatorSelect = (operator: FilterOperator) => {
    setSelectedOperator(operator);
    if (operator === 'between' && selectedField?.type === 'date') {
      setDateRange({ mode: 'range' });
    } else if (operator === 'before' && selectedField?.type === 'date') {
      setDateRange({ mode: 'before' });
    } else if (operator === 'after' && selectedField?.type === 'date') {
      setDateRange({ mode: 'after' });
    } else if (selectedField?.type === 'date') {
      setDateRange({ mode: 'single' });
    }
  };

  const handleValueToggle = (value: string) => {
    if (selectedField?.type === 'multiselect') {
      setSelectedValues(prev => 
        prev.includes(value) 
          ? prev.filter(v => v !== value)
          : [...prev, value]
      );
    } else {
      setSelectedValues([value]);
    }
  };

  const handleApplyFilter = () => {
    if (!selectedField || !selectedOperator) return;

    let values: string[] = [];
    
    if (selectedField.type === 'date' && dateRange) {
      if (dateRange.mode === 'single' && dateRange.from) {
        values = [dateRange.from.toISOString().split('T')[0]];
      } else if (dateRange.mode === 'range' && dateRange.from && dateRange.to) {
        values = [
          dateRange.from.toISOString().split('T')[0],
          dateRange.to.toISOString().split('T')[0]
        ];
      } else if (dateRange.mode === 'before' && dateRange.from) {
        values = [dateRange.from.toISOString().split('T')[0]];
      } else if (dateRange.mode === 'after' && dateRange.from) {
        values = [dateRange.from.toISOString().split('T')[0]];
      }
    } else {
      values = selectedValues;
    }

    if (values.length === 0 && selectedField.type !== 'date') return;

    const newFilter: ActiveFilter = {
      id: `${selectedField.id}-${Date.now()}`,
      fieldId: selectedField.id,
      fieldLabel: selectedField.label,
      operator: selectedOperator,
      values,
      type: selectedField.type,
    };

    onFilterAdd(newFilter);
    
    // Reset state
    setSelectedField(null);
    setSelectedOperator(null);
    setSelectedValues([]);
    setDateRange(null);
    setIsOpen(false);
  };

  const canApply = () => {
    if (!selectedField || !selectedOperator) return false;
    
    if (selectedField.type === 'date') {
      return dateRange?.from !== undefined;
    }
    
    return selectedValues.length > 0;
  };

  const availableFields = fields.filter(
    field => !activeFilters.some(f => f.fieldId === field.id)
  );

  return (
    <div className={cn('flex items-center gap-2', className)} dir="rtl">
      {/* Filter Button */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-11 gap-2 border-indigo-200/60 shadow-sm hover:shadow-md transition-all"
          >
            <Filter className="h-4 w-4" />
            <span>סינון</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-80 p-0 shadow-xl" 
          align="end" 
          dir="rtl"
          side="bottom"
        >
          {!selectedField ? (
            <Command className="rounded-lg border-0">
              <CommandInput placeholder="חפש שדה לסינון..." dir="rtl" />
              <CommandList>
                <CommandEmpty>לא נמצאו שדות</CommandEmpty>
                <CommandGroup heading="בחר שדה לסינון">
                  {availableFields.map((field) => (
                    <CommandItem
                      key={field.id}
                      onSelect={() => handleFieldSelect(field)}
                      className="cursor-pointer"
                    >
                      {field.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          ) : (
            <div className="p-0">
              <div className="p-3 border-b bg-gray-50">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{selectedField.label}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedField(null);
                      setSelectedOperator(null);
                      setSelectedValues([]);
                      setDateRange(null);
                    }}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="p-4 space-y-4">
                {/* Operator Selection */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    תנאי
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {(selectedField.operators || DEFAULT_OPERATORS[selectedField.type]).map((op) => (
                      <Button
                        key={op}
                        variant={selectedOperator === op ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleOperatorSelect(op)}
                        className="text-xs"
                      >
                        {OPERATOR_LABELS[op]}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Value Selection */}
                {selectedOperator && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      ערך
                    </label>
                    
                    {/* Date Picker */}
                    {selectedField.type === 'date' && (
                      <DateRangePicker
                        mode={dateRange?.mode || 'single'}
                        date={dateRange?.from}
                        dateRange={dateRange?.from && dateRange?.to ? { from: dateRange.from, to: dateRange.to } : undefined}
                        onDateChange={(date) => setDateRange(prev => ({ ...prev, from: date }))}
                        onDateRangeChange={(range) => setDateRange(prev => ({ ...prev, from: range?.from, to: range?.to }))}
                      />
                    )}

                    {/* Multi-Select */}
                    {selectedField.type === 'multiselect' && selectedField.options && (
                      <div className="max-h-48 overflow-y-auto space-y-2 border rounded-md p-2">
                        {selectedField.options.map((option) => (
                          <div
                            key={option}
                            className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                            onClick={() => handleValueToggle(option)}
                          >
                            <Checkbox
                              checked={selectedValues.includes(option)}
                              onCheckedChange={() => handleValueToggle(option)}
                            />
                            <span className="text-sm">{option}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Single Select */}
                    {selectedField.type === 'select' && selectedField.options && (
                      <div className="max-h-48 overflow-y-auto space-y-1 border rounded-md p-2">
                        {selectedField.options.map((option) => (
                          <div
                            key={option}
                            className={cn(
                              "flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded",
                              selectedValues.includes(option) && "bg-indigo-50"
                            )}
                            onClick={() => handleValueToggle(option)}
                          >
                            {selectedValues.includes(option) && (
                              <Check className="h-4 w-4 text-indigo-600" />
                            )}
                            <span className="text-sm">{option}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Number Input */}
                    {selectedField.type === 'number' && (
                      <input
                        type="number"
                        className="w-full px-3 py-2 border rounded-md text-sm"
                        placeholder="הכנס מספר"
                        value={selectedValues[0] || ''}
                        onChange={(e) => setSelectedValues([e.target.value])}
                        dir="ltr"
                      />
                    )}

                    {/* Text Input */}
                    {selectedField.type === 'text' && (
                      <input
                        type="text"
                        className="w-full px-3 py-2 border rounded-md text-sm"
                        placeholder="הכנס טקסט"
                        value={selectedValues[0] || ''}
                        onChange={(e) => setSelectedValues([e.target.value])}
                        dir="rtl"
                      />
                    )}
                  </div>
                )}

                {/* Apply Button */}
                <Button
                  onClick={handleApplyFilter}
                  disabled={!canApply()}
                  className="w-full bg-indigo-600 hover:bg-indigo-700"
                  size="sm"
                >
                  הוסף סינון
                </Button>
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
};

