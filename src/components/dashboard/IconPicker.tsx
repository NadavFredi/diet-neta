/**
 * IconPicker Component
 * 
 * Allows users to select an icon for saved views
 */

import { getAvailableIcons, getDefaultIconForResourceKey } from '@/utils/iconUtils';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface IconPickerProps {
  selectedIconName: string | null | undefined;
  resourceKey: string;
  onIconSelect: (iconName: string | null) => void;
  className?: string;
}

export const IconPicker = ({
  selectedIconName,
  resourceKey,
  onIconSelect,
  className,
}: IconPickerProps) => {
  const availableIcons = getAvailableIcons();
  const defaultIcon = getDefaultIconForResourceKey(resourceKey);
  const defaultIconName = availableIcons.find(
    icon => icon.component === defaultIcon
  )?.name || null;

  // Determine which icon is currently selected (use default if none selected)
  const currentIconName = selectedIconName || defaultIconName;

  return (
    <div className={cn('space-y-3', className)}>
      <Label className="text-sm font-medium">בחר אייקון</Label>
      <div className="grid grid-cols-5 gap-2">
        {availableIcons.map(({ name, component: Icon, label }) => {
          const isSelected = currentIconName === name;
          return (
            <Button
              key={name}
              type="button"
              variant={isSelected ? 'default' : 'outline'}
              size="sm"
              className={cn(
                'h-12 flex flex-col items-center justify-center gap-1',
                isSelected 
                  ? 'bg-[#5B6FB9] text-white border-[#5B6FB9]' 
                  : 'hover:bg-gray-50'
              )}
              onClick={() => onIconSelect(name)}
              title={label}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] leading-tight">{label}</span>
            </Button>
          );
        })}
      </div>
      <p className="text-xs text-gray-500 mt-2">
        האייקון יוצג בתפריט הצד ובכותרת הדף
      </p>
    </div>
  );
};
