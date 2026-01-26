import { format } from "date-fns"
import { he } from "date-fns/locale"

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

export const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString || dateString.trim() === '') return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return format(date, "dd/MM/yyyy", { locale: he });
  } catch {
    return '';
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

/**
 * Calculate the current week number from the join date
 * Week 1 starts from the join date
 * @param joinDate - The join date string (YYYY-MM-DD format)
 * @returns The current week number (1-based), or 0 if join date is invalid
 */
export const calculateCurrentWeekFromJoinDate = (joinDate: string | null | undefined): number => {
  if (!joinDate) return 0;
  
  try {
    const join = new Date(joinDate);
    const today = new Date();
    
    // Reset time to midnight for accurate day calculation
    join.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    // Check if join date is valid
    if (isNaN(join.getTime())) return 0;
    
    // If join date is in the future, return 0
    if (join > today) return 0;
    
    // Calculate difference in milliseconds
    const diffTime = today.getTime() - join.getTime();
    
    // Convert to days
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    // Calculate weeks (week 1 is days 0-6, week 2 is days 7-13, etc.)
    const weeks = Math.floor(diffDays / 7) + 1;
    
    return Math.max(1, weeks); // Ensure at least week 1
  } catch {
    return 0;
  }
}
