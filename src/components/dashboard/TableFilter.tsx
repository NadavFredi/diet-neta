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

import React, { useState, useEffect } from 'react';
import { Filter, X, Check, Calendar, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { DateRangePicker } from './DateRangePicker';
import { cn } from '@/lib/utils';
import { FilterGroupDialog } from '@/components/dashboard/FilterGroupDialog';
import { isAdvancedFilterGroup } from '@/utils/filterGroupUtils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export type FilterOperator = 'is' | 'isNot' | 'contains' | 'notContains' | 'equals' | 'notEquals' | 'greaterThan' | 'lessThan' | 'before' | 'after' | 'between';

export type FilterType = 'select' | 'multiselect' | 'date' | 'number' | 'text';

export interface FilterField {
  id: string;
  label: string;
  type: FilterType;
  options?: string[]; // For select/multiselect - static options
  dynamicOptions?: string[]; // For select/multiselect - dynamically extracted from data
  operators?: FilterOperator[]; // Available operators for this field
  filterKey?: string; // Optional key for mapping filters to backend params
  relatedEntity?: string; // If this field belongs to a related entity (e.g., 'subscription', 'budget')
  relatedEntityLabel?: string; // Display label for the related entity
}

export interface ActiveFilter {
  id: string;
  fieldId: string;
  fieldLabel: string;
  operator: FilterOperator;
  values: string[];
  type: FilterType;
}

export interface FilterGroup {
  id: string;
  operator: 'and' | 'or';
  not?: boolean;
  children: Array<FilterNode>;
}

export type FilterNode = ActiveFilter | FilterGroup;

interface TableFilterProps {
  fields: FilterField[];
  activeFilters: ActiveFilter[];
  onFilterAdd: (filter: ActiveFilter) => void;
  onFilterUpdate?: (filter: ActiveFilter) => void;
  onFilterRemove: (filterId: string) => void;
  onFilterClear: () => void;
  filterGroup?: FilterGroup;
  onFilterGroupChange?: (group: FilterGroup) => void;
  allowDuplicateFields?: boolean;
  buttonLabel?: string;
  editFilter?: ActiveFilter | null;
  onEditApplied?: () => void;
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
  onFilterUpdate,
  onFilterRemove,
  onFilterClear,
  filterGroup,
  onFilterGroupChange,
  allowDuplicateFields = false,
  buttonLabel,
  editFilter,
  onEditApplied,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [selectedField, setSelectedField] = useState<FilterField | null>(null);
  const [selectedOperator, setSelectedOperator] = useState<FilterOperator | null>(null);
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date; mode?: 'single' | 'range' | 'before' | 'after' } | null>(null);
  const [valueSearchQuery, setValueSearchQuery] = useState('');
  const [editingFilterId, setEditingFilterId] = useState<string | null>(null);
  const isAdvancedGroup = isAdvancedFilterGroup(filterGroup);

  useEffect(() => {
    if (!editFilter) return;
    const field = fields.find((item) => item.id === editFilter.fieldId);
    if (!field) return;
    setSelectedField(field);
    setSelectedOperator(editFilter.operator);
    setSelectedValues(editFilter.values || []);
    setEditingFilterId(editFilter.id);
    setValueSearchQuery('');

    if (editFilter.type === 'date') {
      if (editFilter.operator === 'between') {
        setDateRange({
          mode: 'range',
          from: editFilter.values[0] ? new Date(editFilter.values[0]) : undefined,
          to: editFilter.values[1] ? new Date(editFilter.values[1]) : undefined,
        });
      } else if (editFilter.operator === 'before') {
        setDateRange({
          mode: 'before',
          from: editFilter.values[0] ? new Date(editFilter.values[0]) : undefined,
        });
      } else if (editFilter.operator === 'after') {
        setDateRange({
          mode: 'after',
          from: editFilter.values[0] ? new Date(editFilter.values[0]) : undefined,
        });
      } else {
        setDateRange({
          mode: 'single',
          from: editFilter.values[0] ? new Date(editFilter.values[0]) : undefined,
        });
      }
    } else {
      setDateRange(null);
    }

    setIsOpen(true);
  }, [editFilter, fields]);

  const handleFieldSelect = (field: FilterField) => {
    setSelectedField(field);
    setSelectedOperator(null);
    setSelectedValues([]);
    setDateRange(null);
    setValueSearchQuery(''); // Reset search when field changes
    
    // Set default operator
    const operators = field.operators || DEFAULT_OPERATORS[field.type];
    if (operators.length > 0) {
      setSelectedOperator(operators[0]);
    }
  };

  const handleOperatorSelect = (operator: FilterOperator) => {
    setSelectedOperator(operator);
    if (selectedField?.type === 'date') {
      if (operator === 'between') {
        setDateRange({ mode: 'range' });
      } else if (operator === 'before') {
        setDateRange({ mode: 'before', from: dateRange?.from });
      } else if (operator === 'after') {
        setDateRange({ mode: 'after', from: dateRange?.from });
      } else if (operator === 'equals') {
        setDateRange({ mode: 'single', from: dateRange?.from });
      } else {
        setDateRange({ mode: 'single' });
      }
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
      if (selectedOperator === 'between') {
        if (dateRange.from && dateRange.to) {
          values = [
            dateRange.from.toISOString().split('T')[0],
            dateRange.to.toISOString().split('T')[0]
          ];
        }
      } else if (selectedOperator === 'before' || selectedOperator === 'after' || selectedOperator === 'equals') {
        if (dateRange.from) {
          values = [dateRange.from.toISOString().split('T')[0]];
        }
      } else if (dateRange.mode === 'single' && dateRange.from) {
        values = [dateRange.from.toISOString().split('T')[0]];
      } else if (dateRange.mode === 'range' && dateRange.from && dateRange.to) {
        values = [
          dateRange.from.toISOString().split('T')[0],
          dateRange.to.toISOString().split('T')[0]
        ];
      }
    } else {
      values = selectedValues;
    }

    if (values.length === 0 && selectedField.type !== 'date') return;

    const newFilter: ActiveFilter = {
      id: editingFilterId || `${selectedField.id}-${Date.now()}`,
      fieldId: selectedField.id,
      fieldLabel: selectedField.label,
      operator: selectedOperator,
      values,
      type: selectedField.type,
    };

    if (editingFilterId && onFilterUpdate) {
      onFilterUpdate(newFilter);
    } else {
      onFilterAdd(newFilter);
    }
    
    // Reset state
    setSelectedField(null);
    setSelectedOperator(null);
    setSelectedValues([]);
    setDateRange(null);
    setEditingFilterId(null);
    setIsOpen(false);
    onEditApplied?.();
  };

  const canApply = () => {
    if (!selectedField || !selectedOperator) return false;
    
    if (selectedField.type === 'date') {
      if (selectedOperator === 'between') {
        return dateRange?.from !== undefined && dateRange?.to !== undefined;
      }
      return dateRange?.from !== undefined;
    }
    
    return selectedValues.length > 0;
  };

  const availableFields = allowDuplicateFields
    ? fields
    : fields.filter((field) => !activeFilters.some((f) => f.fieldId === field.id));

  return (
    <div className={cn('flex items-center gap-2', className)} dir="rtl">
      {/* Filter Button */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "gap-2 h-11",
              activeFilters.length > 0 && "bg-slate-50 border-slate-300"
            )}
          >
            <Filter className="h-4 w-4" />
            <span>{buttonLabel || 'סינון'}</span>
            {isAdvancedGroup && (
              <Badge variant="secondary" className="text-[11px] px-2 py-0.5 bg-indigo-100 text-indigo-700">
                מתקדם
              </Badge>
            )}
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
                {(() => {
                  // Group fields by related entity
                  const directFields = availableFields.filter(f => !f.relatedEntity);
                  const relatedEntityGroups = new Map<string, FilterField[]>();
                  
                  availableFields.forEach(field => {
                    if (field.relatedEntity) {
                      if (!relatedEntityGroups.has(field.relatedEntity)) {
                        relatedEntityGroups.set(field.relatedEntity, []);
                      }
                      relatedEntityGroups.get(field.relatedEntity)!.push(field);
                    }
                  });

                  return (
                    <>
                      {directFields.length > 0 && (
                        <CommandGroup heading="שדות ישירים">
                          {directFields.map((field) => (
                            <CommandItem
                              key={field.id}
                              onSelect={() => handleFieldSelect(field)}
                              className="cursor-pointer"
                            >
                              {field.label}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                      {Array.from(relatedEntityGroups.entries()).length > 0 && (
                        <div className="px-2 py-1">
                          <Accordion type="multiple" className="w-full">
                            {Array.from(relatedEntityGroups.entries()).map(([entityName, fields]) => {
                              const entityLabel = fields[0]?.relatedEntityLabel || entityName;
                              // Check if there's an "entity exists" field (field id ends with .exists or is just the entity name)
                              const entityExistsField = fields.find(f => f.id === `${entityName}.exists` || f.id === entityName);
                              const entityFields = fields.filter(f => f.id !== `${entityName}.exists` && f.id !== entityName);
                              
                              return (
                                <AccordionItem key={entityName} value={entityName} className="border-0">
                                  <AccordionTrigger className="py-2 px-3 hover:no-underline bg-gray-50 rounded-md mb-1 text-sm font-medium text-gray-700 hover:bg-gray-100">
                                    {entityLabel}
                                  </AccordionTrigger>
                                  <AccordionContent className="pb-1 pt-1">
                                    <div className="space-y-0.5">
                                      {/* Entity exists filter (if available) */}
                                      {entityExistsField && (
                                        <CommandItem
                                          onSelect={() => handleFieldSelect(entityExistsField)}
                                          className="cursor-pointer text-sm py-2 px-3 rounded-md hover:bg-gray-50"
                                        >
                                          {entityExistsField.label}
                                        </CommandItem>
                                      )}
                                      {/* Entity fields */}
                                      {entityFields.map((field) => (
                                        <CommandItem
                                          key={field.id}
                                          onSelect={() => handleFieldSelect(field)}
                                          className="cursor-pointer text-sm py-2 px-3 rounded-md hover:bg-gray-50"
                                        >
                                          {field.label}
                                        </CommandItem>
                                      ))}
                                    </div>
                                  </AccordionContent>
                                </AccordionItem>
                              );
                            })}
                          </Accordion>
                        </div>
                      )}
                    </>
                  );
                })()}
              </CommandList>
              {filterGroup && onFilterGroupChange && (
                <div className="p-3 border-t bg-white">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setIsOpen(false);
                      setIsGroupDialogOpen(true);
                    }}
                  >
                    עריכה מתקדמת
                  </Button>
                </div>
              )}
            </Command>
          ) : (
            <div className="p-0">
              <div className="p-3 border-b bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    {selectedField.relatedEntity && (
                      <span className="text-xs text-gray-500 mb-0.5">
                        {selectedField.relatedEntityLabel || selectedField.relatedEntity}
                      </span>
                    )}
                    <span className="text-sm font-medium text-gray-700">{selectedField.label}</span>
                  </div>
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
                        className={cn(
                          "text-xs",
                          selectedOperator === op 
                            ? "bg-[#5B6FB9] hover:bg-[#5B6FB9]/90 text-white" 
                            : "border-[#5B6FB9] bg-transparent text-[#5B6FB9] hover:bg-[#5B6FB9] hover:text-white"
                        )}
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
                        date={selectedOperator === 'equals' ? dateRange?.from : undefined}
                        dateRange={
                          selectedOperator === 'between' 
                            ? { from: dateRange?.from, to: dateRange?.to }
                            : (selectedOperator === 'before' || selectedOperator === 'after')
                            ? { from: dateRange?.from }
                            : undefined
                        }
                        onDateChange={(date) => {
                          if (selectedOperator === 'equals') {
                            setDateRange(prev => ({ ...prev, from: date, mode: 'single' }));
                          } else if (selectedOperator === 'before' || selectedOperator === 'after') {
                            setDateRange(prev => ({ ...prev, from: date, mode: selectedOperator }));
                          } else {
                            setDateRange(prev => ({ ...prev, from: date, mode: 'single' }));
                          }
                        }}
                        onDateRangeChange={(range) => {
                          if (selectedOperator === 'between') {
                            setDateRange(prev => ({ ...prev, from: range?.from, to: range?.to, mode: 'range' }));
                          } else if (selectedOperator === 'before' || selectedOperator === 'after') {
                            setDateRange(prev => ({ ...prev, from: range?.from, mode: selectedOperator }));
                          } else {
                            setDateRange(prev => ({ ...prev, from: range?.from, to: range?.to }));
                          }
                        }}
                        operator={selectedOperator}
                      />
                    )}

                    {/* Multi-Select */}
                    {selectedField.type === 'multiselect' && (selectedField.options || selectedField.dynamicOptions) && (
                      <div className="space-y-2">
                        {/* Search input for values */}
                        <Input
                          placeholder="חפש ערך..."
                          value={valueSearchQuery}
                          onChange={(e) => setValueSearchQuery(e.target.value)}
                          className="w-full h-9 text-sm bg-white text-gray-900 border border-gray-200 hover:bg-white focus:bg-white focus:border-indigo-400"
                          dir="rtl"
                        />
                        <div className="max-h-48 overflow-y-auto space-y-2 border rounded-md p-2">
                          {(selectedField.dynamicOptions || selectedField.options || [])
                            .filter(option => {
                              if (!valueSearchQuery.trim()) return true;
                              return option.toLowerCase().includes(valueSearchQuery.toLowerCase());
                            })
                            .map((option) => (
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
                      </div>
                    )}

                    {/* Single Select */}
                    {selectedField.type === 'select' && (selectedField.options || selectedField.dynamicOptions) && (
                      <div className="space-y-2">
                        {/* Search input for values */}
                        <Input
                          placeholder="חפש ערך..."
                          value={valueSearchQuery}
                          onChange={(e) => setValueSearchQuery(e.target.value)}
                          className="w-full h-9 text-sm bg-white text-gray-900 border border-gray-200 hover:bg-white focus:bg-white focus:border-indigo-400"
                          dir="rtl"
                        />
                        <div className="max-h-48 overflow-y-auto border rounded-md p-2">
                          <RadioGroup
                            value={selectedValues[0] || ''}
                            onValueChange={(value) => setSelectedValues([value])}
                            className="space-y-1"
                          >
                            {(selectedField.dynamicOptions || selectedField.options || [])
                              .filter(option => {
                                if (!valueSearchQuery.trim()) return true;
                                return option.toLowerCase().includes(valueSearchQuery.toLowerCase());
                              })
                              .map((option) => (
                                <div
                                  key={option}
                                  className={cn(
                                    "flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                                  )}
                                  onClick={() => setSelectedValues([option])}
                                >
                                  <RadioGroupItem value={option} id={`radio-${option}`} />
                                  <label
                                    htmlFor={`radio-${option}`}
                                    className="text-sm cursor-pointer flex-1"
                                  >
                                    {option}
                                  </label>
                                </div>
                              ))}
                          </RadioGroup>
                        </div>
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
                  className="w-full bg-[#5B6FB9] hover:bg-[#5B6FB9]/90 text-white"
                  size="sm"
                >
                  {editingFilterId ? 'עדכן סינון' : 'הוסף סינון'}
                </Button>
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>
      {filterGroup && onFilterGroupChange && (
        <FilterGroupDialog
          open={isGroupDialogOpen}
          onOpenChange={setIsGroupDialogOpen}
          filterGroup={filterGroup}
          fields={fields}
          onChange={onFilterGroupChange}
        />
      )}
    </div>
  );
};
