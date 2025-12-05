import { createSlice, PayloadAction } from '@reduxjs/toolkit';

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
}

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

// Mock data for fitness trainer leads
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
  },
];

const initialState: DashboardState = {
  leads: mockLeads,
  filteredLeads: mockLeads,
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
};

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
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
  },
});

function applyFilters(state: DashboardState): Lead[] {
  let filtered = [...state.leads];

  // Apply search filter
  if (state.searchQuery) {
    const query = state.searchQuery.toLowerCase();
    filtered = filtered.filter(
      (lead) =>
        lead.name.toLowerCase().includes(query) ||
        lead.email.toLowerCase().includes(query) ||
        lead.phone.includes(query) ||
        lead.fitnessGoal.toLowerCase().includes(query) ||
        lead.activityLevel.toLowerCase().includes(query) ||
        lead.preferredTime.toLowerCase().includes(query) ||
        (lead.notes && lead.notes.toLowerCase().includes(query)) ||
        lead.age.toString().includes(query) ||
        lead.birthDate.includes(query) ||
        lead.height.toString().includes(query) ||
        lead.weight.toString().includes(query)
    );
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
} = dashboardSlice.actions;
export default dashboardSlice.reducer;


