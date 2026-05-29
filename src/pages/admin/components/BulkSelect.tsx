// @ts-nocheck
import React, { useMemo, useState, useCallback } from 'react';

export type BulkAction = {
  key: string;
  label: string;
  icon?: React.ReactNode;
  /** tailwind color class, e.g. "bg-green-600 hover:bg-green-700" */
  color?: string;
  /** show confirmation prompt before running */
  confirm?: string;
  run: (ids: string[]) => Promise<void> | void;
  hidden?: boolean;
};

export function useBulkSelection<T>(items: T[], getId: (item: T) => string) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const ids = useMemo(() => items.map(getId), [items, getId]);
  const allSelected = ids.length > 0 && ids.every((id) => selected.has(id));
  const someSelected = selected.size > 0 && !allSelected;

  const toggleOne = useCallback((id: string) => {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelected((s) => {
      if (ids.length > 0 && ids.every((id) => s.has(id))) return new Set();
      return new Set(ids);
    });
  }, [ids]);

  const clear = useCallback(() => setSelected(new Set()), []);
  const isSelected = useCallback((id: string) => selected.has(id), [selected]);

  return { selected, count: selected.size, allSelected, someSelected, toggleOne, toggleAll, clear, isSelected };
}

export function SelectCheckbox({
  checked,
  onChange,
  indeterminate,
  title,
}: {
  checked: boolean;
  onChange: () => void;
  indeterminate?: boolean;
  title?: string;
}) {
  const ref = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (ref.current) ref.current.indeterminate = !!indeterminate && !checked;
  }, [indeterminate, checked]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      title={title}
      onClick={(e) => e.stopPropagation()}
      className="w-4 h-4 accent-orange-500 cursor-pointer"
    />
  );
}

export function BulkActionBar({
  count,
  actions,
  onClear,
  ids,
}: {
  count: number;
  actions: BulkAction[];
  onClear: () => void;
  ids: string[];
}) {
  const [busy, setBusy] = useState(false);
  if (count === 0) return null;
  const run = async (a: BulkAction) => {
    if (a.confirm && !window.confirm(a.confirm.replace('{n}', String(count)))) return;
    setBusy(true);
    try {
      await a.run(ids);
      onClear();
    } catch (err) {
      console.error('Bulk action failed:', err);
      alert('Bulk action failed. Check console.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 sticky top-2 z-10">
      <span className="text-sm font-bold text-orange-900">{count} selected</span>
      <span className="text-xs text-orange-700 mr-auto">Bulk actions:</span>
      {actions
        .filter((a) => !a.hidden)
        .map((a) => (
          <button
            key={a.key}
            type="button"
            disabled={busy}
            onClick={() => run(a)}
            className={`inline-flex items-center gap-1.5 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition disabled:opacity-50 ${a.color || 'bg-gray-700 hover:bg-gray-800'}`}
          >
            {a.icon}
            {a.label}
          </button>
        ))}
      <button
        type="button"
        disabled={busy}
        onClick={onClear}
        className="text-xs font-bold text-gray-600 hover:text-gray-900 px-2"
      >
        Clear
      </button>
    </div>
  );
}

/** Runs an async function for each id, swallowing per-item errors and logging. */
export async function runForEach<T = unknown>(ids: string[], fn: (id: string) => Promise<T> | T) {
  for (const id of ids) {
    try { await fn(id); } catch (e) { console.error('Bulk item failed', id, e); }
  }
}
