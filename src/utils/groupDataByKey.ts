/**
 * Utility function to group data by a specific key
 * Returns an array of groups, each containing a key and items
 */

export interface GroupedData<T> {
  groupKey: string;
  groupValue: any;
  items: T[];
  subGroups?: GroupedData<T>[]; // For multi-level grouping
}

export function groupDataByKey<T extends Record<string, any>>(
  data: T[],
  groupByKey: string
): GroupedData<T>[] {
  if (!data || data.length === 0) {
    return [];
  }

  // Group items by the specified key
  const groupsMap = new Map<string, T[]>();

  data.forEach((item) => {
    // Get the value to group by
    const groupValue = item[groupByKey];
    
    // Handle null/undefined values
    const key = groupValue === null || groupValue === undefined 
      ? 'ללא ערך' 
      : String(groupValue);
    
    if (!groupsMap.has(key)) {
      groupsMap.set(key, []);
    }
    groupsMap.get(key)!.push(item);
  });

  // Convert map to array of groups
  const groups: GroupedData<T>[] = Array.from(groupsMap.entries()).map(([groupKey, items]) => ({
    groupKey,
    groupValue: items[0][groupByKey], // Use the actual value from first item
    items,
  }));

  // Sort groups by key (alphabetically or numerically)
  groups.sort((a, b) => {
    // Try numeric comparison first
    const aNum = Number(a.groupKey);
    const bNum = Number(b.groupKey);
    if (!isNaN(aNum) && !isNaN(bNum)) {
      return aNum - bNum;
    }
    // Fallback to string comparison
    return a.groupKey.localeCompare(b.groupKey, 'he');
  });

  return groups;
}

/**
 * Extract all group keys from data based on groupByKeys
 * Returns an array of group key strings that can be used for collapse/expand all
 * 
 * Note: For single-level grouping, keys are just the groupKey (no prefix)
 * For multi-level grouping, keys are prefixed with "level1:" and "level1:...|level2:..."
 */
export function getAllGroupKeys<T extends Record<string, any>>(
  data: T[],
  groupByKeys: [string | null, string | null]
): string[] {
  if (!data || data.length === 0 || (!groupByKeys[0] && !groupByKeys[1])) {
    return [];
  }

  const groupKeys: string[] = [];

  if (groupByKeys[0] && groupByKeys[1]) {
    // Multi-level grouping (both levels)
    const groupedData = groupDataByKeys(data, groupByKeys);
    groupedData.forEach((level1Group) => {
      const level1Key = `level1:${level1Group.level1Key}`;
      groupKeys.push(level1Key);

      if (level1Group.level2Groups && level1Group.level2Groups.length > 0) {
        level1Group.level2Groups.forEach((level2Group) => {
          const level2Key = `${level1Key}|level2:${level2Group.groupKey}`;
          groupKeys.push(level2Key);
        });
      }
    });
  } else if (groupByKeys[0]) {
    // Single-level grouping (level 1 only)
    // The DataTable uses "group:" prefix for single-level grouping
    const groupedData = groupDataByKey(data, groupByKeys[0]);
    groupedData.forEach((group) => {
      const groupKey = `group:${group.groupKey}`;
      groupKeys.push(groupKey);
    });
  }

  return groupKeys;
}

/**
 * Multi-level grouping utility
 * Groups data by up to 2 hierarchical levels with sorting support
 */
export interface MultiLevelGroupedData<T> {
  level1Key: string;
  level1Value: any;
  level2Groups?: GroupedData<T>[];
  items: T[]; // Items that don't have a level2 grouping (when only level1 is set)
}

export function groupDataByKeys<T extends Record<string, any>>(
  data: T[],
  groupByKeys: [string | null, string | null],
  sorting?: { level1: 'asc' | 'desc' | null; level2: 'asc' | 'desc' | null }
): MultiLevelGroupedData<T>[] {
  if (!data || data.length === 0) {
    return [];
  }

  const [level1Key, level2Key] = groupByKeys;

  // If no grouping keys, return empty
  if (!level1Key && !level2Key) {
    return [];
  }

  // If only level 1 grouping
  if (level1Key && !level2Key) {
    const level1Groups = groupDataByKey(data, level1Key);
    
    // Apply sorting if specified
    if (sorting?.level1) {
      const sortFn = (a: GroupedData<T>, b: GroupedData<T>) => {
        const aNum = Number(a.groupValue);
        const bNum = Number(b.groupValue);
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return sorting.level1 === 'asc' ? aNum - bNum : bNum - aNum;
        }
        const comparison = a.groupKey.localeCompare(b.groupKey, 'he');
        return sorting.level1 === 'asc' ? comparison : -comparison;
      };
      level1Groups.sort(sortFn);
    }

    return level1Groups.map((group) => ({
      level1Key: group.groupKey,
      level1Value: group.groupValue,
      items: group.items,
    }));
  }

  // Multi-level grouping (both level1 and level2)
  if (level1Key && level2Key) {
    // First, group by level 1
    const level1Groups = groupDataByKey(data, level1Key);

    // Apply level 1 sorting if specified
    if (sorting?.level1) {
      const sortFn = (a: GroupedData<T>, b: GroupedData<T>) => {
        const aNum = Number(a.groupValue);
        const bNum = Number(b.groupValue);
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return sorting.level1 === 'asc' ? aNum - bNum : bNum - aNum;
        }
        const comparison = a.groupKey.localeCompare(b.groupKey, 'he');
        return sorting.level1 === 'asc' ? comparison : -comparison;
      };
      level1Groups.sort(sortFn);
    }

    // Then, for each level 1 group, group by level 2
    const multiLevelGroups: MultiLevelGroupedData<T>[] = level1Groups.map((level1Group) => {
      const level2Groups = groupDataByKey(level1Group.items, level2Key);

      // Apply level 2 sorting if specified
      if (sorting?.level2) {
        const sortFn = (a: GroupedData<T>, b: GroupedData<T>) => {
          const aNum = Number(a.groupValue);
          const bNum = Number(b.groupValue);
          if (!isNaN(aNum) && !isNaN(bNum)) {
            return sorting.level2 === 'asc' ? aNum - bNum : bNum - aNum;
          }
          const comparison = a.groupKey.localeCompare(b.groupKey, 'he');
          return sorting.level2 === 'asc' ? comparison : -comparison;
        };
        level2Groups.sort(sortFn);
      }

      return {
        level1Key: level1Group.groupKey,
        level1Value: level1Group.groupValue,
        level2Groups,
        items: [], // All items are in subGroups
      };
    });

    return multiLevelGroups;
  }

  return [];
}

/**
 * Calculate total number of groups from grouped data
 * Supports both single-level and multi-level grouping
 */
export function getTotalGroupsCount<T>(
  groupedData: GroupedData<T>[] | MultiLevelGroupedData<T>[] | null
): number {
  if (!groupedData || groupedData.length === 0) {
    return 0;
  }

  // Check if it's multi-level grouping
  if (groupedData.length > 0 && 'level1Key' in groupedData[0]) {
    // Multi-level grouping: count level1 groups
    return groupedData.length;
  }

  // Single-level grouping: count groups
  return groupedData.length;
}

