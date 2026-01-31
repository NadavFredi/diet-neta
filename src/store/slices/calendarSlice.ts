import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type ViewMode = 'calendar' | 'month' | 'year';
export type CalendarViewType = 'month' | 'week' | 'day';

interface CalendarState {
  currentDate: string; // ISO string
  viewMode: ViewMode;
  calendarViewType: CalendarViewType;
  selectedYear: number;
  visibleFields: Record<string, boolean>;
}

const initialState: CalendarState = {
  currentDate: new Date().toISOString(),
  viewMode: 'calendar',
  calendarViewType: 'month',
  selectedYear: new Date().getFullYear(),
  visibleFields: {
    customer_name: true,
    time: true,
    status: true,
    type: false,
    phone: false,
    email: false,
  },
};

export const calendarSlice = createSlice({
  name: 'calendar',
  initialState,
  reducers: {
    setCurrentDate: (state, action: PayloadAction<string>) => {
      state.currentDate = action.payload;
    },
    setViewMode: (state, action: PayloadAction<ViewMode>) => {
      state.viewMode = action.payload;
    },
    setCalendarViewType: (state, action: PayloadAction<CalendarViewType>) => {
      state.calendarViewType = action.payload;
    },
    setSelectedYear: (state, action: PayloadAction<number>) => {
      state.selectedYear = action.payload;
    },
    toggleFieldVisibility: (state, action: PayloadAction<string>) => {
      state.visibleFields[action.payload] = !state.visibleFields[action.payload];
    },
    setVisibleFields: (state, action: PayloadAction<Record<string, boolean>>) => {
      state.visibleFields = action.payload;
    },
  },
});

export const {
  setCurrentDate,
  setViewMode,
  setCalendarViewType,
  setSelectedYear,
  toggleFieldVisibility,
  setVisibleFields,
} = calendarSlice.actions;

export default calendarSlice.reducer;
