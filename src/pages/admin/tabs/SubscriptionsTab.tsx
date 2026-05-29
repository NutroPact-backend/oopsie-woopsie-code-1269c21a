// @ts-nocheck
import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import {
  adminListSubscriptions, adminUpdateSubscription, adminRunSubscriptionNow,
} from '@/lib/subscriptions.functions';
import { RefreshCw, PlayCircle, Pause, Play, X, Repeat } from 'lucide-react';
import { TabHelp } from './_TabHelp';
import { useBulkSelection, BulkActionBar, SelectCheckbox, runForEach } from '@/pages/admin/components/BulkSelect';

const STATUSES = ['active', 'paused', 'cancelled', 'expired'] as const;

export default function SubscriptionsTab() {
  const list = useServerFn(adminListSubscriptions);
  const upd = useServerFn(adminUpdateSubscription);
  const runNow = useServerFn(adminRunSubscriptionNow);

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('active');

  const load = async () => {
    setLoading(true);
    try {
      const r: any = await list({ data: { status: filter || undefined } });
      setRows(r?.rows || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  const setStatus = async (id: string, status: string) => {
    try { await upd({ data: { id, status: status as any } }); load(); }
    catch (e: any) { alert(e?.message); }
  };

  const trigger = async (id: string) => {
    if (!confirm('Create order from this subscription right now?')) return;
    try {
      const r: any = await runNow({ data: { id } });
      alert(`Order created: ${r.orderNumber}`);
      load();
    } catch (e: any) { alert(e?.message); }
  };

  const stats = {
    active: rows.filter(r => r.status === 'active').length,
    paused: rows.filter(r => r.status === 'paused').length,
    mrr: rows.filter(r => r.status === 'active')
      .reduce((s, r) => s + (Number(r.unit_price) * r.qty * (1 - r.discount_percent / 100)) * (30 / r.interval_days), 0),
  };

  const bulk = useBulkSelection(rows, (r: any) => r.id);


  return (
    <div className="space-y-6 max-w-5xl">
      <TabHelp topic="subscriptions" />
      <div>
        <h2 className="text-xl font-black flex items-center gap-2"><Repeat size={20} className="text-orange-500" /> Subscriptions</h2>
        <p className="text-sm text-gray-500">Recurring orders — auto-created at each interval.</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl p-4 border"><p className="text-xs text-gray-500">Active</p><p className="text-2xl font-black">{stats.active}</p></div>
        <div className="bg-white rounded-2xl p-4 border"><p className="text-xs text-gray-500">Paused</p><p className="text-2xl font-black">{stats.paused}</p></div>
        <div className="bg-white rounded-2xl p-4 border"><p className="text-xs text-gray-500">Est. MRR</p><p className="text-2xl font-black">₹{Math.round(stats.mrr)}</p></div>
      </div>

      <section className="bg-white rounded-2xl p-5 border border-gray-100 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="font-black text-gray-800">All Subscriptions</h3>
          <div className="flex gap-2 items-center">
            <select value={filter} onChange={e => setFilter(e.target.value)} className="border rounded-lg px-2 py-1.5 text-xs bg-white">
              <option value="">All statuses</option>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button type="button" onClick={load} className="text-gray-500 hover:text-gray-800"><RefreshCw size={14} /></button>
          </div>
        </div>

        {loading ? (
          <div className="text-sm text-gray-400">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-gray-400 text-center py-8">No subscriptions yet.</div>
        ) : (
          <>
            <BulkActionBar
              count={bulk.count}
              ids={[...bulk.selected]}
              onClear={bulk.clear}
              actions={[
                { key: 'pause', label: 'Pause', color: 'bg-yellow-600 hover:bg-yellow-700', confirm: 'Pause {n} subscription(s)?', run: async (ids) => { await runForEach(ids, (id) => upd({ data: { id, status: 'paused' as any } })); load(); } },
                { key: 'resume', label: 'Resume', color: 'bg-green-600 hover:bg-green-700', confirm: 'Resume {n} subscription(s)?', run: async (ids) => { await runForEach(ids, (id) => upd({ data: { id, status: 'active' as any } })); load(); } },
                { key: 'cancel', label: 'Cancel', color: 'bg-red-600 hover:bg-red-700', confirm: 'Cancel {n} subscription(s)? This cannot be undone.', run: async (ids) => { await runForEach(ids, (id) => upd({ data: { id, status: 'cancelled' as any } })); load(); } },
              ]}
            />
            <label className="flex items-center gap-2 text-xs font-bold text-gray-500 mb-1">
              <SelectCheckbox checked={bulk.allSelected} indeterminate={bulk.someSelected} onChange={bulk.toggleAll} />
              Select all ({rows.length})
            </label>
          <div className="divide-y">
            {rows.map(r => {
              const due = new Date(r.next_run_at).getTime() <= Date.now();
              return (
                <div key={r.id} className="py-3 space-y-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex gap-2">
                      <div className="pt-1"><SelectCheckbox checked={bulk.isSelected(r.id)} onChange={() => bulk.toggleOne(r.id)} /></div>
                      <div>
                      <div className="font-bold text-sm">{r.product_name} <span className="text-gray-400">× {r.qty}</span></div>
                      <div className="text-xs text-gray-500">{r.customer_name || r.customer_email || '—'} · every {r.interval_days}d · {r.discount_percent}% off</div>
                      <div className="text-xs text-gray-400">Next: {new Date(r.next_run_at).toLocaleString()} {due && r.status === 'active' && <span className="text-orange-600 font-bold">· DUE</span>}</div>
                      <div className="text-[11px] text-gray-400">{r.runs_count} runs · last: {r.last_order_number || '—'}</div>
                      </div>
                    </div>
                    <div className="flex gap-1.5 items-center flex-wrap">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        r.status === 'active' ? 'bg-green-100 text-green-700'
                        : r.status === 'paused' ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-600'
                      }`}>{r.status}</span>
                      {r.status === 'active' && <button type="button" onClick={() => setStatus(r.id, 'paused')} className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1"><Pause size={11} />Pause</button>}
                      {r.status === 'paused' && <button type="button" onClick={() => setStatus(r.id, 'active')} className="bg-green-100 text-green-700 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1"><Play size={11} />Resume</button>}
                      {r.status !== 'cancelled' && <button type="button" onClick={() => setStatus(r.id, 'cancelled')} className="bg-red-50 text-red-600 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1"><X size={11} />Cancel</button>}
                      <button type="button" onClick={() => trigger(r.id)} className="bg-orange-500 text-white px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1"><PlayCircle size={11} />Run now</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          </>
        )}
      </section>
    </div>
  );
}
