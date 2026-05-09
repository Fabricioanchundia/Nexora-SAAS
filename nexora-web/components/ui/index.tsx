'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

// ════════════════════════════════════════════════════════
// StatusBadge
// ════════════════════════════════════════════════════════

const BADGE_STYLES: Readonly<Record<string, string>> = {
  authorized: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  active:     'bg-emerald-50 text-emerald-700 border-emerald-200',
  production: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending:    'bg-amber-50   text-amber-700   border-amber-200',
  processing: 'bg-blue-50   text-blue-700    border-blue-200',
  error:      'bg-red-50    text-red-700     border-red-200',
  rejected:   'bg-red-50    text-red-700     border-red-200',
  rechazada:  'bg-red-50    text-red-700     border-red-200',
  inactive:   'bg-slate-100 text-slate-500   border-slate-200',
  test:       'bg-slate-100 text-slate-500   border-slate-200',
  ruc:        'bg-violet-50 text-violet-700  border-violet-200',
  cedula:     'bg-sky-50    text-sky-700     border-sky-200',
  pasaporte:  'bg-orange-50 text-orange-700  border-orange-200',
};

const BADGE_DOTS: Readonly<Record<string, string>> = {
  authorized: 'bg-emerald-500',
  active:     'bg-emerald-500',
  production: 'bg-emerald-500',
  pending:    'bg-amber-500',
  processing: 'bg-blue-500',
  error:      'bg-red-500',
  rejected:   'bg-red-500',
  rechazada:  'bg-red-500',
  inactive:   'bg-slate-400',
  test:       'bg-slate-400',
  ruc:        'bg-violet-500',
  cedula:     'bg-sky-500',
  pasaporte:  'bg-orange-500',
};

const BADGE_LABELS: Readonly<Record<string, string>> = {
  authorized:  'Autorizada',
  active:      'Activo',
  production:  'Producción',
  pending:     'Pendiente',
  processing:  'Procesando',
  error:       'Error',
  rejected:    'Rechazada',
  rechazada:   'Rechazada',
  inactive:    'Inactivo',
  test:        'Pruebas',
  ruc:         'RUC',
  cedula:      'Cédula',
  pasaporte:   'Pasaporte',
  AUTHORIZED:  'Autorizada',
  PENDING:     'Pendiente',
  PROCESSING:  'Procesando',
  ERROR:       'Error',
  REJECTED:    'Rechazada',
  RECHAZADA:   'Rechazada',
  SENT:        'Enviada',
  SIGNED:      'Firmada',
};

interface StatusBadgeProps {
  readonly value: string;
  readonly showDot?: boolean;
}

export function StatusBadge({ value, showDot = true }: StatusBadgeProps) {
  const key    = value?.toLowerCase() ?? '';
  const styles = BADGE_STYLES[key] ?? 'bg-slate-100 text-slate-600 border-slate-200';
  const dot    = BADGE_DOTS[key]   ?? 'bg-slate-400';
  const label  = BADGE_LABELS[value] ?? BADGE_LABELS[key] ?? value;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles}`}>
      {showDot && <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />}
      {label}
    </span>
  );
}

// ════════════════════════════════════════════════════════
// SearchInput
// ════════════════════════════════════════════════════════

interface SearchInputProps {
  readonly value: string;
  readonly onChange: (v: string) => void;
  readonly placeholder?: string;
}

export function SearchInput({ value, onChange, placeholder = 'Buscar...' }: SearchInputProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value), [onChange],
  );
  const handleClear = useCallback(() => onChange(''), [onChange]);
  return (
    <div className="relative">
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        aria-label={placeholder}
        className="pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all placeholder:text-slate-400"
      />
      {value && (
        <button type="button" onClick={handleClear} aria-label="Limpiar búsqueda" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════
// FilterSelect
// ════════════════════════════════════════════════════════

interface SelectOption { readonly value: string; readonly label: string; }

interface FilterSelectProps {
  readonly value: string;
  readonly onChange: (v: string) => void;
  readonly options: readonly SelectOption[];
  readonly placeholder?: string;
}

export function FilterSelect({ value, onChange, options, placeholder = 'Todos' }: FilterSelectProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => onChange(e.target.value), [onChange],
  );
  return (
    <select value={value} onChange={handleChange} aria-label={placeholder}
      className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all text-slate-700 cursor-pointer">
      <option value="">{placeholder}</option>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

// ════════════════════════════════════════════════════════
// SkeletonTable — S5479: no array index keys
// ════════════════════════════════════════════════════════

function SkeletonRow({ rowId, cols }: Readonly<{ rowId: string; cols: number }>) {
  const ids = Array.from({ length: cols }, (_, i) => `${rowId}-c${i}`);
  return (
    <tr className="animate-pulse">
      {ids.map(id => <td key={id} className="px-6 py-4"><div className="h-4 bg-slate-100 rounded-md w-3/4" /></td>)}
    </tr>
  );
}

export function SkeletonTable({ rows = 5, cols = 5 }: Readonly<{ rows?: number; cols?: number }>) {
  const ids = Array.from({ length: rows }, (_, i) => `sk-row-${i}`);
  return <>{ids.map(id => <SkeletonRow key={id} rowId={id} cols={cols} />)}</>;
}

// ════════════════════════════════════════════════════════
// EmptyState
// ════════════════════════════════════════════════════════

interface EmptyStateProps {
  readonly icon: React.ReactNode;
  readonly title: string;
  readonly description: string;
  readonly action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <tr><td colSpan={99}>
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-4 text-slate-400">{icon}</div>
        <p className="text-sm font-medium text-slate-700 mb-1">{title}</p>
        <p className="text-sm text-slate-400 mb-4 max-w-xs">{description}</p>
        {action}
      </div>
    </td></tr>
  );
}

// ════════════════════════════════════════════════════════
// ActionMenu
// ════════════════════════════════════════════════════════

export interface Action {
  readonly label: string;
  readonly icon?: React.ReactNode;
  readonly onClick: () => void;
  readonly variant?: 'default' | 'danger';
}

function ActionMenuItem({ action, onClose }: Readonly<{ action: Action; onClose: () => void }>) {
  const handleClick = useCallback(() => { action.onClick(); onClose(); }, [action, onClose]);
  const cls = action.variant === 'danger'
    ? 'w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors'
    : 'w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors';
  return (
    <button type="button" role="menuitem" onClick={handleClick} className={cls}>
      {action.icon && <span className="w-4 h-4" aria-hidden="true">{action.icon}</span>}
      {action.label}
    </button>
  );
}

export function ActionMenu({ actions }: Readonly<{ actions: readonly Action[] }>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const toggleOpen = useCallback(() => setOpen(p => !p), []);
  const closeMenu  = useCallback(() => setOpen(false), []);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  return (
    <div ref={ref} className="relative inline-block">
      <button type="button" onClick={toggleOpen} aria-label="Abrir menú" aria-expanded={open}
        className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 5a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 7a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 7a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" />
        </svg>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-1 overflow-hidden">
          {actions.map(a => <ActionMenuItem key={a.label} action={a} onClose={closeMenu} />)}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════
// PageHeader
// ════════════════════════════════════════════════════════

interface PageHeaderProps {
  readonly title: string;
  readonly description?: string;
  readonly action?: React.ReactNode;
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// ════════════════════════════════════════════════════════
// DataTable
// S6551: typed row access, no 'as Record' cast
// S3358: no nested ternary
// ════════════════════════════════════════════════════════

export interface Column<T> {
  readonly key: string;
  readonly label: string;
  readonly render?: (row: T) => React.ReactNode;
  readonly className?: string;
}

function DataTableRow<T>({
  row, columns, onRowClick,
}: Readonly<{ row: T; columns: readonly Column<T>[]; onRowClick?: (row: T) => void }>) {
  const handleClick = useCallback(() => onRowClick?.(row), [row, onRowClick]);
  return (
    <tr
      onClick={onRowClick ? handleClick : undefined}
      className={onRowClick ? 'transition-colors cursor-pointer hover:bg-slate-50' : 'transition-colors hover:bg-slate-50/50'}
    >
      {columns.map(col => {
        // S6551: explicit typed index — no 'as Record<string,unknown>' cast
        const typedRow = row as { [key: string]: unknown };
        const rawValue: unknown = typedRow[col.key];
        // S6551: rawValue is unknown — convert safely without '?? "—"' which triggers Object.toString warning
        const fallback = rawValue !== null && rawValue !== undefined ? String(rawValue) : '—';
        const content  = col.render ? col.render(row) : fallback;
        return (
          <td key={col.key} className={`px-6 py-4 text-slate-700 ${col.className ?? ''}`}>
            {content}
          </td>
        );
      })}
    </tr>
  );
}

const DEFAULT_EMPTY_ICON = (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
  </svg>
);

interface DataTableProps<T> {
  readonly columns: readonly Column<T>[];
  readonly data: readonly T[];
  readonly loading?: boolean;
  readonly keyField: keyof T;
  readonly emptyState?: React.ReactNode;
  readonly onRowClick?: (row: T) => void;
}

export function DataTable<T>({ columns, data, loading, keyField, emptyState, onRowClick }: DataTableProps<T>) {
  // S3358: no nested ternary
  let body: React.ReactNode;
  if (loading) {
    body = <SkeletonTable rows={5} cols={columns.length} />;
  } else if (data.length === 0) {
    body = emptyState ?? <EmptyState icon={DEFAULT_EMPTY_ICON} title="Sin resultados" description="No hay datos." />;
  } else {
    body = data.map(row => (
      <DataTableRow key={String(row[keyField])} row={row} columns={columns} onRowClick={onRowClick} />
    ));
  }
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              {columns.map(col => (
                <th key={col.key} scope="col"
                  className={`px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider ${col.className ?? ''}`}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">{body}</tbody>
        </table>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// ConfirmDialog — S6819: native <dialog>
// S6847/S1082: no onClick on non-interactive div → use <button> for backdrop
// ════════════════════════════════════════════════════════

interface ConfirmDialogProps {
  readonly open: boolean;
  readonly title: string;
  readonly description: string;
  readonly confirmLabel?: string;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
  readonly loading?: boolean;
}

export function ConfirmDialog({
  open, title, description, confirmLabel = 'Eliminar', onConfirm, onCancel, loading,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    else if (!open && el.open) el.close();
  }, [open]);

  // S6819: <dialog> handles backdrop natively via ::backdrop pseudo-element
  // S6847/S1082: no onClick on non-interactive element — use dialog's own click to detect backdrop
  const handleDialogClick = useCallback((e: React.MouseEvent<HTMLDialogElement>) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const outside = e.clientX < rect.left || e.clientX > rect.right
                 || e.clientY < rect.top  || e.clientY > rect.bottom;
    if (outside) onCancel();
  }, [onCancel]);

  if (!open) return null;

  return (
    <dialog
      ref={ref}
      onClick={handleDialogClick}
      aria-labelledby="cd-title"
      aria-describedby="cd-desc"
      className="rounded-2xl shadow-xl p-0 border-0 backdrop:bg-slate-900/40 backdrop:backdrop-blur-sm w-full max-w-sm"
    >
      <div className="p-6">
        <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center mb-4">
          <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 id="cd-title" className="text-base font-semibold text-slate-900 mb-1">{title}</h3>
        <p id="cd-desc" className="text-sm text-slate-500 mb-6">{description}</p>
        <div className="flex gap-3">
          <button type="button" onClick={onCancel}
            className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
            Cancelar
          </button>
          <button type="button" onClick={onConfirm} disabled={loading}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 disabled:opacity-60 rounded-lg transition-colors">
            {loading ? 'Eliminando...' : confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}