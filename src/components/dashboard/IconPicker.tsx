/**
 * IconPicker Component
 * 
 * Allows users to select an icon with a modern, visual-first interface
 */

import React from 'react';
import { getAvailableIcons, getDefaultIconForResourceKey } from '@/utils/iconUtils';
import { cn } from '@/lib/utils';

interface IconPickerProps {
  selectedIconName: string | null | undefined;
  resourceKey: string;
  onIconSelect: (iconName: string | null) => void;
  className?: string;
}

// Memoized icon item component for performance
const IconItem = React.memo<{
  icon: { name: string; component: React.ComponentType<{ className?: string }>; label: string };
  isSelected: boolean;
  onSelect: (name: string) => void;
}>(({ icon: { name, component: Icon, label }, isSelected, onSelect }) => {
  return (
    <button
      type="button"
      onClick={() => onSelect(name)}
      title={label}
      className={cn(
        'relative flex items-center justify-center',
        'w-9 h-9 rounded-[8px]',
        'transition-all duration-200 ease-in-out',
        'border-2',
        'focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#5B6FB9]/50',
        isSelected
          ? 'bg-[#5B6FB9]/10 border-[#5B6FB9] text-[#5B6FB9] shadow-sm scale-100'
          : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50 hover:scale-105 hover:shadow-md'
      )}
      aria-label={label}
      aria-pressed={isSelected}
    >
      <Icon className="h-4 w-4" strokeWidth={2} />
    </button>
  );
});

IconItem.displayName = 'IconItem';

export const IconPicker = React.memo(({
  selectedIconName,
  resourceKey,
  onIconSelect,
  className,
}: IconPickerProps) => {
  const availableIcons = React.useMemo(() => getAvailableIcons(), []);
  const defaultIcon = getDefaultIconForResourceKey(resourceKey);
  const defaultIconName = React.useMemo(
    () => availableIcons.find(icon => icon.component === defaultIcon)?.name || null,
    [availableIcons, defaultIcon]
  );

  // Determine which icon is currently selected (use default if none selected)
  const currentIconName = selectedIconName || defaultIconName;

  return (
    <div className={cn('flex flex-col', className)} dir="rtl">
      {/* Scrollable icon grid container */}
      <div className="overflow-y-auto pr-0.5" style={{ maxHeight: '320px' }}>
        <div className="grid grid-cols-8 gap-2 p-0.5">
          {availableIcons.map((icon) => (
            <IconItem
              key={icon.name}
              icon={icon}
              isSelected={currentIconName === icon.name}
              onSelect={onIconSelect}
            />
          ))}
        </div>
      </div>
    </div>
  );
});

IconPicker.displayName = 'IconPicker';


