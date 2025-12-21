import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface SidebarState {
  isCollapsed: boolean;
  expandedSections: Record<string, boolean>;
}

const initialState: SidebarState = {
  isCollapsed: false,
  expandedSections: {
    leads: true,
    customers: true,
    templates: true,
    nutrition_templates: true,
  },
};

const sidebarSlice = createSlice({
  name: 'sidebar',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.isCollapsed = !state.isCollapsed;
      // When collapsing, also collapse all sections
      if (state.isCollapsed) {
        Object.keys(state.expandedSections).forEach((key) => {
          state.expandedSections[key] = false;
        });
      }
    },
    setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.isCollapsed = action.payload;
      // When collapsing, also collapse all sections
      if (action.payload) {
        Object.keys(state.expandedSections).forEach((key) => {
          state.expandedSections[key] = false;
        });
      }
    },
    toggleSection: (state, action: PayloadAction<string>) => {
      const resourceKey = action.payload;
      if (state.expandedSections[resourceKey] !== undefined) {
        state.expandedSections[resourceKey] = !state.expandedSections[resourceKey];
      } else {
        state.expandedSections[resourceKey] = true;
      }
    },
    setSectionExpanded: (state, action: PayloadAction<{ resourceKey: string; expanded: boolean }>) => {
      const { resourceKey, expanded } = action.payload;
      state.expandedSections[resourceKey] = expanded;
    },
    expandAllSections: (state) => {
      Object.keys(state.expandedSections).forEach((key) => {
        state.expandedSections[key] = true;
      });
    },
    collapseAllSections: (state) => {
      Object.keys(state.expandedSections).forEach((key) => {
        state.expandedSections[key] = false;
      });
    },
  },
});

export const {
  toggleSidebar,
  setSidebarCollapsed,
  toggleSection,
  setSectionExpanded,
  expandAllSections,
  collapseAllSections,
} = sidebarSlice.actions;

export default sidebarSlice.reducer;
