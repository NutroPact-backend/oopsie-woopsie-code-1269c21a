// @ts-nocheck
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Trash2, Edit2, Save, X, ChevronUp, ChevronDown, HelpCircle, Eye, EyeOff, GripVertical } from 'lucide-react';
import { TabHelp } from "./_TabHelp";
import { useBulkSelection, BulkActionBar, SelectCheckbox, runForEach } from '@/pages/admin/components/BulkSelect';

const AdminAPI = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });
AdminAPI.interceptors.request.use(config => {
  const token = sessionStorage.getItem('np_admin_token');
  if (token) config.headers['x-admin-token'] = token;
  return config;
});

const DEFAULT_CATEGORIES = ['Orders & Shipping', 'Returns & Refunds', 'Product Quality', 'Payments', 'Account & Orders', 'Supplements & Advice', 'General'];

const EMPTY_FAQ = { category: 'General', question: '', answer: '', enabled: true, order: 0 };

function FAQModal({ item, onClose, onSave }: { item: any; onClose: () => void; onSave: () => void }) {
  const [form, setForm] = useState(item ? { ...item } : { ...EMPTY_FAQ });
  const [saving, setSaving] = useState(false);
  const [customCat, setCustomCat] = useState(!DEFAULT_CATEGORIES.includes(item?.category || 'General'));
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.question.trim() || !form.answer.trim()) return alert('Question and answer are required');
    setSaving(true);
    try {
      if (item?._id) await AdminAPI.put(`/admin/faq/${item._id}`, form);
      else await AdminAPI.post('/admin/faq', form);
      onSave(); onClose();
    } catch { alert('Failed to save FAQ'); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl my-8" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="font-black text-lg">{item?._id ? 'Edit FAQ' : 'Add FAQ Item'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1">Category</label>
            <div className="flex gap-2">
              {customCat ? (
                <input value={form.category} onChange={e => set('category', e.target.value)} placeholder="Custom category name"
                  className="flex-1 border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400" />
              ) : (
                <select value={form.category} onChange={e => set('category', e.target.value)}
                  className="flex-1 border rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-orange-400">
                  {DEFAULT_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              )}
              <button type="button" onClick={() => setCustomCat(!customCat)}
                className="px-3 py-2 border rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-50 transition">
                {customCat ? 'Pick existing' : 'Custom'}
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1">Question *</label>
            <input value={form.question} onChange={e => set('question', e.target.value)}
              placeholder="What is your return policy?"
              className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1">Answer *</label>
            <textarea value={form.answer} onChange={e => set('answer', e.target.value)} rows={5}
              placeholder="We accept returns within 7 days of delivery..."
              className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400 resize-none" />
          </div>
          <label className="flex items-center gap-3 cursor-pointer p-3 bg-gray-50 rounded-xl">
            <input type="checkbox" checked={form.enabled} onChange={e => set('enabled', e.target.checked)} className="w-4 h-4 accent-orange-500" />
            <div>
              <p className="text-sm font-bold text-gray-800">Visible</p>
              <p className="text-xs text-gray-400">Show this FAQ on the public FAQ page</p>
            </div>
          </label>
        </div>
        <div className="flex justify-end gap-3 p-5 border-t">
          <button onClick={onClose} className="px-5 py-2.5 border rounded-xl font-semibold text-sm hover:bg-gray-50">Cancel</button>
          <button onClick={save} disabled={saving} className="px-5 py-2.5 bg-orange-500 text-white rounded-xl font-black text-sm hover:bg-orange-600 disabled:opacity-50">
            {saving ? 'Saving...' : 'Save FAQ'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function FAQTab() {
  const [faqs, setFaqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; item: any }>({ open: false, item: null });
  const [catFilter, setCatFilter] = useState('All');
  const sel = useBulkSelection(faqs, (f) => f._id);

  const load = async () => {
    try { const { data } = await AdminAPI.get('/admin/faq'); setFaqs(data); }
    catch { setFaqs([]); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const del = async (id: string) => {
    if (!confirm('Delete this FAQ?')) return;
    await AdminAPI.delete(`/admin/faq/${id}`);
    load();
  };

  const toggleVisible = async (item: any) => {
    await AdminAPI.put(`/admin/faq/${item._id}`, { ...item, enabled: !item.enabled });
    load();
  };

  const move = async (item: any, dir: 'up' | 'down') => {
    const idx = faqs.findIndex(f => f._id === item._id);
    const other = faqs[dir === 'up' ? idx - 1 : idx + 1];
    if (!other) return;
    await Promise.all([
      AdminAPI.put(`/admin/faq/${item._id}`, { ...item, order: other.order }),
      AdminAPI.put(`/admin/faq/${other._id}`, { ...other, order: item.order }),
    ]);
    load();
  };

  const allCats = ['All', ...Array.from(new Set(faqs.map(f => f.category).filter(Boolean)))];
  const filtered = catFilter === 'All' ? faqs : faqs.filter(f => f.category === catFilter);

  const grouped: Record<string, any[]> = {};
  filtered.forEach(f => { if (!grouped[f.category]) grouped[f.category] = []; grouped[f.category].push(f); });

  return (
    <div>
      <TabHelp topic="faq" />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-black">FAQ Management</h2>
          <p className="text-sm text-gray-500 mt-0.5">{faqs.length} questions · {faqs.filter(f => f.enabled).length} visible</p>
        </div>
        <button onClick={() => setModal({ open: true, item: null })}
          className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-orange-600 transition">
          <Plus size={15} /> Add FAQ
        </button>
      </div>

      <div className="flex gap-2 flex-wrap mb-5">
        {allCats.map(cat => (
          <button key={cat} onClick={() => setCatFilter(cat)}
            className={`px-3 py-1.5 rounded-xl text-sm font-semibold border transition ${catFilter === cat ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'}`}>
            {cat}
          </button>
        ))}
      </div>

      <BulkActionBar
        count={sel.count}
        ids={Array.from(sel.selected)}
        onClear={() => { sel.clear(); load(); }}
        actions={[
          { key: 'show', label: 'Show', color: 'bg-green-600 hover:bg-green-700', run: (ids) => runForEach(ids, (id) => AdminAPI.put(`/admin/faq/${id}`, { enabled: true })) },
          { key: 'hide', label: 'Hide', color: 'bg-gray-700 hover:bg-gray-800', run: (ids) => runForEach(ids, (id) => AdminAPI.put(`/admin/faq/${id}`, { enabled: false })) },
          { key: 'delete', label: 'Delete', color: 'bg-red-600 hover:bg-red-700', confirm: 'Delete {n} FAQ(s)?', run: (ids) => runForEach(ids, (id) => AdminAPI.delete(`/admin/faq/${id}`)) },
        ]}
      />
      {!loading && faqs.length > 0 && (
        <label className="flex items-center gap-2 text-xs font-bold text-gray-500 px-2 mt-3 mb-2">
          <SelectCheckbox checked={sel.allSelected} indeterminate={sel.someSelected} onChange={sel.toggleAll} />
          Select all ({filtered.length})
        </label>
      )}
      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : faqs.length === 0 ? (
        <div className="bg-white rounded-2xl border p-16 text-center">
          <HelpCircle size={40} className="text-gray-200 mx-auto mb-3" />
          <p className="font-bold text-gray-500 text-lg">No FAQ items yet</p>
          <p className="text-sm text-gray-400 mt-1">Add questions that your customers frequently ask</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                  <HelpCircle size={14} className="text-orange-500" />
                </div>
                <h3 className="font-black text-gray-800">{cat}</h3>
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-bold">{items.length}</span>
              </div>
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={item._id} className={`flex items-center gap-3 p-3.5 bg-white border rounded-xl hover:border-orange-200 transition ${!item.enabled ? 'opacity-60' : ''} ${sel.isSelected(item._id) ? 'ring-2 ring-orange-300' : ''}`}>
                    <SelectCheckbox checked={sel.isSelected(item._id)} onChange={() => sel.toggleOne(item._id)} />
                    <div className="flex flex-col gap-0.5">
                      <button onClick={() => move(item, 'up')} disabled={idx === 0} className="p-0.5 text-gray-300 hover:text-gray-600 disabled:opacity-30 transition"><ChevronUp size={13} /></button>
                      <button onClick={() => move(item, 'down')} disabled={idx === items.length - 1} className="p-0.5 text-gray-300 hover:text-gray-600 disabled:opacity-30 transition"><ChevronDown size={13} /></button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold text-sm ${item.enabled ? 'text-gray-800' : 'text-gray-400'}`}>{item.question}</p>
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{item.answer}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => toggleVisible(item)} title={item.enabled ? 'Hide' : 'Show'}
                        className={`w-7 h-7 flex items-center justify-center rounded-lg border transition ${item.enabled ? 'text-green-500 border-green-200 hover:bg-green-50' : 'text-gray-300 border-gray-200 hover:bg-gray-50'}`}>
                        {item.enabled ? <Eye size={13} /> : <EyeOff size={13} />}
                      </button>
                      <button onClick={() => setModal({ open: true, item })} className="w-7 h-7 flex items-center justify-center rounded-lg border hover:bg-gray-50 text-gray-600 transition"><Edit2 size={12} /></button>
                      <button onClick={() => del(item._id)} className="w-7 h-7 flex items-center justify-center rounded-lg border border-red-100 hover:bg-red-50 text-red-400 transition"><Trash2 size={12} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {modal.open && <FAQModal item={modal.item} onClose={() => setModal({ open: false, item: null })} onSave={load} />}
    </div>
  );
}
