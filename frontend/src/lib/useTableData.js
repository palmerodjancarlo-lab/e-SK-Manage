// lib/useTableData.js — client-side sorting + pagination for list tables
import { useMemo, useState } from 'react';

const collator = new Intl.Collator('en-PH', { sensitivity: 'base', numeric: true });

const compare = (a, b) => {
  if (a == null && b == null) return 0;
  if (a == null) return 1;           // empty values always sink to the bottom
  if (b == null) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (a instanceof Date || b instanceof Date) return new Date(a) - new Date(b);
  return collator.compare(String(a), String(b));
};

/**
 * @param rows        the already-filtered rows
 * @param accessors   { [sortKey]: (row) => comparable value }
 * @param initialSort { key, dir: 'asc' | 'desc' }
 */
export default function useTableData(rows, { accessors = {}, initialSort = null, pageSize = 10 } = {}) {
  const [sort, setSort] = useState(initialSort);
  const [page, setPage] = useState(1);

  const sorted = useMemo(() => {
    const get = sort && accessors[sort.key];
    if (!get) return rows;
    const dir = sort.dir === 'desc' ? -1 : 1;
    return [...rows].sort((a, b) => dir * compare(get(a), get(b)));
  }, [rows, sort, accessors]);

  const total = sorted.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, pageCount); // stays valid when filters shrink the list
  const pageRows = sorted.slice((current - 1) * pageSize, current * pageSize);

  const toggleSort = (key) => {
    setSort((s) => (s?.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
    setPage(1);
  };

  return { pageRows, sort, toggleSort, page: current, setPage, pageCount, total, pageSize };
}
