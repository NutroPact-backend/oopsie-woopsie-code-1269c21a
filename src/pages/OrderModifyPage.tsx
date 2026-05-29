// @ts-nocheck
import { useEffect, useState } from 'react';
import { useParams } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { getOrderModifyByToken, submitOrderModify } from '@/lib/order-modify.functions';
import { Package, MapPin, Phone, MessageSquare, Check, Clock, AlertCircle } from 'lucide-react';

export default function OrderModifyPage() {
  const { token } = useParams({ from: '/modify/$token' });
  const fetchFn = useServerFn(getOrderModifyByToken);
  const submitFn = useServerFn(submitOrderModify);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [info, setInfo] = useState<any>(null);

  const [address, setAddress] = useState({
    fullName: '', line1: '', line2: '', city: '', state: '', pincode: '', country: 'India',
  });
  const [phone, setPhone] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r: any = await fetchFn({ data: { token } });
        if (!r?.ok) { setErr(r?.error || 'Invalid link'); }
        else {
          setInfo(r);
          const a = r.originalAddress || {};
          setAddress({
            fullName: a.fullName || r.customerName || '',
            line1: a.line1 || '', line2: a.line2 || '',
            city: a.city || '', state: a.state || '',
            pincode: a.pincode || '', country: a.country || 'India',
          });
          setPhone(r.customerPhone || '');
          setItems((r.originalItems || []).map((it: any) => ({
            ...it, qty: Number(it.qty ?? it.quantity ?? 1),
          })));
        }
      } catch (e: any) { setErr(e?.message || 'Failed to load'); }
      setLoading(false);
    })();
  }, [token]);

  const setQty = (idx: number, q: number) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, qty: Math.max(0, q) } : it));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await submitFn({
        data: {
          token,
          requestedAddress: address,
          requestedPhone: phone,
          requestedItems: items.filter(i => Number(i.qty) > 0),
          customerNotes: notes,
        },
      });
      setDone(true);
    } catch (e: any) { setErr(e?.message || 'Submit failed'); }
    setSubmitting(false);
  };

  if (loading) return <div className="p-8 text-center text-gray-400 text-sm">Loading…</div>;

  if (err && !info) return (
    <div className="max-w-md mx-auto p-6 mt-12">
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
        <AlertCircle className="mx-auto mb-3 text-red-500" size={36} />
        <h1 className="font-black text-lg mb-1">Link unavailable</h1>
        <p className="text-sm text-gray-600">{err}</p>
      </div>
    </div>
  );

  if (done) return (
    <div className="max-w-md mx-auto p-6 mt-12">
      <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
        <Check className="mx-auto mb-3 text-green-600" size={40} />
        <h1 className="font-black text-lg mb-1">Request submitted</h1>
        <p className="text-sm text-gray-600">We've received your modification request. Our team will review and confirm via WhatsApp/email shortly.</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-5">
      <header className="space-y-1">
        <h1 className="font-black text-2xl">Modify Order #{info.orderNumber}</h1>
        <p className="text-xs text-gray-500 flex items-center gap-1">
          <Clock size={12} /> Link expires {new Date(info.expiresAt).toLocaleString()}
        </p>
      </header>

      <form onSubmit={submit} className="space-y-5">
        <section className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3">
          <h2 className="font-black flex items-center gap-2 text-gray-800"><MapPin size={16} className="text-orange-500" /> Shipping Address</h2>
          <input className="w-full border rounded-xl px-3 py-2 text-sm" placeholder="Full name"
            value={address.fullName} onChange={e => setAddress({ ...address, fullName: e.target.value })} />
          <input className="w-full border rounded-xl px-3 py-2 text-sm" placeholder="Address line 1"
            value={address.line1} onChange={e => setAddress({ ...address, line1: e.target.value })} required />
          <input className="w-full border rounded-xl px-3 py-2 text-sm" placeholder="Address line 2 (optional)"
            value={address.line2} onChange={e => setAddress({ ...address, line2: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <input className="border rounded-xl px-3 py-2 text-sm" placeholder="City"
              value={address.city} onChange={e => setAddress({ ...address, city: e.target.value })} />
            <input className="border rounded-xl px-3 py-2 text-sm" placeholder="State"
              value={address.state} onChange={e => setAddress({ ...address, state: e.target.value })} />
            <input className="border rounded-xl px-3 py-2 text-sm" placeholder="Pincode"
              value={address.pincode} onChange={e => setAddress({ ...address, pincode: e.target.value })} />
            <input className="border rounded-xl px-3 py-2 text-sm" placeholder="Country"
              value={address.country} onChange={e => setAddress({ ...address, country: e.target.value })} />
          </div>
        </section>

        <section className="bg-white border border-gray-100 rounded-2xl p-4 space-y-2">
          <h2 className="font-black flex items-center gap-2 text-gray-800"><Phone size={16} className="text-orange-500" /> Contact Phone</h2>
          <input className="w-full border rounded-xl px-3 py-2 text-sm" placeholder="10-digit phone"
            value={phone} onChange={e => setPhone(e.target.value)} />
        </section>

        <section className="bg-white border border-gray-100 rounded-2xl p-4 space-y-2">
          <h2 className="font-black flex items-center gap-2 text-gray-800"><Package size={16} className="text-orange-500" /> Items (set qty 0 to remove)</h2>
          {items.length === 0 ? (
            <p className="text-xs text-gray-400">No items.</p>
          ) : items.map((it, i) => (
            <div key={i} className="flex items-center justify-between gap-3 py-2 border-b last:border-0">
              <div className="text-sm flex-1 truncate">{it.name || `Item ${i + 1}`}</div>
              <input type="number" min={0} max={99} value={it.qty}
                onChange={e => setQty(i, Number(e.target.value))}
                className="w-16 border rounded-lg px-2 py-1 text-sm text-center" />
            </div>
          ))}
          <p className="text-xs text-gray-400">Changes are subject to admin approval and stock availability.</p>
        </section>

        <section className="bg-white border border-gray-100 rounded-2xl p-4 space-y-2">
          <h2 className="font-black flex items-center gap-2 text-gray-800"><MessageSquare size={16} className="text-orange-500" /> Additional Notes</h2>
          <textarea className="w-full border rounded-xl px-3 py-2 text-sm" rows={3}
            placeholder="Anything we should know?"
            value={notes} onChange={e => setNotes(e.target.value)} />
        </section>

        {err && <p className="text-sm text-red-500">{err}</p>}

        <button type="submit" disabled={submitting}
          className="w-full bg-orange-500 text-white py-3 rounded-2xl font-black text-sm hover:bg-orange-600 disabled:opacity-50">
          {submitting ? 'Submitting…' : 'Submit Modification Request'}
        </button>
      </form>
    </div>
  );
}
