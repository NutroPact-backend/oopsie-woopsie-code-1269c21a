// @ts-nocheck
import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, X, Save, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { fetchFlavors, invalidateFlavorsCache, type Flavor } from '@/hooks/useMasterData';
import { useBulkSelection, BulkActionBar, SelectCheckbox, runForEach } from '@/pages/admin/components/BulkSelect';
import { TabHelp } from './_TabHelp';

const toSlug = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const EMPTY: Omit<Flavor, 'id'> = { name: '', slug: '', hex_color: '#8b5cf6', sort_order: 0, active: true };

export default function FlavorsTab() {
  const [rows, setRows] = useState<Flavor[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<(Flavor | typeof EMPTY) | null>(null);
  const [saving, setSaving] = useState(false);
  const sel = useBulkSelection(rows, (r) => r.id);

  const load = () => { setLoading(true); fetchFlavors({ force: true, includeInactive: true }).then(setRows).catch(() => setRows([])).finally(() => setLoading(false)); };
  useEffect(load, []);

  const save = async () => {
    if (!editing || !editing.name.trim()) return alert('Name required');
    setSaving(true);
    const payload: any = { ...editing, slug: editing.slug?.trim() || toSlug(editing.name) };
    const id = 'id' in editing ? (editing as Flavor).id : null;
    const { error } = id
      ? await supabase.from('product_flavors').update(payload).eq('id', id)
      : await supabase.from('product_flavors').insert(payload);
    setSaving(false);
    if (error) return alert(error.message);
    invalidateFlavorsCache(); setEditing(null); load();
  };
  const remove = async (f: Flavor) => { if (!confirm(`Delete "${f.name}"?`)) return; const { error } = await supabase.from('product_flavors').delete().eq('id', f.id); if (error) return alert(error.message); invalidateFlavorsCache(); load(); };
  const toggle = async (f: Flavor) => { await supabase.from('product_flavors').update({ active: !f.active }).eq('id', f.id); invalidateFlavorsCache(); load(); };

  return (
    <div className="space-y-5">
      <TabHelp topic="flavors" />
      <div className="flex items-center justify-between">
        <div><h2 className="text-2xl font-black">Flavors</h2><p className="text-sm text-gray-500">Master flavor list with color swatches.</p></div>
        <div className="flex items-center gap-3">
          {rows.length > 0 && <label className="flex items-center gap-1.5 text-xs font-bold text-gray-600 cursor-pointer"><SelectCheckbox checked={sel.allSelected} indeterminate={sel.someSelected} onChange={sel.toggleAll} /> Select all</label>}
          <button onClick={() => setEditing({ ...EMPTY, sort_order: rows.length * 10 })} className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-4 py-2 rounded-xl text-sm"><Plus size={16} /> New Flavor</button>
        </div>
      </div>

      <BulkActionBar
        count={sel.count}
        ids={Array.from(sel.selected)}
        onClear={() => { sel.clear(); load(); }}
        actions={[
          { key: 'activate', label: 'Activate', color: 'bg-green-600 hover:bg-green-700', run: async (ids) => { await runForEach(ids, (id) => supabase.from('product_flavors').update({ active: true }).eq('id', id)); invalidateFlavorsCache(); } },
          { key: 'deactivate', label: 'Deactivate', color: 'bg-yellow-600 hover:bg-yellow-700', run: async (ids) => { await runForEach(ids, (id) => supabase.from('product_flavors').update({ active: false }).eq('id', id)); invalidateFlavorsCache(); } },
          { key: 'delete', label: 'Delete', color: 'bg-red-600 hover:bg-red-700', confirm: 'Delete {n} flavors?', run: async (ids) => { await runForEach(ids, (id) => supabase.from('product_flavors').delete().eq('id', id)); invalidateFlavorsCache(); } },
        ]}
      />

      {loading ? <div className="grid gap-2">{[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}</div> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {rows.map(f => (
            <div key={f.id} className={`bg-white rounded-2xl border p-4 flex items-center gap-3 ${sel.isSelected(f.id) ? 'border-orange-400 ring-1 ring-orange-200' : 'border-gray-100'}`}>
              <SelectCheckbox checked={sel.isSelected(f.id)} onChange={() => sel.toggleOne(f.id)} />
              <span className="w-10 h-10 rounded-full border shadow-inner shrink-0" style={{ backgroundColor: f.hex_color }} />
              <div className="flex-1 min-w-0"><p className="font-bold truncate">{f.name}</p><p className="text-xs text-gray-400 font-mono">{f.slug}</p></div>
              <button onClick={() => toggle(f)} className="p-1.5">{f.active ? <Eye size={16} className="text-green-600" /> : <EyeOff size={16} className="text-gray-300" />}</button>
              <button onClick={() => setEditing(f)} className="p-1.5 hover:bg-gray-100 rounded"><Edit2 size={14} /></button>
              <button onClick={() => remove(f)} className="p-1.5 hover:bg-red-50 text-red-500 rounded"><Trash2 size={14} /></button>
            </div>
          ))}
          {rows.length === 0 && <p className="col-span-full text-center py-12 text-gray-400">No flavors yet.</p>}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="border-b px-6 py-4 flex items-center justify-between"><h3 className="text-xl font-black">{'id' in editing ? 'Edit' : 'New'} Flavor</h3><button onClick={() => setEditing(null)}><X size={20} /></button></div>
            <div className="p-6 space-y-3">
              <Field label="Name *"><input className="np-in" value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value, slug: editing.slug || toSlug(e.target.value) })} /></Field>
              <Field label="Slug"><input className="np-in font-mono" value={editing.slug} onChange={e => setEditing({ ...editing, slug: toSlug(e.target.value) })} /></Field>
              <Field label="Color (hex)"><div className="flex gap-2"><input type="color" value={editing.hex_color} onChange={e => setEditing({ ...editing, hex_color: e.target.value })} className="h-11 w-16 rounded-xl border cursor-pointer" /><input className="np-in flex-1 font-mono" value={editing.hex_color} onChange={e => setEditing({ ...editing, hex_color: e.target.value })} /></div></Field>
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
