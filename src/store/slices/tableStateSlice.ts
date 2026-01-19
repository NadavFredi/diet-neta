import { createSlice, PayloadAction, createSelector } from '@reduxjs/toolkit';

export type ResourceKey = 'leads' | 'customers' | 'templates' | 'nutrition_templates' | 'budgets' | 'meetings';

export interface TableState {
  columnVisibility: Record<string, boolean>;
  columnSizing: Record<string, number>;
  columnOrder: string[];
  searchQuery: string;
  activeFilters: any[]; // ActiveFilter[] type from TableFilter
  groupByKey: string | null; // Legacy: Column key to group by (null = no grouping) - DEPRECATED
  groupByKeys: [string | null, string | null]; // Multi-level grouping: [Level 1, Level 2] (max 2 levels)
  groupSorting: {
    level1: 'asc' | 'desc' | null;
    level2: 'asc' | 'desc' | null;
  };
  collapsedGroups: string[]; // Array of collapsed group keys (supports composite keys for multi-level)
}

interface TableStateMap {
  [resourceKey: string]: TableState;
}

interface TableStateState {
  tables: TableStateMap;
}

const initialState: TableStateState = {
  tables: {},
};

const tableStateSlice = createSlice({
  name: 'tableState',
  initialState,
  reducers: {
    // Initialize table state for a resource
    initializeTableState: (
      state,
      action: PayloadAction<{
        resourceKey: ResourceKey;
        columnIds: string[];
        initialVisibility?: Record<string, boolean>;
        initialSizing?: Record<string, number>;
        initialOrder?: string[];
      }>
    ) => {
      const { resourceKey, columnIds, initialVisibility, initialSizing, initialOrder } = action.payload;

      // Only initialize if not already initialized
      if (!state.tables[resourceKey]) {
        const visibility: Record<string, boolean> = {};
        columnIds.forEach((id) => {
          visibility[id] = initialVisibility?.[id] !== undefined ? initialVisibility[id] : true;
        });

        state.tables[resourceKey] = {
          columnVisibility: visibility,
          columnSizing: initialSizing || {},
          columnOrder: initialOrder || columnIds,
          searchQuery: '',
          activeFilters: [],
          groupByKey: null, // Legacy
          groupByKeys: [null, null], // Multi-level grouping
          groupSorting: {
            level1: null,
            level2: null,
          },
          collapsedGroups: [],
        };
      }
    },

    // Update column visibility
    setColumnVisibility: (
      state,
      action: PayloadAction<{
        resourceKey: ResourceKey;
        columnId: string;
        visible: boolean;
      }>
    ) => {
      const { resourceKey, columnId, visible } = action.payload;
      if (!state.tables[resourceKey]) {
        // Initialize state if it doesn't exist (shouldn't happen, but handle gracefully)
        state.tables[resourceKey] = {
          columnVisibility: { [columnId]: visible },
          columnSizing: {},
          columnOrder: [columnId],
          searchQuery: '',
          activeFilters: [],
          groupByKey: null,
          groupByKeys: [null, null],
          groupSorting: { level1: null, level2: null },
          collapsedGroups: [],
        };
        return;
      }
      state.tables[resourceKey].columnVisibility[columnId] = visible;
    },

    // Toggle column visibility
    toggleColumnVisibility: (
      state,
      action: PayloadAction<{
        resourceKey: ResourceKey;
        columnId: string;
      }>
    ) => {
      const { resourceKey, columnId } = action.payload;
      if (!state.tables[resourceKey]) {
        return;
      }
      const current = state.tables[resourceKey].columnVisibility[columnId];
      state.tables[resourceKey].columnVisibility[columnId] = current !== undefined ? !current : false;
    },

    // Set all column visibility for a resource
    setAllColumnVisibility: (
      state,
      action: PayloadAction<{
        resourceKey: ResourceKey;
        visibility: Record<string, boolean>;
      }>
    ) => {
      const { resourceKey, visibility } = action.payload;
      if (!state.tables[resourceKey]) {
        return;
      }
      state.tables[resourceKey].columnVisibility = visibility;
    },

    // Update column sizing
    setColumnSizing: (
      state,
      action: PayloadAction<{
        resourceKey: ResourceKey;
        columnId: string;
        size: number;
      }>
    ) => {
      const { resourceKey, columnId, size } = action.payload;
      if (!state.tables[resourceKey]) {
        return;
      }
      state.tables[resourceKey].columnSizing[columnId] = size;
    },

    // Set all column sizing for a resource
    setAllColumnSizing: (
      state,
      action: PayloadAction<{
        resourceKey: ResourceKey;
        sizing: Record<string, number>;
      }>
    ) => {
      const { resourceKey, sizing } = action.payload;
      if (!state.tables[resourceKey]) {
        return;
      }
      state.tables[resourceKey].columnSizing = sizing;
    },

    // Update column order
    setColumnOrder: (
      state,
      action: PayloadAction<{
        resourceKey: ResourceKey;
        order: string[];
      }>
    ) => {
      const { resourceKey, order } = action.payload;
      if (!state.tables[resourceKey]) {
        return;
      }
      state.tables[resourceKey].columnOrder = order;
    },

    // Set search query for a resource
    setSearchQuery: (
      state,
      action: PayloadAction<{
        resourceKey: ResourceKey;
        query: string;
      }>
    ) => {
      const { resourceKey, query } = action.payload;
      if (!state.tables[resourceKey]) {
        return;
      }
      state.tables[resourceKey].searchQuery = query;
    },

    // Add a filter
    addFilter: (
      state,
      action: PayloadAction<{
        resourceKey: ResourceKey;
        filter: any; // ActiveFilter type
      }>
    ) => {
      const { resourceKey, filter } = action.payload;
      if (!state.tables[resourceKey]) {
        return;
      }
      state.tables[resourceKey].activeFilters.push(filter);
    },

    // Remove a filter
    removeFilter: (
      state,
      action: PayloadAction<{
        resourceKey: ResourceKey;
        filterId: string;
      }>
    ) => {
      const { resourceKey, filterId } = action.payload;
      if (!state.tables[resourceKey]) {
        return;
      }
      state.tables[resourceKey].activeFilters = state.tables[resourceKey].activeFilters.filter(
        (f) => f.id !== filterId
      );
    },

    // Clear all filters
    clearFilters: (
      state,
      action: PayloadAction<{
        resourceKey: ResourceKey;
      }>
    ) => {
      const { resourceKey } = action.payload;
      if (!state.tables[resourceKey]) {
        return;
      }
      state.tables[resourceKey].activeFilters = [];
    },

    // Set group by key (legacy - for backward compatibility)
    setGroupByKey: (
      state,
      action: PayloadAction<{
        resourceKey: ResourceKey;
        groupByKey: string | null;
      }>
    ) => {
      const { resourceKey, groupByKey } = action.payload;
      if (!state.tables[resourceKey]) {
        return;
      }
      state.tables[resourceKey].groupByKey = groupByKey;
      // Also update multi-level grouping (set as Level 1, clear Level 2)
      state.tables[resourceKey].groupByKeys = [groupByKey, null];
      // Reset collapsed groups when changing group by
      state.tables[resourceKey].collapsedGroups = [];
    },

    // Set multi-level group by keys
    setGroupByKeys: (
      state,
      action: PayloadAction<{
        resourceKey: ResourceKey;
        groupByKeys: [string | null, string | null];
      }>
    ) => {
      const { resourceKey, groupByKeys } = action.payload;
      if (!state.tables[resourceKey]) {
        return;
      }
      state.tables[resourceKey].groupByKeys = groupByKeys;
      // Update legacy groupByKey for backward compatibility (use Level 1)
      state.tables[resourceKey].groupByKey = groupByKeys[0];
      // Reset collapsed groups when changing group by
      state.tables[resourceKey].collapsedGroups = [];
    },

    // Set group sorting for a specific level
    setGroupSorting: (
      state,
      action: PayloadAction<{
        resourceKey: ResourceKey;
        level: 1 | 2;
        direction: 'asc' | 'desc' | null;
      }>
    ) => {
      const { resourceKey, level, direction } = action.payload;
      if (!state.tables[resourceKey]) {
        return;
      }
      const key = level === 1 ? 'level1' : 'level2';
      state.tables[resourceKey].groupSorting[key] = direction;
    },

    // Toggle group collapse
    toggleGroupCollapse: (
      state,
      action: PayloadAction<{
        resourceKey: ResourceKey;
        groupKey: string;
      }>
    ) => {
      const { resourceKey, groupKey } = action.payload;
      if (!state.tables[resourceKey]) {
        return;
      }
      const collapsedGroups = [...state.tables[resourceKey].collapsedGroups];
      const index = collapsedGroups.indexOf(groupKey);
      if (index > -1) {
        collapsedGroups.splice(index, 1);
      } else {
        collapsedGroups.push(groupKey);
      }
      state.tables[resourceKey].collapsedGroups = collapsedGroups;
    },
  },
});

export const {
  initializeTableState,
  setColumnVisibility,
  toggleColumnVisibility,
  setAllColumnVisibility,
  setColumnSizing,
  setAllColumnSizing,
  setColumnOrder,
  setSearchQuery,
  addFilter,
  removeFilter,
  clearFilters,
  setGroupByKey,
  setGroupByKeys,
  setGroupSorting,
  toggleGroupCollapse,
} = tableStateSlice.actions;

export default tableStateSlice.reducer;

// Selectors
export const selectTableState = (state: { tableState: TableStateState }, resourceKey: ResourceKey): TableState | undefined => {
  return state.tableState.tables[resourceKey];
};

export const selectColumnVisibility = (state: { tableState: TableStateState }, resourceKey: ResourceKey): Record<string, boolean> => {
  return state.tableState.tables[resourceKey]?.columnVisibility || {};
};

export const selectColumnSizing = (state: { tableState: TableStateState }, resourceKey: ResourceKey): Record<string, number> => {
  return state.tableState.tables[resourceKey]?.columnSizing || {};
};

export const selectColumnOrder = (state: { tableState: TableStateState }, resourceKey: ResourceKey): string[] => {
  return state.tableState.tables[resourceKey]?.columnOrder || [];
};

export const selectSearchQuery = (state: { tableState: TableStateState }, resourceKey: ResourceKey): string => {
  return state.tableState.tables[resourceKey]?.searchQuery || '';
};

export const selectActiveFilters = (state: { tableState: TableStateState }, resourceKey: ResourceKey): any[] => {
  return state.tableState.tables[resourceKey]?.activeFilters || [];
};

export const selectGroupByKey = (state: { tableState: TableStateState }, resourceKey: ResourceKey): string | null => {
  return state.tableState.tables[resourceKey]?.groupByKey || null;
};

export const selectGroupByKeys = (state: { tableState: TableStateState }, resourceKey: ResourceKey): [string | null, string | null] => {
  return state.tableState.tables[resourceKey]?.groupByKeys || [null, null];
};

export const selectGroupSorting = (state: { tableState: TableStateState }, resourceKey: ResourceKey): { level1: 'asc' | 'desc' | null; level2: 'asc' | 'desc' | null } => {
  return state.tableState.tables[resourceKey]?.groupSorting || { level1: null, level2: null };
};

// Memoized selector for collapsed groups to prevent unnecessary re-renders
export const selectCollapsedGroups = createSelector(
  [
    (state: { tableState: TableStateState }) => state.tableState.tables,
    (_state: { tableState: TableStateState }, resourceKey: ResourceKey) => resourceKey,
  ],
  (tables, resourceKey) => {
    return tables[resourceKey]?.collapsedGroups || [];
  }
);


