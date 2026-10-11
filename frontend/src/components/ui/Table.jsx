import { createContext, useContext } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

// `stack` = on phones each row becomes a labelled card instead of a squeezed table.
// Explicit ARIA roles keep table semantics when the layout switches to blocks.
const TableCtx = createContext({ stack: false });
const role = (stack, r) => (stack ? r : undefined);

/**
 * @param label  accessible name for the table (also announced for the scroll region)
 * @param stack  render rows as cards below the `sm` breakpoint — give each <TD> a `label`
 * @param footer e.g. <TablePagination />
 */
export function Table({ className, label, stack = false, footer, children, ...props }) {
  return (
    <TableCtx.Provider value={{ stack }}>
      <div className="w-full overflow-hidden rounded-xl border border-border bg-surface">
        <div
          className="w-full overflow-x-auto"
          role="region"
          aria-label={label}
          tabIndex={label ? 0 : undefined}
        >
          <table className={cn('w-full text-sm', stack && 'table-stack', className)} role={role(stack, 'table')} aria-label={label} {...props}>
            {children}
          </table>
        </div>
        {footer}
      </div>
    </TableCtx.Provider>
  );
}

export function THead({ className, ...props }) {
  const { stack } = useContext(TableCtx);
  return <thead className={cn('border-b border-border bg-surface2/60', className)} role={role(stack, 'rowgroup')} {...props} />;
}

export function TBody({ className, ...props }) {
  const { stack } = useContext(TableCtx);
  return <tbody className={cn('divide-y divide-border', className)} role={role(stack, 'rowgroup')} {...props} />;
}

export function TR({ className, ...props }) {
  const { stack } = useContext(TableCtx);
  return <tr className={cn('transition-colors hover:bg-surface2/50', className)} role={role(stack, 'row')} {...props} />;
}

const thClass = 'whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted';

export function TH({ className, ...props }) {
  const { stack } = useContext(TableCtx);
  return <th scope="col" className={cn(thClass, className)} role={role(stack, 'columnheader')} {...props} />;
}

/** A column header that sorts. `sort` is { key, dir } from useTableData. */
export function SortableTH({ sortKey, sort, onSort, children, className, ...props }) {
  const { stack } = useContext(TableCtx);
  const active = sort?.key === sortKey;
  const Icon = !active ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <th
      scope="col"
      aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={cn(thClass, 'py-2', className)}
      role={role(stack, 'columnheader')}
      {...props}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn('-mx-1.5 inline-flex min-h-[32px] items-center gap-1.5 rounded-md px-1.5 uppercase transition-colors hover:bg-surface2 hover:text-fg', active && 'text-fg')}
      >
        {children}
        <Icon aria-hidden="true" className={cn('h-3.5 w-3.5', !active && 'opacity-50')} />
      </button>
    </th>
  );
}

/** @param label column name shown beside the value when rows stack on phones */
export function TD({ className, label, ...props }) {
  const { stack } = useContext(TableCtx);
  return <td className={cn('px-4 py-3 align-middle text-fg', className)} data-label={label} role={role(stack, 'cell')} {...props} />;
}

/** "Showing 11–20 of 57" + previous / next, for the Table `footer` slot. */
export function TablePagination({ page, pageCount, total, pageSize, onPage, noun = 'results' }) {
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const btn = 'inline-flex h-9 items-center gap-1 rounded-lg border border-border bg-surface px-3 text-sm font-medium text-fg transition-colors hover:bg-surface2 disabled:cursor-not-allowed disabled:opacity-40';
  return (
    <nav aria-label="Pagination" className="flex flex-col gap-3 border-t border-border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <p className="text-muted" aria-live="polite">
        Showing <span className="font-semibold text-fg">{from}–{to}</span> of <span className="font-semibold text-fg">{total}</span> {noun}
      </p>
      {pageCount > 1 && (
        <div className="flex items-center gap-2">
          <button type="button" className={btn} onClick={() => onPage(page - 1)} disabled={page <= 1}>
            <ChevronLeft aria-hidden="true" className="h-4 w-4" /> Previous
          </button>
          <span className="px-1 text-muted">Page {page} of {pageCount}</span>
          <button type="button" className={btn} onClick={() => onPage(page + 1)} disabled={page >= pageCount}>
            Next <ChevronRight aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      )}
    </nav>
  );
}
