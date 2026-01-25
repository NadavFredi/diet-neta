/**
 * WhatsApp Template Placeholders
 * 
 * Defines available placeholders for WhatsApp message templates
 */

export interface Placeholder {
  key: string;
  label: string;
  description: string;
  category: 'customer' | 'lead' | 'fitness' | 'plans' | 'weekly_review';
}

export const AVAILABLE_PLACEHOLDERS: Placeholder[] = [
  // Customer information
  { key: 'name', label: 'שם מלא', description: 'שם הלקוח', category: 'customer' },
  { key: 'phone', label: 'טלפון', description: 'מספר טלפון', category: 'customer' },
  { key: 'email', label: 'אימייל', description: 'כתובת אימייל', category: 'customer' },
  { key: 'password', label: 'סיסמה', description: 'סיסמת המשתמש', category: 'customer' },
  { key: 'login_url', label: 'קישור התחברות', description: 'קישור לדף ההתחברות', category: 'customer' },
  { key: 'city', label: 'עיר', description: 'עיר מגורים', category: 'customer' },
  { key: 'gender', label: 'מגדר', description: 'מגדר הלקוח', category: 'customer' },
  
  // Lead/Inquiry information
  { key: 'status', label: 'סטטוס', description: 'סטטוס ההתעניינות', category: 'lead' },
  { key: 'created_date', label: 'תאריך יצירה', description: 'תאריך יצירת ההתעניינות', category: 'lead' },
  { key: 'lead_id', label: 'מזהה ליד', description: 'מזהה ייחודי של הליד ב-Supabase (לשימוש בפרמטר URL)', category: 'lead' },
  
  // Fitness information
  { key: 'fitness_goal', label: 'מטרת כושר', description: 'מטרת הכושר של הלקוח', category: 'fitness' },
  { key: 'activity_level', label: 'רמת פעילות', description: 'רמת הפעילות הגופנית', category: 'fitness' },
  { key: 'preferred_time', label: 'זמן מועדף', description: 'זמן אימון מועדף', category: 'fitness' },
  { key: 'height', label: 'גובה', description: 'גובה בס"מ', category: 'fitness' },
  { key: 'weight', label: 'משקל', description: 'משקל בק"ג', category: 'fitness' },
  { key: 'bmi', label: 'BMI', description: 'מדד מסת הגוף', category: 'fitness' },
  { key: 'age', label: 'גיל', description: 'גיל הלקוח', category: 'fitness' },
  
  // Plans (if available)
  { key: 'workout_plan_name', label: 'שם תוכנית אימונים', description: 'שם תוכנית האימונים הפעילה', category: 'plans' },
  { key: 'nutrition_plan_name', label: 'שם תוכנית תזונה', description: 'שם תוכנית התזונה הפעילה', category: 'plans' },
  { key: 'budget_link', label: 'קישור תכנית פעולה', description: 'קישור לתכנית פעולה (Taktziv)', category: 'plans' },
  { key: 'budget_name', label: 'שם תכנית פעולה', description: 'שם תכנית הפעולה', category: 'plans' },
  
  // Payment
  { key: 'payment_link', label: 'קישור תשלום', description: 'קישור לתשלום Stripe', category: 'customer' },
  
  // Weekly Review placeholders (for weekly_review template)
  { key: 'week_label', label: 'תווית שבוע', description: 'טווח התאריכים של השבוע (למשל: שבוע 01/01 - 07/01)', category: 'weekly_review' },
  { key: 'week_start', label: 'תחילת שבוע', description: 'תאריך תחילת השבוע', category: 'weekly_review' },
  { key: 'week_end', label: 'סוף שבוע', description: 'תאריך סוף השבוע', category: 'weekly_review' },
  { key: 'first_name', label: 'שם פרטי', description: 'השם הפרטי של הלקוח', category: 'weekly_review' },
  { key: 'full_name', label: 'שם מלא', description: 'השם המלא של הלקוח', category: 'weekly_review' },
  { key: 'target_calories', label: 'יעד קלוריות', description: 'יעד קלוריות יומי', category: 'weekly_review' },
  { key: 'target_protein', label: 'יעד חלבון', description: 'יעד חלבון יומי בגרמים', category: 'weekly_review' },
  { key: 'target_fiber', label: 'יעד סיבים', description: 'יעד סיבים יומי בגרמים', category: 'weekly_review' },
  { key: 'target_steps', label: 'יעד צעדים', description: 'יעד צעדים יומי', category: 'weekly_review' },
  { key: 'actual_calories', label: 'קלוריות בפועל', description: 'ממוצע קלוריות בפועל', category: 'weekly_review' },
  { key: 'actual_protein', label: 'חלבון בפועל', description: 'ממוצע חלבון בפועל בגרמים', category: 'weekly_review' },
  { key: 'actual_fiber', label: 'סיבים בפועל', description: 'ממוצע סיבים בפועל בגרמים', category: 'weekly_review' },
  { key: 'actual_weight', label: 'משקל ממוצע', description: 'משקל ממוצע לשבוע בק"ג', category: 'weekly_review' },
  { key: 'trainer_summary', label: 'סיכום מאמן', description: 'סיכום ומסקנות המאמן', category: 'weekly_review' },
  { key: 'action_plan', label: 'תוכנית פעולה', description: 'דגשים ומטרות לשבוע הבא', category: 'weekly_review' },
];

export const getPlaceholdersByCategory = (category: Placeholder['category']): Placeholder[] => {
  return AVAILABLE_PLACEHOLDERS.filter(p => p.category === category);
};

export const getCategoryLabel = (category: Placeholder['category']): string => {
  const labels: Record<Placeholder['category'], string> = {
    customer: 'פרטי לקוח',
    lead: 'פרטי התעניינות',
    fitness: 'מידע כושר',
    plans: 'תוכניות',
    weekly_review: 'סיכום שבועי',
  };
  return labels[category];
};


