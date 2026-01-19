import { format } from "date-fns"
import { he } from "date-fns/locale"

export type ColumnKey =
  | "id"
  | "name"
  | "createdDate"
  | "status"
  | "phone"
  | "email"
  | "source"
  | "age"
  | "height"
  | "weight"
  | "fitnessGoal"
  | "activityLevel"
  | "preferredTime"
  | "notes"

export interface ColumnVisibility {
  id: boolean
  name: boolean
  createdDate: boolean
  status: boolean
  phone: boolean
  email: boolean
  source: boolean
  age: boolean
  height: boolean
  weight: boolean
  fitnessGoal: boolean
  activityLevel: boolean
  preferredTime: boolean
  notes: boolean
}

export const COLUMN_ORDER: ColumnKey[] = [
  "id",
  "name",
  "age",
  "height",
  "weight",
  "fitnessGoal",
  "activityLevel",
  "preferredTime",
  "createdDate",
  "status",
  "phone",
  "email",
  "source",
  "notes",
]

export const STATUS_OPTIONS = ["חדש", "בטיפול", "הושלם"] as const

export const FITNESS_GOAL_OPTIONS = [
  "ירידה במשקל",
  "חיטוב",
  "בניית שרירים",
  "כושר כללי",
  "שיפור סיבולת",
  "בריאות כללית",
] as const

export const ACTIVITY_LEVEL_OPTIONS = ["מתחיל", "בינוני", "מתקדם"] as const

export const PREFERRED_TIME_OPTIONS = ["בוקר", "צהריים", "ערב"] as const

export const SOURCE_OPTIONS = ["פייסבוק", "אינסטגרם", "המלצה"] as const

export const getColumnLabel = (key: ColumnKey): string => {
  const labels: Record<ColumnKey, string> = {
    id: "מזהה",
    name: "שם",
    createdDate: "תאריך יצירה",
    status: "סטטוס",
    phone: "טלפון",
    email: "אימייל",
    source: "מקור",
    age: "גיל",
    height: 'גובה (ס"מ)',
    weight: 'משקל (ק"ג)',
    fitnessGoal: "מטרת כושר",
    activityLevel: "רמת פעילות",
    preferredTime: "זמן מועדף",
    notes: "הערות",
  }
  return labels[key]
}

export const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString)
    return format(date, "dd/MM/yyyy", { locale: he })
  } catch {
    return dateString
  }
}

export const formatDateTime = (dateString: string): string => {
  try {
    const date = new Date(dateString)
    return format(date, "dd/MM/yyyy HH:mm", { locale: he })
  } catch {
    return dateString
  }
}
