/**
 * WhatsApp Template Placeholders
 * 
 * Defines available placeholders for WhatsApp message templates
 */

export interface Placeholder {
  key: string;
  label: string;
  description: string;
  category: 'customer' | 'lead' | 'fitness' | 'plans';
}

export const AVAILABLE_PLACEHOLDERS: Placeholder[] = [
  // Customer information
  { key: 'name', label: 'שם מלא', description: 'שם הלקוח', category: 'customer' },
  { key: 'phone', label: 'טלפון', description: 'מספר טלפון', category: 'customer' },
  { key: 'email', label: 'אימייל', description: 'כתובת אימייל', category: 'customer' },
  { key: 'city', label: 'עיר', description: 'עיר מגורים', category: 'customer' },
  { key: 'gender', label: 'מגדר', description: 'מגדר הלקוח', category: 'customer' },
  
  // Lead/Inquiry information
  { key: 'status', label: 'סטטוס', description: 'סטטוס ההתעניינות', category: 'lead' },
  { key: 'created_date', label: 'תאריך יצירה', description: 'תאריך יצירת ההתעניינות', category: 'lead' },
  
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
  };
  return labels[category];
};


