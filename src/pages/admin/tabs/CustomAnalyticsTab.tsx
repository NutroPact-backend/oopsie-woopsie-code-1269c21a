// @ts-nocheck
/**
 * Custom analytics — builder + saved views + scheduled email reports.
 * Single tabbed shell so admins can switch between exploring, saving, and
 * automating reports without leaving the page.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3, LineChart, PieChart, Table as TableIcon, Calendar, Plus, Save, Trash2,
  Pin, Download, Send, Clock, Mail, RefreshCw, X,
} from 'lucide-react';
import {
  getCustomAnalytics, listSavedViews, upsertSavedView, deleteSavedView,
  listSubscriptions, upsertSubscription, deleteSubscription, sendReportNow, listReportRuns,
} from '@/lib/reports.functions';
import {
  AnalyticsConfig, DEFAULT_CONFIG, Metric, Dimension, ChartType,
  METRIC_LABEL, DIMENSION_LABEL, downloadBlob, toCSV, toXLS, fmtINR,
} from '@/lib/reports.shared';
import { TabHelp } from './_TabHelp';

type SubTab = 'overview' | 'builder' | 'saved' | 'schedule';

export default function CustomAnalyticsTab() {
  const [tab, setTab] = useState<SubTab>('overview');
  return (
    <div className="space-y-5">
      <TabHelp topic="analytics" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black">Analytics</h2>
          <p className="text-sm text-gray-500 mt-0.5">Custom reports, saved views, and scheduled email digests</p>
        </div>
      </div>

      <div className="flex gap-1 bg-white border rounded-xl p-1 w-fit">
        {([
          { v: 'overview', l: 'Overview' },
          { v: 'builder',  l: 'Custom builder' },
          { v: 'saved',    l: 'Saved views' },
          { v: 'schedule', l: 'Scheduled reports' },
        ] as { v: SubTab; l: string }[]).map(t => (
          <button key={t.v} onClick={() => setTab(t.v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${tab === t.v ? 'bg-orange-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
            {t.l}
          </button>
        ))}
      </div>

      {tab === 'overview' && <BuilderView config={{ ...DEFAULT_CONFIG }} embedded />}
      {tab === 'builder' && <BuilderPage />}
      {tab === 'saved' && <SavedViewsPanel onLoad={() => setTab('builder')} />}
      {tab === 'schedule' && <SchedulePanel />}
    </div>
  );
}

/* ──────────────── Custom Builder ──────────────── */

function BuilderPage() {
  const [config, setConfig] = useState<AnalyticsConfig>({ ...DEFAULT_CONFIG });
  return <BuilderView config={config} onConfigChange={setConfig} />;
}

function BuilderView({ config: initial, onConfigChange, embedded }: { config: AnalyticsConfig; onConfigChange?: (c: AnalyticsConfig) => void; embedded?: boolean }) {
  const [config, setConfig] = useState<AnalyticsConfig>(initial);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [saveOpen, setSaveOpen] = useState(false);

  const update = (patch: Partial<AnalyticsConfig>) => {
    const next = { ...config, ...patch };
    setConfig(next);
    onConfigChange?.(next);
  };

  const run = async () => {
    setLoading(true); setErr('');
    try {
      const res = await getCustomAnalytics({
        data: { filters: config.filters, dimension: config.dimension, granularity: config.granularity, topN: config.topN || 20 },
      });
      setRows((res as any).rows || []);
    } catch (e: any) { setErr(e?.message || 'Failed'); }
    finally { setLoading(false); }
  };
  useEffect(() => { run(); /* eslint-disable-next-line */ }, [config.dimension, config.granularity, config.filters.days, config.filters.from, config.filters.to, config.topN]);

  const exportCSV = () => downloadBlob(toCSV(rows), `analytics-${config.dimension}.csv`, 'text/csv');
  const exportXLS = () => downloadBlob(toXLS(`Analytics ${config.dimension}`, rows), `analytics-${config.dimension}.xls`, 'application/vnd.ms-excel');

  return (
    <div className="space-y-4">
      {!embedded && <BuilderToolbar config={config} update={update} onSave={() => setSaveOpen(true)} onCSV={exportCSV} onXLS={exportXLS} onPDF={() => window.print()} onRefresh={run} loading={loading} />}
      {embedded && (
        <div className="flex flex-wrap gap-2 items-center">
          <DaysSelect value={config.filters.days || 30} onChange={(d: number) => update({ filters: { ...config.filters, days: d } })} />
          <DimSelect value={config.dimension} onChange={(d: Dimension) => update({ dimension: d })} />
          <MetricSelect value={config.primaryMetric} onChange={(m: Metric) => update({ primaryMetric: m })} />
          <ChartSelect value={config.chart} onChange={(c: ChartType) => update({ chart: c })} />
          <button onClick={run} className="ml-auto p-2 bg-white border rounded-xl hover:bg-gray-50" title="Refresh">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      )}

      {err && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl">{err}</div>}

      {/* KPI strip */}
      <KpiStrip rows={rows} metrics={config.metrics} />

      {/* Chart */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-black">{METRIC_LABEL[config.primaryMetric]} by {DIMENSION_LABEL[config.dimension]}</h3>
          <span className="text-xs text-gray-400">{rows.length} rows</span>
        </div>
        {rows.length === 0 ? (
          <p className="text-sm text-gray-400 py-12 text-center">{loading ? 'Loading…' : 'No data for current filters.'}</p>
        ) : config.chart === 'pie' ? (
          <PieView rows={rows} metric={config.primaryMetric} />
        ) : config.chart === 'table' ? (
          <TableView rows={rows} />
        ) : (
          <BarsView rows={rows} metric={config.primaryMetric} type={config.chart} />
        )}
      </div>

      <TableView rows={rows} />

      {saveOpen && <SaveViewDialog config={config} onClose={() => setSaveOpen(false)} />}
    </div>
  );
}

function BuilderToolbar({ config, update, onSave, onCSV, onXLS, onPDF, onRefresh, loading }: any) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        <DaysSelect value={config.filters.days || 30} onChange={(d: number) => update({ filters: { ...config.filters, days: d, from: undefined, to: undefined } })} />
        <DateRange filters={config.filters} onChange={(f: any) => update({ filters: f })} />
        <DimSelect value={config.dimension} onChange={(d: Dimension) => update({ dimension: d })} />
        <GranSelect value={config.granularity || 'day'} onChange={(g: any) => update({ granularity: g })} disabled={config.dimension !== 'time'} />
        <MetricSelect value={config.primaryMetric} onChange={(m: Metric) => update({ primaryMetric: m })} />
        <ChartSelect value={config.chart} onChange={(c: ChartType) => update({ chart: c })} />
        <div className="ml-auto flex gap-1">
          <button onClick={onRefresh} className="p-2 bg-white border rounded-xl hover:bg-gray-50" title="Refresh">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={onSave} className="px-3 py-2 bg-orange-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 hover:bg-orange-600">
            <Save size={13} /> Save view
          </button>
          <button onClick={onCSV} className="px-3 py-2 bg-white border rounded-xl text-xs font-bold flex items-center gap-1 hover:bg-gray-50"><Download size={13} /> CSV</button>
          <button onClick={onXLS} className="px-3 py-2 bg-white border rounded-xl text-xs font-bold flex items-center gap-1 hover:bg-gray-50"><Download size={13} /> Excel</button>
          <button onClick={onPDF} className="px-3 py-2 bg-white border rounded-xl text-xs font-bold flex items-center gap-1 hover:bg-gray-50"><Download size={13} /> PDF</button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <PillFilter label="Order status" all={['pending','confirmed','processing','shipped','out_for_delivery','delivered','cancelled']}
          selected={config.filters.status || []}
          onChange={(s: string[]) => update({ filters: { ...config.filters, status: s.length ? s : undefined } })} />
        <PillFilter label="Payment" all={['paid','pending','failed','refunded']}
          selected={config.filters.paymentStatus || []}
          onChange={(s: string[]) => update({ filters: { ...config.filters, paymentStatus: s.length ? s : undefined } })} />
        <PillFilter label="Method" all={['razorpay','phonepe','cod','wallet','unknown']}
          selected={config.filters.paymentMethod || []}
          onChange={(s: string[]) => update({ filters: { ...config.filters, paymentMethod: s.length ? s : undefined } })} />
        <input value={config.filters.search || ''} onChange={e => update({ filters: { ...config.filters, search: e.target.value || undefined } })}
          placeholder="Search order # / customer…"
          className="ml-auto border rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-orange-400 min-w-48" />
      </div>
    </div>
  );
}

function DaysSelect({ value, onChange }: any) {
  return (
    <select value={value} onChange={e => onChange(Number(e.target.value))}
      className="border rounded-xl px-3 py-1.5 text-xs font-bold bg-white focus:outline-none focus:border-orange-400">
      {[1,7,14,30,60,90,180,365].map(d => <option key={d} value={d}>Last {d}d</option>)}
    </select>
  );
}
function DimSelect({ value, onChange }: any) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="border rounded-xl px-3 py-1.5 text-xs font-bold bg-white focus:outline-none focus:border-orange-400">
      {Object.entries(DIMENSION_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
    </select>
  );
}
function GranSelect({ value, onChange, disabled }: any) {
  return (
    <select value={value} disabled={disabled} onChange={e => onChange(e.target.value)}
      className="border rounded-xl px-3 py-1.5 text-xs font-bold bg-white focus:outline-none focus:border-orange-400 disabled:opacity-40">
      {['hour','day','week','month'].map(g => <option key={g} value={g}>{g[0].toUpperCase() + g.slice(1)}</option>)}
    </select>
  );
}
function MetricSelect({ value, onChange }: any) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="border rounded-xl px-3 py-1.5 text-xs font-bold bg-white focus:outline-none focus:border-orange-400">
      {Object.entries(METRIC_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
    </select>
  );
}
function ChartSelect({ value, onChange }: any) {
  const opts: { v: ChartType; icon: any }[] = [
    { v: 'bar', icon: BarChart3 }, { v: 'line', icon: LineChart },
    { v: 'area', icon: LineChart }, { v: 'pie', icon: PieChart },
    { v: 'table', icon: TableIcon },
  ];
  return (
    <div className="flex gap-1 bg-white border rounded-xl p-0.5">
      {opts.map(o => {
        const Ico = o.icon;
        return (
          <button key={o.v} onClick={() => onChange(o.v)} title={o.v}
            className={`p-1.5 rounded ${value === o.v ? 'bg-orange-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
            <Ico size={14} />
          </button>
        );
      })}
    </div>
  );
}
function DateRange({ filters, onChange }: any) {
  return (
    <div className="flex items-center gap-1 text-xs">
      <Calendar size={13} className="text-gray-400" />
      <input type="date" value={filters.from?.slice(0,10) || ''}
        onChange={e => onChange({ ...filters, from: e.target.value ? new Date(e.target.value).toISOString() : undefined, days: undefined })}
        className="border rounded-xl px-2 py-1.5 focus:outline-none focus:border-orange-400" />
      <span className="text-gray-400">→</span>
      <input type="date" value={filters.to?.slice(0,10) || ''}
        onChange={e => onChange({ ...filters, to: e.target.value ? new Date(e.target.value + 'T23:59:59').toISOString() : undefined, days: undefined })}
        className="border rounded-xl px-2 py-1.5 focus:outline-none focus:border-orange-400" />
    </div>
  );
}
function PillFilter({ label, all, selected, onChange }: any) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${selected.length ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-white border-gray-200 text-gray-600'}`}>
        {label}{selected.length ? ` · ${selected.length}` : ''}
      </button>
      {open && (
        <div className="absolute top-full mt-1 z-10 bg-white border rounded-xl shadow-lg p-2 min-w-40 space-y-1">
          {all.map((o: string) => (
            <label key={o} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-gray-50 px-2 py-1 rounded">
              <input type="checkbox" checked={selected.includes(o)}
                onChange={e => onChange(e.target.checked ? [...selected, o] : selected.filter((s: string) => s !== o))} />
              {o.replace(/_/g, ' ')}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function KpiStrip({ rows, metrics }: { rows: any[]; metrics: Metric[] }) {
  const totals = useMemo(() => {
    const t: any = { revenue: 0, orders: 0, units: 0, customers: 0, discount: 0, cancelled: 0, delivered: 0, shipping: 0 };
    rows.forEach(r => { for (const k of Object.keys(t)) t[k] += Number(r[k] || 0); });
    t.aov = t.orders ? t.revenue / t.orders : 0;
    return t;
  }, [rows]);
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {metrics.map(m => (
        <div key={m} className="bg-white rounded-2xl border border-gray-100 p-3">
          <p className="text-xs text-gray-500">{METRIC_LABEL[m]}</p>
          <p className="text-xl font-black">{m === 'revenue' || m === 'aov' || m === 'discount' || m === 'shipping' ? fmtINR(totals[m] || 0) : Math.round(totals[m] || 0).toLocaleString('en-IN')}</p>
        </div>
      ))}
    </div>
  );
}

function BarsView({ rows, metric, type }: { rows: any[]; metric: Metric; type: ChartType }) {
  const max = Math.max(1, ...rows.map(r => Number(r[metric] || 0)));
  return (
    <div className="overflow-x-auto">
      <div className="flex items-end gap-1.5 h-48 min-w-full" style={{ minWidth: rows.length * 20 }}>
        {rows.map((r, i) => {
          const v = Number(r[metric] || 0);
          const h = Math.max(2, (v / max) * 100);
          return (
            <div key={i} className="flex-1 group relative" title={`${r.key}: ${v}`}>
              <div className={`rounded-t transition ${type === 'area' ? 'bg-orange-300' : 'bg-orange-500'} hover:bg-orange-600`} style={{ height: `${h}%` }} />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-gray-400 mt-2">
        <span className="truncate">{rows[0]?.key}</span>
        <span className="truncate">{rows[rows.length - 1]?.key}</span>
      </div>
    </div>
  );
}

function PieView({ rows, metric }: { rows: any[]; metric: Metric }) {
  const total = rows.reduce((s, r) => s + Number(r[metric] || 0), 0) || 1;
  const colors = ['#f97316','#fb923c','#fbbf24','#a3e635','#34d399','#22d3ee','#60a5fa','#a78bfa','#f472b6','#fb7185'];
  let acc = 0;
  return (
    <div className="flex flex-wrap gap-6 items-center">
      <svg viewBox="0 0 100 100" className="w-48 h-48 -rotate-90">
        {rows.slice(0, 10).map((r, i) => {
          const v = Number(r[metric] || 0);
          const pct = v / total;
          const start = acc; acc += pct;
          const a1 = start * 2 * Math.PI, a2 = acc * 2 * Math.PI;
          const x1 = 50 + 50 * Math.cos(a1), y1 = 50 + 50 * Math.sin(a1);
          const x2 = 50 + 50 * Math.cos(a2), y2 = 50 + 50 * Math.sin(a2);
          const large = pct > 0.5 ? 1 : 0;
          return <path key={i} d={`M50,50 L${x1},${y1} A50,50 0 ${large} 1 ${x2},${y2} Z`} fill={colors[i % colors.length]} />;
        })}
      </svg>
      <ul className="space-y-1 text-xs">
        {rows.slice(0, 10).map((r, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="w-3 h-3 rounded" style={{ background: colors[i % colors.length] }} />
            <span className="font-bold truncate max-w-[160px]">{r.key}</span>
            <span className="text-gray-400">{((Number(r[metric] || 0) / total) * 100).toFixed(1)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TableView({ rows }: { rows: any[] }) {
  if (!rows.length) return null;
  const cols = Object.keys(rows[0]);
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto max-h-96">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 sticky top-0">
            <tr>{cols.map(c => <th key={c} className="text-left px-3 py-2 font-bold text-gray-600 uppercase">{c}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t hover:bg-orange-50/40">
                {cols.map(c => <td key={c} className="px-3 py-1.5 font-mono">{typeof r[c] === 'number' ? r[c].toLocaleString('en-IN') : String(r[c] ?? '')}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ──────────────── Saved views ──────────────── */

function SavedViewsPanel({ onLoad }: { onLoad: () => void }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const load = async () => { setLoading(true); try { setItems((await listSavedViews()) as any[]); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);
  const remove = async (id: string) => { if (!confirm('Delete this view?')) return; await deleteSavedView({ data: { id } }); load(); };
  const togglePin = async (v: any) => { await upsertSavedView({ data: { id: v.id, name: v.name, description: v.description || '', config: v.config, is_pinned: !v.is_pinned } }); load(); };

  if (loading) return <div className="h-32 bg-gray-100 rounded-2xl animate-pulse" />;
  if (!items.length) return <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center text-sm text-gray-400">No saved views yet. Build a report and click "Save view".</div>;

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {items.map((v) => (
        <div key={v.id} className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h4 className="font-black truncate">{v.name}</h4>
              {v.description && <p className="text-xs text-gray-500 truncate">{v.description}</p>}
            </div>
            <button onClick={() => togglePin(v)} title={v.is_pinned ? 'Unpin' : 'Pin'}
              className={`p-1.5 rounded-lg ${v.is_pinned ? 'text-orange-500' : 'text-gray-300 hover:text-gray-500'}`}>
              <Pin size={14} fill={v.is_pinned ? 'currentColor' : 'none'} />
            </button>
          </div>
          <div className="text-xs text-gray-400 flex flex-wrap gap-1">
            <span className="px-2 py-0.5 bg-gray-100 rounded">{(v.config?.dimension as string) || 'time'}</span>
            <span className="px-2 py-0.5 bg-gray-100 rounded">{(v.config?.primaryMetric as string) || 'revenue'}</span>
            <span className="px-2 py-0.5 bg-gray-100 rounded">{(v.config?.chart as string) || 'bar'}</span>
          </div>
          <div className="flex gap-2 mt-2">
            <button onClick={onLoad} className="flex-1 px-3 py-2 bg-orange-500 text-white text-xs font-bold rounded-xl hover:bg-orange-600">Open</button>
            <button onClick={() => remove(v.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl"><Trash2 size={14} /></button>
          </div>
        </div>
      ))}
    </div>
  );
}

function SaveViewDialog({ config, onClose }: { config: AnalyticsConfig; onClose: () => void }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [pin, setPin] = useState(false);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try { await upsertSavedView({ data: { name: name.trim(), description: desc.trim(), config, is_pinned: pin } }); onClose(); }
    finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-5 w-full max-w-md">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-black">Save view</h3>
          <button onClick={onClose}><X size={16} /></button>
        </div>
        <div className="space-y-3">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="View name"
            className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400" />
          <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Description (optional)" rows={2}
            className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400" />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={pin} onChange={e => setPin(e.target.checked)} /> Pin to top
          </label>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 px-3 py-2 bg-gray-100 rounded-xl text-sm font-bold">Cancel</button>
          <button disabled={busy || !name.trim()} onClick={save} className="flex-1 px-3 py-2 bg-orange-500 text-white rounded-xl text-sm font-bold disabled:opacity-50">{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}

/* ──────────────── Scheduled reports ──────────────── */

function SchedulePanel() {
  const [subs, setSubs] = useState<any[]>([]);
  const [runs, setRuns] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [s, r] = await Promise.all([listSubscriptions(), listReportRuns()]);
      setSubs(s as any[]); setRuns(r as any[]);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const remove = async (id: string) => { if (!confirm('Delete this schedule?')) return; await deleteSubscription({ data: { id } }); load(); };
  const sendNow = async (s: any) => {
    if (!confirm(`Send report now to ${s.recipients.length} recipient(s)?`)) return;
    await sendReportNow({ data: { subscriptionId: s.id, days: s.config?.filters?.days || 7, formats: s.formats } });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-black">Scheduled reports</h3>
        <button onClick={() => setEditing({})} className="px-3 py-2 bg-orange-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 hover:bg-orange-600">
          <Plus size={13} /> New schedule
        </button>
      </div>

      {loading ? <div className="h-24 bg-gray-100 rounded-2xl animate-pulse" /> :
        subs.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center text-sm text-gray-400">
            No scheduled reports. Create one to automatically email digests.
          </div>
        ) : (
          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs">
                <tr>
                  <th className="text-left px-4 py-2 font-bold text-gray-600">Name</th>
                  <th className="text-left px-4 py-2 font-bold text-gray-600">Schedule</th>
                  <th className="text-left px-4 py-2 font-bold text-gray-600">Recipients</th>
                  <th className="text-left px-4 py-2 font-bold text-gray-600">Next run</th>
                  <th className="text-right px-4 py-2 font-bold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {subs.map(s => (
                  <tr key={s.id} className="border-t">
                    <td className="px-4 py-2 font-bold">{s.name}{!s.enabled && <span className="ml-2 text-xs text-gray-400">(paused)</span>}</td>
                    <td className="px-4 py-2 capitalize">{s.schedule} @ {String(s.send_hour).padStart(2, '0')}:00</td>
                    <td className="px-4 py-2 text-xs text-gray-500">{(s.recipients as string[]).slice(0, 2).join(', ')}{s.recipients.length > 2 ? ` +${s.recipients.length - 2}` : ''}</td>
                    <td className="px-4 py-2 text-xs text-gray-500">{s.next_run_at ? new Date(s.next_run_at).toLocaleString('en-IN') : '—'}</td>
                    <td className="px-4 py-2 text-right">
                      <button onClick={() => sendNow(s)} className="p-1.5 text-orange-500 hover:bg-orange-50 rounded-lg" title="Send now"><Send size={14} /></button>
                      <button onClick={() => setEditing(s)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg" title="Edit"><Mail size={14} /></button>
                      <button onClick={() => remove(s.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title="Delete"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      {/* Recent runs */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-black flex items-center gap-2"><Clock size={14} /> Recent runs</h4>
          <button onClick={load} className="p-1.5 hover:bg-gray-50 rounded-lg"><RefreshCw size={13} /></button>
        </div>
        {runs.length === 0 ? <p className="text-xs text-gray-400">No runs yet.</p> : (
          <ul className="text-xs divide-y">
            {runs.slice(0, 10).map(r => (
              <li key={r.id} className="py-2 flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${r.status === 'sent' ? 'bg-green-100 text-green-700' : r.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>{r.status}</span>
                <span className="text-gray-500">{r.trigger}</span>
                <span className="flex-1 truncate">{(r.recipients as string[])?.join(', ')}</span>
                <span className="text-gray-400">{new Date(r.created_at).toLocaleString('en-IN')}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {editing && <SubscriptionDialog initial={editing} onClose={() => { setEditing(null); load(); }} />}
    </div>
  );
}

function SubscriptionDialog({ initial, onClose }: { initial: any; onClose: () => void }) {
  const [form, setForm] = useState<any>({
    id: initial.id,
    name: initial.name || 'Daily analytics digest',
    schedule: initial.schedule || 'daily',
    send_hour: initial.send_hour ?? 9,
    weekday: initial.weekday ?? 1,
    monthday: initial.monthday ?? 1,
    recipients: (initial.recipients as string[])?.join(', ') || '',
    formats: initial.formats || ['pdf', 'csv'],
    enabled: initial.enabled ?? true,
    days: initial.config?.filters?.days || 7,
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const save = async () => {
    setErr('');
    const recipients = form.recipients.split(/[,\s;]+/).map((s: string) => s.trim()).filter(Boolean);
    if (!recipients.length) { setErr('At least one recipient required'); return; }
    setBusy(true);
    try {
      await upsertSubscription({
        data: {
          id: form.id, name: form.name, schedule: form.schedule,
          send_hour: Number(form.send_hour), weekday: Number(form.weekday), monthday: Number(form.monthday),
          recipients, formats: form.formats, enabled: form.enabled,
          config: { filters: { days: Number(form.days) } },
        },
      });
      onClose();
    } catch (e: any) { setErr(e?.message || 'Failed'); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl p-5 w-full max-w-lg my-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black">{form.id ? 'Edit schedule' : 'New schedule'}</h3>
          <button onClick={onClose}><X size={16} /></button>
        </div>
        <div className="space-y-3">
          <Field label="Name"><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inp} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Frequency">
              <select value={form.schedule} onChange={e => setForm({ ...form, schedule: e.target.value })} className={inp}>
                <option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option>
              </select>
            </Field>
            <Field label="Hour (24h)"><input type="number" min={0} max={23} value={form.send_hour} onChange={e => setForm({ ...form, send_hour: e.target.value })} className={inp} /></Field>
          </div>
          {form.schedule === 'weekly' && (
            <Field label="Weekday">
              <select value={form.weekday} onChange={e => setForm({ ...form, weekday: e.target.value })} className={inp}>
                {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
            </Field>
          )}
          {form.schedule === 'monthly' && (
            <Field label="Day of month (1–28)"><input type="number" min={1} max={28} value={form.monthday} onChange={e => setForm({ ...form, monthday: e.target.value })} className={inp} /></Field>
          )}
          <Field label="Look-back period (days)">
            <select value={form.days} onChange={e => setForm({ ...form, days: e.target.value })} className={inp}>
              {[1,7,14,30,90].map(d => <option key={d} value={d}>Last {d} days</option>)}
            </select>
          </Field>
          <Field label="Recipients (comma-separated emails)">
            <textarea value={form.recipients} onChange={e => setForm({ ...form, recipients: e.target.value })} rows={2}
              placeholder="admin@store.com, ops@store.com" className={inp} />
          </Field>
          <Field label="Formats">
            <div className="flex gap-2 flex-wrap">
              {(['pdf','csv','xls'] as const).map(f => (
                <label key={f} className="flex items-center gap-1.5 text-xs cursor-pointer bg-gray-50 px-3 py-1.5 rounded-xl">
                  <input type="checkbox" checked={form.formats.includes(f)}
                    onChange={e => setForm({ ...form, formats: e.target.checked ? [...form.formats, f] : form.formats.filter((x: string) => x !== f) })} />
                  {f.toUpperCase()}
                </label>
              ))}
            </div>
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.enabled} onChange={e => setForm({ ...form, enabled: e.target.checked })} /> Enabled
          </label>
          {err && <p className="text-xs text-red-600">{err}</p>}
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 px-3 py-2 bg-gray-100 rounded-xl text-sm font-bold">Cancel</button>
          <button disabled={busy} onClick={save} className="flex-1 px-3 py-2 bg-orange-500 text-white rounded-xl text-sm font-bold disabled:opacity-50">{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}

const inp = 'w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400 bg-white';
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-bold text-gray-500 block mb-1">{label}</label>
      {children}
    </div>
  );
}
