/**
 * Check-in Settings Page - Professional High-Density Field Manager
 * Allows admins to customize which fields and sections are visible in client check-in forms
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCheckInFieldConfigurations, type CheckInFieldConfiguration, DEFAULT_CHECK_IN_CONFIG } from '@/hooks/useCheckInFieldConfigurations';
import { useToast } from '@/hooks/use-toast';
import { Scale, Activity, UtensilsCrossed, Moon, Save, Trash2, Plus, GripVertical } from 'lucide-react';
import { RTLSwitch } from '@/components/ui/RTLSwitch';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { useSidebarWidth } from '@/hooks/useSidebarWidth';
import { useAppSelector } from '@/store/hooks';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Available units for fields
const AVAILABLE_UNITS = [
  'ק״ג',
  'ס״מ',
  'קק״ל',
  'גרם',
  'ליטר',
  'צעדים',
  'תרגילים',
  'דקות',
  'אינטרוולים',
  'שעות',
  '1-10',
  'טקסט',
];

interface FieldRowProps {
  fieldId: string;
  field: { visible: boolean; label: string; unit: string; section: string; order?: number };
  onToggle: (fieldId: string, visible: boolean) => void;
  onLabelChange: (fieldId: string, label: string) => void;
  onUnitChange: (fieldId: string, unit: string) => void;
  onDelete: (fieldId: string) => void;
}

const FieldRow: React.FC<FieldRowProps> = ({
  fieldId,
  field,
  onToggle,
  onLabelChange,
  onUnitChange,
  onDelete,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: fieldId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "grid grid-cols-[40px_30px_50px_1fr_120px] gap-2 items-center py-2 px-2 border-b border-slate-100 hover:bg-gray-50 transition-colors group",
        "text-xs"
      )}
      dir="rtl"
    >
      {/* Drag Handle */}
      <div className="flex items-center justify-center cursor-grab active:cursor-grabbing" {...attributes} {...listeners}>
        <GripVertical className="h-4 w-4 text-slate-400 hover:text-slate-600" />
      </div>

      {/* Delete Button - Left side (visual right in RTL) */}
      <div className="flex items-center justify-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(fieldId)}
          className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Visibility Toggle - RTL aligned */}
      <div className="flex items-center justify-center">
        <RTLSwitch
          checked={field.visible}
          onCheckedChange={(checked) => onToggle(fieldId, checked)}
          className="data-[state=checked]:bg-[#5B6FB9] scale-90"
        />
      </div>

      {/* Label Input - Borderless style */}
      <div className="min-w-0">
        <Input
          value={field.label}
          onChange={(e) => onLabelChange(fieldId, e.target.value)}
          className={cn(
            "h-7 border-0 bg-transparent px-1.5 py-0.5 text-xs font-medium text-slate-900 w-full",
            "focus-visible:ring-1 focus-visible:ring-[#5B6FB9] focus-visible:ring-offset-0",
            "hover:bg-slate-50 rounded transition-colors",
            !field.visible && "opacity-50"
          )}
          dir="rtl"
          placeholder="שם השדה"
          disabled={!field.visible}
          style={{ fontSize: '13px' }}
        />
      </div>

      {/* Unit Selector */}
      <div className="min-w-0">
        <Select
          value={field.unit}
          onValueChange={(value) => onUnitChange(fieldId, value)}
          disabled={!field.visible}
        >
          <SelectTrigger
            className={cn(
              "h-7 text-xs border-slate-200 bg-white px-2",
              !field.visible && "opacity-50"
            )}
            dir="rtl"
            style={{ fontSize: '12px' }}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent dir="rtl">
            {AVAILABLE_UNITS.map((unit) => (
              <SelectItem key={unit} value={unit} style={{ fontSize: '12px' }}>
                {unit}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

interface SectionEditorProps {
  sectionKey: string;
  section: { visible: boolean; label: string };
  fields: Record<string, { visible: boolean; label: string; unit: string; section: string; id?: string; order?: number }>;
  onSectionToggle: (sectionKey: string, visible: boolean) => void;
  onSectionLabelChange: (sectionKey: string, label: string) => void;
  onFieldToggle: (fieldId: string, visible: boolean) => void;
  onFieldLabelChange: (fieldId: string, label: string) => void;
  onFieldUnitChange: (fieldId: string, unit: string) => void;
  onFieldDelete: (fieldId: string) => void;
  onFieldAdd: (sectionKey: string) => void;
  onFieldReorder: (sectionKey: string, fieldIds: string[]) => void;
  sectionIcon: React.ComponentType<{ className?: string }>;
}

const SectionEditor: React.FC<SectionEditorProps> = ({
  sectionKey,
  section,
  fields,
  onSectionToggle,
  onSectionLabelChange,
  onFieldToggle,
  onFieldLabelChange,
  onFieldUnitChange,
  onFieldDelete,
  onFieldAdd,
  onFieldReorder,
  sectionIcon: SectionIcon,
}) => {
  const sectionFields = useMemo(() => {
    return Object.entries(fields)
      .filter(([_, field]) => field.section === sectionKey)
      .sort(([_, a], [__, b]) => {
        const orderA = a.order ?? 999;
        const orderB = b.order ?? 999;
        return orderA - orderB;
      });
  }, [fields, sectionKey]);

  const visibleCount = sectionFields.filter(([_, f]) => f.visible).length;
  
  const fieldIds = useMemo(() => sectionFields.map(([fieldId]) => fieldId), [sectionFields]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px of movement before dragging starts
      },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = fieldIds.indexOf(active.id as string);
      const newIndex = fieldIds.indexOf(over.id as string);

      const newFieldIds = [...fieldIds];
      const [removed] = newFieldIds.splice(oldIndex, 1);
      newFieldIds.splice(newIndex, 0, removed);

      onFieldReorder(sectionKey, newFieldIds);
    }
  };

  return (
    <Card className="border border-slate-200 bg-white shadow-sm" dir="rtl">
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <SectionIcon className="h-4 w-4 text-[#5B6FB9] flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <Input
                value={section.label}
                onChange={(e) => onSectionLabelChange(sectionKey, e.target.value)}
                className={cn(
                  "h-7 border-0 bg-transparent px-0 py-0.5 text-sm font-semibold text-slate-900",
                  "focus-visible:ring-1 focus-visible:ring-[#5B6FB9] focus-visible:ring-offset-0",
                  "hover:bg-slate-50 rounded transition-colors"
                )}
                dir="rtl"
                placeholder="שם הסעיף"
                style={{ fontSize: '13px', fontWeight: 600 }}
              />
              <CardDescription className="text-xs mt-0 text-slate-500" style={{ fontSize: '11px' }}>
                {sectionFields.length} שדות • {visibleCount} גלויים
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <RTLSwitch
              checked={section.visible}
              onCheckedChange={(checked) => onSectionToggle(sectionKey, checked)}
              className="data-[state=checked]:bg-[#5B6FB9] scale-90"
            />
          </div>
        </div>
      </CardHeader>
      {section.visible && (
        <CardContent className="pt-0 pb-2 px-3">
          {/* Table Header */}
          <div
            className="grid grid-cols-[40px_30px_50px_1fr_120px] gap-2 items-center py-1.5 px-2 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider"
            dir="rtl"
            style={{ fontSize: '10px' }}
          >
            <div className="text-center"></div>
            <div className="text-center"></div>
            <div className="text-center">פעיל</div>
            <div>שם השדה</div>
            <div>יחידה</div>
          </div>

          {/* Field Rows */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={fieldIds} strategy={verticalListSortingStrategy}>
              <div className="divide-y divide-slate-100">
                {sectionFields.map(([fieldId, field]) => (
                  <FieldRow
                    key={fieldId}
                    fieldId={fieldId}
                    field={field}
                    onToggle={onFieldToggle}
                    onLabelChange={onFieldLabelChange}
                    onUnitChange={onFieldUnitChange}
                    onDelete={onFieldDelete}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {/* Add Field Button - Dashed border ghost button */}
          <div className="pt-1.5 mt-1.5 border-t border-slate-200">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onFieldAdd(sectionKey)}
              className={cn(
                "w-full h-8 border-2 border-dashed border-slate-300 bg-transparent",
                "text-slate-600 hover:text-slate-900 hover:bg-slate-50",
                "hover:border-slate-400 transition-colors",
                "text-xs font-medium"
              )}
              dir="rtl"
            >
              <Plus className="h-3.5 w-3.5 ml-1.5" />
              הוסף שדה חדש
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export const CheckInSettingsPage: React.FC = () => {
  const { configuration, isLoading, saveConfiguration } = useCheckInFieldConfigurations(null); // Global config
  const { toast } = useToast();
  const [localConfig, setLocalConfig] = useState<CheckInFieldConfiguration>(DEFAULT_CHECK_IN_CONFIG);
  const [hasChanges, setHasChanges] = useState(false);
  const sidebarWidth = useSidebarWidth();
  const { user } = useAppSelector((state) => state.auth);
  const { handleLogout } = useAuth();

  // Initialize local config when configuration loads
  useEffect(() => {
    if (configuration) {
      // Ensure all fields have units
      const configWithUnits: CheckInFieldConfiguration = {
        ...configuration,
        fields: Object.fromEntries(
          Object.entries(configuration.fields).map(([key, field]) => [
            key,
            {
              ...field,
              unit: field.unit || AVAILABLE_UNITS[0], // Default to first unit if missing
            },
          ])
        ),
      };
      setLocalConfig(configWithUnits);
      setHasChanges(false);
    }
  }, [configuration]);

  const handleSectionToggle = (sectionKey: string, visible: boolean) => {
    setLocalConfig((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        [sectionKey]: { ...prev.sections[sectionKey as keyof typeof prev.sections], visible },
      },
    }));
    setHasChanges(true);
  };

  const handleSectionLabelChange = (sectionKey: string, label: string) => {
    setLocalConfig((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        [sectionKey]: { ...prev.sections[sectionKey as keyof typeof prev.sections], label },
      },
    }));
    setHasChanges(true);
  };

  const handleFieldToggle = (fieldId: string, visible: boolean) => {
    setLocalConfig((prev) => ({
      ...prev,
      fields: {
        ...prev.fields,
        [fieldId]: { ...prev.fields[fieldId], visible },
      },
    }));
    setHasChanges(true);
  };

  const handleFieldLabelChange = (fieldId: string, label: string) => {
    setLocalConfig((prev) => ({
      ...prev,
      fields: {
        ...prev.fields,
        [fieldId]: { ...prev.fields[fieldId], label },
      },
    }));
    setHasChanges(true);
  };

  const handleFieldUnitChange = (fieldId: string, unit: string) => {
    setLocalConfig((prev) => ({
      ...prev,
      fields: {
        ...prev.fields,
        [fieldId]: { ...prev.fields[fieldId], unit },
      },
    }));
    setHasChanges(true);
  };

  const handleFieldDelete = (fieldId: string) => {
    setLocalConfig((prev) => {
      const newFields = { ...prev.fields };
      delete newFields[fieldId];
      return {
        ...prev,
        fields: newFields,
      };
    });
    setHasChanges(true);
    toast({
      title: 'הצלחה',
      description: 'השדה נמחק בהצלחה',
    });
  };

  const handleFieldAdd = (sectionKey: string) => {
    const newFieldId = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Get existing fields in this section to determine next order
    const sectionFields = Object.entries(localConfig.fields)
      .filter(([_, field]) => field.section === sectionKey);
    const maxOrder = Math.max(
      ...sectionFields.map(([_, field]) => field.order ?? 0),
      -1
    );
    
    setLocalConfig((prev) => ({
      ...prev,
      fields: {
        ...prev.fields,
        [newFieldId]: {
          visible: true,
          label: 'שדה חדש',
          unit: AVAILABLE_UNITS[0],
          section: sectionKey as 'body' | 'activity' | 'nutrition' | 'wellness',
          id: newFieldId,
          order: maxOrder + 1,
        },
      },
    }));
    setHasChanges(true);
  };

  const handleFieldReorder = (sectionKey: string, fieldIds: string[]) => {
    setLocalConfig((prev) => {
      const newFields = { ...prev.fields };
      
      // Update order for each field based on new position
      fieldIds.forEach((fieldId, index) => {
        if (newFields[fieldId]) {
          newFields[fieldId] = {
            ...newFields[fieldId],
            order: index,
          };
        }
      });
      
      return {
        ...prev,
        fields: newFields,
      };
    });
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      await saveConfiguration(localConfig, true); // Save as global config
      setHasChanges(false);
      toast({
        title: 'הצלחה',
        description: 'הגדרות צ\'ק-אין נשמרו בהצלחה',
      });
    } catch (error: any) {
      toast({
        title: 'שגיאה',
        description: error.message || 'נכשל בשמירת ההגדרות',
        variant: 'destructive',
      });
    }
  };

  const handleReset = () => {
    setLocalConfig(DEFAULT_CHECK_IN_CONFIG);
    setHasChanges(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" dir="rtl">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#5B6FB9] mb-2"></div>
          <p className="text-sm text-gray-600">טוען הגדרות...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 flex flex-col min-h-screen" dir="rtl">
      <DashboardHeader
        userEmail={user?.email}
        onLogout={handleLogout}
        sidebarContent={<DashboardSidebar />}
      />
      
      <div 
        className="flex-1 overflow-y-auto"
        style={{ marginRight: `${sidebarWidth.width}px` }}
      >
        <div className="p-4 pt-24 max-w-7xl mx-auto space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-xl font-bold text-slate-900 mb-0.5" style={{ fontSize: '18px' }}>הגדרות צ'ק-אין</h1>
              <p className="text-xs text-slate-600" style={{ fontSize: '12px' }}>
                התאם אישית אילו שדות וסעיפים יוצגו ללקוחות בטופס הצ'ק-אין היומי
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={!hasChanges}
                className="h-8 text-xs"
                style={{ fontSize: '12px' }}
              >
                אפס לברירת מחדל
              </Button>
              <Button
                onClick={handleSave}
                disabled={!hasChanges}
                className="bg-[#5B6FB9] hover:bg-[#5B6FB9]/90 text-white h-8 text-xs"
                style={{ fontSize: '12px' }}
              >
                <Save className="h-3.5 w-3.5 ml-1.5" />
                שמור הגדרות
              </Button>
            </div>
          </div>

          {/* Sections - 2 columns grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SectionEditor
              sectionKey="body"
              section={localConfig.sections.body}
              fields={localConfig.fields}
              onSectionToggle={handleSectionToggle}
              onSectionLabelChange={handleSectionLabelChange}
              onFieldToggle={handleFieldToggle}
              onFieldLabelChange={handleFieldLabelChange}
              onFieldUnitChange={handleFieldUnitChange}
              onFieldDelete={handleFieldDelete}
              onFieldAdd={handleFieldAdd}
              onFieldReorder={handleFieldReorder}
              sectionIcon={Scale}
            />

            <SectionEditor
              sectionKey="activity"
              section={localConfig.sections.activity}
              fields={localConfig.fields}
              onSectionToggle={handleSectionToggle}
              onSectionLabelChange={handleSectionLabelChange}
              onFieldToggle={handleFieldToggle}
              onFieldLabelChange={handleFieldLabelChange}
              onFieldUnitChange={handleFieldUnitChange}
              onFieldDelete={handleFieldDelete}
              onFieldAdd={handleFieldAdd}
              onFieldReorder={handleFieldReorder}
              sectionIcon={Activity}
            />

            <SectionEditor
              sectionKey="nutrition"
              section={localConfig.sections.nutrition}
              fields={localConfig.fields}
              onSectionToggle={handleSectionToggle}
              onSectionLabelChange={handleSectionLabelChange}
              onFieldToggle={handleFieldToggle}
              onFieldLabelChange={handleFieldLabelChange}
              onFieldUnitChange={handleFieldUnitChange}
              onFieldDelete={handleFieldDelete}
              onFieldAdd={handleFieldAdd}
              onFieldReorder={handleFieldReorder}
              sectionIcon={UtensilsCrossed}
            />

            <SectionEditor
              sectionKey="wellness"
              section={localConfig.sections.wellness}
              fields={localConfig.fields}
              onSectionToggle={handleSectionToggle}
              onSectionLabelChange={handleSectionLabelChange}
              onFieldToggle={handleFieldToggle}
              onFieldLabelChange={handleFieldLabelChange}
              onFieldUnitChange={handleFieldUnitChange}
              onFieldDelete={handleFieldDelete}
              onFieldAdd={handleFieldAdd}
              onFieldReorder={handleFieldReorder}
              sectionIcon={Moon}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
