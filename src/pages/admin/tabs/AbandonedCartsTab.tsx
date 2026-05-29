// @ts-nocheck
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ShoppingCart, Mail, MessageSquare, Trash2, Send, Search, ExternalLink, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { useBulkSelection, BulkActionBar, SelectCheckbox, runForEach } from '@/pages/admin/components/BulkSelect';

type Cart = {
  id: string;
  user_id: string | null;
  customer_email: string;
  customer_phone: string;
  customer_name: string;
  items: any[];
  subtotal: number;
  item_count: number;
  status: 'active' | 'notified' | 'recovered' | 'expired';
  last_activity_at: string;
  notified_at: string | null;
  notify_count: number;
  recovered_at: string | null;
  recovered_order_number: string | null;
  recovery_token: string;
  created_at: string;
};

type Filter = 'active' | 'notified' | 'recovered' | 'expired' | 'all';

export default function AbandonedCartsTab() {
  const [rows, setRows] = useState<Cart[]>([]);
  const [filter, setFilter] = useState<Filter>('active');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('abandoned_carts')
      .select('*')
      .order('last_activity_at', { ascending: false })
      .limit(500);
    setRows((data as any[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const remove = async (c: Cart) => {
    if (!confirm('Delete this abandoned cart record?')) return;
    await supabase.from('abandoned_carts').delete().eq('id', c.id);
    setRows(rs => rs.filter(x => x.id !== c.id));
  };

  const notify = async (c: Cart) => {
    setBusy(c.id);
    try {
      const link = `${window.location.origin}/cart?recover=${encodeURIComponent(c.recovery_token)}`;
      const itemsLabel = c.items?.slice(0, 3).map((i: any) => i.name).join(', ') || 'your selection';
      const more = (c.items?.length ?? 0) > 3 ? ` +${c.items.length - 3} more` : '';
      const body = `Aapne ${itemsLabel}${more} cart me chhoda tha. Wapas aaiye — abhi complete kijiye!`;
      const payload = { cartId: c.id, customerName: c.customer_name, itemCount: c.item_count, subtotal: c.subtotal, items: itemsLabel, link };

      if (c.user_id) {
        await supabase.from('user_notifications').insert({
          user_id: c.user_id,
          title: '🛒 Aapka cart wait kar raha hai',
          body, type: 'info', link: '/cart',
        });
      }
      if (c.customer_email) {
        await supabase.from('notification_queue').insert({
          user_id: c.user_id, channel: 'email', template: 'abandoned_cart',
          recipient: c.customer_email, payload,
        });
      }
      if (c.customer_phone) {
        await supabase.from('notification_queue').insert({
          user_id: c.user_id, channel: 'whatsapp', template: 'abandoned_cart',
          recipient: c.customer_phone, payload, status: 'pending_external',
        });
      }
      await supabase.from('abandoned_carts').update({
        status: 'notified',
        notified_at: new Date().toISOString(),
        notify_count: (c.notify_count ?? 0) + 1,
      }).eq('id', c.id);
      await load();
    } catch (e: any) {
      alert('Notify failed: ' + (e?.message ?? 'unknown'));
    }
    setBusy(null);
  };

  const filtered = rows.filter(r => {
    if (filter !== 'all' && r.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!`${r.customer_name} ${r.customer_email} ${r.customer_phone}`.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const bulk = useBulkSelection(filtered, (c) => c.id);

  const counts = {
    active: rows.filter(r => r.status === 'active').length,
    notified: rows.filter(r => r.status === 'notified').length,
    recovered: rows.filter(r => r.status === 'recovered').length,
    expired: rows.filter(r => r.status === 'expired').length,
  };
  const totalValue = rows.filter(r => ['active', 'notified'].includes(r.status)).reduce((s, r) => s + Number(r.subtotal || 0), 0);
  const recoveredValue = rows.filter(r => r.status === 'recovered').reduce((s, r) => s + Number(r.subtotal || 0), 0);
  const recoveryRate = (counts.recovered + counts.notified) > 0
    ? ((counts.recovered / (counts.recovered + counts.notified)) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-4">
      <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 text-sm text-orange-900">
        <p className="font-bold mb-1">🛒 Abandoned Cart Recovery</p>
        <p>Jab customer checkout tak pahuche but order place na kare, cart yaha save ho jaata hai.</p>
        <ul className="list-disc ml-5 mt-1 space-y-0.5 text-xs">
          <li><b>Auto cron</b>: har 15 min me 2+ ghante purane carts ko notify karta hai (in-app + email + whatsapp queue).</li>
          <li>Manually <b>Notify Now</b> button se bhej sakte ho.</li>
          <li>Customer order place kare to status auto <b>recovered</b> ho jata hai.</li>
          <li>72 ghante baad inactive cart auto <b>expired</b>.</li>
        </ul>
        <p className="text-xs mt-2 text-orange-800">
          ⚙️ Cron schedule karne ke liye: Database SQL me <code>cron.schedule</code> chala — endpoint: <code>/api/public/hooks/recover-carts</code>.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat label="Active" value={counts.active} color="bg-orange-50 text-orange-700" icon={<ShoppingCart size={16} />} />
        <Stat label="Notified" value={counts.notified} color="bg-blue-50 text-blue-700" icon={<Mail size={16} />} />
        <Stat label="Recovered" value={counts.recovered} color="bg-green-50 text-green-700" icon={<CheckCircle2 size={16} />} />
        <Stat label="Expired" value={counts.expired} color="bg-gray-100 text-gray-700" icon={<XCircle size={16} />} />
        <Stat label="Recovery %" value={recoveryRate + '%'} color="bg-purple-50 text-purple-700" icon={<Clock size={16} />} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <p className="text-xs text-gray-500 font-bold uppercase">Potential Revenue at Risk</p>
          <p className="text-2xl font-black text-orange-600 mt-1">₹{totalValue.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <p className="text-xs text-gray-500 font-bold uppercase">Recovered Revenue</p>
          <p className="text-2xl font-black text-green-600 mt-1">₹{recoveredValue.toLocaleString('en-IN')}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-gray-100 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 flex-wrap">
          {(['active', 'notified', 'recovered', 'expired', 'all'] as Filter[]).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg capitalize ${filter === f ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>
              {f}
            </button>
          ))}
        </div>
        <div className="flex-1 min-w-[200px] relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email, phone…"
            className="w-full pl-9 pr-3 py-2 border rounded-xl text-sm focus:outline-none focus:border-orange-400" />
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">No carts in this view.</div>
      ) : (
        <div className="space-y-3">
          <BulkActionBar
            count={bulk.count}
            ids={[...bulk.selected]}
            onClear={bulk.clear}
            actions={[
              { key: 'notify', label: 'Notify Now', color: 'bg-orange-600 hover:bg-orange-700', confirm: 'Send recovery notification to {n} cart(s)?', run: async (ids) => { await runForEach(ids, async (id) => { const c = filtered.find(x => x.id === id); if (c && ['active', 'notified'].includes(c.status)) await notify(c); }); load(); } },
              { key: 'expire', label: 'Mark Expired', color: 'bg-gray-600 hover:bg-gray-700', confirm: 'Mark {n} cart(s) as expired?', run: async (ids) => { await runForEach(ids, async (id) => { await supabase.from('abandoned_carts').update({ status: 'expired' }).eq('id', id); }); load(); } },
              { key: 'del', label: 'Delete', color: 'bg-red-600 hover:bg-red-700', confirm: 'Delete {n} cart record(s)? This cannot be undone.', run: async (ids) => { await runForEach(ids, async (id) => { await supabase.from('abandoned_carts').delete().eq('id', id); }); load(); } },
            ]}
          />
          <label className="flex items-center gap-2 text-xs font-bold text-gray-500 px-2">
            <SelectCheckbox checked={bulk.allSelected} indeterminate={bulk.someSelected} onChange={bulk.toggleAll} />
            Select all ({filtered.length})
          </label>
          {filtered.map(c => {
            const hrsAgo = Math.round((Date.now() - new Date(c.last_activity_at).getTime()) / 3600_000);
            return (
              <div key={c.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col md:flex-row gap-4">
                <div className="pt-1 md:pt-0"><SelectCheckbox checked={bulk.isSelected(c.id)} onChange={() => bulk.toggleOne(c.id)} /></div>
                <div className="md:w-56 shrink-0">
                  <p className="font-bold text-sm truncate">{c.customer_name || 'Guest'}</p>
                  {c.customer_email && <p className="text-xs text-gray-500 truncate flex items-center gap-1"><Mail size={11} />{c.customer_email}</p>}
                  {c.customer_phone && <p className="text-xs text-gray-500 truncate flex items-center gap-1"><MessageSquare size={11} />{c.customer_phone}</p>}
                  <p className="text-[11px] text-gray-400 mt-1">{hrsAgo}h ago · {c.item_count} item{c.item_count !== 1 ? 's' : ''}</p>
                  <StatusPill status={c.status} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-orange-600 text-lg">₹{Number(c.subtotal).toLocaleString('en-IN')}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {c.items?.slice(0, 4).map((it: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg px-2 py-1 text-xs">
                        {it.image && <img src={it.image} alt="" className="w-6 h-6 rounded object-cover" loading="lazy" />}
                        <span className="font-semibold truncate max-w-[140px]">{it.name}</span>
                        <span className="text-gray-400">×{it.quantity}</span>
                      </div>
                    ))}
                    {(c.items?.length ?? 0) > 4 && <span className="text-xs text-gray-400 self-center">+{c.items.length - 4} more</span>}
                  </div>
                  {c.notify_count > 0 && (
                    <p className="text-[11px] text-gray-500 mt-2">
                      Notified {c.notify_count}× · last {c.notified_at ? new Date(c.notified_at).toLocaleString('en-IN') : '-'}
                    </p>
                  )}
                  {c.recovered_order_number && (
                    <a href={`/track-order?order=${c.recovered_order_number}`} target="_blank" rel="noreferrer"
                      className="text-[11px] text-green-700 font-bold mt-1 inline-flex items-center gap-1 hover:underline">
                      Recovered → {c.recovered_order_number} <ExternalLink size={10} />
                    </a>
                  )}
                </div>
                <div className="flex md:flex-col gap-2 md:w-36 shrink-0">
                  {['active', 'notified'].includes(c.status) && (
                    <button onClick={() => notify(c)} disabled={busy === c.id}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-bold bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 transition">
                      <Send size={14} /> {busy === c.id ? 'Sending…' : 'Notify Now'}
                    </button>
                  )}
                  <button onClick={() => remove(c)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100 transition">
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color, icon }: { label: string; value: number | string; color: string; icon: React.ReactNode }) {
  return (
    <div className={`rounded-2xl p-3 ${color}`}>
      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider opacity-80">{icon}{label}</div>
      <p className="text-2xl font-black mt-1">{value}</p>
    </div>
  );
}

function StatusPill({ status }: { status: Cart['status'] }) {
  const map: Record<Cart['status'], string> = {
    active: 'bg-orange-100 text-orange-700',
    notified: 'bg-blue-100 text-blue-700',
    recovered: 'bg-green-100 text-green-700',
    expired: 'bg-gray-200 text-gray-600',
  };
  return <span className={`inline-block mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${map[status]}`}>{status}</span>;
}
