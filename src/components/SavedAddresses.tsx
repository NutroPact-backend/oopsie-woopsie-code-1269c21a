// @ts-nocheck
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/store/authStore';
import { MapPin, Plus, Star, Trash2, Edit2, X, Check } from 'lucide-react';

export interface AddressRecord {
  id: string;
  user_id: string;
  label: string;
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2?: string | null;
  landmark?: string | null;
  city: string;
  state: string;
  pincode: string;
  country: string;
  is_default: boolean;
}

type Mode = 'manage' | 'pick';

interface Props {
  mode?: Mode;
  selectedId?: string | null;
  onSelect?: (addr: AddressRecord) => void;
  compact?: boolean;
}

const emptyForm = {
  label: 'Home',
  full_name: '',
  phone: '',
  address_line1: '',
  address_line2: '',
  landmark: '',
  city: '',
  state: '',
  pincode: '',
  country: 'India',
  is_default: false,
};

export default function SavedAddresses({ mode = 'manage', selectedId, onSelect, compact }: Props) {
  const { user } = useAuthStore();
  const [list, setList] = useState<AddressRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('user_addresses')
      .select('*')
      .order('is_default', { ascending: false })
      .order('updated_at', { ascending: false });
    if (!error && data) setList(data as AddressRecord[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // Auto-select default in pick mode
  useEffect(() => {
    if (mode === 'pick' && !selectedId && list.length > 0 && onSelect) {
      const def = list.find(a => a.is_default) || list[0];
      onSelect(def);
    }
  }, [mode, selectedId, list, onSelect]);

  const startAdd = () => { setForm({ ...emptyForm, is_default: list.length === 0 }); setAdding(true); setEditingId(null); setError(''); };
  const startEdit = (a: AddressRecord) => {
    setForm({
      label: a.label, full_name: a.full_name, phone: a.phone,
      address_line1: a.address_line1, address_line2: a.address_line2 || '',
      landmark: a.landmark || '', city: a.city, state: a.state,
      pincode: a.pincode, country: a.country, is_default: a.is_default,
    });
    setEditingId(a.id); setAdding(false); setError('');
  };
  const cancel = () => { setAdding(false); setEditingId(null); setError(''); };

  const handleSave = async () => {
    if (!user) return;
    setError('');
    if (!form.full_name.trim() || !form.phone.trim() || !form.address_line1.trim() || !form.city.trim() || !form.state.trim()) {
      setError('Please fill name, phone, address, city and state.'); return;
    }
    if (!/^\d{6}$/.test(form.pincode.trim())) { setError('Pincode must be 6 digits.'); return; }
    if (!/^\d{10}$/.test(form.phone.trim())) { setError('Phone must be 10 digits.'); return; }
    setSaving(true);
    const payload = { ...form, user_id: user.id };
    const res = editingId
      ? await supabase.from('user_addresses').update(payload).eq('id', editingId)
      : await supabase.from('user_addresses').insert(payload);
    setSaving(false);
    if (res.error) { setError(res.error.message); return; }
    cancel();
    await load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this address?')) return;
    await supabase.from('user_addresses').delete().eq('id', id);
    await load();
  };

  const setDefault = async (id: string) => {
    await supabase.from('user_addresses').update({ is_default: true }).eq('id', id);
    await load();
  };

  if (!user) {
    return <p className="text-sm text-gray-500">Please log in to manage saved addresses.</p>;
  }

  return (
    <div className="space-y-3">
      {loading && <p className="text-sm text-gray-400">Loading addresses…</p>}

      {!loading && list.length === 0 && !adding && (
        <div className={`text-center ${compact ? 'py-4' : 'py-8'} bg-gray-50 rounded-xl`}>
          <MapPin size={compact ? 24 : 36} className="mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-500">No saved addresses yet.</p>
        </div>
      )}

      {list.map(a => {
        const isPicked = mode === 'pick' && selectedId === a.id;
        return (
          <div
            key={a.id}
            className={`p-4 rounded-xl border-2 transition ${isPicked ? 'border-orange-500 bg-orange-50' : 'border-gray-200 bg-white'} ${mode === 'pick' ? 'cursor-pointer hover:border-orange-400' : ''}`}
            onClick={mode === 'pick' ? () => onSelect?.(a) : undefined}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm">{a.label}</span>
                  {a.is_default && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold uppercase text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                      <Star size={10} /> Default
                    </span>
                  )}
                </div>
                <p className="text-sm font-semibold mt-1">{a.full_name} <span className="text-gray-400 font-normal">· {a.phone}</span></p>
                <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
                  {a.address_line1}{a.address_line2 ? `, ${a.address_line2}` : ''}{a.landmark ? `, near ${a.landmark}` : ''}, {a.city}, {a.state} - {a.pincode}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                {!a.is_default && (
                  <button onClick={() => setDefault(a.id)} title="Set as default" className="p-1.5 rounded hover:bg-gray-100 text-gray-500">
                    <Star size={14} />
                  </button>
                )}
                <button onClick={() => startEdit(a)} title="Edit" className="p-1.5 rounded hover:bg-gray-100 text-gray-500">
                  <Edit2 size={14} />
                </button>
                <button onClick={() => remove(a.id)} title="Delete" className="p-1.5 rounded hover:bg-red-50 text-red-500">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {(adding || editingId) && (
        <div className="rounded-xl border-2 border-orange-300 bg-orange-50/40 p-4 space-y-2">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-bold">{editingId ? 'Edit address' : 'New address'}</p>
            <button onClick={cancel} className="text-gray-400 hover:text-gray-700"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select value={form.label} onChange={e => setForm({ ...form, label: e.target.value })}
              className="col-span-2 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white">
              <option>Home</option><option>Office</option><option>Other</option>
            </select>
            <input placeholder="Full name" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            <input placeholder="10-digit phone" inputMode="numeric" maxLength={10} value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value.replace(/\D/g, '') })}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Address line 1" value={form.address_line1} onChange={e => setForm({ ...form, address_line1: e.target.value })}
              className="col-span-2 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Address line 2 (optional)" value={form.address_line2} onChange={e => setForm({ ...form, address_line2: e.target.value })}
              className="col-span-2 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Landmark (optional)" value={form.landmark} onChange={e => setForm({ ...form, landmark: e.target.value })}
              className="col-span-2 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            <input placeholder="City" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            <input placeholder="State" value={form.state} onChange={e => setForm({ ...form, state: e.target.value })}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Pincode" inputMode="numeric" maxLength={6} value={form.pincode}
              onChange={e => setForm({ ...form, pincode: e.target.value.replace(/\D/g, '') })}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            <label className="flex items-center gap-2 text-xs px-1">
              <input type="checkbox" checked={form.is_default} onChange={e => setForm({ ...form, is_default: e.target.checked })} />
              Set as default
            </label>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving}
              className="flex-1 inline-flex items-center justify-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-lg py-2 transition disabled:opacity-50">
              <Check size={14} /> {saving ? 'Saving…' : (editingId ? 'Update' : 'Save')}
            </button>
            <button onClick={cancel} className="px-4 text-sm font-bold text-gray-600 rounded-lg border border-gray-300 hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      )}

      {!loading && !adding && !editingId && (
        <button onClick={startAdd}
          className="w-full inline-flex items-center justify-center gap-1.5 border-2 border-dashed border-gray-300 hover:border-orange-400 hover:text-orange-600 text-gray-500 text-sm font-bold rounded-xl py-3 transition">
          <Plus size={16} /> Add new address
        </button>
      )}
    </div>
  );
}
