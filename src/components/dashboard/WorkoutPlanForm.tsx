import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Trash2, 
  Calendar as CalendarIcon,
  X,
  Checkbox
} from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { Checkbox } from '@/components/ui/checkbox';
import type { WorkoutPlan, CustomField } from './WorkoutPlanCard';

interface WorkoutPlanFormProps {
  initialData?: WorkoutPlan;
  onSave: (plan: Partial<WorkoutPlan>) => void;
  onCancel: () => void;
  leadId?: string;
}

export const WorkoutPlanForm = ({ 
  initialData, 
  onSave, 
  onCancel,
  leadId 
}: WorkoutPlanFormProps) => {
  const [startDate, setStartDate] = useState<Date | undefined>(
    initialData?.start_date ? new Date(initialData.start_date) : new Date()
  );
  const [description, setDescription] = useState(initialData?.description || '');
  const [strength, setStrength] = useState(initialData?.strength || 0);
  const [cardio, setCardio] = useState(initialData?.cardio || 0);
  const [intervals, setIntervals] = useState(initialData?.intervals || 0);
  
  const [customFields, setCustomFields] = useState<CustomField[]>(
    initialData?.custom_attributes?.schema || []
  );
  const [customData, setCustomData] = useState<Record<string, any>>(
    initialData?.custom_attributes?.data || {}
  );

  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<'text' | 'number' | 'date' | 'boolean'>('text');

  const handleAddField = () => {
    if (!newFieldName.trim()) return;
    
    const fieldExists = customFields.some(f => f.fieldName === newFieldName.trim());
    if (fieldExists) {
      alert('שדה עם שם זה כבר קיים');
      return;
    }

    const newField: CustomField = {
      fieldName: newFieldName.trim(),
      fieldType: newFieldType,
    };

    setCustomFields([...customFields, newField]);
    setNewFieldName('');
    setNewFieldType('text');
  };

  const handleRemoveField = (fieldName: string) => {
    setCustomFields(customFields.filter(f => f.fieldName !== fieldName));
    const newData = { ...customData };
    delete newData[fieldName];
    setCustomData(newData);
  };

  const handleCustomDataChange = (fieldName: string, value: any) => {
    setCustomData({
      ...customData,
      [fieldName]: value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!startDate) {
      alert('נא לבחור תאריך התחלה');
      return;
    }

    const planData: Partial<WorkoutPlan> = {
      start_date: format(startDate, 'yyyy-MM-dd'),
      description,
      strength: Number(strength),
      cardio: Number(cardio),
      intervals: Number(intervals),
      custom_attributes: {
        schema: customFields,
        data: customData,
      },
      ...(leadId && { lead_id: leadId }),
    };

    onSave(planData);
  };

  const renderCustomFieldInput = (field: CustomField) => {
    const value = customData[field.fieldName];

    switch (field.fieldType) {
      case 'text':
        return (
          <Input
            value={value || ''}
            onChange={(e) => handleCustomDataChange(field.fieldName, e.target.value)}
            placeholder={`הכנס ${field.fieldName}`}
            className="mt-1"
          />
        );
      
      case 'number':
        return (
          <Input
            type="number"
            value={value || ''}
            onChange={(e) => handleCustomDataChange(field.fieldName, Number(e.target.value))}
            placeholder={`הכנס ${field.fieldName}`}
            className="mt-1"
          />
        );
      
      case 'date':
        const dateValue = value ? new Date(value) : undefined;
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full mt-1 justify-start text-right font-normal"
              >
                <CalendarIcon className="ml-2 h-4 w-4" />
                {dateValue ? format(dateValue, 'dd/MM/yyyy', { locale: he }) : 'בחר תאריך'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start" dir="rtl">
              <Calendar
                mode="single"
                selected={dateValue}
                onSelect={(date) => handleCustomDataChange(field.fieldName, date ? format(date, 'yyyy-MM-dd') : null)}
                locale={he}
              />
            </PopoverContent>
          </Popover>
        );
      
      case 'boolean':
        return (
          <div className="flex items-center space-x-2 space-x-reverse mt-1">
            <Checkbox
              id={`field-${field.fieldName}`}
              checked={value || false}
              onCheckedChange={(checked) => handleCustomDataChange(field.fieldName, checked)}
            />
            <Label htmlFor={`field-${field.fieldName}`} className="cursor-pointer">
              {value ? 'כן' : 'לא'}
            </Label>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" dir="rtl">
      {/* Standard Fields */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="start_date">תאריך התחלה *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full mt-1 justify-start text-right font-normal"
              >
                <CalendarIcon className="ml-2 h-4 w-4" />
                {startDate ? format(startDate, 'dd/MM/yyyy', { locale: he }) : 'בחר תאריך'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start" dir="rtl">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={setStartDate}
                locale={he}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div>
          <Label htmlFor="description">תיאור</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="הכנס תיאור לתוכנית האימונים"
            className="mt-1"
            rows={4}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="strength">כוח (אימונים בשבוע)</Label>
            <Input
              id="strength"
              type="number"
              min="0"
              value={strength}
              onChange={(e) => setStrength(Number(e.target.value))}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="cardio">קרדיו (אימונים בשבוע)</Label>
            <Input
              id="cardio"
              type="number"
              min="0"
              value={cardio}
              onChange={(e) => setCardio(Number(e.target.value))}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="intervals">אינטרוולים (אימונים בשבוע)</Label>
            <Input
              id="intervals"
              type="number"
              min="0"
              value={intervals}
              onChange={(e) => setIntervals(Number(e.target.value))}
              className="mt-1"
            />
          </div>
        </div>
      </div>

      {/* Custom Fields Builder */}
      <Card className="border-2 border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Plus className="h-5 w-5" />
            שדות מותאמים אישית
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add New Field */}
          <div className="flex gap-2 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <Input
              placeholder="שם השדה"
              value={newFieldName}
              onChange={(e) => setNewFieldName(e.target.value)}
              className="flex-1"
            />
            <Select value={newFieldType} onValueChange={(v: any) => setNewFieldType(v)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="text">טקסט</SelectItem>
                <SelectItem value="number">מספר</SelectItem>
                <SelectItem value="date">תאריך</SelectItem>
                <SelectItem value="boolean">כן/לא</SelectItem>
              </SelectContent>
            </Select>
            <Button
              type="button"
              onClick={handleAddField}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 ml-1" />
              הוסף
            </Button>
          </div>

          {/* Existing Custom Fields */}
          {customFields.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <h4 className="font-semibold text-slate-700">שדות קיימים:</h4>
              {customFields.map((field) => (
                <div
                  key={field.fieldName}
                  className="p-4 bg-white rounded-lg border border-slate-200 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Label className="font-semibold text-slate-900">
                        {field.fieldName}
                      </Label>
                      <Badge variant="outline" className="text-xs">
                        {field.fieldType === 'text' && 'טקסט'}
                        {field.fieldType === 'number' && 'מספר'}
                        {field.fieldType === 'date' && 'תאריך'}
                        {field.fieldType === 'boolean' && 'כן/לא'}
                      </Badge>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveField(field.fieldName)}
                      className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {renderCustomFieldInput(field)}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Actions */}
      <div className="flex gap-3 pt-4 border-t border-slate-200">
        <Button
          type="submit"
          className="flex-1 bg-blue-600 hover:bg-blue-700"
        >
          שמור תוכנית
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1"
        >
          ביטול
        </Button>
      </div>
    </form>
  );
};

