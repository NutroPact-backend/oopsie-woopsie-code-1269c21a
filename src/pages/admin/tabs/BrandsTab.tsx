// @ts-nocheck
import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, X, Save, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { fetchBrands, invalidateBrandsCache, type Brand } from '@/hooks/useMasterData';
import { useSimpleUpload } from '@/lib/useSimpleUpload';
import { useBulkSelection, BulkActionBar, SelectCheckbox, runForEach } from '@/pages/admin/components/BulkSelect';
import { TabHelp } from './_TabHelp';

const toSlug = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const EMPTY: Omit<Brand, 'id'> = { name: '', slug: '', logo_url: '', description: '', sort_order: 0, active: true };

export default function BrandsTab() {
  const [rows, setRows] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<(Brand | typeof EMPTY) | null>(null);
  const [saving, setSaving] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const { uploadFile, isUploading } = useSimpleUpload();
  const sel = useBulkSelection(rows, (b) => b.id);

  const load = () => { setLoading(true); fetchBrands({ force: true, includeInactive: true }).then(setRows).catch(() => setRows([])).finally(() => setLoading(false)); };
  useEffect(load, []);

  const save = async () => {
    if (!editing || !editing.name.trim()) return alert('Name required');
    setSaving(true);
    const payload: any = { ...editing, slug: editing.slug?.trim() || toSlug(editing.name) };
    const id = 'id' in editing ? (editing as Brand).id : null;
    const { error } = id
      ? await supabase.from('brands').update(payload).eq('id', id)
      : await supabase.from('brands').insert(payload);
    setSaving(false);
    if (error) return alert(error.message);
    invalidateBrandsCache(); setEditing(null); load();
  };

  const remove = async (b: Brand) => {
    if (!confirm(`Delete brand "${b.name}"?`)) return;
    const { error } = await supabase.from('brands').delete().eq('id', b.id);
    if (error) return alert(error.message);
    invalidateBrandsCache(); load();
  };
  const toggle = async (b: Brand) => { await supabase.from('brands').update({ active: !b.active }).eq('id', b.id); invalidateBrandsCache(); load(); };

  return (
    <div className="space-y-5">
      <TabHelp topic="brands" />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black">Brands</h2>
          <p className="text-sm text-gray-500">Master brand list — used in product form & filters.</p>
        </div>
        <button onClick={() => { setSlugTouched(false); setEditing({ ...EMPTY, sort_order: rows.length * 10 }); }}
          className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-4 py-2 rounded-xl text-sm">
          <Plus size={16} /> New Brand
        </button>
      </div>

      <BulkActionBar
        count={sel.count}
        ids={Array.from(sel.selected)}
        onClear={() => { sel.clear(); load(); }}
        actions={[
          { key: 'activate', label: 'Activate', color: 'bg-green-600 hover:bg-green-700', run: async (ids) => { await runForEach(ids, (id) => supabase.from('brands').update({ active: true }).eq('id', id)); invalidateBrandsCache(); } },
          { key: 'deactivate', label: 'Deactivate', color: 'bg-gray-700 hover:bg-gray-800', run: async (ids) => { await runForEach(ids, (id) => supabase.from('brands').update({ active: false }).eq('id', id)); invalidateBrandsCache(); } },
          { key: 'delete', label: 'Delete', color: 'bg-red-600 hover:bg-red-700', confirm: 'Delete {n} brand(s)?', run: async (ids) => { await runForEach(ids, (id) => supabase.from('brands').delete().eq('id', id)); invalidateBrandsCache(); } },
        ]}
      />
      {loading ? <div className="grid gap-2">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div> : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr><th className="px-3 py-3 w-10"><SelectCheckbox checked={sel.allSelected} indeterminate={sel.someSelected} onChange={sel.toggleAll} /></th><th className="text-left px-4 py-3">Brand</th><th className="text-left px-4 py-3">Slug</th><th className="px-4 py-3">Active</th><th className="px-4 py-3 w-32">Actions</th></tr>
            </thead>
            <tbody>
              {rows.map(b => (
                <tr key={b.id} className={`border-t hover:bg-orange-50/30 ${sel.isSelected(b.id) ? 'bg-orange-50/40' : ''}`}>
                  <td className="px-3 py-3"><SelectCheckbox checked={sel.isSelected(b.id)} onChange={() => sel.toggleOne(b.id)} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {b.logo_url ? <img src={b.logo_url} alt="" className="w-10 h-10 object-contain rounded bg-gray-50" /> : <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center text-xs font-black text-gray-400">{b.name[0]}</div>}
                      <div><p className="font-bold">{b.name}</p>{b.description && <p className="text-xs text-gray-500 line-clamp-1 max-w-xs">{b.description}</p>}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-gray-500">{b.slug}</td>
                  <td className="px-4 py-3 text-center"><button onClick={() => toggle(b)}>{b.active ? <Eye size={16} className="text-green-600" /> : <EyeOff size={16} className="text-gray-300" />}</button></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => { setSlugTouched(true); setEditing(b); }} className="p-1.5 hover:bg-gray-100 rounded"><Edit2 size={14} /></button>
                      <button onClick={() => remove(b)} className="p-1.5 hover:bg-red-50 text-red-500 rounded"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={5} className="text-center py-12 text-gray-400">No brands yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="border-b px-6 py-4 flex items-center justify-between"><h3 className="text-xl font-black">{'id' in editing ? 'Edit' : 'New'} Brand</h3><button onClick={() => setEditing(null)}><X size={20} /></button></div>
            <div className="p-6 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Name *"><input className="np-in" value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value, slug: slugTouched ? editing.slug : toSlug(e.target.value) })} /></Field>
                <Field label="Slug"><input className="np-in font-mono" value={editing.slug} onChange={e => { setSlugTouched(true); setEditing({ ...editing, slug: toSlug(e.target.value) }); }} /></Field>
              </div>
              <Field label="Description"><textarea className="np-in min-h-[60px]" value={editing.description} onChange={e => setEditing({ ...editing, description: e.target.value })} /></Field>
              <Field label="Logo">
                <div className="flex gap-2 items-start">
                  <input className="np-in flex-1" value={editing.logo_url} onChange={e => setEditing({ ...editing, logo_url: e.target.value })} placeholder="https://… or upload →" />
                  <label className="px-3 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-bold cursor-pointer">
                    {isUploading ? '…' : 'Upload'}
                    <input type="file" accept="image/*" className="hidden" onChange={async e => { const f = e.target.files?.[0]; if (!f) return; const url = await uploadFile(f); if (url) setEditing({ ...editing, logo_url: url }); }} />
                  </label>
                </div>
                {editing.logo_url && <img src={editing.logo_url} alt="" className="mt-2 h-16 object-contain bg-gray-50 rounded" />}
              </Field>
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
