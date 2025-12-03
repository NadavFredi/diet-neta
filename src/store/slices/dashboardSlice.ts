import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Lead {
  id: string;
  name: string;
  createdDate: string;
  status: string;
  phone: string;
  email: string;
  source: string;
}

interface ColumnVisibility {
  id: boolean;
  name: boolean;
  createdDate: boolean;
  status: boolean;
  phone: boolean;
  email: boolean;
  source: boolean;
}

interface DashboardState {
  leads: Lead[];
  filteredLeads: Lead[];
  searchQuery: string;
  selectedDate: string | null;
  selectedStatus: string | null;
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
};

// Mock data for gym trainer leads
const mockLeads: Lead[] = [
  {
    id: '1',
    name: 'יוחנן כהן',
    createdDate: '2024-01-15',
    status: 'חדש',
    phone: '050-1234567',
    email: 'yohanan@example.com',
    source: 'פייסבוק',
  },
  {
    id: '2',
    name: 'שרה לוי',
    createdDate: '2024-01-16',
    status: 'בטיפול',
    phone: '052-2345678',
    email: 'sara@example.com',
    source: 'המלצה',
  },
  {
    id: '3',
    name: 'דוד ישראלי',
    createdDate: '2024-01-17',
    status: 'חדש',
    phone: '054-3456789',
    email: 'david@example.com',
    source: 'אינסטגרם',
  },
  {
    id: '4',
    name: 'רחל אברהם',
    createdDate: '2024-01-18',
    status: 'הושלם',
    phone: '050-4567890',
    email: 'rachel@example.com',
    source: 'פייסבוק',
  },
  {
    id: '5',
    name: 'משה כהן',
    createdDate: '2024-01-19',
    status: 'בטיפול',
    phone: '052-5678901',
    email: 'moshe@example.com',
    source: 'המלצה',
  },
  {
    id: '6',
    name: 'מרים דוד',
    createdDate: '2024-01-20',
    status: 'חדש',
    phone: '054-6789012',
    email: 'miriam@example.com',
    source: 'אינסטגרם',
  },
  {
    id: '7',
    name: 'אברהם יצחק',
    createdDate: '2024-01-21',
    status: 'בטיפול',
    phone: '050-7890123',
    email: 'avraham@example.com',
    source: 'פייסבוק',
  },
];

const initialState: DashboardState = {
  leads: mockLeads,
  filteredLeads: mockLeads,
  searchQuery: '',
  selectedDate: null,
  selectedStatus: null,
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
        lead.phone.includes(query)
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

  return filtered;
}

export const {
  setSearchQuery,
  setSelectedDate,
  setSelectedStatus,
  toggleColumnVisibility,
  setColumnVisibility,
} = dashboardSlice.actions;
export default dashboardSlice.reducer;


