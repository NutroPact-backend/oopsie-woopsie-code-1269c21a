// @ts-nocheck
import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { TrendingUp, Target, DollarSign, MousePointerClick } from 'lucide-react';
import { getRoasBreakdown } from '@/lib/admin-phase3.functions';
import { TabHelp } from './_TabHelp';

const CHANNEL_COLORS: Record<string, string> = {
  google: '#4285F4', facebook: '#1877F2', instagram: '#E4405F',
  whatsapp: '#25D366', email: '#F97316', organic: '#10B981',
  other: '#9CA3AF', tiktok: '#000000', pinterest: '#E60023',
};

function fmt(n: number) {
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

export default function RoasDashboardTab() {
  const fn = useServerFn(getRoasBreakdown);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fn({}).then(setData).catch(console.error).finally(() => setLoading(false)); }, []);

  if (loading) return <div className="p-8 text-sm text-gray-400">Loading dashboard…</div>;
  if (!data) return <div className="p-8 text-sm text-red-500">Failed to load</div>;

  const channels = Object.entries(data.byChannel as Record<string, any>);
  const totalSpend = channels.reduce((s, [, c]) => s + c.spend, 0);
  const totalRev = channels.reduce((s, [, c]) => s + c.revenue, 0);
  const totalConv = channels.reduce((s, [, c]) => s + c.conversions, 0);
  const totalClicks = channels.reduce((s, [, c]) => s + c.clicks, 0);
  const roas = totalSpend > 0 ? totalRev / totalSpend : 0;
  const maxRev = Math.max(...channels.map(([, c]) => c.revenue), data.organicRevenue, 1);

  return (
    <div className="space-y-6 max-w-6xl">
      <TabHelp topic="roas" />
      <div>
        <h2 className="text-xl font-black">ROAS & Attribution</h2>
        <p className="text-sm text-gray-500">Last 30 days. Edit campaign spend/revenue in Marketing → UTM Builder.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI icon={<TrendingUp size={18} />} label="Overall ROAS" value={roas.toFixed(2) + 'x'} color="bg-green-500" />
        <KPI icon={<DollarSign size={18} />} label="Tracked Revenue" value={fmt(totalRev)} color="bg-orange-500" />
        <KPI icon={<Target size={18} />} label="Spend" value={fmt(totalSpend)} color="bg-red-500" />
        <KPI icon={<MousePointerClick size={18} />} label="Clicks → Conv" value={`${totalClicks.toLocaleString()} → ${totalConv}`} color="bg-blue-500" />
      </div>

      <section className="bg-white rounded-2xl border p-5">
        <h3 className="font-black mb-4">Revenue by Channel</h3>
        <div className="space-y-2">
          {[...channels, ['organic', { revenue: data.organicRevenue, spend: 0, clicks: 0, conversions: data.totalOrders }] as any]
            .sort((a, b) => b[1].revenue - a[1].revenue)
            .map(([ch, c]: any) => {
              const pct = (c.revenue / maxRev) * 100;
              const channelRoas = c.spend > 0 ? c.revenue / c.spend : null;
              return (
                <div key={ch}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold capitalize">{ch}</span>
                    <span className="text-gray-500">
                      {fmt(c.revenue)} {channelRoas !== null && <span className="ml-2 font-bold text-green-600">{channelRoas.toFixed(2)}x</span>}
                    </span>
                  </div>
                  <div className="h-6 bg-gray-100 rounded-lg overflow-hidden">
                    <div className="h-full rounded-lg transition-all" style={{ width: `${pct}%`, background: CHANNEL_COLORS[ch] || '#9CA3AF' }} />
                  </div>
                </div>
              );
            })}
        </div>
      </section>

      <section className="bg-white rounded-2xl border p-5">
        <h3 className="font-black mb-4">Server-side Conversions (30d)</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(data.eventsByChannel as Record<string, number>).length === 0
            ? <p className="text-sm text-gray-400 col-span-full">No events yet. Conversions flow in as CAPI/GA4 fires.</p>
            : Object.entries(data.eventsByChannel as Record<string, number>).map(([ch, n]) => (
              <div key={ch} className="border rounded-xl p-3">
                <p className="text-xs text-gray-500 uppercase">{ch}</p>
                <p className="text-2xl font-black">{n}</p>
              </div>
            ))}
        </div>
      </section>

      <section className="bg-white rounded-2xl border overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50 font-bold text-sm">Campaign Performance</div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b text-xs text-gray-500">
            <tr>
              <th className="text-left px-4 py-2">Campaign</th>
              <th className="text-left px-4 py-2">Channel</th>
              <th className="text-right px-4 py-2">Spend</th>
              <th className="text-right px-4 py-2">Revenue</th>
              <th className="text-right px-4 py-2">ROAS</th>
              <th className="text-right px-4 py-2">Conv</th>
            </tr>
          </thead>
          <tbody>
            {(data.campaigns || []).length === 0 ? (
              <tr><td colSpan={6} className="text-center text-gray-400 py-6 text-sm">No campaigns yet.</td></tr>
            ) : data.campaigns.map((c: any) => {
              const r = Number(c.spend) > 0 ? Number(c.revenue) / Number(c.spend) : 0;
              return (
                <tr key={c.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-2 font-bold">{c.name}</td>
                  <td className="px-4 py-2 text-xs text-gray-500 capitalize">{c.channel || 'other'}</td>
                  <td className="px-4 py-2 text-right">{fmt(c.spend)}</td>
                  <td className="px-4 py-2 text-right">{fmt(c.revenue)}</td>
                  <td className={`px-4 py-2 text-right font-bold ${r >= 2 ? 'text-green-600' : r >= 1 ? 'text-amber-600' : 'text-red-600'}`}>{r.toFixed(2)}x</td>
                  <td className="px-4 py-2 text-right">{c.conversions || 0}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function KPI({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="bg-white rounded-2xl p-4 border flex items-center gap-3">
      <div className={`w-10 h-10 ${color} text-white rounded-xl flex items-center justify-center`}>{icon}</div>
      <div><p className="text-xs text-gray-500">{label}</p><p className="text-lg font-black">{value}</p></div>
    </div>
  );
}
