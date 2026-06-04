// @ts-nocheck
import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, X, Save, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { fetchSizes, invalidateSizesCache, type Size } from '@/hooks/useMasterData';
import { useBulkSelection, BulkActionBar, SelectCheckbox, runForEach } from '@/pages/admin/components/BulkSelect';
import { TabHelp } from './_TabHelp';

const toSlug = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const EMPTY: Omit<Size, 'id'> = { name: '', slug: '', value_grams: 0, sort_order: 0, active: true };

export default function SizesTab() {
  const [rows, setRows] = useState<Size[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<(Size | typeof EMPTY) | null>(null);
  const [saving, setSaving] = useState(false);
  const sel = useBulkSelection(rows, (r) => r.id);

  const load = () => { setLoading(true); fetchSizes({ force: true, includeInactive: true }).then(setRows).catch(() => setRows([])).finally(() => setLoading(false)); };
  useEffect(load, []);

  const save = async () => {
    if (!editing || !editing.name.trim()) return alert('Name required');
    setSaving(true);
    const payload: any = { ...editing, slug: editing.slug?.trim() || toSlug(editing.name) };
    const id = 'id' in editing ? (editing as Size).id : null;
    const { error } = id
      ? await supabase.from('product_sizes').update(payload).eq('id', id)
      : await supabase.from('product_sizes').insert(payload);
    setSaving(false);
    if (error) return alert(error.message);
    invalidateSizesCache(); setEditing(null); load();
  };
  const remove = async (s: Size) => { if (!confirm(`Delete "${s.name}"?`)) return; const { error } = await supabase.from('product_sizes').delete().eq('id', s.id); if (error) return alert(error.message); invalidateSizesCache(); load(); };
  const toggle = async (s: Size) => { await supabase.from('product_sizes').update({ active: !s.active }).eq('id', s.id); invalidateSizesCache(); load(); };

  return (
    <div className="space-y-5">
      <TabHelp topic="sizes" />
      <div className="flex items-center justify-between">
        <div><h2 className="text-2xl font-black">Sizes</h2><p className="text-sm text-gray-500">Master size list. Grams used for shipping weight estimation.</p></div>
        <button onClick={() => setEditing({ ...EMPTY, sort_order: rows.length * 10 })} className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-4 py-2 rounded-xl text-sm"><Plus size={16} /> New Size</button>
      </div>

      <BulkActionBar
        count={sel.count}
        ids={Array.from(sel.selected)}
        onClear={() => { sel.clear(); load(); }}
        actions={[
          { key: 'activate', label: 'Activate', color: 'bg-green-600 hover:bg-green-700', run: async (ids) => { await runForEach(ids, (id) => supabase.from('product_sizes').update({ active: true }).eq('id', id)); invalidateSizesCache(); } },
          { key: 'deactivate', label: 'Deactivate', color: 'bg-yellow-600 hover:bg-yellow-700', run: async (ids) => { await runForEach(ids, (id) => supabase.from('product_sizes').update({ active: false }).eq('id', id)); invalidateSizesCache(); } },
          { key: 'delete', label: 'Delete', color: 'bg-red-600 hover:bg-red-700', confirm: 'Delete {n} sizes?', run: async (ids) => { await runForEach(ids, (id) => supabase.from('product_sizes').delete().eq('id', id)); invalidateSizesCache(); } },
        ]}
      />

      {loading ? <div className="grid gap-2">{[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}</div> : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr>
              <th className="px-3 py-3 w-10"><SelectCheckbox checked={sel.allSelected} indeterminate={sel.someSelected} onChange={sel.toggleAll} /></th>
              <th className="text-left px-4 py-3">Size</th><th className="text-left px-4 py-3">Slug</th><th className="text-right px-4 py-3">Grams</th><th className="px-4 py-3">Active</th><th className="px-4 py-3 w-32">Actions</th></tr></thead>
            <tbody>
              {rows.map(s => (
                <tr key={s.id} className={`border-t hover:bg-orange-50/30 ${sel.isSelected(s.id) ? 'bg-orange-50' : ''}`}>
                  <td className="px-3 py-3"><SelectCheckbox checked={sel.isSelected(s.id)} onChange={() => sel.toggleOne(s.id)} /></td>
                  <td className="px-4 py-3 font-bold">{s.name}</td>
                  <td className="px-4 py-3 text-xs font-mono text-gray-500">{s.slug}</td>
                  <td className="px-4 py-3 text-right text-sm tabular-nums">{s.value_grams || '—'}</td>
                  <td className="px-4 py-3 text-center"><button onClick={() => toggle(s)}>{s.active ? <Eye size={16} className="text-green-600" /> : <EyeOff size={16} className="text-gray-300" />}</button></td>
                  <td className="px-4 py-3"><div className="flex items-center justify-end gap-1"><button onClick={() => setEditing(s)} className="p-1.5 hover:bg-gray-100 rounded"><Edit2 size={14} /></button><button onClick={() => remove(s)} className="p-1.5 hover:bg-red-50 text-red-500 rounded"><Trash2 size={14} /></button></div></td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={6} className="text-center py-12 text-gray-400">No sizes yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="border-b px-6 py-4 flex items-center justify-between"><h3 className="text-xl font-black">{'id' in editing ? 'Edit' : 'New'} Size</h3><button onClick={() => setEditing(null)}><X size={20} /></button></div>
            <div className="p-6 space-y-3">
              <Field label="Name * (e.g. 1 kg, 500 g, 60 caps)"><input className="np-in" value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value, slug: toSlug(e.target.value) })} /></Field>
              <Field label="Slug"><input className="np-in font-mono" value={editing.slug} onChange={e => setEditing({ ...editing, slug: toSlug(e.target.value) })} /></Field>
              <Field label="Weight in grams (used for shipping calc)"><input type="number" className="np-in" value={editing.value_grams} onChange={e => setEditing({ ...editing, value_grams: Number(e.target.value) })} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Sort order"><input type="number" className="np-in" value={editing.sort_order} onChange={e => setEditing({ ...editing, sort_order: Number(e.target.value) })} /></Field>
                <label className="flex items-center gap-2 text-sm font-semibold mt-7"><input type="checkbox" checked={editing.active} onChange={e => setEditing({ ...editing, active: e.target.checked })} /> Active</label>
              </div>
            </div>
            <div className="border-t px-6 py-3 flex justify-end gap-2"><button onClick={() => setEditing(null)} className="px-4 py-2 rounded-xl border font-bold text-sm">Cancel</button><button onClick={save} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm disabled:opacity-50"><Save size={16} /> {saving ? 'Saving…' : 'Save'}</button></div>
          </div>
        </div>
      )}
      <style>{`.np-in{width:100%;border:1px solid #e5e7eb;border-radius:.75rem;padding:.6rem .75rem;font-size:.875rem;background:#fff} .np-in:focus{outline:none;border-color:#fb923c}`}</style>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div><label className="text-xs font-bold text-gray-500 block mb-1">{label}</label>{children}</div>; }
