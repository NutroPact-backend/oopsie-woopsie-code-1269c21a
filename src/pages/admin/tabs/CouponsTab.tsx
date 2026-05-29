// @ts-nocheck
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Trash2, Save, Edit2, X, Tag, ToggleLeft, ToggleRight } from 'lucide-react';
import { TabHelp } from "./_TabHelp";
import { useBulkSelection, BulkActionBar, SelectCheckbox, runForEach } from '@/pages/admin/components/BulkSelect';

const AdminAPI = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });
AdminAPI.interceptors.request.use(config => {
  const token = sessionStorage.getItem('np_admin_token');
  if (token) config.headers['x-admin-token'] = token;
  return config;
});

interface Coupon {
  code: string;
  type: 'percent' | 'flat';
  value: number;
  label: string;
  active: boolean;
  minOrderValue: number;
  maxDiscount?: number;
  expiresAt?: string;
  usageLimit?: number;
  usageCount: number;
}

const EMPTY: Omit<Coupon, 'code' | 'usageCount'> = {
  type: 'percent', value: 10, label: '', active: true, minOrderValue: 0,
  maxDiscount: undefined, expiresAt: '', usageLimit: undefined,
};

function Inp({ label, value, onChange, placeholder, type = 'text', help, min }: any) {
  return (
    <div>
      {label && <label className="text-xs font-bold text-gray-500 block mb-1">{label}</label>}
      <input
        type={type} value={value ?? ''} min={min}
        onChange={e => onChange(type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400 transition" />
      {help && <p className="text-xs text-gray-400 mt-0.5">{help}</p>}
    </div>
  );
}

function CouponForm({ initial, existingCode, onSave, onCancel }: {
  initial: Partial<Coupon>; existingCode?: string; onSave: (c: any) => void; onCancel: () => void;
}) {
  const [code, setCode] = useState(existingCode || '');
  const [form, setForm] = useState<any>({ ...EMPTY, ...initial });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!code.trim() && !existingCode) { setErr('Coupon code is required'); return; }
    if (!form.value) { setErr('Discount value is required'); return; }
    setSaving(true); setErr('');
    try {
      if (existingCode) {
        await AdminAPI.put(`/admin/coupons/${existingCode}`, form);
      } else {
        await AdminAPI.post('/admin/coupons', { ...form, code: code.trim().toUpperCase() });
      }
      onSave({});
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-black text-gray-800">{existingCode ? `Edit ${existingCode}` : 'New Coupon'}</h3>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {!existingCode && (
          <div className="col-span-2">
            <Inp label="Coupon Code *" value={code} onChange={(v: string) => setCode(v.toUpperCase().replace(/\s/g, ''))} placeholder="e.g. SAVE20" help="Letters and numbers only — auto-uppercased" />
          </div>
        )}
        <div>
          <label className="text-xs font-bold text-gray-500 block mb-1">Discount Type *</label>
          <select value={form.type} onChange={e => set('type', e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400">
            <option value="percent">Percentage (%)</option>
            <option value="flat">Flat Amount (₹)</option>
          </select>
        </div>
        <Inp label={form.type === 'percent' ? 'Discount % *' : 'Discount ₹ *'} value={form.value} onChange={(v: any) => set('value', v)} type="number" min="0" placeholder={form.type === 'percent' ? '10' : '50'} />
        <Inp label="Min Order Value (₹)" value={form.minOrderValue} onChange={(v: any) => set('minOrderValue', v)} type="number" min="0" placeholder="0" help="0 = no minimum" />
        {form.type === 'percent' && (
          <Inp label="Max Discount Cap (₹)" value={form.maxDiscount ?? ''} onChange={(v: any) => set('maxDiscount', v === '' ? undefined : v)} type="number" min="0" placeholder="Optional" help="Leave blank for no cap" />
        )}
        <Inp label="Expiry Date" value={form.expiresAt ? form.expiresAt.slice(0, 10) : ''} onChange={(v: string) => set('expiresAt', v || undefined)} type="date" help="Leave blank = no expiry" />
        <Inp label="Usage Limit" value={form.usageLimit ?? ''} onChange={(v: any) => set('usageLimit', v === '' ? undefined : v)} type="number" min="0" placeholder="Optional" help="Leave blank = unlimited" />
        <div className="col-span-2">
          <Inp label="Success Message" value={form.label} onChange={(v: string) => set('label', v)} placeholder={form.type === 'percent' ? `${form.value}% off applied!` : `₹${form.value} off applied!`} help="Shown to the customer when applied (leave blank for default)" />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <div onClick={() => set('active', !form.active)} className={`w-10 h-6 rounded-full transition-colors ${form.active ? 'bg-green-500' : 'bg-gray-300'} flex items-center px-1`}>
            <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${form.active ? 'translate-x-4' : 'translate-x-0'}`} />
          </div>
          <span className="text-sm font-semibold">{form.active ? 'Active' : 'Inactive'}</span>
        </label>
      </div>
      {err && <p className="text-red-500 text-xs bg-red-50 rounded-xl px-3 py-2">{err}</p>}
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 font-semibold transition">Cancel</button>
        <button onClick={submit} disabled={saving}
          className="flex items-center gap-2 px-5 py-2 bg-orange-500 text-white text-sm font-black rounded-xl hover:bg-orange-600 transition disabled:opacity-50">
          <Save size={15} />{saving ? 'Saving…' : 'Save Coupon'}
        </button>
      </div>
    </div>
  );
}

export default function CouponsTab() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const sel = useBulkSelection(coupons, (c) => c.code);

  const load = () => {
    setLoading(true);
    AdminAPI.get('/admin/coupons').then(r => setCoupons(r.data)).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const toggle = async (c: Coupon) => {
    await AdminAPI.put(`/admin/coupons/${c.code}`, { active: !c.active });
    load();
  };

  const remove = async (code: string) => {
    if (!confirm(`Delete coupon "${code}"? This cannot be undone.`)) return;
    setDeleting(code);
    await AdminAPI.delete(`/admin/coupons/${code}`).catch(() => {});
    setDeleting(null);
    load();
  };

  const fmt = (c: Coupon) => c.type === 'percent' ? `${c.value}%` : `₹${c.value}`;
  const isExpired = (c: Coupon) => !!c.expiresAt && new Date(c.expiresAt) < new Date();

  return (
    <div className="space-y-6">
      <TabHelp topic="coupons" />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-gray-900">Discount Coupons</h2>
          <p className="text-sm text-gray-500 mt-0.5">Create and manage promo codes for your store</p>
        </div>
        {!adding && (
          <button onClick={() => { setAdding(true); setEditing(null); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 text-white text-sm font-black rounded-xl hover:bg-orange-600 transition">
            <Plus size={16} /> Add Coupon
          </button>
        )}
      </div>

      {adding && (
        <CouponForm initial={{}} onSave={() => { setAdding(false); load(); }} onCancel={() => setAdding(false)} />
      )}

      <BulkActionBar
        count={sel.count}
        ids={Array.from(sel.selected)}
        onClear={() => { sel.clear(); load(); }}
        actions={[
          { key: 'activate', label: 'Activate', color: 'bg-green-600 hover:bg-green-700', run: (ids) => runForEach(ids, (code) => AdminAPI.put(`/admin/coupons/${code}`, { active: true })) },
          { key: 'deactivate', label: 'Deactivate', color: 'bg-gray-700 hover:bg-gray-800', run: (ids) => runForEach(ids, (code) => AdminAPI.put(`/admin/coupons/${code}`, { active: false })) },
          { key: 'delete', label: 'Delete', color: 'bg-red-600 hover:bg-red-700', confirm: 'Delete {n} coupon(s)?', run: (ids) => runForEach(ids, (code) => AdminAPI.delete(`/admin/coupons/${code}`)) },
        ]}
      />


      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
      ) : coupons.length === 0 && !adding ? (
        <div className="text-center py-16 text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl">
          <Tag size={36} className="mx-auto mb-3 opacity-30" />
          <p className="font-bold">No coupons yet</p>
          <p className="text-xs mt-1">Click "Add Coupon" to create your first promo code</p>
        </div>
      ) : (
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-xs font-bold text-gray-500 px-2">
            <SelectCheckbox checked={sel.allSelected} indeterminate={sel.someSelected} onChange={sel.toggleAll} />
            Select all ({coupons.length})
          </label>
          {coupons.map(c => (
            editing === c.code ? (
              <CouponForm key={c.code} initial={c} existingCode={c.code}
                onSave={() => { setEditing(null); load(); }} onCancel={() => setEditing(null)} />
            ) : (
              <div key={c.code} className={`bg-white rounded-2xl border p-4 flex items-center gap-4 transition ${isExpired(c) ? 'border-red-100 opacity-70' : c.active ? 'border-gray-100' : 'border-gray-100 opacity-60'} ${sel.isSelected(c.code) ? 'ring-2 ring-orange-300' : ''}`}>
                <SelectCheckbox checked={sel.isSelected(c.code)} onChange={() => sel.toggleOne(c.code)} />
                <div className={`px-3 py-1.5 rounded-xl text-sm font-black tracking-wider font-mono ${c.active && !isExpired(c) ? 'bg-orange-50 text-orange-600' : 'bg-gray-100 text-gray-400'}`}>
                  {c.code}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-gray-800">{fmt(c)} off</span>
                    {c.minOrderValue > 0 && <span className="text-xs text-gray-400">· min ₹{c.minOrderValue}</span>}
                    {c.maxDiscount && <span className="text-xs text-gray-400">· max ₹{c.maxDiscount}</span>}
                    {c.usageLimit && <span className="text-xs text-gray-400">· {c.usageCount}/{c.usageLimit} used</span>}
                    {!c.usageLimit && c.usageCount > 0 && <span className="text-xs text-gray-400">· {c.usageCount} used</span>}
                    {c.expiresAt && (
                      <span className={`text-xs ${isExpired(c) ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
                        · {isExpired(c) ? 'Expired' : `Expires ${new Date(c.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{c.label}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => toggle(c)} title={c.active ? 'Deactivate' : 'Activate'}
                    className={`p-2 rounded-xl transition ${c.active ? 'text-green-500 hover:bg-green-50' : 'text-gray-300 hover:bg-gray-50'}`}>
                    {c.active ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                  </button>
                  <button onClick={() => { setEditing(c.code); setAdding(false); }}
                    className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition">
                    <Edit2 size={15} />
                  </button>
                  <button onClick={() => remove(c.code)} disabled={deleting === c.code}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition disabled:opacity-40">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            )
          ))}
        </div>
      )}

      <div className="bg-gray-50 rounded-2xl p-4 text-xs text-gray-500 space-y-1">
        <p className="font-bold text-gray-600 mb-2">How coupons work</p>
        <p>• Customers enter the code at checkout to get the discount</p>
        <p>• Percentage coupons discount by % of order total (use Max Cap to limit large discounts)</p>
        <p>• Flat coupons deduct a fixed amount regardless of order size</p>
        <p>• Inactive coupons are rejected at checkout even if the code is entered correctly</p>
        <p>• Usage count increases each time a coupon is successfully applied</p>
      </div>
    </div>
  );
}
