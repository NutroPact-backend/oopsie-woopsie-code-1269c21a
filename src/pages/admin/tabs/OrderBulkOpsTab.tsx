// @ts-nocheck
import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Clock, CheckSquare, Square, Download, Zap, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { bulkUpdateOrderStatus, getOrderTimeline } from '@/lib/admin-phase3.functions';
import { TabHelp } from './_TabHelp';

const STATUSES = ['pending', 'confirmed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'];

function toCSV(rows: any[]): string {
  if (!rows?.length) return '';
  const cols = Array.from(new Set(rows.flatMap(r => Object.keys(r || {}))));
  const esc = (v: any) => { if (v == null) return ''; const s = typeof v === 'object' ? JSON.stringify(v) : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return [cols.join(','), ...rows.map(r => cols.map(c => esc(r[c])).join(','))].join('\n');
}

export default function OrderBulkOpsTab() {
  const bulk = useServerFn(bulkUpdateOrderStatus);
  const timelineFn = useServerFn(getOrderTimeline);

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [bulkStatus, setBulkStatus] = useState('confirmed');
  const [busy, setBusy] = useState(false);

  const [timelineOrder, setTimelineOrder] = useState<any>(null);
  const [timelineEvents, setTimelineEvents] = useState<any[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('orders').select('order_number,customer_name,customer_phone,total,order_status,payment_status,created_at')
      .order('created_at', { ascending: false }).limit(500);
    setOrders(data || []); setSelected(new Set()); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = orders.filter(o => {
    if (statusFilter && o.order_status !== statusFilter) return false;
    if (filter && !(`${o.order_number} ${o.customer_name || ''} ${o.customer_phone || ''}`.toLowerCase().includes(filter.toLowerCase()))) return false;
    return true;
  });

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(o => o.order_number)));
  };
  const toggle = (n: string) => { const next = new Set(selected); next.has(n) ? next.delete(n) : next.add(n); setSelected(next); };

  const runBulk = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Update ${selected.size} order(s) → ${bulkStatus}?`)) return;
    setBusy(true);
    try {
      await bulk({ data: { orderNumbers: Array.from(selected), status: bulkStatus } });
      await load();
    } catch (e: any) { alert(e?.message || 'Bulk failed'); }
    setBusy(false);
  };

  const downloadCsv = () => {
    const rows = selected.size > 0 ? filtered.filter(o => selected.has(o.order_number)) : filtered;
    const blob = new Blob([toCSV(rows)], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `orders-${Date.now()}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  };

  const openTimeline = async (orderNumber: string) => {
    setTimelineOrder({ order_number: orderNumber });
    setTimelineLoading(true); setTimelineEvents([]);
    try {
      const r: any = await timelineFn({ data: { orderNumber } });
      setTimelineOrder(r.order); setTimelineEvents(r.events || []);
    } catch (e: any) { alert(e?.message); }
    setTimelineLoading(false);
  };

  return (
    <div className="space-y-4 max-w-6xl">
      <TabHelp topic="orderBulkOps" />
      <div>
        <h2 className="text-xl font-black flex items-center gap-2"><Zap size={20} className="text-orange-500" /> Bulk Order Ops + Timeline</h2>
        <p className="text-sm text-gray-500">Filter, bulk-update status, export selected to CSV, or open the full event timeline for any order.</p>
      </div>

      <div className="bg-white rounded-2xl border p-3 flex flex-wrap gap-2 items-center">
        <input placeholder="Search order # / customer / phone" value={filter} onChange={e => setFilter(e.target.value)}
          className="flex-1 min-w-48 border rounded-lg px-3 py-2 text-sm" />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={bulkStatus} onChange={e => setBulkStatus(e.target.value)} className="border rounded-lg px-3 py-2 text-sm bg-orange-50">
          {STATUSES.map(s => <option key={s} value={s}>→ {s}</option>)}
        </select>
        <button disabled={!selected.size || busy} onClick={runBulk}
          className="px-3 py-2 bg-gray-900 text-white rounded-lg text-sm font-bold disabled:opacity-30">
          Apply to {selected.size}
        </button>
        <button onClick={downloadCsv} className="px-3 py-2 bg-white border rounded-lg text-sm font-bold flex items-center gap-1 hover:bg-gray-50">
          <Download size={13} /> CSV
        </button>
      </div>

      <div className="bg-white rounded-2xl border overflow-hidden">
        {loading ? <div className="p-8 text-center text-sm text-gray-400">Loading…</div> : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b text-xs text-gray-500">
              <tr>
                <th className="px-3 py-2 w-8"><button onClick={toggleAll}>{selected.size === filtered.length && filtered.length > 0 ? <CheckSquare size={15} /> : <Square size={15} />}</button></th>
                <th className="text-left px-3 py-2">Order #</th>
                <th className="text-left px-3 py-2">Customer</th>
                <th className="text-right px-3 py-2">Total</th>
                <th className="text-center px-3 py-2">Status</th>
                <th className="text-right px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(o => (
                <tr key={o.order_number} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-3 py-2"><button onClick={() => toggle(o.order_number)}>{selected.has(o.order_number) ? <CheckSquare size={15} className="text-orange-500" /> : <Square size={15} className="text-gray-300" />}</button></td>
                  <td className="px-3 py-2 font-mono font-bold text-orange-600">{o.order_number}</td>
                  <td className="px-3 py-2">{o.customer_name || '—'}<br /><span className="text-xs text-gray-400">{o.customer_phone}</span></td>
                  <td className="px-3 py-2 text-right font-bold">₹{Number(o.total).toLocaleString()}</td>
                  <td className="px-3 py-2 text-center"><span className="text-[11px] bg-gray-100 rounded-full px-2 py-0.5 font-bold capitalize">{(o.order_status || '').replace(/_/g, ' ')}</span></td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => openTimeline(o.order_number)} className="text-xs text-orange-500 font-bold hover:underline inline-flex items-center gap-1">
                      <Clock size={12} /> Timeline
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={6} className="text-center text-gray-400 py-6 text-sm">No orders match.</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {timelineOrder && (
        <div className="fixed inset-0 bg-black/40 z-50 flex justify-end" onClick={() => setTimelineOrder(null)}>
          <div onClick={e => e.stopPropagation()} className="w-full max-w-lg bg-white h-full overflow-y-auto p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs text-gray-400">Timeline</p>
                <p className="font-mono font-black text-lg">{timelineOrder.order_number}</p>
              </div>
              <button onClick={() => setTimelineOrder(null)} className="text-gray-400 hover:text-gray-900">✕</button>
            </div>

            {timelineLoading ? <p className="text-sm text-gray-400">Loading…</p> : (
              <div className="space-y-3">
                {timelineEvents.length === 0 && <p className="text-sm text-gray-400">No events yet.</p>}
                {timelineEvents.map((e, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 rounded-full bg-orange-500 ring-4 ring-orange-100 mt-1.5" />
                      {i < timelineEvents.length - 1 && <div className="w-0.5 flex-1 bg-gray-200 my-1" />}
                    </div>
                    <div className="flex-1 pb-3">
                      <p className="text-[11px] text-gray-400">{new Date(e.t).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                      <p className="text-sm font-bold capitalize">{e.label}</p>
                      {e.meta?.awb && <p className="text-xs text-gray-500">AWB: <span className="font-mono">{e.meta.awb}</span></p>}
                      {e.meta?.total && <p className="text-xs text-gray-500">Total: ₹{Number(e.meta.total).toLocaleString()}</p>}
                      {e.meta?.note && <p className="text-xs text-gray-600 italic">"{e.meta.note}"</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
