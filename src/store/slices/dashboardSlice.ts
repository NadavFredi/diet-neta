import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { supabase } from '@/lib/supabaseClient';

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

interface ColumnVisibility {
  id: boolean;
  name: boolean;
  createdDate: boolean;
  status: boolean;
  phone: boolean;
  email: boolean;
  source: boolean;
  age: boolean;
  birthDate: boolean;
  height: boolean;
  weight: boolean;
  fitnessGoal: boolean;
  activityLevel: boolean;
  preferredTime: boolean;
  notes: boolean;
}

interface DashboardState {
  leads: Lead[];
  filteredLeads: Lead[];
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

// Helper function to calculate age from birth date
function calculateAge(birthDate: string | null): number {
  if (!birthDate) return 0;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

// Helper function to format date to YYYY-MM-DD
function formatDateString(date: string | null): string {
  if (!date) return '';
  return new Date(date).toISOString().split('T')[0];
}

// Helper function to map DB lead to UI Lead format
function mapDBLeadToUILead(dbLead: DBLead): Lead {
  // Extract daily protocol data
  const dailyProtocol = dbLead.daily_protocol || {};
  const dailyStepsGoal = dailyProtocol.stepsGoal || 0;
  const weeklyWorkouts = dailyProtocol.workoutGoal || 0;
  const dailySupplements = dailyProtocol.supplements || [];

  // Extract subscription data
  const subscriptionData = dbLead.subscription_data || {};
  const subscription: SubscriptionInfo = {
    joinDate: dbLead.join_date ? formatDateString(dbLead.join_date) : '',
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
    createdDate: formatDateString(dbLead.created_at),
    status,
    phone: customer.phone,
    email: customer.email || '',
    source: dbLead.source || '',
    age: calculateAge(dbLead.birth_date),
    birthDate: dbLead.birth_date ? formatDateString(dbLead.birth_date) : '',
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

// Async thunk to fetch leads from Supabase (with customer JOIN)
export const fetchLeads = createAsyncThunk(
  'dashboard/fetchLeads',
  async (_, { rejectWithValue }) => {
    try {
      // Use the foreign key relationship - Supabase uses the table name
      const { data, error } = await supabase
        .from('leads')
        .select(`
          *,
          customers(*)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching leads:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        return rejectWithValue(error.message);
      }

      // Handle empty data gracefully
      if (!data || data.length === 0) {
        console.log('No leads found in database');
        return [];
      }

      console.log(`Fetched ${data.length} leads from database`);

      // Map database leads to UI format (with customer data)
      // Note: Supabase returns the joined table as 'customers' not 'customer'
      const mappedLeads = data
        .map((lead: any) => {
          // Supabase returns the joined table with the relationship name
          // Try both 'customers' and 'customer' for compatibility
          const customer = lead.customers || lead.customer;
          
          if (!customer) {
            console.error(`Lead ${lead.id} has no customer data. Lead data:`, {
              id: lead.id,
              customer_id: lead.customer_id,
              hasCustomers: !!lead.customers,
              hasCustomer: !!lead.customer,
            });
            return null;
          }

          try {
            return mapDBLeadToUILead({
              ...lead,
              customer: customer,
            });
          } catch (err) {
            console.error(`Error mapping lead ${lead.id}:`, err);
            return null;
          }
        })
        .filter((lead): lead is Lead => lead !== null);

      console.log(`Successfully mapped ${mappedLeads.length} leads`);
      return mappedLeads;
    } catch (err) {
      console.error('Unexpected error fetching leads:', err);
      return rejectWithValue('Failed to fetch leads');
    }
  }
);

const initialColumnVisibility: ColumnVisibility = {
  id: true,
  name: true,
  createdDate: true,
  status: true,
  phone: true,
  email: true,
  source: true,
  age: true,
  birthDate: true,
  height: true,
  weight: true,
  fitnessGoal: true,
  activityLevel: true,
  preferredTime: true,
  notes: false,
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
  leads: [],
  filteredLeads: [],
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
};

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    setLeads: (state, action: PayloadAction<Lead[]>) => {
      state.leads = action.payload;
      state.filteredLeads = applyFilters({ ...state, leads: action.payload });
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
      state.filteredLeads = applyFilters(state);
    },
    setSelectedDate: (state, action: PayloadAction<string | null>) => {
      state.selectedDate = action.payload;
      state.filteredLeads = applyFilters(state);
    },
    setSelectedStatus: (state, action: PayloadAction<string | null>) => {
      state.selectedStatus = action.payload;
      state.filteredLeads = applyFilters(state);
    },
    setSelectedAge: (state, action: PayloadAction<string | null>) => {
      state.selectedAge = action.payload;
      state.filteredLeads = applyFilters(state);
    },
    setSelectedHeight: (state, action: PayloadAction<string | null>) => {
      state.selectedHeight = action.payload;
      state.filteredLeads = applyFilters(state);
    },
    setSelectedWeight: (state, action: PayloadAction<string | null>) => {
      state.selectedWeight = action.payload;
      state.filteredLeads = applyFilters(state);
    },
    setSelectedFitnessGoal: (state, action: PayloadAction<string | null>) => {
      state.selectedFitnessGoal = action.payload;
      state.filteredLeads = applyFilters(state);
    },
    setSelectedActivityLevel: (state, action: PayloadAction<string | null>) => {
      state.selectedActivityLevel = action.payload;
      state.filteredLeads = applyFilters(state);
    },
    setSelectedPreferredTime: (state, action: PayloadAction<string | null>) => {
      state.selectedPreferredTime = action.payload;
      state.filteredLeads = applyFilters(state);
    },
    setSelectedSource: (state, action: PayloadAction<string | null>) => {
      state.selectedSource = action.payload;
      state.filteredLeads = applyFilters(state);
    },
    toggleColumnVisibility: (state, action: PayloadAction<keyof ColumnVisibility>) => {
      state.columnVisibility[action.payload] = !state.columnVisibility[action.payload];
    },
    setColumnVisibility: (state, action: PayloadAction<ColumnVisibility>) => {
      state.columnVisibility = action.payload;
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
      state.filteredLeads = applyFilters(state);
    },
    updateLeadStatus: (state, action: PayloadAction<{ leadId: string; status: string }>) => {
      const { leadId, status } = action.payload;
      const lead = state.leads.find((l) => l.id === leadId);
      if (lead) {
        lead.status = status;
        state.filteredLeads = applyFilters(state);
      }
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
        state.leads = action.payload;
        state.filteredLeads = applyFilters({ ...state, leads: action.payload });
      })
      .addCase(fetchLeads.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        // Keep existing leads on error, don't clear them
      });
  },
});

function applyFilters(state: DashboardState): Lead[] {
  let filtered = [...state.leads];

  // Apply search filter - search across all lead fields
  if (state.searchQuery) {
    const query = state.searchQuery.toLowerCase();
    filtered = filtered.filter((lead) => {
      // Search in name
      const nameMatch = lead.name?.toLowerCase().includes(query) || false;
      
      // Search in email
      const emailMatch = lead.email?.toLowerCase().includes(query) || false;
      
      // Search in phone (exact match, not case-sensitive)
      const phoneMatch = lead.phone?.includes(query) || false;
      
      // Search in fitness goal
      const fitnessGoalMatch = lead.fitnessGoal?.toLowerCase().includes(query) || false;
      
      // Search in activity level
      const activityLevelMatch = lead.activityLevel?.toLowerCase().includes(query) || false;
      
      // Search in preferred time
      const preferredTimeMatch = lead.preferredTime?.toLowerCase().includes(query) || false;
      
      // Search in source
      const sourceMatch = lead.source?.toLowerCase().includes(query) || false;
      
      // Search in notes
      const notesMatch = lead.notes?.toLowerCase().includes(query) || false;
      
      // Search in age (as string)
      const ageMatch = lead.age?.toString().includes(query) || false;
      
      // Search in birth date
      const birthDateMatch = lead.birthDate?.includes(query) || false;
      
      // Search in height (as string)
      const heightMatch = lead.height?.toString().includes(query) || false;
      
      // Search in weight (as string)
      const weightMatch = lead.weight?.toString().includes(query) || false;
      
      // Search in created date
      const createdDateMatch = lead.createdDate?.includes(query) || false;
      
      // Search in status
      const statusMatch = lead.status?.toLowerCase().includes(query) || false;
      
      // Search in subscription data
      const subscriptionMatch = 
        lead.subscription?.joinDate?.includes(query) ||
        lead.subscription?.timeInCurrentBudget?.toLowerCase().includes(query) ||
        lead.subscription?.initialPackageMonths?.toString().includes(query) ||
        lead.subscription?.currentWeekInProgram?.toString().includes(query) ||
        false;
      
      // Search in workout programs
      const workoutProgramsMatch = lead.workoutProgramsHistory?.some((program) =>
        program.programName?.toLowerCase().includes(query) ||
        program.description?.toLowerCase().includes(query) ||
        program.startDate?.includes(query) ||
        program.validUntil?.includes(query) ||
        program.duration?.toLowerCase().includes(query) ||
        false
      ) || false;
      
      // Search in daily supplements
      const supplementsMatch = lead.dailySupplements?.some((supplement) =>
        supplement.toLowerCase().includes(query)
      ) || false;
      
      // Search in daily steps goal
      const stepsGoalMatch = lead.dailyStepsGoal?.toString().includes(query) || false;
      
      // Search in weekly workouts
      const weeklyWorkoutsMatch = lead.weeklyWorkouts?.toString().includes(query) || false;

      return (
        nameMatch ||
        emailMatch ||
        phoneMatch ||
        fitnessGoalMatch ||
        activityLevelMatch ||
        preferredTimeMatch ||
        sourceMatch ||
        notesMatch ||
        ageMatch ||
        birthDateMatch ||
        heightMatch ||
        weightMatch ||
        createdDateMatch ||
        statusMatch ||
        subscriptionMatch ||
        workoutProgramsMatch ||
        supplementsMatch ||
        stepsGoalMatch ||
        weeklyWorkoutsMatch
      );
    });
  }

  // Apply date filter
  if (state.selectedDate) {
    filtered = filtered.filter((lead) => lead.createdDate === state.selectedDate);
  }

  // Apply status filter
  if (state.selectedStatus) {
    filtered = filtered.filter((lead) => lead.status === state.selectedStatus);
  }

  // Apply age filter
  if (state.selectedAge) {
    filtered = filtered.filter((lead) => lead.age.toString() === state.selectedAge);
  }

  // Apply height filter
  if (state.selectedHeight) {
    filtered = filtered.filter((lead) => lead.height.toString() === state.selectedHeight);
  }

  // Apply weight filter
  if (state.selectedWeight) {
    filtered = filtered.filter((lead) => lead.weight.toString() === state.selectedWeight);
  }

  // Apply fitness goal filter
  if (state.selectedFitnessGoal) {
    filtered = filtered.filter((lead) => lead.fitnessGoal === state.selectedFitnessGoal);
  }

  // Apply activity level filter
  if (state.selectedActivityLevel) {
    filtered = filtered.filter((lead) => lead.activityLevel === state.selectedActivityLevel);
  }

  // Apply preferred time filter
  if (state.selectedPreferredTime) {
    filtered = filtered.filter((lead) => lead.preferredTime === state.selectedPreferredTime);
  }

  // Apply source filter
  if (state.selectedSource) {
    filtered = filtered.filter((lead) => lead.source === state.selectedSource);
  }

  return filtered;
}

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
  updateLeadStatus,
} = dashboardSlice.actions;
export default dashboardSlice.reducer;


