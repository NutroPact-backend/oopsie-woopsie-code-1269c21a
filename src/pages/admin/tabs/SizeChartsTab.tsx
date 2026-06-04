// @ts-nocheck
import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, X, Save, Eye, EyeOff, Upload, Ruler } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSimpleUpload } from '@/lib/useSimpleUpload';
import { TabHelp } from './_TabHelp';

const toSlug = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const PRESETS: Record<string, { columns: string[]; rows: string[][]; unit: string }> = {
  't-shirt':       { unit: 'inches', columns: ['Size','Chest','Length','Shoulder'], rows: [['S','38','27','17'],['M','40','28','17.5'],['L','42','29','18'],['XL','44','30','18.5'],['XXL','46','31','19']] },
  'hoodie':        { unit: 'inches', columns: ['Size','Chest','Length','Sleeve'],   rows: [['S','40','27','24'],['M','42','28','25'],['L','44','29','25.5'],['XL','46','30','26']] },
  'wrist band':    { unit: 'inches', columns: ['Size','Wrist Circumference'],       rows: [['S','5.5 – 6.5'],['M','6.5 – 7.5'],['L','7.5 – 8.5']] },
  'lifting belt':  { unit: 'inches', columns: ['Size','Waist'],                     rows: [['S','24 – 31'],['M','31 – 36'],['L','36 – 41'],['XL','41 – 47']] },
  'knee sleeve':   { unit: 'cm',     columns: ['Size','Knee Circumference (just above)'], rows: [['S','30 – 33'],['M','33 – 36'],['L','36 – 39'],['XL','39 – 42']] },
  'gloves':        { unit: 'inches', columns: ['Size','Palm Width'],                rows: [['S','3.0 – 3.5'],['M','3.5 – 4.0'],['L','4.0 – 4.5'],['XL','4.5 – 5.0']] },
  'shoes':         { unit: 'UK',     columns: ['UK','US','EU','Foot Length (cm)'],  rows: [['6','7','40','25'],['7','8','41','25.7'],['8','9','42','26.5'],['9','10','43','27.3'],['10','11','44','28']] },
};

const EMPTY = { name: '', slug: '', category: '', description: '', image_url: '', columns: ['Size'], rows: [['S']], unit_hint: '', active: true, sort_order: 0 };

export default function SizeChartsTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const { uploadFile, isUploading } = useSimpleUpload();

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('size_charts').select('*').order('sort_order').order('name');
    setRows(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => setEditing({ ...EMPTY });
  const openEdit = (r: any) => setEditing({ ...EMPTY, ...r, columns: r.columns?.length ? r.columns : ['Size'], rows: r.rows?.length ? r.rows : [['S']] });

  const applyPreset = (cat: string) => {
    const p = PRESETS[cat];
    if (!p) return;
    setEditing((e: any) => ({ ...e, category: cat, columns: p.columns, rows: p.rows.map(r => [...r]), unit_hint: p.unit }));
  };

  const save = async () => {
    if (!editing?.name?.trim()) return alert('Name required');
    if (!editing?.category?.trim()) return alert('Category required');
    setSaving(true);
    const payload: any = {
      name: editing.name.trim(),
      slug: editing.slug?.trim() || toSlug(editing.name),
      category: editing.category.trim(),
      description: editing.description || null,
      image_url: editing.image_url || null,
      columns: editing.columns || [],
      rows: editing.rows || [],
      unit_hint: editing.unit_hint || null,
      active: editing.active !== false,
      sort_order: editing.sort_order || 0,
    };
    const { error } = editing.id
      ? await supabase.from('size_charts').update(payload).eq('id', editing.id)
      : await supabase.from('size_charts').insert(payload);
    setSaving(false);
    if (error) return alert(error.message);
    setEditing(null); load();
  };
  const remove = async (r: any) => { if (!confirm(`Delete "${r.name}"?`)) return; const { error } = await supabase.from('size_charts').delete().eq('id', r.id); if (error) return alert(error.message); load(); };
  const toggle = async (r: any) => { await supabase.from('size_charts').update({ active: !r.active }).eq('id', r.id); load(); };

  // table editors
  const addCol = () => setEditing((e: any) => ({ ...e, columns: [...e.columns, `Col ${e.columns.length + 1}`], rows: e.rows.map((r: string[]) => [...r, '']) }));
  const delCol = (i: number) => setEditing((e: any) => ({ ...e, columns: e.columns.filter((_: any, k: number) => k !== i), rows: e.rows.map((r: string[]) => r.filter((_, k) => k !== i)) }));
  const setCol = (i: number, v: string) => setEditing((e: any) => { const c = [...e.columns]; c[i] = v; return { ...e, columns: c }; });
  const addRow = () => setEditing((e: any) => ({ ...e, rows: [...e.rows, e.columns.map(() => '')] }));
  const delRow = (i: number) => setEditing((e: any) => ({ ...e, rows: e.rows.filter((_: any, k: number) => k !== i) }));
  const setCell = (ri: number, ci: number, v: string) => setEditing((e: any) => { const rs = e.rows.map((r: string[]) => [...r]); rs[ri][ci] = v; return { ...e, rows: rs }; });

  const onImage = async (file: File) => { const url = await uploadFile(file); if (url) setEditing((e: any) => ({ ...e, image_url: url })); };

  return (
    <div className="space-y-5">
      <TabHelp topic="sizecharts" />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black flex items-center gap-2"><Ruler size={22} /> Size Charts</h2>
          <p className="text-sm text-gray-500">Reusable size charts for apparel & accessories. Each product can link to a chart, or override it. Presets available for t-shirts, lifting belts, knee sleeves, etc.</p>
        </div>
        <button onClick={openNew} className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold px-4 py-2 rounded-xl text-sm"><Plus size={16} /> New Chart</button>
      </div>

      {loading ? <div className="grid gap-2">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div> : (
        <div className="grid gap-3">
          {rows.length === 0 && <div className="text-center py-16 text-gray-400 bg-white rounded-2xl border">No size charts yet. Click <b>New Chart</b> to create one.</div>}
          {rows.map((r: any) => (
            <div key={r.id} className="bg-white rounded-2xl border p-4 flex items-center gap-4">
              {r.image_url ? <img src={r.image_url} alt="" className="w-14 h-14 rounded-lg object-cover border" /> : <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center text-gray-300"><Ruler size={20} /></div>}
              <div className="flex-1">
                <div className="font-bold">{r.name} <span className="text-[10px] uppercase bg-blue-50 text-blue-700 px-2 py-0.5 rounded ml-2">{r.category}</span></div>
                <div className="text-xs text-gray-500">{(r.columns || []).length} columns · {(r.rows || []).length} rows {r.unit_hint && `· ${r.unit_hint}`}</div>
              </div>
              <button onClick={() => toggle(r)} title={r.active ? 'Active' : 'Inactive'}>{r.active ? <Eye size={16} className="text-green-600" /> : <EyeOff size={16} className="text-gray-300" />}</button>
              <button onClick={() => openEdit(r)} className="p-2 hover:bg-gray-100 rounded"><Edit2 size={14} /></button>
              <button onClick={() => remove(r)} className="p-2 hover:bg-red-50 text-red-500 rounded"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="border-b px-6 py-4 flex items-center justify-between sticky top-0 bg-white z-10"><h3 className="text-xl font-black">{editing.id ? 'Edit' : 'New'} Size Chart</h3><button onClick={() => setEditing(null)}><X size={20} /></button></div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Name *"><input className="np-in" value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value, slug: toSlug(e.target.value) })} placeholder="e.g. T-Shirt Size Chart" /></Field>
                <Field label="Category *">
                  <input
                    className="np-in"
                    list="size-chart-categories"
                    value={editing.category}
                    onChange={e => setEditing({ ...editing, category: e.target.value })}
                    placeholder="Type a new category or pick existing"
                  />
                  <datalist id="size-chart-categories">
                    {Array.from(new Set(rows.map((r: any) => r.category).filter(Boolean))).map((c: string) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </Field>
              </div>

              <div className="flex flex-wrap gap-2 items-center text-xs">
                <span className="font-bold text-gray-500">Load preset:</span>
                {Object.keys(PRESETS).map(p => (
                  <button key={p} onClick={() => applyPreset(p)} className="px-2.5 py-1 rounded-full bg-gray-100 hover:bg-orange-100 hover:text-orange-700 font-semibold">{p}</button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Unit hint (inches / cm / UK)"><input className="np-in" value={editing.unit_hint || ''} onChange={e => setEditing({ ...editing, unit_hint: e.target.value })} placeholder="inches" /></Field>
                <Field label="Sort order"><input type="number" className="np-in" value={editing.sort_order || 0} onChange={e => setEditing({ ...editing, sort_order: Number(e.target.value) })} /></Field>
              </div>

              <Field label="Description (optional)"><textarea className="np-in" rows={2} value={editing.description || ''} onChange={e => setEditing({ ...editing, description: e.target.value })} placeholder="Measuring tips, fit notes…" /></Field>

              {/* Image upload */}
              <Field label="Chart image (optional)">
                <div className="flex items-center gap-3">
                  {editing.image_url && <img src={editing.image_url} alt="" className="w-20 h-20 object-cover rounded-lg border" />}
                  <label className="inline-flex items-center gap-2 px-3 py-2 border-2 border-dashed rounded-xl cursor-pointer hover:bg-orange-50 hover:border-orange-300 text-sm font-semibold">
                    <Upload size={14} /> {isUploading ? 'Uploading…' : 'Upload image'}
                    <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onImage(f); }} />
                  </label>
                  {editing.image_url && <button onClick={() => setEditing({ ...editing, image_url: '' })} className="text-xs text-red-500 font-semibold">Remove</button>}
                </div>
              </Field>

              {/* Table editor */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-gray-500">Chart rows</label>
                  <div className="flex gap-2">
                    <button onClick={addCol} className="text-xs font-bold px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200">+ Column</button>
                    <button onClick={addRow} className="text-xs font-bold px-2 py-1 rounded-lg bg-orange-100 hover:bg-orange-200 text-orange-700">+ Row</button>
                  </div>
                </div>
                <div className="overflow-x-auto border rounded-xl">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        {editing.columns.map((c: string, i: number) => (
                          <th key={i} className="p-1">
                            <div className="flex items-center gap-1">
                              <input className="np-in !py-1 !text-xs !font-bold" value={c} onChange={e => setCol(i, e.target.value)} />
                              {editing.columns.length > 1 && <button onClick={() => delCol(i)} className="text-red-400 hover:text-red-600"><X size={12} /></button>}
                            </div>
                          </th>
                        ))}
                        <th className="w-8" />
                      </tr>
                    </thead>
                    <tbody>
                      {editing.rows.map((row: string[], ri: number) => (
                        <tr key={ri} className="border-t">
                          {row.map((cell, ci) => (
                            <td key={ci} className="p-1"><input className="np-in !py-1 !text-xs" value={cell} onChange={e => setCell(ri, ci, e.target.value)} /></td>
                          ))}
                          <td className="text-center"><button onClick={() => delRow(ri)} className="text-red-400 hover:text-red-600"><Trash2 size={12} /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={editing.active !== false} onChange={e => setEditing({ ...editing, active: e.target.checked })} /> Active</label>
            </div>
            <div className="border-t px-6 py-3 flex justify-end gap-2 sticky bottom-0 bg-white"><button onClick={() => setEditing(null)} className="px-4 py-2 rounded-xl border font-bold text-sm">Cancel</button><button onClick={save} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm disabled:opacity-50"><Save size={16} /> {saving ? 'Saving…' : 'Save'}</button></div>
          </div>
        </div>
      )}
      <style>{`.np-in{width:100%;border:1px solid #e5e7eb;border-radius:.75rem;padding:.6rem .75rem;font-size:.875rem;background:#fff} .np-in:focus{outline:none;border-color:#fb923c}`}</style>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div><label className="text-xs font-bold text-gray-500 block mb-1">{label}</label>{children}</div>; }
