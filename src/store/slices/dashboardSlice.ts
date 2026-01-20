import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { supabase } from '@/lib/supabaseClient';
import type { ColumnVisibility } from '@/utils/dashboard';

export interface WorkoutProgram {
  programName: string;
  startDate: string;
  validUntil: string;
  duration: string;
  description: string;
  strengthCount: number;
  cardioCount: number;
  intervalsCount: number;
}

export interface StepsHistory {
  weekNumber: string | number;
  startDate: string;
  endDate: string;
  target: number;
}

export interface SubscriptionInfo {
  joinDate: string;
  initialPackageMonths: number;
  initialPrice: number;
  monthlyRenewalPrice: number;
  currentWeekInProgram: number;
  timeInCurrentBudget: string;
}

export interface Lead {
  id: string;
  name: string;
  createdDate: string;
  status: string;
  phone: string;
  email: string;
  source: string;
  age: number;
  birthDate: string;
  height: number; // in cm
  weight: number; // in kg
  fitnessGoal: string;
  activityLevel: string;
  preferredTime: string;
  notes?: string;
  dailyStepsGoal: number;
  weeklyWorkouts: number;
  dailySupplements: string[];
  subscription: SubscriptionInfo;
  workoutProgramsHistory: WorkoutProgram[];
  stepsHistory: StepsHistory[];
  customerId?: string; // Link to customer
}

interface DashboardState {
  leads: Lead[]; // Source of truth - fetched from PostgreSQL (already filtered)
  searchQuery: string;
  selectedDate: string | null;
  selectedStatus: string | null;
  selectedAge: string | null;
  selectedHeight: string | null;
  selectedWeight: string | null;
  selectedFitnessGoal: string | null;
  selectedActivityLevel: string | null;
  selectedPreferredTime: string | null;
  selectedSource: string | null;
  columnVisibility: ColumnVisibility;
  isLoading: boolean;
  error: string | null;
  // Pagination state
  currentPage: number;
  pageSize: number; // 50 or 100
  totalLeads: number; // Total count from server (for pagination)
  // Sorting state
  sortBy: string; // Column to sort by (e.g., 'createdDate', 'name', 'status')
  sortOrder: 'ASC' | 'DESC';
  // NOTE: filteredLeads removed - filtering now happens in PostgreSQL via RPC
  // leads array already contains filtered results from get_filtered_leads()
}

// Database Customer type (matches Supabase schema)
interface DBCustomer {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  created_at: string;
  updated_at: string;
}

// Database Lead type (matches Supabase schema - normalized)
interface DBLead {
  id: string;
  created_at: string;
  updated_at: string;
  assigned_to: string | null;
  customer_id: string;
  city: string | null;
  birth_date: string | null;
  gender: string | null;
  status_main: string | null;
  status_sub: string | null;
  height: number | null;
  weight: number | null;
  bmi: number | null;
  join_date: string | null;
  subscription_data: any;
  daily_protocol: any;
  workout_history: any;
  steps_history: any;
  source: string | null;
  fitness_goal: string | null;
  activity_level: string | null;
  preferred_time: string | null;
  notes: string | null;
  // Joined customer data
  customer?: DBCustomer;
}

// =====================================================
// NOTE: Helper functions moved to service layer
// =====================================================
// calculateAge() -> Now in PostgreSQL (EXTRACT(YEAR FROM AGE(...)))
// formatDateString() -> Now in PostgreSQL (TO_CHAR(...))
// mapDBLeadToUILead() -> Now in leadService.ts (mapLeadToUIFormat)
// =====================================================

// Legacy mapping function (kept for backward compatibility during migration)
// Will be removed once all code uses leadService
function mapDBLeadToUILead(dbLead: DBLead): Lead {
  // Extract daily protocol data
  const dailyProtocol = dbLead.daily_protocol || {};
  const dailyStepsGoal = dailyProtocol.stepsGoal || 0;
  const weeklyWorkouts = dailyProtocol.workoutGoal || 0;
  const dailySupplements = dailyProtocol.supplements || [];

  // Extract subscription data
  const subscriptionData = dbLead.subscription_data || {};
  const subscription: SubscriptionInfo = {
    joinDate: dbLead.join_date ? new Date(dbLead.join_date).toISOString().split('T')[0] : '',
    initialPackageMonths: subscriptionData.months || 0,
    initialPrice: subscriptionData.initialPrice || 0,
    monthlyRenewalPrice: subscriptionData.renewalPrice || 0,
    currentWeekInProgram: subscriptionData.currentWeekInProgram || 0,
    timeInCurrentBudget: subscriptionData.timeInCurrentBudget || '',
  };

  // Map workout history
  const workoutHistory: WorkoutProgram[] = (dbLead.workout_history || []).map((workout: any) => ({
    programName: workout.name || '',
    startDate: workout.startDate ? formatDateString(workout.startDate) : '',
    validUntil: workout.validUntil ? formatDateString(workout.validUntil) : '',
    duration: workout.duration || '',
    description: workout.description || '',
    strengthCount: workout.split?.strength || workout.strengthCount || 0,
    cardioCount: workout.split?.cardio || workout.cardioCount || 0,
    intervalsCount: workout.split?.intervals || workout.intervalsCount || 0,
  }));

  // Map steps history
  const stepsHistory: StepsHistory[] = (dbLead.steps_history || []).map((step: any) => ({
    weekNumber: step.weekNumber || step.week || '',
    startDate: step.startDate ? formatDateString(step.startDate) : step.dates || '',
    endDate: step.endDate ? formatDateString(step.endDate) : '',
    target: step.target || 0,
  }));

  // Determine status (combine main and sub if needed, or use main)
  const status = dbLead.status_main || 'חדש';

  // Extract customer data (from JOIN)
  // Supabase may return it as 'customers' or 'customer' depending on the relationship name
  const customer = (dbLead as any).customers || dbLead.customer;
  if (!customer) {
    // This should never happen if the JOIN is correct, but TypeScript needs this check
    throw new Error(`Customer data is required for lead mapping. Lead ID: ${dbLead.id}`);
  }

  return {
    id: dbLead.id,
    name: customer.full_name,
    createdDate: new Date(dbLead.created_at).toISOString().split('T')[0],
    status,
    phone: customer.phone,
    email: customer.email || '',
    source: dbLead.source || '',
    age: dbLead.birth_date ? Math.floor((new Date().getTime() - new Date(dbLead.birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : 0, // Temporary calculation - will use PostgreSQL age
    birthDate: dbLead.birth_date ? new Date(dbLead.birth_date).toISOString().split('T')[0] : '',
    height: dbLead.height || 0,
    weight: dbLead.weight || 0,
    fitnessGoal: dbLead.fitness_goal || '',
    activityLevel: dbLead.activity_level || '',
    preferredTime: dbLead.preferred_time || '',
    notes: dbLead.notes || undefined,
    dailyStepsGoal,
    weeklyWorkouts,
    dailySupplements,
    subscription,
    workoutProgramsHistory: workoutHistory,
    stepsHistory,
    customerId: customer.id, // Add customer ID for linking
  };
}

// =====================================================
// NOTE: fetchLeads thunk is DEPRECATED
// =====================================================
// New architecture: Use leadService.fetchFilteredLeads() directly in hooks
// This thunk is kept for backward compatibility during migration
// =====================================================
export const fetchLeads = createAsyncThunk(
  'dashboard/fetchLeads',
  async (_, { rejectWithValue }) => {
    try {
      // Use the optimized view (pre-joined with customer data)
      const { data, error } = await supabase
        .from('v_leads_with_customer')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        return rejectWithValue(error.message);
      }

      if (!data || data.length === 0) {
        return [];
      }

      // Map using service layer function (minimal transformation)
      // Most calculations already done in PostgreSQL view
      const mappedLeads = data
        .map((dbLead: any) => {
          try {
            // Transform to match Lead interface
            return {
              id: dbLead.id,
              name: dbLead.customer_name,
              createdDate: dbLead.created_date_formatted,
              status: dbLead.status_sub || dbLead.status_main || '',
              phone: dbLead.customer_phone,
              email: dbLead.customer_email || '',
              source: dbLead.source || '',
              age: dbLead.age || 0, // Already calculated in PostgreSQL
              birthDate: dbLead.birth_date_formatted || '',
              height: dbLead.height || 0,
              weight: dbLead.weight || 0,
              fitnessGoal: dbLead.fitness_goal || '',
              activityLevel: dbLead.activity_level || '',
              preferredTime: dbLead.preferred_time || '',
              notes: dbLead.notes || undefined,
              dailyStepsGoal: dbLead.daily_steps_goal || 0,
              weeklyWorkouts: dbLead.weekly_workouts || 0,
              dailySupplements: dbLead.daily_supplements || [],
              subscription: {
                joinDate: '',
                initialPackageMonths: dbLead.subscription_months || 0,
                initialPrice: dbLead.subscription_initial_price || 0,
                monthlyRenewalPrice: dbLead.subscription_renewal_price || 0,
                currentWeekInProgram: 0,
                timeInCurrentBudget: '',
              },
              workoutProgramsHistory: [],
              stepsHistory: [],
              customerId: dbLead.customer_id,
            } as Lead;
          } catch (err) {
            return null;
          }
        })
        .filter((lead): lead is Lead => lead !== null);

      return mappedLeads;
    } catch (err) {
      return rejectWithValue('Failed to fetch leads');
    }
  }
);

// Default column visibility - only essential columns shown by default
// Users can add more columns via the column visibility menu
// Default column visibility matching the user's preferred view from the image
// Visible columns: Created At, Name, Status, Age, Fitness Goal, Activity Level, Preferred Time, Phone, Source, Notes
const initialColumnVisibility: ColumnVisibility = {
  // Visible columns (matching the image)
  createdDate: true,    // תאריך יצירה
  name: true,           // שם
  status: true,         // סטטוס
  age: true,            // גיל
  fitnessGoal: true,    // מטרת כושר
  activityLevel: true,   // רמת פעילות
  preferredTime: true,   // זמן מועדף
  phone: true,          // טלפון
  source: true,         // מקור
  notes: true,          // הערות
  
  // Hidden columns (not shown in the image)
  id: false,           // מזהה - hidden
  email: false,        // אימייל - hidden
  height: false,       // גובה - hidden (only in filters, not in table)
  weight: false,       // משקל - hidden (only in filters, not in table)
};

// Mock data removed - now fetching from Supabase
// Legacy mock data kept for reference (commented out):
/*
const mockLeads: Lead[] = [
  {
    id: '1',
    name: 'יוחנן כהן',
    createdDate: '2024-01-15',
    status: 'חדש',
    phone: '050-1234567',
    email: 'yohanan@example.com',
    source: 'פייסבוק',
    age: 32,
    birthDate: '1992-03-15',
    height: 178,
    weight: 85,
    fitnessGoal: 'ירידה במשקל',
    activityLevel: 'מתחיל',
    preferredTime: 'בוקר',
    notes: 'מעוניין בתוכנית אישית',
    dailyStepsGoal: 8000,
    weeklyWorkouts: 3,
    dailySupplements: ['אומגה 3', 'מגנזיום', 'ויטמין D'],
    subscription: {
      joinDate: '2024-01-15',
      initialPackageMonths: 3,
      initialPrice: 1200,
      monthlyRenewalPrice: 450,
      currentWeekInProgram: 8,
      timeInCurrentBudget: '3 חודשים',
    },
    workoutProgramsHistory: [
      {
        programName: 'תוכנית ירידה במשקל - מתחיל',
        startDate: '2024-01-15',
        validUntil: '2024-04-15',
        duration: '12 שבועות',
        description: 'תוכנית מותאמת למתחילים עם דגש על ירידה במשקל ושיפור סיבולת לב-ריאה',
        strengthCount: 2,
        cardioCount: 3,
        intervalsCount: 1,
      },
    ],
    stepsHistory: [
      {
        weekNumber: 'שבוע 1-4',
        startDate: '2024-01-15',
        endDate: '2024-02-11',
        target: 6000,
      },
      {
        weekNumber: 'שבוע 5-8',
        startDate: '2024-02-12',
        endDate: '2024-03-10',
        target: 7000,
      },
      {
        weekNumber: 'שבוע 9-12',
        startDate: '2024-03-11',
        endDate: '2024-04-07',
        target: 8000,
      },
    ],
  },
  {
    id: '2',
    name: 'שרה לוי',
    createdDate: '2024-01-16',
    status: 'בטיפול',
    phone: '052-2345678',
    email: 'sara@example.com',
    source: 'המלצה',
    age: 28,
    birthDate: '1996-05-22',
    height: 165,
    weight: 62,
    fitnessGoal: 'חיטוב',
    activityLevel: 'בינוני',
    preferredTime: 'ערב',
    notes: 'מתאמנת בעבר',
    dailyStepsGoal: 10000,
    weeklyWorkouts: 4,
    dailySupplements: ['אומגה 3', 'ברזל', 'קולגן'],
    subscription: {
      joinDate: '2024-01-16',
      initialPackageMonths: 6,
      initialPrice: 2400,
      monthlyRenewalPrice: 400,
      currentWeekInProgram: 12,
      timeInCurrentBudget: '6 חודשים',
    },
    workoutProgramsHistory: [
      {
        programName: 'תוכנית חיטוב - בינוני',
        startDate: '2024-01-16',
        validUntil: '2024-07-16',
        duration: '24 שבועות',
        description: 'תוכנית חיטוב מתקדמת עם דגש על אימוני כוח וסיבולת',
        strengthCount: 3,
        cardioCount: 2,
        intervalsCount: 2,
      },
    ],
    stepsHistory: [
      {
        weekNumber: 'שבוע 1-6',
        startDate: '2024-01-16',
        endDate: '2024-02-26',
        target: 8000,
      },
      {
        weekNumber: 'שבוע 7-12',
        startDate: '2024-02-27',
        endDate: '2024-04-08',
        target: 9000,
      },
      {
        weekNumber: 'שבוע 13-18',
        startDate: '2024-04-09',
        endDate: '2024-05-20',
        target: 10000,
      },
    ],
  },
  {
    id: '3',
    name: 'דוד ישראלי',
    createdDate: '2024-01-17',
    status: 'חדש',
    phone: '054-3456789',
    email: 'david@example.com',
    source: 'אינסטגרם',
    age: 45,
    birthDate: '1979-08-10',
    height: 182,
    weight: 92,
    fitnessGoal: 'בניית שרירים',
    activityLevel: 'מתקדם',
    preferredTime: 'בוקר',
    notes: '',
    dailyStepsGoal: 12000,
    weeklyWorkouts: 5,
    dailySupplements: ['חלבון', 'קריאטין', 'אומגה 3', 'ויטמין D'],
    subscription: {
      joinDate: '2024-01-17',
      initialPackageMonths: 12,
      initialPrice: 4800,
      monthlyRenewalPrice: 400,
      currentWeekInProgram: 4,
      timeInCurrentBudget: '12 חודשים',
    },
    workoutProgramsHistory: [
      {
        programName: 'תוכנית בניית שרירים - מתקדם',
        startDate: '2024-01-17',
        validUntil: '2025-01-17',
        duration: '52 שבועות',
        description: 'תוכנית אינטנסיבית לבניית מסת שריר עם דגש על אימוני כוח מתקדמים',
        strengthCount: 4,
        cardioCount: 1,
        intervalsCount: 2,
      },
    ],
    stepsHistory: [
      {
        weekNumber: 'שבוע 1-4',
        startDate: '2024-01-17',
        endDate: '2024-02-13',
        target: 10000,
      },
      {
        weekNumber: 'שבוע 5-8',
        startDate: '2024-02-14',
        endDate: '2024-03-12',
        target: 11000,
      },
      {
        weekNumber: 'שבוע 9-12',
        startDate: '2024-03-13',
        endDate: '2024-04-09',
        target: 12000,
      },
    ],
  },
  {
    id: '4',
    name: 'רחל אברהם',
    createdDate: '2024-01-18',
    status: 'הושלם',
    phone: '050-4567890',
    email: 'rachel@example.com',
    source: 'פייסבוק',
    age: 35,
    birthDate: '1989-11-05',
    height: 160,
    weight: 68,
    fitnessGoal: 'כושר כללי',
    activityLevel: 'בינוני',
    preferredTime: 'צהריים',
    notes: 'סיימה תוכנית בהצלחה',
    dailyStepsGoal: 10000,
    weeklyWorkouts: 4,
    dailySupplements: ['מולטי ויטמין', 'אומגה 3', 'מגנזיום'],
    subscription: {
      joinDate: '2023-10-18',
      initialPackageMonths: 6,
      initialPrice: 2400,
      monthlyRenewalPrice: 400,
      currentWeekInProgram: 24,
      timeInCurrentBudget: '6 חודשים',
    },
    workoutProgramsHistory: [
      {
        programName: 'תוכנית כושר כללי - בינוני',
        startDate: '2023-10-18',
        validUntil: '2024-04-18',
        duration: '24 שבועות',
        description: 'תוכנית מאוזנת לשיפור כושר כללי עם שילוב של אימוני כוח וסיבולת',
        strengthCount: 2,
        cardioCount: 2,
        intervalsCount: 1,
      },
    ],
    stepsHistory: [
      {
        weekNumber: 'שבוע 1-8',
        startDate: '2023-10-18',
        endDate: '2023-12-12',
        target: 8000,
      },
      {
        weekNumber: 'שבוע 9-16',
        startDate: '2023-12-13',
        endDate: '2024-02-06',
        target: 9000,
      },
      {
        weekNumber: 'שבוע 17-24',
        startDate: '2024-02-07',
        endDate: '2024-04-02',
        target: 10000,
      },
    ],
  },
  {
    id: '5',
    name: 'משה כהן',
    createdDate: '2024-01-19',
    status: 'בטיפול',
    phone: '052-5678901',
    email: 'moshe@example.com',
    source: 'המלצה',
    age: 39,
    birthDate: '1985-07-18',
    height: 175,
    weight: 78,
    fitnessGoal: 'שיפור סיבולת',
    activityLevel: 'מתחיל',
    preferredTime: 'ערב',
    notes: 'יש בעיות גב קלות',
    dailyStepsGoal: 7000,
    weeklyWorkouts: 2,
    dailySupplements: ['מגנזיום', 'ויטמין D', 'גלוקוזאמין'],
    subscription: {
      joinDate: '2024-01-19',
      initialPackageMonths: 3,
      initialPrice: 1200,
      monthlyRenewalPrice: 450,
      currentWeekInProgram: 6,
      timeInCurrentBudget: '3 חודשים',
    },
    workoutProgramsHistory: [
      {
        programName: 'תוכנית שיפור סיבולת - מתחיל',
        startDate: '2024-01-19',
        validUntil: '2024-04-19',
        duration: '12 שבועות',
        description: 'תוכנית עדינה לשיפור סיבולת עם התאמה לבעיות גב',
        strengthCount: 1,
        cardioCount: 2,
        intervalsCount: 1,
      },
    ],
    stepsHistory: [
      {
        weekNumber: 'שבוע 1-4',
        startDate: '2024-01-19',
        endDate: '2024-02-15',
        target: 5000,
      },
      {
        weekNumber: 'שבוע 5-8',
        startDate: '2024-02-16',
        endDate: '2024-03-14',
        target: 6000,
      },
      {
        weekNumber: 'שבוע 9-12',
        startDate: '2024-03-15',
        endDate: '2024-04-11',
        target: 7000,
      },
    ],
  },
  {
    id: '6',
    name: 'מרים דוד',
    createdDate: '2024-01-20',
    status: 'חדש',
    phone: '054-6789012',
    email: 'miriam@example.com',
    source: 'אינסטגרם',
    age: 26,
    birthDate: '1998-02-14',
    height: 168,
    weight: 58,
    fitnessGoal: 'חיטוב',
    activityLevel: 'בינוני',
    preferredTime: 'בוקר',
    notes: '',
    dailyStepsGoal: 10000,
    weeklyWorkouts: 4,
    dailySupplements: ['אומגה 3', 'ברזל', 'קולגן', 'ויטמין C'],
    subscription: {
      joinDate: '2024-01-20',
      initialPackageMonths: 6,
      initialPrice: 2400,
      monthlyRenewalPrice: 400,
      currentWeekInProgram: 10,
      timeInCurrentBudget: '6 חודשים',
    },
    workoutProgramsHistory: [
      {
        programName: 'תוכנית חיטוב - בינוני',
        startDate: '2024-01-20',
        validUntil: '2024-07-20',
        duration: '24 שבועות',
        description: 'תוכנית חיטוב מתקדמת עם דגש על אימוני כוח וסיבולת',
        strengthCount: 3,
        cardioCount: 2,
        intervalsCount: 2,
      },
    ],
    stepsHistory: [
      {
        weekNumber: 'שבוע 1-6',
        startDate: '2024-01-20',
        endDate: '2024-03-02',
        target: 8000,
      },
      {
        weekNumber: 'שבוע 7-12',
        startDate: '2024-03-03',
        endDate: '2024-04-13',
        target: 9000,
      },
      {
        weekNumber: 'שבוע 13-18',
        startDate: '2024-04-14',
        endDate: '2024-05-25',
        target: 10000,
      },
    ],
  },
  {
    id: '7',
    name: 'אברהם יצחק',
    createdDate: '2024-01-21',
    status: 'בטיפול',
    phone: '050-7890123',
    email: 'avraham@example.com',
    source: 'פייסבוק',
    age: 52,
    birthDate: '1972-09-30',
    height: 170,
    weight: 88,
    fitnessGoal: 'בריאות כללית',
    activityLevel: 'מתחיל',
    preferredTime: 'בוקר',
    notes: 'צריך תוכנית עדינה',
    dailyStepsGoal: 6000,
    weeklyWorkouts: 2,
    dailySupplements: ['מולטי ויטמין', 'אומגה 3', 'קו-אנזים Q10'],
    subscription: {
      joinDate: '2024-01-21',
      initialPackageMonths: 3,
      initialPrice: 1200,
      monthlyRenewalPrice: 450,
      currentWeekInProgram: 5,
      timeInCurrentBudget: '3 חודשים',
    },
    workoutProgramsHistory: [
      {
        programName: 'תוכנית בריאות כללית - מתחיל',
        startDate: '2024-01-21',
        validUntil: '2024-04-21',
        duration: '12 שבועות',
        description: 'תוכנית עדינה לשיפור בריאות כללית עם דגש על תנועה עדינה',
        strengthCount: 1,
        cardioCount: 2,
        intervalsCount: 0,
      },
    ],
    stepsHistory: [
      {
        weekNumber: 'שבוע 1-4',
        startDate: '2024-01-21',
        endDate: '2024-02-17',
        target: 4000,
      },
      {
        weekNumber: 'שבוע 5-8',
        startDate: '2024-02-18',
        endDate: '2024-03-16',
        target: 5000,
      },
      {
        weekNumber: 'שבוע 9-12',
        startDate: '2024-03-17',
        endDate: '2024-04-13',
        target: 6000,
      },
    ],
  },
  {
    id: '8',
    name: 'תמר כהן',
    createdDate: '2024-01-22',
    status: 'חדש',
    phone: '052-8901234',
    email: 'tamar@example.com',
    source: 'אינסטגרם',
    age: 31,
    birthDate: '1993-04-25',
    height: 172,
    weight: 70,
    fitnessGoal: 'ירידה במשקל',
    activityLevel: 'מתחיל',
    preferredTime: 'ערב',
    notes: '',
    dailyStepsGoal: 9000,
    weeklyWorkouts: 3,
    dailySupplements: ['אומגה 3', 'מגנזיום', 'L-קרניטין'],
    subscription: {
      joinDate: '2024-01-22',
      initialPackageMonths: 3,
      initialPrice: 1200,
      monthlyRenewalPrice: 450,
      currentWeekInProgram: 7,
      timeInCurrentBudget: '3 חודשים',
    },
    workoutProgramsHistory: [
      {
        programName: 'תוכנית ירידה במשקל - מתחיל',
        startDate: '2024-01-22',
        validUntil: '2024-04-22',
        duration: '12 שבועות',
        description: 'תוכנית מותאמת למתחילים עם דגש על ירידה במשקל ושיפור סיבולת',
        strengthCount: 2,
        cardioCount: 3,
        intervalsCount: 1,
      },
    ],
    stepsHistory: [
      {
        weekNumber: 'שבוע 1-4',
        startDate: '2024-01-22',
        endDate: '2024-02-18',
        target: 7000,
      },
      {
        weekNumber: 'שבוע 5-8',
        startDate: '2024-02-19',
        endDate: '2024-03-17',
        target: 8000,
      },
      {
        weekNumber: 'שבוע 9-12',
        startDate: '2024-03-18',
        endDate: '2024-04-14',
        target: 9000,
      },
    ],
  },
  {
    id: '9',
    name: 'אלון ישראלי',
    createdDate: '2024-01-23',
    status: 'בטיפול',
    phone: '054-9012345',
    email: 'alon@example.com',
    source: 'המלצה',
    age: 24,
    birthDate: '2000-06-12',
    height: 185,
    weight: 80,
    fitnessGoal: 'בניית שרירים',
    activityLevel: 'מתקדם',
    preferredTime: 'בוקר',
    notes: 'מתאמן באופן קבוע',
    dailyStepsGoal: 12000,
    weeklyWorkouts: 6,
    dailySupplements: ['חלבון', 'קריאטין', 'BCAA', 'אומגה 3', 'ויטמין D'],
    subscription: {
      joinDate: '2023-12-23',
      initialPackageMonths: 12,
      initialPrice: 4800,
      monthlyRenewalPrice: 400,
      currentWeekInProgram: 18,
      timeInCurrentBudget: '12 חודשים',
    },
    workoutProgramsHistory: [
      {
        programName: 'תוכנית בניית שרירים - מתקדם',
        startDate: '2023-12-23',
        validUntil: '2024-12-23',
        duration: '52 שבועות',
        description: 'תוכנית אינטנסיבית לבניית מסת שריר עם דגש על אימוני כוח מתקדמים',
        strengthCount: 4,
        cardioCount: 1,
        intervalsCount: 2,
      },
    ],
    stepsHistory: [
      {
        weekNumber: 'שבוע 1-12',
        startDate: '2023-12-23',
        endDate: '2024-03-16',
        target: 10000,
      },
      {
        weekNumber: 'שבוע 13-24',
        startDate: '2024-03-17',
        endDate: '2024-06-08',
        target: 11000,
      },
      {
        weekNumber: 'שבוע 25-36',
        startDate: '2024-06-09',
        endDate: '2024-08-31',
        target: 12000,
      },
    ],
  },
  {
    id: '10',
    name: 'נועה לוי',
    createdDate: '2024-01-24',
    status: 'חדש',
    phone: '050-0123456',
    email: 'noa@example.com',
    source: 'פייסבוק',
    age: 29,
    birthDate: '1995-12-08',
    height: 163,
    weight: 65,
    fitnessGoal: 'חיטוב',
    activityLevel: 'בינוני',
    preferredTime: 'צהריים',
    notes: '',
    dailyStepsGoal: 10000,
    weeklyWorkouts: 4,
    dailySupplements: ['אומגה 3', 'ברזל', 'קולגן', 'ויטמין B12'],
    subscription: {
      joinDate: '2024-01-24',
      initialPackageMonths: 6,
      initialPrice: 2400,
      monthlyRenewalPrice: 400,
      currentWeekInProgram: 3,
      timeInCurrentBudget: '6 חודשים',
    },
    workoutProgramsHistory: [
      {
        programName: 'תוכנית חיטוב - בינוני',
        startDate: '2024-01-24',
        validUntil: '2024-07-24',
        duration: '24 שבועות',
        description: 'תוכנית חיטוב מתקדמת עם דגש על אימוני כוח וסיבולת',
        strengthCount: 3,
        cardioCount: 2,
        intervalsCount: 2,
      },
    ],
    stepsHistory: [
      {
        weekNumber: 'שבוע 1-6',
        startDate: '2024-01-24',
        endDate: '2024-03-05',
        target: 8000,
      },
      {
        weekNumber: 'שבוע 7-12',
        startDate: '2024-03-06',
        endDate: '2024-04-16',
        target: 9000,
      },
      {
        weekNumber: 'שבוע 13-18',
        startDate: '2024-04-17',
        endDate: '2024-05-28',
        target: 10000,
      },
    ],
  },
];
*/

const initialState: DashboardState = {
  leads: [], // Source of truth - already filtered by PostgreSQL
  searchQuery: '',
  selectedDate: null,
  selectedStatus: null,
  selectedAge: null,
  selectedHeight: null,
  selectedWeight: null,
  selectedFitnessGoal: null,
  selectedActivityLevel: null,
  selectedPreferredTime: null,
  selectedSource: null,
  columnVisibility: initialColumnVisibility,
  isLoading: false,
  error: null,
  // Pagination state
  currentPage: 1,
  pageSize: 100, // Default to 100, can be changed to 50
  totalLeads: 0,
  // Sorting state
  sortBy: 'createdDate', // Default sort by created date
  sortOrder: 'DESC', // Default descending (newest first)
};

// Clean up columnVisibility to remove birthDate if it exists (migration)
const cleanColumnVisibility = (visibility: any): ColumnVisibility => {
  if (!visibility) return initialColumnVisibility;
  const { birthDate, ...cleaned } = visibility;
  // Ensure all required fields exist
  const result: ColumnVisibility = {
    id: cleaned.id ?? false,
    name: cleaned.name ?? true,
    createdDate: cleaned.createdDate ?? true,
    status: cleaned.status ?? true,
    phone: cleaned.phone ?? true,
    email: cleaned.email ?? false,
    source: cleaned.source ?? true,
    age: cleaned.age ?? true,
    height: cleaned.height ?? false,
    weight: cleaned.weight ?? false,
    fitnessGoal: cleaned.fitnessGoal ?? true,
    activityLevel: cleaned.activityLevel ?? true,
    preferredTime: cleaned.preferredTime ?? true,
    notes: cleaned.notes ?? false,
  };
  return result;
};

// Ensure initial state has correct columnVisibility
const safeInitialState = {
  ...initialState,
  columnVisibility: cleanColumnVisibility(initialState.columnVisibility),
};

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState: safeInitialState,
  reducers: {
    // Set leads (already filtered by PostgreSQL)
    setLeads: (state, action: PayloadAction<Lead[]>) => {
      state.leads = action.payload;
      // No need to filter - PostgreSQL already did it
    },
    // Filter state setters (no client-side filtering - triggers new fetch)
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
      // Filtering happens in PostgreSQL via useDashboardLogic hook
    },
    setSelectedDate: (state, action: PayloadAction<string | null>) => {
      state.selectedDate = action.payload;
    },
    setSelectedStatus: (state, action: PayloadAction<string | null>) => {
      state.selectedStatus = action.payload;
    },
    setSelectedAge: (state, action: PayloadAction<string | null>) => {
      state.selectedAge = action.payload;
    },
    setSelectedHeight: (state, action: PayloadAction<string | null>) => {
      state.selectedHeight = action.payload;
    },
    setSelectedWeight: (state, action: PayloadAction<string | null>) => {
      state.selectedWeight = action.payload;
    },
    setSelectedFitnessGoal: (state, action: PayloadAction<string | null>) => {
      state.selectedFitnessGoal = action.payload;
    },
    setSelectedActivityLevel: (state, action: PayloadAction<string | null>) => {
      state.selectedActivityLevel = action.payload;
    },
    setSelectedPreferredTime: (state, action: PayloadAction<string | null>) => {
      state.selectedPreferredTime = action.payload;
    },
    setSelectedSource: (state, action: PayloadAction<string | null>) => {
      state.selectedSource = action.payload;
    },
    toggleColumnVisibility: (state, action: PayloadAction<keyof ColumnVisibility>) => {
      state.columnVisibility[action.payload] = !state.columnVisibility[action.payload];
    },
    setColumnVisibility: (state, action: PayloadAction<ColumnVisibility>) => {
      state.columnVisibility = cleanColumnVisibility(action.payload);
    },
    resetFilters: (state) => {
      state.searchQuery = '';
      state.selectedDate = null;
      state.selectedStatus = null;
      state.selectedAge = null;
      state.selectedHeight = null;
      state.selectedWeight = null;
      state.selectedFitnessGoal = null;
      state.selectedActivityLevel = null;
      state.selectedPreferredTime = null;
      state.selectedSource = null;
      // Reset pagination to page 1 when filters change
      state.currentPage = 1;
      // No filtering needed - will trigger new fetch
    },
    // Pagination actions
    setCurrentPage: (state, action: PayloadAction<number>) => {
      state.currentPage = Math.max(1, action.payload); // Ensure page >= 1
    },
    setPageSize: (state, action: PayloadAction<number>) => {
      // Only allow 50 or 100
      const newPageSize = action.payload === 50 || action.payload === 100 ? action.payload : 100;
      state.pageSize = newPageSize;
      state.currentPage = 1; // Reset to first page when page size changes
    },
    setTotalLeads: (state, action: PayloadAction<number>) => {
      state.totalLeads = Math.max(0, action.payload);
    },
    // Sorting actions
    setSortBy: (state, action: PayloadAction<string>) => {
      state.sortBy = action.payload;
      state.currentPage = 1; // Reset to first page when sorting changes
    },
    setSortOrder: (state, action: PayloadAction<'ASC' | 'DESC'>) => {
      state.sortOrder = action.payload;
      state.currentPage = 1; // Reset to first page when sort order changes
    },
    // Clean up columnVisibility on any state update (migration helper)
    cleanColumnVisibilityState: (state) => {
      state.columnVisibility = cleanColumnVisibility(state.columnVisibility);
    },
    updateLeadStatus: (state, action: PayloadAction<{ leadId: string; status: string }>) => {
      const { leadId, status } = action.payload;
      const lead = state.leads.find((l) => l.id === leadId);
      if (lead) {
        lead.status = status;
        // No filtering needed - leads already filtered
      }
    },
    // Loading and error state
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchLeads.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchLeads.fulfilled, (state, action) => {
        state.isLoading = false;
        state.error = null;
        state.leads = action.payload; // Already filtered by PostgreSQL
      })
      .addCase(fetchLeads.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        // Keep existing leads on error, don't clear them
      });
  },
});

// =====================================================
// NOTE: applyFilters() function REMOVED
// =====================================================
// All filtering now happens in PostgreSQL via get_filtered_leads() RPC function
// This eliminates client-side filtering overhead
// =====================================================

export const {
  setLeads,
  setSearchQuery,
  setSelectedDate,
  setSelectedStatus,
  setSelectedAge,
  setSelectedHeight,
  setSelectedWeight,
  setSelectedFitnessGoal,
  setSelectedActivityLevel,
  setSelectedPreferredTime,
  setSelectedSource,
  toggleColumnVisibility,
  setColumnVisibility,
  resetFilters,
  cleanColumnVisibilityState,
  updateLeadStatus,
  setLoading,
  setError,
  // Pagination actions
  setCurrentPage,
  setPageSize,
  setTotalLeads,
  // Sorting actions
  setSortBy,
  setSortOrder,
} = dashboardSlice.actions;
export default dashboardSlice.reducer;


