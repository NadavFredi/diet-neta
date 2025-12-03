import { format } from 'date-fns';
import { he } from 'date-fns/locale';

export type ColumnKey = 'id' | 'name' | 'createdDate' | 'status' | 'phone' | 'email' | 'source';

export interface ColumnVisibility {
  id: boolean;
  name: boolean;
  createdDate: boolean;
  status: boolean;
  phone: boolean;
  email: boolean;
  source: boolean;
}

export const COLUMN_ORDER: ColumnKey[] = [
  'id',
  'name',
  'createdDate',
  'status',
  'phone',
  'email',
  'source',
];

export const STATUS_OPTIONS = ['חדש', 'בטיפול', 'הושלם'] as const;

export const getColumnLabel = (key: ColumnKey): string => {
  const labels: Record<ColumnKey, string> = {
    id: 'מזהה',
    name: 'שם',
    createdDate: 'תאריך יצירה',
    status: 'סטטוס',
    phone: 'טלפון',
    email: 'אימייל',
    source: 'מקור',
  };
  return labels[key];
};

export const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return format(date, 'dd/MM/yyyy', { locale: he });
  } catch {
    return dateString;
  }
};

