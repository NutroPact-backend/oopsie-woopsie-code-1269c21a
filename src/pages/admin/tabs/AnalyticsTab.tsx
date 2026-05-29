// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatPrice } from '@/lib/utils';
import { TrendingUp, ShoppingBag, Users, IndianRupee, Package, AlertCircle } from 'lucide-react';
import { TabHelp } from './_TabHelp';

type Order = {
  order_number: string; total: number; subtotal: number | null; discount: number | null;
  order_status: string; payment_status: string; payment_method: string | null;
  customer_email: string | null; user_id: string | null; items: any[];
  created_at: string;
};
type Range = 7 | 30 | 90 | 365;

const RANGES: { v: Range; label: string }[] = [
  { v: 7, label: '7 days' }, { v: 30, label: '30 days' }, { v: 90, label: '90 days' }, { v: 365, label: '1 year' },
];

function dayKey(d: Date) { return d.toISOString().slice(0, 10); }

export default function AnalyticsTab() {
  const [range, setRange] = useState<Range>(30);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const since = new Date(Date.now() - range * 86400000).toISOString();
    supabase
      .from('orders')
      .select('order_number,total,subtotal,discount,order_status,payment_status,payment_method,customer_email,user_id,items,created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(1000)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) { setOrders([]); }
        else { setOrders((data || []) as any); }
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [range]);

  const stats = useMemo(() => {
    const paid = orders.filter(o => o.payment_status === 'paid' || o.payment_method === 'cod');
    const revenue = paid.reduce((a, o) => a + Number(o.total || 0), 0);
    const orderCount = orders.length;
    const aov = orderCount ? revenue / orderCount : 0;
    const uniqueCustomers = new Set(orders.map(o => o.user_id || o.customer_email).filter(Boolean)).size;
    const cancelled = orders.filter(o => o.order_status === 'cancelled').length;
    const delivered = orders.filter(o => o.order_status === 'delivered').length;
    const pending = orders.filter(o => ['pending', 'confirmed', 'processing'].includes(o.order_status)).length;
    const shipped = orders.filter(o => ['shipped', 'out_for_delivery'].includes(o.order_status)).length;

    // status breakdown
    const statusMap: Record<string, number> = {};
    orders.forEach(o => { statusMap[o.order_status] = (statusMap[o.order_status] || 0) + 1; });

    // top products
    const prodMap: Record<string, { name: string; qty: number; revenue: number }> = {};
    orders.forEach(o => {
      (o.items || []).forEach((it: any) => {
        const id = it.productId || it.id || it.name;
        if (!id) return;
        if (!prodMap[id]) prodMap[id] = { name: it.name || id, qty: 0, revenue: 0 };
        prodMap[id].qty += Number(it.quantity || 1);
        prodMap[id].revenue += Number(it.price || 0) * Number(it.quantity || 1);
      });
    });
    const topProducts = Object.values(prodMap).sort((a, b) => b.revenue - a.revenue).slice(0, 8);

    // payment method breakdown
    const pmMap: Record<string, number> = {};
    orders.forEach(o => { const k = o.payment_method || 'unknown'; pmMap[k] = (pmMap[k] || 0) + 1; });

    // daily series
    const series: { day: string; rev: number; count: number }[] = [];
    for (let i = range - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      series.push({ day: dayKey(d), rev: 0, count: 0 });
    }
    const idx: Record<string, number> = {};
    series.forEach((s, i) => { idx[s.day] = i; });
    paid.forEach(o => {
      const k = dayKey(new Date(o.created_at));
      if (idx[k] !== undefined) { series[idx[k]].rev += Number(o.total || 0); series[idx[k]].count += 1; }
    });

    return { revenue, orderCount, aov, uniqueCustomers, cancelled, delivered, pending, shipped, statusMap, topProducts, pmMap, series, paid: paid.length };
  }, [orders, range]);

  const maxRev = Math.max(1, ...stats.series.map(s => s.rev));

  return (
    <div className="space-y-6">
      <TabHelp topic="analytics" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black">Order Analytics</h2>
          <p className="text-sm text-gray-500 mt-0.5">Real-time business insights from your orders</p>
        </div>
        <div className="flex gap-1 bg-white border rounded-xl p-1">
          {RANGES.map(r => (
            <button key={r.v} onClick={() => setRange(r.v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${range === r.v ? 'bg-orange-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPI icon={<IndianRupee size={20} className="text-green-600" />} label="Revenue (paid)" value={formatPrice(stats.revenue)} sub={`${stats.paid} paid orders`} color="bg-green-50" />
            <KPI icon={<ShoppingBag size={20} className="text-orange-600" />} label="Orders" value={stats.orderCount} sub={`${stats.cancelled} cancelled`} color="bg-orange-50" />
            <KPI icon={<TrendingUp size={20} className="text-blue-600" />} label="Avg Order Value" value={formatPrice(Math.round(stats.aov))} sub="per order" color="bg-blue-50" />
            <KPI icon={<Users size={20} className="text-purple-600" />} label="Customers" value={stats.uniqueCustomers} sub="unique buyers" color="bg-purple-50" />
            <KPI icon={<Package size={20} className="text-emerald-600" />} label="Delivered" value={stats.delivered} sub="completed" color="bg-emerald-50" />
            <KPI icon={<Package size={20} className="text-cyan-600" />} label="In Transit" value={stats.shipped} sub="shipped / OFD" color="bg-cyan-50" />
            <KPI icon={<Package size={20} className="text-yellow-600" />} label="Pending" value={stats.pending} sub="to process" color="bg-yellow-50" />
            <KPI icon={<AlertCircle size={20} className="text-red-600" />} label="Cancelled" value={stats.cancelled} sub={stats.orderCount ? `${((stats.cancelled / stats.orderCount) * 100).toFixed(1)}% rate` : '—'} color="bg-red-50" />
          </div>

          {/* Revenue trend chart (lightweight SVG bars) */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black">Revenue Trend</h3>
              <span className="text-xs text-gray-400">Last {range} days</span>
            </div>
            {stats.series.every(s => s.rev === 0) ? (
              <p className="text-sm text-gray-400 py-8 text-center">No paid orders in this period.</p>
            ) : (
              <div className="overflow-x-auto">
                <div className="flex items-end gap-1 h-40 min-w-full" style={{ minWidth: stats.series.length * 12 }}>
                  {stats.series.map(s => {
                    const h = Math.max(2, (s.rev / maxRev) * 100);
                    return (
                      <div key={s.day} className="flex-1 group relative" title={`${s.day}: ${formatPrice(s.rev)} (${s.count} orders)`}>
                        <div className="bg-orange-400 hover:bg-orange-500 rounded-t transition" style={{ height: `${h}%` }} />
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between text-[10px] text-gray-400 mt-2">
                  <span>{stats.series[0]?.day}</span>
                  <span>Peak: {formatPrice(maxRev)}</span>
                  <span>{stats.series[stats.series.length - 1]?.day}</span>
                </div>
              </div>
            )}
          </div>

          {/* Top products + Status breakdown */}
          <div className="grid lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-black mb-4">Top Products by Revenue</h3>
              {stats.topProducts.length === 0 ? (
                <p className="text-sm text-gray-400">No products sold yet.</p>
              ) : (
                <div className="space-y-3">
                  {stats.topProducts.map((p, i) => {
                    const max = stats.topProducts[0].revenue;
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="font-semibold truncate flex-1 mr-2">{i + 1}. {p.name}</span>
                          <span className="font-bold text-green-600 shrink-0">{formatPrice(p.revenue)}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div className="bg-gradient-to-r from-orange-400 to-orange-500 h-full" style={{ width: `${(p.revenue / max) * 100}%` }} />
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{p.qty} units sold</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-black mb-4">Order Status Breakdown</h3>
              {Object.keys(stats.statusMap).length === 0 ? (
                <p className="text-sm text-gray-400">No orders in this period.</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(stats.statusMap).sort((a, b) => b[1] - a[1]).map(([status, count]) => {
                    const pct = (count / stats.orderCount) * 100;
                    return (
                      <div key={status}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="font-semibold capitalize">{status.replace(/_/g, ' ')}</span>
                          <span className="text-gray-500">{count} ({pct.toFixed(0)}%)</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div className={`h-full ${statusColor(status)}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <h3 className="font-black mt-6 mb-3">Payment Methods</h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(stats.pmMap).map(([m, c]) => (
                  <span key={m} className="px-3 py-1.5 bg-gray-100 rounded-full text-xs font-bold">
                    <span className="uppercase">{m}</span>: {c}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function KPI({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: any; sub?: string; color: string }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-start gap-4">
      <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center shrink-0`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-2xl font-black truncate">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function statusColor(s: string) {
  if (s === 'delivered') return 'bg-green-500';
  if (s === 'cancelled') return 'bg-red-500';
  if (s === 'shipped' || s === 'out_for_delivery') return 'bg-cyan-500';
  if (s === 'pending') return 'bg-yellow-500';
  return 'bg-orange-400';
}
