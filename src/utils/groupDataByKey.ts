/**
 * Utility function to group data by a specific key
 * Returns an array of groups, each containing a key and items
 */

export interface GroupedData<T> {
  groupKey: string;
  groupValue: any;
  items: T[];
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

