// @ts-nocheck
import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, X, Save, Package, Box } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { TabHelp } from "./_TabHelp";
import { useBulkSelection, BulkActionBar, SelectCheckbox, runForEach } from '@/pages/admin/components/BulkSelect';

function Inp({ label, value, onChange, placeholder, type = 'text', help }: any) {
  return (
    <div>
      {label && <label className="text-xs font-bold text-gray-500 block mb-1">{label}</label>}
      <input type={type} value={value ?? ''} onChange={e => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
        placeholder={placeholder}
        className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400 bg-white" />
      {help && <p className="text-xs text-gray-400 mt-0.5">{help}</p>}
    </div>
  );
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `id-${Date.now()}`;

function DimensionModal({ dim, onClose, onSave }: any) {
  const [form, setForm] = useState(dim || { name: '', length: 0, width: 0, height: 0, weight: 0, unit: 'cm' });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const save = async () => {
    if (!form.name) return alert('Name required');
    setSaving(true);
    await onSave(form).catch((e: any) => alert(e.message || 'Failed'));
    setSaving(false);
    onClose();
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="font-black">{dim?.id ? 'Edit Dimension' : 'Add Dimension Preset'}</h3>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <div className="p-5 space-y-3">
          <Inp label="Name *" value={form.name} onChange={(v: string) => set('name', v)} placeholder="e.g. 2kg Protein Bag" />
          <div className="grid grid-cols-3 gap-3">
            <Inp label="Length (cm)" type="number" value={form.length} onChange={(v: number) => set('length', v)} />
            <Inp label="Width (cm)" type="number" value={form.width} onChange={(v: number) => set('width', v)} />
            <Inp label="Height (cm)" type="number" value={form.height} onChange={(v: number) => set('height', v)} />
          </div>
          <Inp label="Gross Weight (grams)" type="number" value={form.weight} onChange={(v: number) => set('weight', v)} help="Total product weight including content" />
        </div>
        <div className="flex justify-end gap-3 p-5 border-t">
          <button onClick={onClose} className="px-5 py-2.5 border rounded-xl font-semibold text-sm">Cancel</button>
          <button onClick={save} disabled={saving} className="px-5 py-2.5 bg-orange-500 text-white rounded-xl font-black text-sm disabled:opacity-50 flex items-center gap-2">
            <Save size={14} /> {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

function BoxModal({ box, onClose, onSave }: any) {
  const [form, setForm] = useState(box || { name: '', length: 0, width: 0, height: 0, weight: 0, max_weight: 0, unit: 'cm' });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const save = async () => {
    if (!form.name) return alert('Name required');
    setSaving(true);
    await onSave(form).catch((e: any) => alert(e.message || 'Failed'));
    setSaving(false);
    onClose();
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="font-black">{box?.id ? 'Edit Packaging Box' : 'Add Packaging Box'}</h3>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <div className="p-5 space-y-3">
          <Inp label="Box Name *" value={form.name} onChange={(v: string) => set('name', v)} placeholder="e.g. Standard Shipping Box" />
          <div className="grid grid-cols-3 gap-3">
            <Inp label="Length (cm)" type="number" value={form.length} onChange={(v: number) => set('length', v)} />
            <Inp label="Width (cm)" type="number" value={form.width} onChange={(v: number) => set('width', v)} />
            <Inp label="Height (cm)" type="number" value={form.height} onChange={(v: number) => set('height', v)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Inp label="Dead Weight (g)" type="number" value={form.weight} onChange={(v: number) => set('weight', v)} help="Empty box + packing" />
            <Inp label="Max Capacity (g)" type="number" value={form.max_weight} onChange={(v: number) => set('max_weight', v)} help="0 = unlimited" />
          </div>
        </div>
        <div className="flex justify-end gap-3 p-5 border-t">
          <button onClick={onClose} className="px-5 py-2.5 border rounded-xl font-semibold text-sm">Cancel</button>
          <button onClick={save} disabled={saving} className="px-5 py-2.5 bg-orange-500 text-white rounded-xl font-black text-sm disabled:opacity-50 flex items-center gap-2">
            <Save size={14} /> {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DimensionsTab() {
  const [dims, setDims] = useState<any[]>([]);
  const [boxes, setBoxes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dimModal, setDimModal] = useState<{ open: boolean; dim: any }>({ open: false, dim: null });
  const [boxModal, setBoxModal] = useState<{ open: boolean; box: any }>({ open: false, box: null });
  const dimSel = useBulkSelection(dims, (d) => d.id);
  const boxSel = useBulkSelection(boxes, (b) => b.id);


  const load = async () => {
    setLoading(true);
    const [d, b] = await Promise.all([
      supabase.from('dimensions').select('*').order('name'),
      supabase.from('packaging_boxes').select('*').order('name'),
    ]);
    setDims(d.data || []);
    setBoxes(b.data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const saveDim = async (form: any) => {
    const row = { ...form, id: form.id || slug(form.name) };
    const { error } = await supabase.from('dimensions').upsert(row);
    if (error) throw error;
    load();
  };
  const saveBox = async (form: any) => {
    const row = { ...form, id: form.id || slug(form.name) };
    const { error } = await supabase.from('packaging_boxes').upsert(row);
    if (error) throw error;
    load();
  };
  const deleteDim = async (id: string) => {
    if (!confirm('Delete?')) return;
    await supabase.from('dimensions').delete().eq('id', id);
    load();
  };
  const deleteBox = async (id: string) => {
    if (!confirm('Delete?')) return;
    await supabase.from('packaging_boxes').delete().eq('id', id);
    load();
  };

  return (
    <div className="space-y-10 max-w-4xl">
      <TabHelp topic="dimensions" />
      <div>
        <h2 className="text-2xl font-black mb-1">Dimensions & Packaging Boxes</h2>
        <p className="text-gray-500 text-sm">Configure product dimensions and packaging boxes. Auto-shipment uses the smallest fitting box and calculates volumetric weight.</p>
      </div>

      {/* Product Dimensions */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center"><Package size={18} className="text-orange-500" /></div>
            <div>
              <h3 className="font-black">Product Dimension Presets</h3>
              <p className="text-xs text-gray-500">L × W × H (cm) + gross weight (g)</p>
            </div>
          </div>
          <button onClick={() => setDimModal({ open: true, dim: null })} className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-xl font-bold text-sm">
            <Plus size={14} /> Add Preset
          </button>
        </div>
        <div className="px-4 pt-3">
          <BulkActionBar count={dimSel.count} ids={Array.from(dimSel.selected)} onClear={() => { dimSel.clear(); load(); }}
            actions={[{ key: 'delete', label: 'Delete', color: 'bg-red-600 hover:bg-red-700', confirm: 'Delete {n} dimension presets?', run: async (ids) => { await runForEach(ids, (id) => supabase.from('dimensions').delete().eq('id', id)); } }]} />
        </div>
        {loading ? <div className="p-6 space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />)}</div>
          : dims.length === 0 ? <div className="p-12 text-center text-gray-400"><Package size={32} className="mx-auto mb-3 opacity-30" /><p className="font-semibold">No dimension presets yet</p></div>
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b"><tr>
                  <th className="px-4 py-3 w-10"><SelectCheckbox checked={dimSel.allSelected} indeterminate={dimSel.someSelected} onChange={dimSel.toggleAll} /></th>
                  <th className="text-left px-4 py-3 font-bold text-gray-600">Name</th>
                  <th className="text-center px-4 py-3 font-bold text-gray-600">L × W × H</th>
                  <th className="text-center px-4 py-3 font-bold text-gray-600">Weight</th>
                  <th className="text-right px-6 py-3 font-bold text-gray-600">Actions</th>
                </tr></thead>
                <tbody>
                  {dims.map(d => (
                    <tr key={d.id} className={`border-b last:border-0 hover:bg-gray-50 ${dimSel.isSelected(d.id) ? 'bg-orange-50' : ''}`}>
                      <td className="px-4 py-3.5"><SelectCheckbox checked={dimSel.isSelected(d.id)} onChange={() => dimSel.toggleOne(d.id)} /></td>
                      <td className="px-4 py-3.5 font-semibold">{d.name}</td>
                      <td className="px-4 py-3.5 text-center font-mono">{d.length} × {d.width} × {d.height}</td>
                      <td className="px-4 py-3.5 text-center">{d.weight ? `${d.weight}g` : '—'}</td>
                      <td className="px-6 py-3.5 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setDimModal({ open: true, dim: d })} className="w-8 h-8 flex items-center justify-center border rounded-lg"><Edit2 size={13} /></button>
                          <button onClick={() => deleteDim(d.id)} className="w-8 h-8 flex items-center justify-center border border-red-100 rounded-lg text-red-400"><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>


      {/* Packaging Boxes */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center"><Box size={18} className="text-blue-500" /></div>
            <div>
              <h3 className="font-black">Packaging Box Presets</h3>
              <p className="text-xs text-gray-500">Used by auto-shipment to pick smallest fitting box</p>
            </div>
          </div>
          <button onClick={() => setBoxModal({ open: true, box: null })} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-sm">
            <Plus size={14} /> Add Box
          </button>
        </div>
        <div className="px-4 pt-3">
          <BulkActionBar count={boxSel.count} ids={Array.from(boxSel.selected)} onClear={() => { boxSel.clear(); load(); }}
            actions={[{ key: 'delete', label: 'Delete', color: 'bg-red-600 hover:bg-red-700', confirm: 'Delete {n} boxes?', run: async (ids) => { await runForEach(ids, (id) => supabase.from('packaging_boxes').delete().eq('id', id)); } }]} />
        </div>
        {loading ? <div className="p-6 space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />)}</div>
          : boxes.length === 0 ? <div className="p-12 text-center text-gray-400"><Box size={32} className="mx-auto mb-3 opacity-30" /><p className="font-semibold">No packaging boxes yet</p></div>
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b"><tr>
                  <th className="px-4 py-3 w-10"><SelectCheckbox checked={boxSel.allSelected} indeterminate={boxSel.someSelected} onChange={boxSel.toggleAll} /></th>
                  <th className="text-left px-4 py-3 font-bold text-gray-600">Box Name</th>
                  <th className="text-center px-4 py-3 font-bold text-gray-600">L × W × H</th>
                  <th className="text-center px-4 py-3 font-bold text-gray-600">Dead Wt</th>
                  <th className="text-center px-4 py-3 font-bold text-gray-600">Max Cap</th>
                  <th className="text-right px-6 py-3 font-bold text-gray-600">Actions</th>
                </tr></thead>
                <tbody>
                  {boxes.map(b => (
                    <tr key={b.id} className={`border-b last:border-0 hover:bg-gray-50 ${boxSel.isSelected(b.id) ? 'bg-orange-50' : ''}`}>
                      <td className="px-4 py-3.5"><SelectCheckbox checked={boxSel.isSelected(b.id)} onChange={() => boxSel.toggleOne(b.id)} /></td>
                      <td className="px-4 py-3.5 font-semibold">{b.name}</td>
                      <td className="px-4 py-3.5 text-center font-mono">{b.length} × {b.width} × {b.height}</td>
                      <td className="px-4 py-3.5 text-center">{b.weight ? `${b.weight}g` : '—'}</td>
                      <td className="px-4 py-3.5 text-center">{b.max_weight ? `${b.max_weight}g` : '∞'}</td>
                      <td className="px-6 py-3.5 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setBoxModal({ open: true, box: b })} className="w-8 h-8 flex items-center justify-center border rounded-lg"><Edit2 size={13} /></button>
                          <button onClick={() => deleteBox(b.id)} className="w-8 h-8 flex items-center justify-center border border-red-100 rounded-lg text-red-400"><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>


      {dimModal.open && <DimensionModal dim={dimModal.dim} onClose={() => setDimModal({ open: false, dim: null })} onSave={saveDim} />}
      {boxModal.open && <BoxModal box={boxModal.box} onClose={() => setBoxModal({ open: false, box: null })} onSave={saveBox} />}
    </div>
  );
}
