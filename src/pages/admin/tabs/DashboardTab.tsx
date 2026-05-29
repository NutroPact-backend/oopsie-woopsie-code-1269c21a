/**
 * Enterprise admin dashboard — Amazon/MuscleBlaze-style at-a-glance overview.
 * Reads the same server aggregator powering scheduled reports, so what admins
 * see is exactly what gets emailed.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  TrendingUp, TrendingDown, ShoppingBag, IndianRupee, Users, Package,
  AlertCircle, Truck, CheckCircle2, Clock, Download, RefreshCw, ArrowRight,
  Smartphone, Monitor, Tablet, Repeat, UserPlus, Globe, Activity,
} from 'lucide-react';

import { getDashboardOverview } from '@/lib/reports.functions';
import { downloadBlob, toCSV, toXLS, fmtINR, fmtPct, delta } from '@/lib/reports.shared';
import { TabHelp } from './_TabHelp';

const RANGES = [
  { v: 1,   label: 'Today' },
  { v: 7,   label: '7d' },
  { v: 30,  label: '30d' },
  { v: 90,  label: '90d' },
  { v: 365, label: '1y' },
];

type Overview = Awaited<ReturnType<typeof getDashboardOverview>>;

export default function DashboardTab() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const load = async () => {
    setLoading(true); setErr('');
    try {
      const res = await getDashboardOverview({ data: { days } });
      setData(res as Overview);
    } catch (e: any) { setErr(e?.message || 'Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [days]);

  const maxRev = useMemo(
    () => Math.max(1, ...(data?.series ?? []).map(s => Math.max(s.rev, s.prevRev))),
    [data],
  );

  const exportCSV = () => {
    if (!data) return;
    const rows = data.series.map(s => ({ day: s.day, revenue: s.rev, orders: s.count, prev_revenue: s.prevRev }));
    downloadBlob(toCSV(rows), `dashboard-${days}d.csv`, 'text/csv');
  };
  const exportXLS = () => {
    if (!data) return;
    const rows = data.series.map(s => ({ Day: s.day, Revenue: s.rev, Orders: s.count, 'Prev Revenue': s.prevRev }));
    downloadBlob(toXLS(`Dashboard ${days}d`, rows), `dashboard-${days}d.xls`, 'application/vnd.ms-excel');
  };
  const printPDF = () => window.print();

  if (loading && !data) return <DashSkeleton />;
  if (err) return <div className="p-6 text-red-600 bg-red-50 rounded-2xl">{err}</div>;
  if (!data) return null;

  const k = data.kpis;

  return (
    <div className="space-y-6">
      <TabHelp topic="analytics" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black">Dashboard</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Live business overview · {new Date(data.period.from).toLocaleDateString('en-IN')} → {new Date(data.period.to).toLocaleDateString('en-IN')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 bg-white border rounded-xl p-1">
            {RANGES.map(r => (
              <button key={r.v} onClick={() => setDays(r.v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${days === r.v ? 'bg-orange-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                {r.label}
              </button>
            ))}
          </div>
          <button onClick={load} title="Refresh" className="p-2 bg-white border rounded-xl hover:bg-gray-50">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          <div className="flex gap-1">
            <button onClick={exportCSV} className="px-3 py-2 bg-white border rounded-xl text-xs font-bold hover:bg-gray-50 flex items-center gap-1">
              <Download size={13} /> CSV
            </button>
            <button onClick={exportXLS} className="px-3 py-2 bg-white border rounded-xl text-xs font-bold hover:bg-gray-50 flex items-center gap-1">
              <Download size={13} /> Excel
            </button>
            <button onClick={printPDF} className="px-3 py-2 bg-white border rounded-xl text-xs font-bold hover:bg-gray-50 flex items-center gap-1">
              <Download size={13} /> PDF
            </button>
          </div>
        </div>
      </div>
      {/* Today live strip */}
      {data.today && (
        <div className="grid sm:grid-cols-3 gap-4">
          <LiveCard icon={<Activity size={18} />} label="Aaj k orders" value={data.today.orders.toLocaleString('en-IN')} accent="from-orange-500 to-rose-500" />
          <LiveCard icon={<IndianRupee size={18} />} label="Aaj ki revenue" value={fmtINR(data.today.revenue)} accent="from-green-500 to-emerald-500" />
          <LiveCard icon={<Users size={18} />} label="Aaj k visitors" value={data.today.sessions.toLocaleString('en-IN')} accent="from-blue-500 to-cyan-500" />
        </div>
      )}

      {/* Actionables strip */}
      <Actionables a={data.actionables} />



      {/* Hero KPIs */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={<IndianRupee size={20} className="text-green-600" />} bg="bg-green-50"
          label="Revenue" value={fmtINR(k.revenue)} delta={delta(k.revenue, k.prevRevenue)} />
        <KpiCard icon={<ShoppingBag size={20} className="text-orange-600" />} bg="bg-orange-50"
          label="Orders" value={k.orderCount.toLocaleString('en-IN')} delta={delta(k.orderCount, k.prevOrderCount)} />
        <KpiCard icon={<TrendingUp size={20} className="text-blue-600" />} bg="bg-blue-50"
          label="Avg Order Value" value={fmtINR(k.aov)} delta={delta(k.aov, k.prevAov)} />
        <KpiCard icon={<Users size={20} className="text-purple-600" />} bg="bg-purple-50"
          label="Unique customers" value={k.customers.toLocaleString('en-IN')} delta={delta(k.customers, k.prevCustomers)} />
      </div>

      {/* Status pills */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MiniStat icon={<Package size={16} className="text-emerald-600" />} label="Delivered" value={k.delivered} tone="emerald" />
        <MiniStat icon={<Truck size={16} className="text-cyan-600" />} label="In Transit" value={k.shipped} tone="cyan" />
        <MiniStat icon={<Clock size={16} className="text-yellow-600" />} label="Pending" value={k.pending} tone="yellow" />
        <MiniStat icon={<AlertCircle size={16} className="text-red-600" />} label="Cancelled" value={k.cancelled}
          sub={k.orderCount ? `${((k.cancelled / k.orderCount) * 100).toFixed(1)}%` : '—'} tone="red" />
      </div>

      {/* Revenue trend with previous-period overlay */}
      <Card title="Revenue trend" subtitle={`Last ${days} days vs previous ${days} days`}>
        {data.series.every(s => s.rev === 0 && s.prevRev === 0) ? (
          <p className="text-sm text-gray-400 py-8 text-center">No paid orders in this period.</p>
        ) : (
          <div className="overflow-x-auto">
            <div className="flex items-end gap-1.5 h-44 min-w-full" style={{ minWidth: data.series.length * 14 }}>
              {data.series.map(s => {
                const h = Math.max(2, (s.rev / maxRev) * 100);
                const ph = Math.max(0, (s.prevRev / maxRev) * 100);
                return (
                  <div key={s.day} className="flex-1 group relative flex flex-col justify-end gap-0.5"
                    title={`${s.day}: ${fmtINR(s.rev)} (${s.count} orders) · prev ${fmtINR(s.prevRev)}`}>
                    {ph > 0 && <div className="bg-gray-200 rounded-t" style={{ height: `${ph}%`, opacity: 0.5 }} />}
                    <div className="bg-gradient-to-t from-orange-500 to-orange-400 rounded-t hover:from-orange-600 transition" style={{ height: `${h}%` }} />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-[10px] text-gray-400 mt-2">
              <span>{data.series[0]?.day}</span>
              <span className="flex items-center gap-3">
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-orange-500 rounded-sm" />Current</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-gray-300 rounded-sm" />Previous</span>
                <span>Peak {fmtINR(maxRev)}</span>
              </span>
              <span>{data.series[data.series.length - 1]?.day}</span>
            </div>
          </div>
        )}
      </Card>

      {/* Two-column lists */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Top products by revenue">
          <RankList items={data.topProducts.map((p: any) => ({ name: p.name, value: p.revenue, sub: `${p.qty} units` }))} />
        </Card>
        <Card title="Top categories">
          <RankList items={data.topCategories.map((c: any) => ({ name: c.key, value: c.revenue, sub: `${c.qty} units` }))} />
        </Card>
        <Card title="Top customers (by spend)">
          <RankList items={data.topCustomers.map((c: any) => ({ name: (c as any).name || (c as any).email || (c as any).key, value: (c as any).spend, sub: `${(c as any).orders} orders` }))} />
        </Card>
        <Card title="Top states">
          <RankList items={data.topStates.map((s: any) => ({ name: s.key, value: s.revenue, sub: `${s.orders} orders` }))} />
        </Card>
      </div>

      {/* Marketing funnel + coupons */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card title="Cart recovery funnel" className="lg:col-span-2">
          <div className="grid grid-cols-3 gap-3">
            <FunnelStep label="Abandoned" value={data.funnel.abandoned} color="bg-red-100 text-red-700" />
            <FunnelStep label="Recovered" value={data.funnel.recovered} color="bg-amber-100 text-amber-700" />
            <FunnelStep label="Orders" value={data.funnel.orders} color="bg-green-100 text-green-700" />
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <Mini label="Recovery rate" value={fmtPct(data.funnel.recoveryRate)} />
            <Mini label="Lost value" value={fmtINR(data.funnel.abandonedValue)} />
          </div>
        </Card>
        <Card title="Top coupons">
          {data.topCoupons.length === 0 ? <p className="text-sm text-gray-400">No coupon use yet.</p> : (
            <ul className="space-y-2 text-sm">
              {data.topCoupons.map((c: any) => (
                <li key={c.key} className="flex items-center justify-between">
                  <span className="font-mono font-bold text-orange-600">{c.key}</span>
                  <span className="text-gray-500">{c.uses} uses · {fmtINR(c.discount)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Inventory & recent orders */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card title={`Low stock (${data.inventory.lowCount})`}
          subtitle={data.inventory.outCount ? `${data.inventory.outCount} out of stock` : 'All in stock'}>
          {data.inventory.lowItems.length === 0 ? (
            <p className="text-sm text-gray-400">Everything looks healthy.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {data.inventory.lowItems.map((p: any) => (
                <li key={p.id} className="flex items-center justify-between">
                  <span className="truncate flex-1 mr-2">{p.name}</span>
                  <span className={`font-bold ${p.stock === 0 ? 'text-red-600' : 'text-amber-600'}`}>
                    {p.stock} / {p.threshold}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Recent orders">
          {data.recentOrders.length === 0 ? <p className="text-sm text-gray-400">No orders yet.</p> : (
            <ul className="divide-y">
              {data.recentOrders.map((o: any) => (
                <li key={o.order_number} className="py-2 flex items-center gap-3 text-sm">
                  <span className="font-mono text-xs text-gray-400 shrink-0">{o.order_number}</span>
                  <span className="flex-1 truncate">{o.customer_name || '—'}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${statusBadge(o.order_status)}`}>
                    {o.order_status}
                  </span>
                  <span className="font-bold text-green-700 shrink-0">{fmtINR(Number(o.total || 0))}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Visitor KPIs */}
      {data.visitors && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon={<Globe size={20} className="text-blue-600" />} bg="bg-blue-50"
            label="Sessions" value={data.visitors.sessions.toLocaleString('en-IN')} delta={delta(data.visitors.sessions, data.visitors.prevSessions)} />
          <KpiCard icon={<TrendingUp size={20} className="text-emerald-600" />} bg="bg-emerald-50"
            label="Conversion Rate" value={fmtPct(data.visitors.conversionRate)} delta={delta(data.visitors.conversionRate, data.visitors.prevConversionRate)} />
          <KpiCard icon={<UserPlus size={20} className="text-fuchsia-600" />} bg="bg-fuchsia-50"
            label="New customers" value={(data.cohorts?.newCust ?? 0).toLocaleString('en-IN')}
            sub={`${data.cohorts?.returningCust ?? 0} returning`} />
          <KpiCard icon={<Repeat size={20} className="text-amber-600" />} bg="bg-amber-50"
            label="Repeat rate" value={fmtPct(data.cohorts?.repeatRate ?? 0)}
            sub={`${data.cohorts?.repeatCust ?? 0} of ${data.cohorts?.totalCustEver ?? 0} ever`} />
        </div>
      )}

      {/* Traffic source + Device */}
      {data.visitors && (
        <div className="grid lg:grid-cols-2 gap-4">
          <Card title="Traffic source" subtitle="Unique sessions">
            {data.visitors.trafficSource.length === 0 ? (
              <p className="text-sm text-gray-400">No visitor data yet. Tracking starts now.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {data.visitors.trafficSource.slice(0, 8).map((t: any) => {
                  const max = data.visitors.trafficSource[0].sessions || 1;
                  return (
                    <li key={t.source}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold capitalize">{t.source}</span>
                        <span className="text-gray-500">{t.sessions}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-gradient-to-r from-blue-400 to-blue-600 h-full" style={{ width: `${(t.sessions / max) * 100}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
          <Card title="Device split" subtitle="Where visitors come from">
            <div className="grid grid-cols-3 gap-3">
              <DeviceStat icon={<Smartphone size={18} />} label="Mobile" value={data.visitors.deviceMap.mobile} />
              <DeviceStat icon={<Monitor size={18} />} label="Desktop" value={data.visitors.deviceMap.desktop} />
              <DeviceStat icon={<Tablet size={18} />} label="Tablet" value={data.visitors.deviceMap.tablet} />
            </div>
          </Card>
        </div>
      )}

      {/* Hour-of-day + day-of-week heatstrip */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Best hours" subtitle="Orders by hour of day">
          <HeatStrip data={data.hourMap.map((h, i) => ({ key: `${i}:00`, v: h.orders }))} />
        </Card>
        <Card title="Best weekdays" subtitle="Orders by day of week">
          <HeatStrip data={data.dowMap.map((d, i) => ({ key: ['S','M','T','W','T','F','S'][i], v: d.orders }))} />
        </Card>
      </div>

    </div>
  );
}

/* ─────────────────── Sub-components ─────────────────── */

function KpiCard({ icon, label, value, sub, delta: d, bg }: { icon: React.ReactNode; label: string; value: string; sub?: string; delta?: number; bg: string }) {
  const up = (d ?? 0) >= 0;
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-start gap-3">
        <div className={`w-11 h-11 ${bg} rounded-xl flex items-center justify-center shrink-0`}>{icon}</div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-black truncate">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
      </div>
      {d !== undefined && (
        <div className={`mt-3 inline-flex items-center gap-1 text-xs font-bold ${up ? 'text-green-600' : 'text-red-600'}`}>
          {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {fmtPct(Math.abs(d))} <span className="text-gray-400 font-normal">vs prev</span>
        </div>
      )}
    </div>
  );
}

function MiniStat({ icon, label, value, sub, tone }: { icon: React.ReactNode; label: string; value: any; sub?: string; tone: string }) {
  return (
    <div className={`bg-${tone}-50 border border-${tone}-100 rounded-2xl p-4 flex items-center gap-3`}>
      <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 truncate">{label}</p>
        <p className="text-lg font-black">{value}{sub && <span className="text-xs font-normal text-gray-400 ml-1">{sub}</span>}</p>
      </div>
    </div>
  );
}

function Card({ title, subtitle, children, className = '' }: { title: string; subtitle?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 p-5 ${className}`}>
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="font-black">{title}</h3>
        {subtitle && <span className="text-xs text-gray-400">{subtitle}</span>}
      </div>
      {children}
    </div>
  );
}

function RankList({ items }: { items: { name: string; value: number; sub?: string }[] }) {
  if (!items.length) return <p className="text-sm text-gray-400">No data yet.</p>;
  const max = Math.max(1, ...items.map(i => i.value));
  return (
    <div className="space-y-3">
      {items.map((it, i) => (
        <div key={i}>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="font-semibold truncate flex-1 mr-2">{i + 1}. {it.name}</span>
            <span className="font-bold text-green-700 shrink-0">{fmtINR(it.value)}</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
            <div className="bg-gradient-to-r from-orange-400 to-orange-500 h-full" style={{ width: `${(it.value / max) * 100}%` }} />
          </div>
          {it.sub && <p className="text-xs text-gray-400 mt-0.5">{it.sub}</p>}
        </div>
      ))}
    </div>
  );
}

/* ─────────────────── Sub-components ─────────────────── */

function LiveCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: string }) {
  return (
    <div className={`rounded-2xl p-4 text-white bg-gradient-to-r ${accent} shadow-sm flex items-center gap-3`}>
      <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">{icon}</div>
      <div>
        <p className="text-xs opacity-90">{label}</p>
        <p className="text-xl font-black">{value}</p>
      </div>
    </div>
  );
}

function DeviceStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3 text-center">
      <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center mx-auto text-gray-600 mb-1">{icon}</div>
      <p className="text-2xl font-black">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}

function Actionables({ a }: { a: any }) {
  const items = [
    { v: a.pendingOrders, label: 'Pending orders', tone: 'bg-yellow-50 text-yellow-700', icon: <Clock size={14} /> },
    { v: a.lowStock, label: 'Low stock', tone: 'bg-amber-50 text-amber-700', icon: <Package size={14} /> },
    { v: a.outOfStock, label: 'Out of stock', tone: 'bg-red-50 text-red-700', icon: <AlertCircle size={14} /> },
    { v: a.newContacts, label: 'New contacts', tone: 'bg-blue-50 text-blue-700', icon: <ArrowRight size={14} /> },
    { v: a.pendingQA, label: 'Pending Q&A', tone: 'bg-purple-50 text-purple-700', icon: <CheckCircle2 size={14} /> },
  ];
  const total = items.reduce((s, i) => s + i.v, 0);
  if (!total) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-3 flex flex-wrap gap-2">
      {items.filter(i => i.v > 0).map(i => (
        <span key={i.label} className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 ${i.tone}`}>
          {i.icon} {i.v} {i.label}
        </span>
      ))}
    </div>
  );
}

function FunnelStep({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`rounded-xl p-3 ${color}`}>
      <p className="text-xs font-bold uppercase opacity-80">{label}</p>
      <p className="text-2xl font-black">{value.toLocaleString('en-IN')}</p>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-black">{value}</p>
    </div>
  );
}

function HeatStrip({ data }: { data: { key: string; v: number }[] }) {
  const max = Math.max(1, ...data.map(d => d.v));
  return (
    <div className="flex gap-1">
      {data.map((d, i) => {
        const intensity = d.v / max;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1" title={`${d.key}: ${d.v} orders`}>
            <div className="w-full h-12 rounded" style={{ background: `rgba(249,115,22,${0.15 + intensity * 0.85})` }} />
            <span className="text-[9px] text-gray-400">{d.key}</span>
          </div>
        );
      })}
    </div>
  );
}

function statusBadge(s: string) {
  if (s === 'delivered') return 'bg-green-100 text-green-700';
  if (s === 'cancelled') return 'bg-red-100 text-red-700';
  if (s === 'shipped' || s === 'out_for_delivery') return 'bg-cyan-100 text-cyan-700';
  if (s === 'pending') return 'bg-yellow-100 text-yellow-700';
  return 'bg-gray-100 text-gray-600';
}

function DashSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-10 bg-gray-100 rounded-2xl animate-pulse" />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />)}
      </div>
      <div className="h-56 bg-gray-100 rounded-2xl animate-pulse" />
    </div>
  );
}
