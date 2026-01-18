import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface SidebarState {
  isCollapsed: boolean;
  expandedSections: Record<string, boolean>;
}

// Normalize expanded sections to ensure only one is expanded at a time
const normalizeExpandedSections = (expandedSections: Record<string, boolean>): Record<string, boolean> => {
  const normalized: Record<string, boolean> = {};
  const keys = Object.keys(expandedSections);
  
  // Find the first expanded section, if any
  const firstExpandedKey = keys.find(key => expandedSections[key] === true);
  
  // Set all sections to false initially
  keys.forEach(key => {
    normalized[key] = false;
  });
  
  // Only keep the first expanded section
  if (firstExpandedKey) {
    normalized[firstExpandedKey] = true;
  } else if (keys.length > 0) {
    // If none were expanded, default to the first key (usually 'leads')
    normalized[keys[0]] = true;
  }
  
  return normalized;
};

// Load initial state from localStorage
const loadSidebarState = (): Partial<SidebarState> => {
  try {
    const saved = localStorage.getItem('sidebarState');
    if (saved) {
      const parsed = JSON.parse(saved);
      const loadedExpandedSections = parsed.expandedSections ?? {
        leads: true,
        customers: false,
        templates: false,
        nutrition_templates: false,
        meetings: false,
        budgets: false,
        payments: false,
      };
      
      // Normalize to ensure only one section is expanded
      const normalizedExpandedSections = normalizeExpandedSections(loadedExpandedSections);
      
      return {
        isCollapsed: parsed.isCollapsed ?? false,
        expandedSections: normalizedExpandedSections,
      };
    }
  } catch (error) {
    console.warn('Failed to load sidebar state from localStorage:', error);
  }
  return {};
};

const defaultExpandedSections: Record<string, boolean> = {
  leads: true,
  customers: false,
  templates: false,
  nutrition_templates: false,
  meetings: false,
  budgets: false,
  payments: false,
};

const loadedState = loadSidebarState();
const mergedExpandedSections = {
  ...defaultExpandedSections,
  ...(loadedState.expandedSections || {}),
};

const initialState: SidebarState = {
  isCollapsed: loadedState.isCollapsed ?? false,
  expandedSections: normalizeExpandedSections(mergedExpandedSections),
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
      if (expanded) {
        // If expanding, collapse all other sections first to ensure only one is open
        Object.keys(state.expandedSections).forEach((key) => {
          state.expandedSections[key] = false;
        });
      }
      // Then set the target section's state
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

