import { createSlice, PayloadAction, createSelector } from '@reduxjs/toolkit';
import type { ActiveFilter, FilterGroup } from '@/components/dashboard/TableFilter';
import {
  addFilterToGroup,
  addGroupToGroup,
  createRootGroup,
  flattenFilterGroup,
  removeFilterFromGroup,
  removeGroupFromGroup,
  updateFilterInGroup,
  updateGroupInGroup,
} from '@/utils/filterGroupUtils';

export type ResourceKey = 'leads' | 'customers' | 'templates' | 'nutrition_templates' | 'budgets' | 'meetings' | 'subscription_types' | 'payments';

export interface TableState {
  columnVisibility: Record<string, boolean>;
  columnSizing: Record<string, number>;
  columnOrder: string[];
  searchQuery: string;
  activeFilters: ActiveFilter[];
  filterGroup: FilterGroup;
  groupByKey: string | null; // Legacy: Column key to group by (null = no grouping) - DEPRECATED
  groupByKeys: [string | null, string | null]; // Multi-level grouping: [Level 1, Level 2] (max 2 levels)
  groupSorting: {
    level1: 'asc' | 'desc' | null;
    level2: 'asc' | 'desc' | null;
  };
  collapsedGroups: string[]; // Array of collapsed group keys (supports composite keys for multi-level)
  // Sorting state
  sortBy: string | null; // Column to sort by (e.g., 'createdDate', 'name', 'status')
  sortOrder: 'ASC' | 'DESC' | null; // Sort order
  // Pagination state
  currentPage: number;
  pageSize: number; // 50 or 100
  totalCount: number; // Total count from server (for pagination)
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
          filterGroup: createRootGroup([]),
          groupByKey: null, // Legacy
          groupByKeys: [null, null], // Multi-level grouping
          groupSorting: {
            level1: null,
            level2: null,
          },
          collapsedGroups: [],
          // Sorting state
          sortBy: null,
          sortOrder: null,
          // Pagination state
          currentPage: 1,
          pageSize: 100, // Default to 100, can be changed to 50
          totalCount: 0,
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
          filterGroup: createRootGroup([]),
          groupByKey: null,
          groupByKeys: [null, null],
          groupSorting: { level1: null, level2: null },
          collapsedGroups: [],
          // Sorting state
          sortBy: null,
          sortOrder: null,
          // Pagination state
          currentPage: 1,
          pageSize: 100,
          totalCount: 0,
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
        filter: ActiveFilter;
        parentGroupId?: string;
      }>
    ) => {
      const { resourceKey, filter, parentGroupId } = action.payload;
      if (!state.tables[resourceKey]) {
        return;
      }
      const currentGroup = state.tables[resourceKey].filterGroup || createRootGroup([]);
      const nextGroup = addFilterToGroup(currentGroup, filter, parentGroupId);
      state.tables[resourceKey].filterGroup = nextGroup;
      state.tables[resourceKey].activeFilters = flattenFilterGroup(nextGroup);
    },

    // Update a filter by id
    updateFilter: (
      state,
      action: PayloadAction<{
        resourceKey: ResourceKey;
        filter: ActiveFilter;
      }>
    ) => {
      const { resourceKey, filter } = action.payload;
      if (!state.tables[resourceKey]) {
        return;
      }
      const currentGroup = state.tables[resourceKey].filterGroup || createRootGroup([]);
      const nextGroup = updateFilterInGroup(currentGroup, filter);
      state.tables[resourceKey].filterGroup = nextGroup;
      state.tables[resourceKey].activeFilters = flattenFilterGroup(nextGroup);
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
      const currentGroup = state.tables[resourceKey].filterGroup || createRootGroup([]);
      const nextGroup = removeFilterFromGroup(currentGroup, filterId);
      state.tables[resourceKey].filterGroup = nextGroup;
      state.tables[resourceKey].activeFilters = flattenFilterGroup(nextGroup);
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
      const nextGroup = createRootGroup([]);
      state.tables[resourceKey].filterGroup = nextGroup;
      state.tables[resourceKey].activeFilters = [];
    },

    // Replace all filters (used for loading saved views)
    setActiveFilters: (
      state,
      action: PayloadAction<{
        resourceKey: ResourceKey;
        filters: ActiveFilter[] | FilterGroup;
      }>
    ) => {
      const { resourceKey, filters } = action.payload;
      if (!state.tables[resourceKey]) {
        return;
      }
      const nextGroup = createRootGroup(filters as any);
      state.tables[resourceKey].filterGroup = nextGroup;
      state.tables[resourceKey].activeFilters = flattenFilterGroup(nextGroup);
    },

    addFilterGroup: (
      state,
      action: PayloadAction<{
        resourceKey: ResourceKey;
        group: FilterGroup;
        parentGroupId?: string;
      }>
    ) => {
      const { resourceKey, group, parentGroupId } = action.payload;
      if (!state.tables[resourceKey]) {
        return;
      }
      const currentGroup = state.tables[resourceKey].filterGroup || createRootGroup([]);
      const nextGroup = addGroupToGroup(currentGroup, group, parentGroupId);
      state.tables[resourceKey].filterGroup = nextGroup;
      state.tables[resourceKey].activeFilters = flattenFilterGroup(nextGroup);
    },

    updateFilterGroup: (
      state,
      action: PayloadAction<{
        resourceKey: ResourceKey;
        groupId: string;
        updates: Partial<FilterGroup>;
      }>
    ) => {
      const { resourceKey, groupId, updates } = action.payload;
      if (!state.tables[resourceKey]) {
        return;
      }
      const currentGroup = state.tables[resourceKey].filterGroup || createRootGroup([]);
      const nextGroup = updateGroupInGroup(currentGroup, groupId, updates);
      state.tables[resourceKey].filterGroup = nextGroup;
      state.tables[resourceKey].activeFilters = flattenFilterGroup(nextGroup);
    },

    removeFilterGroup: (
      state,
      action: PayloadAction<{
        resourceKey: ResourceKey;
        groupId: string;
      }>
    ) => {
      const { resourceKey, groupId } = action.payload;
      if (!state.tables[resourceKey]) {
        return;
      }
      const currentGroup = state.tables[resourceKey].filterGroup || createRootGroup([]);
      const nextGroup = removeGroupFromGroup(currentGroup, groupId);
      state.tables[resourceKey].filterGroup = nextGroup;
      state.tables[resourceKey].activeFilters = flattenFilterGroup(nextGroup);
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

    // Pagination actions
    setCurrentPage: (
      state,
      action: PayloadAction<{
        resourceKey: ResourceKey;
        page: number;
      }>
    ) => {
      const { resourceKey, page } = action.payload;
      if (!state.tables[resourceKey]) {
        return;
      }
      state.tables[resourceKey].currentPage = Math.max(1, page); // Ensure page >= 1
    },

    setPageSize: (
      state,
      action: PayloadAction<{
        resourceKey: ResourceKey;
        pageSize: number;
      }>
    ) => {
      const { resourceKey, pageSize } = action.payload;
      if (!state.tables[resourceKey]) {
        return;
      }
      // Only allow 50 or 100
      const newPageSize = pageSize === 50 || pageSize === 100 ? pageSize : 100;
      state.tables[resourceKey].pageSize = newPageSize;
      state.tables[resourceKey].currentPage = 1; // Reset to first page when page size changes
    },

    setTotalCount: (
      state,
      action: PayloadAction<{
        resourceKey: ResourceKey;
        totalCount: number;
      }>
    ) => {
      const { resourceKey, totalCount } = action.payload;
      if (!state.tables[resourceKey]) {
        return;
      }
      state.tables[resourceKey].totalCount = Math.max(0, totalCount);
    },

    // Sorting actions
    setSortBy: (
      state,
      action: PayloadAction<{
        resourceKey: ResourceKey;
        sortBy: string | null;
      }>
    ) => {
      const { resourceKey, sortBy } = action.payload;
      if (!state.tables[resourceKey]) {
        return;
      }
      state.tables[resourceKey].sortBy = sortBy;
      state.tables[resourceKey].currentPage = 1; // Reset to first page when sorting changes
    },

    setSortOrder: (
      state,
      action: PayloadAction<{
        resourceKey: ResourceKey;
        sortOrder: 'ASC' | 'DESC' | null;
      }>
    ) => {
      const { resourceKey, sortOrder } = action.payload;
      if (!state.tables[resourceKey]) {
        return;
      }
      state.tables[resourceKey].sortOrder = sortOrder;
      state.tables[resourceKey].currentPage = 1; // Reset to first page when sort order changes
    },
  },
});

export const {
  initializeTableState,
  setColumnVisibility,
  setCurrentPage,
  setPageSize,
  setTotalCount,
  toggleColumnVisibility,
  setAllColumnVisibility,
  setColumnSizing,
  setAllColumnSizing,
  setColumnOrder,
  setSearchQuery,
  addFilter,
  updateFilter,
  removeFilter,
  clearFilters,
  setActiveFilters,
  addFilterGroup,
  updateFilterGroup,
  removeFilterGroup,
  setGroupByKey,
  setGroupByKeys,
  setGroupSorting,
  toggleGroupCollapse,
  setSortBy,
  setSortOrder,
} = tableStateSlice.actions;

export default tableStateSlice.reducer;

// Stable default values to prevent unnecessary re-renders
const DEFAULT_COLUMN_VISIBILITY: Record<string, boolean> = {};
const DEFAULT_COLUMN_SIZING: Record<string, number> = {};
const DEFAULT_COLUMN_ORDER: string[] = [];
const DEFAULT_ACTIVE_FILTERS: any[] = [];
const DEFAULT_FILTER_GROUP: FilterGroup = createRootGroup([]);
const DEFAULT_GROUP_BY_KEYS: [string | null, string | null] = [null, null];
const DEFAULT_GROUP_SORTING: { level1: 'asc' | 'desc' | null; level2: 'asc' | 'desc' | null } = { level1: null, level2: null };
const DEFAULT_COLLAPSED_GROUPS: string[] = [];

// Selectors
export const selectTableState = (state: { tableState: TableStateState }, resourceKey: ResourceKey): TableState | undefined => {
  return state.tableState.tables[resourceKey];
};

// Helper selector to get a specific table state
const selectTableStateByKey = createSelector(
  [
    (state: { tableState: TableStateState }) => state.tableState.tables,
    (_state: { tableState: TableStateState }, resourceKey: ResourceKey) => resourceKey,
  ],
  (tables, resourceKey) => {
    return tables[resourceKey];
  }
);

// Memoized selectors to prevent unnecessary re-renders
export const selectColumnVisibility = createSelector(
  [selectTableStateByKey],
  (tableState) => {
    return tableState?.columnVisibility ?? DEFAULT_COLUMN_VISIBILITY;
  }
);

export const selectColumnSizing = createSelector(
  [selectTableStateByKey],
  (tableState) => {
    return tableState?.columnSizing ?? DEFAULT_COLUMN_SIZING;
  }
);

export const selectColumnOrder = createSelector(
  [selectTableStateByKey],
  (tableState) => {
    return tableState?.columnOrder ?? DEFAULT_COLUMN_ORDER;
  }
);

export const selectSearchQuery = (state: { tableState: TableStateState }, resourceKey: ResourceKey): string => {
  return state.tableState.tables[resourceKey]?.searchQuery || '';
};

export const selectActiveFilters = createSelector(
  [selectTableStateByKey],
  (tableState) => {
    return tableState?.activeFilters ?? DEFAULT_ACTIVE_FILTERS;
  }
);

export const selectFilterGroup = createSelector(
  [selectTableStateByKey],
  (tableState) => {
    return tableState?.filterGroup ?? DEFAULT_FILTER_GROUP;
  }
);

export const selectGroupByKey = (state: { tableState: TableStateState }, resourceKey: ResourceKey): string | null => {
  return state.tableState.tables[resourceKey]?.groupByKey || null;
};

export const selectGroupByKeys = createSelector(
  [selectTableStateByKey],
  (tableState) => {
    return tableState?.groupByKeys ?? DEFAULT_GROUP_BY_KEYS;
  }
);

export const selectGroupSorting = createSelector(
  [selectTableStateByKey],
  (tableState) => {
    return tableState?.groupSorting ?? DEFAULT_GROUP_SORTING;
  }
);

// Memoized selector for collapsed groups to prevent unnecessary re-renders
export const selectCollapsedGroups = createSelector(
  [selectTableStateByKey],
  (tableState) => {
    return tableState?.collapsedGroups ?? DEFAULT_COLLAPSED_GROUPS;
  }
);

// Pagination selectors
export const selectCurrentPage = (state: { tableState: TableStateState }, resourceKey: ResourceKey): number => {
  return state.tableState.tables[resourceKey]?.currentPage ?? 1;
};

export const selectPageSize = (state: { tableState: TableStateState }, resourceKey: ResourceKey): number => {
  return state.tableState.tables[resourceKey]?.pageSize ?? 100;
};

export const selectTotalCount = (state: { tableState: TableStateState }, resourceKey: ResourceKey): number => {
  return state.tableState.tables[resourceKey]?.totalCount ?? 0;
};

// Sorting selectors
export const selectSortBy = (state: { tableState: TableStateState }, resourceKey: ResourceKey): string | null => {
  return state.tableState.tables[resourceKey]?.sortBy ?? null;
};

export const selectSortOrder = (state: { tableState: TableStateState }, resourceKey: ResourceKey): 'ASC' | 'DESC' | null => {
  return state.tableState.tables[resourceKey]?.sortOrder ?? null;
};
