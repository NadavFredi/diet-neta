import type { ActiveFilter, FilterGroup, FilterNode } from '@/components/dashboard/TableFilter';

export const isFilterGroup = (node: FilterNode): node is FilterGroup => {
  return typeof (node as FilterGroup).children !== 'undefined';
};

export const createRootGroup = (input?: FilterGroup | ActiveFilter[] | null): FilterGroup => {
  if (!input) {
    return { id: `group-${Date.now()}`, operator: 'and', children: [] };
  }

  if (Array.isArray(input)) {
    return { id: `group-${Date.now()}`, operator: 'and', children: [...input] };
  }

  return input;
};

export const flattenFilterGroup = (group: FilterGroup): ActiveFilter[] => {
  const result: ActiveFilter[] = [];

  const walk = (node: FilterNode) => {
    if (isFilterGroup(node)) {
      node.children.forEach(walk);
      return;
    }
    result.push(node);
  };

  walk(group);
  return result;
};

export const addFilterToGroup = (group: FilterGroup, filter: ActiveFilter, parentGroupId?: string): FilterGroup => {
  if (!parentGroupId || group.id === parentGroupId) {
    return { ...group, children: [...group.children, filter] };
  }

  return {
    ...group,
    children: group.children.map((child) =>
      isFilterGroup(child) ? addFilterToGroup(child, filter, parentGroupId) : child
    ),
  };
};

export const updateFilterInGroup = (group: FilterGroup, filter: ActiveFilter): FilterGroup => {
  return {
    ...group,
    children: group.children.map((child) => {
      if (isFilterGroup(child)) {
        return updateFilterInGroup(child, filter);
      }
      return child.id === filter.id ? filter : child;
    }),
  };
};

export const removeFilterFromGroup = (group: FilterGroup, filterId: string): FilterGroup => {
  return {
    ...group,
    children: group.children
      .filter((child) => (isFilterGroup(child) ? true : child.id !== filterId))
      .map((child) => (isFilterGroup(child) ? removeFilterFromGroup(child, filterId) : child)),
  };
};

export const addGroupToGroup = (group: FilterGroup, newGroup: FilterGroup, parentGroupId?: string): FilterGroup => {
  if (!parentGroupId || group.id === parentGroupId) {
    return { ...group, children: [...group.children, newGroup] };
  }

  return {
    ...group,
    children: group.children.map((child) =>
      isFilterGroup(child) ? addGroupToGroup(child, newGroup, parentGroupId) : child
    ),
  };
};

export const updateGroupInGroup = (group: FilterGroup, groupId: string, updates: Partial<FilterGroup>): FilterGroup => {
  if (group.id === groupId) {
    return { ...group, ...updates };
  }

  return {
    ...group,
    children: group.children.map((child) =>
      isFilterGroup(child) ? updateGroupInGroup(child, groupId, updates) : child
    ),
  };
};

export const removeGroupFromGroup = (group: FilterGroup, groupId: string): FilterGroup => {
  if (group.id === groupId) {
    return { ...group, children: [] };
  }

  return {
    ...group,
    children: group.children
      .filter((child) => (isFilterGroup(child) ? child.id !== groupId : true))
      .map((child) => (isFilterGroup(child) ? removeGroupFromGroup(child, groupId) : child)),
  };
};

export const isAdvancedFilterGroup = (group?: FilterGroup | null): boolean => {
  if (!group) return false;
  if (group.not || group.operator === 'or') return true;
  return group.children.some((child) => isFilterGroup(child));
};

export const createSearchGroup = (query: string, fieldIds: string[]): FilterGroup => {
  const trimmed = query.trim();
  return {
    id: `search-${Date.now()}`,
    operator: 'or',
    children: fieldIds.map((fieldId) => ({
      id: `${fieldId}-search-${Date.now()}`,
      fieldId,
      fieldLabel: fieldId,
      operator: 'contains',
      values: [trimmed],
      type: 'text',
    })),
  };
};

export const mergeFilterGroups = (primary?: FilterGroup | null, secondary?: FilterGroup | null): FilterGroup | null => {
  if (!primary && !secondary) return null;
  if (primary && (!primary.children || primary.children.length === 0)) {
    return secondary || primary;
  }
  if (!secondary || !secondary.children || secondary.children.length === 0) {
    return primary || secondary;
  }
  return {
    id: `group-${Date.now()}`,
    operator: 'and',
    children: [primary, secondary],
  };
};
