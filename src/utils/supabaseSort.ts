type SortTarget =
  | string
  | {
      column: string;
      foreignTable?: string;
      nullsFirst?: boolean;
    };

const isJsonPath = (value: string) => value.includes('->');

const applySingleSort = (query: any, target: SortTarget, ascending: boolean) => {
  if (typeof target === 'string') {
    if (isJsonPath(target)) {
      return query.order(target, { ascending });
    }

    if (target.includes('.')) {
      const [foreignTable, column] = target.split('.');
      return query.order(column, { ascending, foreignTable });
    }

    return query.order(target, { ascending });
  }

  return query.order(target.column, {
    ascending,
    foreignTable: target.foreignTable,
    nullsFirst: target.nullsFirst,
  });
};

export const applySort = <T extends Record<string, SortTarget | SortTarget[]>>(
  query: any,
  sortBy: string | null | undefined,
  sortOrder: 'ASC' | 'DESC' | null | undefined,
  sortMap: T
) => {
  if (!sortBy || !sortOrder) return query;
  const target = sortMap[sortBy];
  if (!target) return query;

  const ascending = sortOrder === 'ASC';
  if (Array.isArray(target)) {
    return target.reduce((acc, entry) => applySingleSort(acc, entry, ascending), query);
  }

  return applySingleSort(query, target, ascending);
};
