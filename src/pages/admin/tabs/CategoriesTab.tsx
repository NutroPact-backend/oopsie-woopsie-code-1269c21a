// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import { Plus, Edit2, Trash2, ArrowUp, ArrowDown, X, Save, Eye, EyeOff, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { fetchCategories, invalidateCategoriesCache, type Category } from '@/hooks/useCategories';
import { useSimpleUpload } from '@/lib/useSimpleUpload';
import { useBulkSelection, BulkActionBar, SelectCheckbox, runForEach } from '@/pages/admin/components/BulkSelect';
import { TabHelp } from './_TabHelp';
import { PAGE_OPTIONS } from '@/lib/page-keys';

const toSlug = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const EMPTY: Omit<Category, 'id' | 'created_at' | 'updated_at'> = {
  name: '', slug: '', description: '', icon: '', image_url: '',
  parent_id: null, sort_order: 0, active: true, featured: false,
  seo_title: '', seo_description: '', seo_keywords: '',
  visible_on_pages: [],
};

import { useAdminPermissions } from '@/hooks/useAdminPermissions';

export default function CategoriesTab() {
  const [rows, setRows] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<(Category | typeof EMPTY) | null>(null);
  const [saving, setSaving] = useState(false);
  const { uploadFile, isUploading } = useSimpleUpload();
  const sel = useBulkSelection(rows, (c) => c.id);
  const perms = useAdminPermissions();
  const canPlacement = perms.has('categories.manage_placement');


  const load = () => {
    setLoading(true);
    fetchCategories({ force: true, includeInactive: true })
      .then(setRows).catch(() => setRows([])).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const tree = useMemo(() => {
    const parents = rows.filter(r => !r.parent_id);
    return parents.map(p => ({ ...p, children: rows.filter(r => r.parent_id === p.id) }));
  }, [rows]);

  const save = async () => {
    if (!editing) return;
    if (!editing.name.trim()) return alert('Name required');
    setSaving(true);
    const payload: any = { ...editing, slug: editing.slug?.trim() || toSlug(editing.name) };
    if ('id' in editing && editing.id) {
      const { error } = await supabase.from('categories').update(payload).eq('id', editing.id);
      if (error) { setSaving(false); return alert(error.message); }
    } else {
      const { error } = await supabase.from('categories').insert(payload);
      if (error) { setSaving(false); return alert(error.message); }
    }
    invalidateCategoriesCache();
    setSaving(false); setEditing(null); load();
  };

  const remove = async (c: Category) => {
    if (!confirm(`Delete "${c.name}"? Products using this category will keep the old name as text.`)) return;
    const { error } = await supabase.from('categories').delete().eq('id', c.id);
    if (error) return alert(error.message);
    invalidateCategoriesCache(); load();
  };

  const toggleActive = async (c: Category) => {
    await supabase.from('categories').update({ active: !c.active }).eq('id', c.id);
    invalidateCategoriesCache(); load();
  };
  const toggleFeatured = async (c: Category) => {
    await supabase.from('categories').update({ featured: !c.featured }).eq('id', c.id);
    invalidateCategoriesCache(); load();
  };

  const move = async (c: Category, dir: -1 | 1) => {
    const peers = rows.filter(r => r.parent_id === c.parent_id).sort((a, b) => a.sort_order - b.sort_order);
    const idx = peers.findIndex(r => r.id === c.id);
    const swap = peers[idx + dir];
    if (!swap) return;
    await Promise.all([
      supabase.from('categories').update({ sort_order: swap.sort_order }).eq('id', c.id),
      supabase.from('categories').update({ sort_order: c.sort_order }).eq('id', swap.id),
    ]);
    invalidateCategoriesCache(); load();
  };

  return (
    <div className="space-y-5">
      <TabHelp topic="categories" />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black">Categories</h2>
          <p className="text-sm text-gray-500">Master list used in product form, navigation, offers, and category landing pages.</p>
        </div>
        <button onClick={() => setEditing({ ...EMPTY, sort_order: (rows.reduce((m, r) => Math.max(m, r.sort_order), 0) + 10) })}
          className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-4 py-2 rounded-xl text-sm">
          <Plus size={16} /> New Category
        </button>
      </div>

      <BulkActionBar
        count={sel.count}
        ids={Array.from(sel.selected)}
        onClear={() => { sel.clear(); load(); }}
        actions={[
          { key: 'activate', label: 'Activate', color: 'bg-green-600 hover:bg-green-700', run: async (ids) => { await runForEach(ids, (id) => supabase.from('categories').update({ active: true }).eq('id', id)); invalidateCategoriesCache(); } },
          { key: 'deactivate', label: 'Deactivate', color: 'bg-gray-700 hover:bg-gray-800', run: async (ids) => { await runForEach(ids, (id) => supabase.from('categories').update({ active: false }).eq('id', id)); invalidateCategoriesCache(); } },
          { key: 'feature', label: 'Feature', color: 'bg-yellow-500 hover:bg-yellow-600', run: async (ids) => { await runForEach(ids, (id) => supabase.from('categories').update({ featured: true }).eq('id', id)); invalidateCategoriesCache(); } },
          { key: 'unfeature', label: 'Unfeature', color: 'bg-gray-500 hover:bg-gray-600', run: async (ids) => { await runForEach(ids, (id) => supabase.from('categories').update({ featured: false }).eq('id', id)); invalidateCategoriesCache(); } },
          { key: 'delete', label: 'Delete', color: 'bg-red-600 hover:bg-red-700', confirm: 'Delete {n} categor(ies)?', run: async (ids) => { await runForEach(ids, (id) => supabase.from('categories').delete().eq('id', id)); invalidateCategoriesCache(); } },
        ]}
      />
      {loading ? (
        <div className="grid gap-2">{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr><th className="px-3 py-3 w-10"><SelectCheckbox checked={sel.allSelected} indeterminate={sel.someSelected} onChange={sel.toggleAll} /></th><th className="text-left px-4 py-3">Category</th><th className="text-left px-4 py-3">Slug</th><th className="px-4 py-3">Sub</th><th className="px-4 py-3">On Pages</th><th className="px-4 py-3">Active</th><th className="px-4 py-3">Featured</th><th className="px-4 py-3 w-56">Actions</th></tr>
            </thead>
            <tbody>
              {tree.map(parent => (
                <RowGroup key={parent.id} parent={parent} sel={sel} onEdit={c => setEditing(c)} onDelete={remove} onToggle={toggleActive} onFeature={toggleFeatured} onMove={move} onAddChild={(p) => setEditing({ ...EMPTY, parent_id: p.id, sort_order: ((p as any).children?.length || 0) * 10 })} />
              ))}
              {tree.length === 0 && <tr><td colSpan={8} className="text-center py-12 text-gray-400">No categories yet — click "New Category".</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
              <h3 className="text-xl font-black">{'id' in editing && (editing as Category).id ? 'Edit' : 'New'} Category</h3>
              <button onClick={() => setEditing(null)}><X size={20} /></button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Name *">
                  <input className="np-in" value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value, slug: toSlug(e.target.value) })} />
                </Field>
                <Field label="Slug (URL)">
                  <input className="np-in font-mono" value={editing.slug} onChange={e => setEditing({ ...editing, slug: toSlug(e.target.value) })} placeholder="auto" />
                </Field>
              </div>

              <Field label="Description (shown on category page)">
                <textarea className="np-in min-h-[70px]" value={editing.description} onChange={e => setEditing({ ...editing, description: e.target.value })} />
              </Field>

              <div className="grid grid-cols-3 gap-3">
                <Field label="Icon (emoji)">
                  <input className="np-in text-center text-xl" value={editing.icon} onChange={e => setEditing({ ...editing, icon: e.target.value })} maxLength={4} placeholder="💪" />
                </Field>
                <Field label="Parent (optional)">
                  <select className="np-in" value={editing.parent_id || ''} onChange={e => setEditing({ ...editing, parent_id: e.target.value || null })}>
                    <option value="">— Top level —</option>
                    {rows.filter(r => !r.parent_id && (!('id' in editing) || r.id !== (editing as Category).id)).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </Field>
                <Field label="Sort order">
                  <input type="number" className="np-in" value={editing.sort_order} onChange={e => setEditing({ ...editing, sort_order: Number(e.target.value) })} />
                </Field>
              </div>

              <Field label="Cover image (optional, used as hero on category page)">
                <div className="flex gap-3 items-start">
                  <input className="np-in flex-1" value={editing.image_url} onChange={e => setEditing({ ...editing, image_url: e.target.value })} placeholder="https://… or upload →" />
                  <label className="px-3 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-bold cursor-pointer shrink-0">
                    {isUploading ? '...' : 'Upload'}
                    <input type="file" accept="image/*" className="hidden" onChange={async e => {
                      const f = e.target.files?.[0]; if (!f) return;
                      const url = await uploadFile(f); if (url) setEditing({ ...editing, image_url: url });
                    }} />
                  </label>
                </div>
                {editing.image_url && <img src={editing.image_url} alt="" className="mt-2 h-28 rounded-lg object-cover" />}
              </Field>

              <div className="flex gap-4 flex-wrap">
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <input type="checkbox" checked={editing.active} onChange={e => setEditing({ ...editing, active: e.target.checked })} /> Active
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <input type="checkbox" checked={editing.featured} onChange={e => setEditing({ ...editing, featured: e.target.checked })} /> Featured (homepage / nav)
                </label>
              </div>

              {canPlacement && (
              <details className="border rounded-xl p-3 bg-orange-50/50 border-orange-200" open>
                <summary className="cursor-pointer font-bold text-sm text-gray-800">Show this category link on which pages?</summary>
                <p className="text-xs text-gray-500 mt-2">Tick pages where this {editing.parent_id ? 'sub-category' : 'category'} should appear (via the <code>&lt;CategoryLinks/&gt;</code> block on each page). "Global" = show on every page.</p>
                <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-1.5 max-h-64 overflow-y-auto">
                  {PAGE_OPTIONS.map(p => {
                    const checked = (editing.visible_on_pages || []).includes(p.key);
                    return (
                      <label key={p.key} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs cursor-pointer border ${checked ? 'bg-orange-100 border-orange-300 font-semibold text-orange-900' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                        <input type="checkbox" checked={checked} onChange={e => {
                          const cur = new Set(editing.visible_on_pages || []);
                          if (e.target.checked) cur.add(p.key); else cur.delete(p.key);
                          setEditing({ ...editing, visible_on_pages: Array.from(cur) });
                        }} />
                        <span className="truncate">{p.label}</span>
                      </label>
                    );
                  })}
                </div>
              </details>
              )}

              <details className="border rounded-xl p-3 bg-gray-50">
                <summary className="cursor-pointer font-bold text-sm text-gray-700">SEO (optional)</summary>
                <div className="mt-3 space-y-3">
                  <Field label="SEO Title (≤60 chars)"><input className="np-in" maxLength={70} value={editing.seo_title} onChange={e => setEditing({ ...editing, seo_title: e.target.value })} /></Field>
                  <Field label="SEO Description (≤160 chars)"><textarea className="np-in" maxLength={180} value={editing.seo_description} onChange={e => setEditing({ ...editing, seo_description: e.target.value })} /></Field>
                  <Field label="Keywords (comma separated)"><input className="np-in" value={editing.seo_keywords} onChange={e => setEditing({ ...editing, seo_keywords: e.target.value })} /></Field>
                </div>
              </details>
            </div>

            <div className="sticky bottom-0 bg-white border-t px-6 py-3 flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-xl border font-bold text-sm">Cancel</button>
              <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm disabled:opacity-50">
                <Save size={16} /> {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`.np-in{width:100%;border:1px solid #e5e7eb;border-radius:.75rem;padding:.6rem .75rem;font-size:.875rem;background:#fff} .np-in:focus{outline:none;border-color:#fb923c}`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="text-xs font-bold text-gray-500 block mb-1">{label}</label>{children}</div>;
}

function RowGroup({ parent, sel, onEdit, onDelete, onToggle, onFeature, onMove, onAddChild }: {
  parent: Category & { children: Category[] };
  sel: { isSelected: (id: string) => boolean; toggleOne: (id: string) => void };
  onEdit: (c: Category) => void; onDelete: (c: Category) => void;
  onToggle: (c: Category) => void; onFeature: (c: Category) => void;
  onMove: (c: Category, d: -1 | 1) => void;
  onAddChild: (p: Category) => void;
}) {
  const RowUI = (c: Category, indent = false, isParent = false) => {
    const pages = c.visible_on_pages || [];
    return (
    <tr key={c.id} className={`border-t hover:bg-orange-50/30 ${sel.isSelected(c.id) ? 'bg-orange-50/40' : ''}`}>
      <td className="px-3 py-3"><SelectCheckbox checked={sel.isSelected(c.id)} onChange={() => sel.toggleOne(c.id)} /></td>
      <td className="px-4 py-3">
        <div className={`flex items-center gap-2 ${indent ? 'pl-6' : ''}`}>
          {indent && <span className="text-gray-300">↳</span>}
          {c.icon && <span className="text-lg">{c.icon}</span>}
          <div>
            <p className="font-bold text-gray-900">{c.name}</p>
            {c.description && <p className="text-xs text-gray-500 line-clamp-1 max-w-xs">{c.description}</p>}
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-xs font-mono text-gray-500">{c.slug}</td>
      <td className="px-4 py-3 text-center text-xs text-gray-400">{(c as any).children?.length ?? '—'}</td>
      <td className="px-4 py-3 text-center text-xs">
        {pages.length === 0
          ? <span className="text-gray-300">none</span>
          : pages.includes('global')
            ? <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-bold">Global</span>
            : <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-bold" title={pages.join(', ')}>{pages.length} page{pages.length > 1 ? 's' : ''}</span>}
      </td>
      <td className="px-4 py-3 text-center"><button onClick={() => onToggle(c)} title={c.active ? 'Hide' : 'Show'}>{c.active ? <Eye size={16} className="text-green-600" /> : <EyeOff size={16} className="text-gray-300" />}</button></td>
      <td className="px-4 py-3 text-center"><button onClick={() => onFeature(c)} title="Toggle featured"><Star size={16} className={c.featured ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'} /></button></td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1">
          {isParent && <button onClick={() => onAddChild(c)} className="p-1.5 hover:bg-green-50 text-green-600 rounded" title="Add sub-category"><Plus size={14} /></button>}
          <button onClick={() => onMove(c, -1)} className="p-1.5 hover:bg-gray-100 rounded" title="Move up"><ArrowUp size={14} /></button>
          <button onClick={() => onMove(c, 1)} className="p-1.5 hover:bg-gray-100 rounded" title="Move down"><ArrowDown size={14} /></button>
          <button onClick={() => onEdit(c)} className="p-1.5 hover:bg-gray-100 rounded" title="Edit"><Edit2 size={14} /></button>
          <button onClick={() => onDelete(c)} className="p-1.5 hover:bg-red-50 text-red-500 rounded" title="Delete"><Trash2 size={14} /></button>
        </div>
      </td>
    </tr>
  );};
  return <>{RowUI(parent, false, true)}{parent.children.map(c => RowUI(c, true, false))}</>;
}
