import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface SidebarState {
  isCollapsed: boolean;
  expandedSections: Record<string, boolean>;
}

// Load initial state from localStorage
const loadSidebarState = (): Partial<SidebarState> => {
  try {
    const saved = localStorage.getItem('sidebarState');
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        isCollapsed: parsed.isCollapsed ?? false,
        expandedSections: parsed.expandedSections ?? {
          leads: true,
          customers: false,
          templates: false,
          nutrition_templates: false,
          meetings: false,
        },
      };
    }
  } catch (error) {
    console.warn('Failed to load sidebar state from localStorage:', error);
  }
  return {};
};

const initialState: SidebarState = {
  isCollapsed: false,
  expandedSections: {
    leads: true,
    customers: false,
    templates: false,
    nutrition_templates: false,
    meetings: false,
  },
  ...loadSidebarState(),
};

// Save to localStorage helper
const saveSidebarState = (state: SidebarState) => {
  try {
    localStorage.setItem('sidebarState', JSON.stringify({
      isCollapsed: state.isCollapsed,
      expandedSections: state.expandedSections,
    }));
  } catch (error) {
    console.warn('Failed to save sidebar state to localStorage:', error);
  }
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
      saveSidebarState(state);
    },
    setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.isCollapsed = action.payload;
      // When collapsing, also collapse all sections
      if (action.payload) {
        Object.keys(state.expandedSections).forEach((key) => {
          state.expandedSections[key] = false;
        });
      }
      saveSidebarState(state);
    },
    toggleSection: (state, action: PayloadAction<string>) => {
      const resourceKey = action.payload;
      const isCurrentlyExpanded = state.expandedSections[resourceKey] ?? false;
      
      if (isCurrentlyExpanded) {
        // If already expanded, collapse it
        state.expandedSections[resourceKey] = false;
      } else {
        // If collapsed, expand it and collapse all others
        // First, collapse all sections
        Object.keys(state.expandedSections).forEach((key) => {
          state.expandedSections[key] = false;
        });
        // Then expand the clicked section
        state.expandedSections[resourceKey] = true;
      }
      saveSidebarState(state);
    },
    setSectionExpanded: (state, action: PayloadAction<{ resourceKey: string; expanded: boolean }>) => {
      const { resourceKey, expanded } = action.payload;
      state.expandedSections[resourceKey] = expanded;
      saveSidebarState(state);
    },
    expandAllSections: (state) => {
      Object.keys(state.expandedSections).forEach((key) => {
        state.expandedSections[key] = true;
      });
      saveSidebarState(state);
    },
    collapseAllSections: (state) => {
      Object.keys(state.expandedSections).forEach((key) => {
        state.expandedSections[key] = false;
      });
      saveSidebarState(state);
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

