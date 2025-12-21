/**
 * Icon Utilities
 * 
 * Helper functions for icon selection and mapping
 */

import { 
  LayoutDashboard, 
  Dumbbell, 
  Apple, 
  Users, 
  UserCircle, 
  Flame,
  Settings,
  Link2,
  FileText,
  LucideIcon,
  type Icon
} from 'lucide-react';

// Map of icon names to Lucide icon components
export const ICON_MAP: Record<string, LucideIcon> = {
  'LayoutDashboard': LayoutDashboard,
  'Dumbbell': Dumbbell,
  'Apple': Apple,
  'Users': Users,
  'UserCircle': UserCircle,
  'Flame': Flame,
  'Settings': Settings,
  'Link2': Link2,
  'FileText': FileText,
};

// Get default icon for a resource key (matches the navigationItems defaults)
export const getDefaultIconForResourceKey = (resourceKey: string): LucideIcon => {
  const defaultIcons: Record<string, LucideIcon> = {
    'leads': LayoutDashboard, // Match sidebar default
    'customers': LayoutDashboard, // Match sidebar default
    'templates': Dumbbell,
    'nutrition_templates': Apple, // Match sidebar default (not Flame)
    'interfaces': Link2,
    'pages': FileText,
    'settings': Settings,
  };
  
  return defaultIcons[resourceKey] || LayoutDashboard;
};

// Get icon by name string, fallback to default for resource key
export const getIconByName = (iconName: string | null | undefined, resourceKey: string): LucideIcon => {
  if (iconName && iconName in ICON_MAP) {
    return ICON_MAP[iconName];
  }
  return getDefaultIconForResourceKey(resourceKey);
};

// Get all available icon options for selection
export const getAvailableIcons = (): Array<{ name: string; component: LucideIcon; label: string }> => {
  return [
    { name: 'LayoutDashboard', component: LayoutDashboard, label: 'לוח בקרה' },
    { name: 'Users', component: Users, label: 'משתמשים' },
    { name: 'UserCircle', component: UserCircle, label: 'משתמש' },
    { name: 'Dumbbell', component: Dumbbell, label: 'אימונים' },
    { name: 'Flame', component: Flame, label: 'תזונה' },
    { name: 'Apple', component: Apple, label: 'תפוח' },
    { name: 'FileText', component: FileText, label: 'מסמך' },
    { name: 'Link2', component: Link2, label: 'קישור' },
    { name: 'Settings', component: Settings, label: 'הגדרות' },
  ];
};
