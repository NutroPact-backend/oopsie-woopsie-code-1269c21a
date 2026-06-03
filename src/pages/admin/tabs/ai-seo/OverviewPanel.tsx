// @ts-nocheck
import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { getAiSeoOverview, runAiSeoAudit } from '@/lib/aiSeoCenter.functions';
import { Activity, AlertTriangle, RefreshCw, Sparkles } from 'lucide-react';

const VECTORS = [
  { key: 'score_aeo', label: 'AEO', subtitle: 'Answer Engine Optimization', color: 'from-orange-400 to-orange-600' },
  { key: 'score_geo', label: 'GEO', subtitle: 'Generative Engine Access', color: 'from-blue-400 to-blue-600' },
  { key: 'score_entity', label: 'Entity', subtitle: 'Brand Entity Signals', color: 'from-purple-400 to-purple-600' },
  { key: 'score_reputation', label: 'Reputation', subtitle: 'Trust & Citations', color: 'from-pink-400 to-rose-600' },
  { key: 'score_conversational', label: 'Conversational', subtitle: 'Voice & Chat Patterns', color: 'from-emerald-400 to-teal-600' },
];

function CircularScore({ value, size = 140 }: { value: number; size?: number }) {
  const r = (size - 16) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  const color = value >= 80 ? '#10b981' : value >= 60 ? '#f59e0b' : value >= 40 ? '#f97316' : '#ef4444';
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} stroke="#e5e7eb" strokeWidth="10" fill="none" />
        <circle cx={size/2} cy={size/2} r={r} stroke={color} strokeWidth="10" fill="none"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-3xl font-black" style={{ color }}>{value}</div>
        <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">/ 100</div>
      </div>
    </div>
  );
}

export default function OverviewPanel() {
  const fetchOv = useServerFn(getAiSeoOverview);
  const runAudit = useServerFn(runAiSeoAudit);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setData(await fetchOv({ data: {} })); } catch (e: any) { console.error(e); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const runNow = async () => {
    setRunning(true);
    try { await runAudit({ data: {} }); await load(); } catch (e: any) { alert('Audit failed: ' + e.message); }
    setRunning(false);
  };

  if (loading) return <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}</div>;

  const latest = data?.latest;
  const scores = latest ? VECTORS.map(v => latest[v.key] || 0) : [];
  const global = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const alerts = latest?.alerts || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-black flex items-center gap-2"><Sparkles size={20} className="text-orange-500" /> AI SEO Command Center</h2>
          <p className="text-sm text-gray-500">5-vector audit for AEO, GEO, Entity, Reputation, Conversational signals.</p>
        </div>
        <button onClick={runNow} disabled={running}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500 text-white font-bold text-sm hover:bg-orange-600 disabled:opacity-50">
          <RefreshCw size={15} className={running ? 'animate-spin' : ''} />
          {running ? 'Auditing site…' : 'Run Audit Now'}
        </button>
      </div>

      {!latest && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 text-center">
          <Activity className="mx-auto mb-2 text-blue-500" size={32} />
          <p className="font-bold text-sm">No audits yet</p>
          <p className="text-xs text-gray-600 mt-1">Click "Run Audit Now" to scan your live site for AI-search readiness.</p>
        </div>
      )}

      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a: any, i: number) => (
            <div key={i} className={`rounded-xl p-3 flex items-start gap-2 text-sm font-medium ${a.level === 'critical' ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-yellow-50 text-yellow-800 border border-yellow-200'}`}>
              <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
              <span>{a.message}</span>
            </div>
          ))}
        </div>
      )}

      {latest && (
        <>
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white flex flex-col sm:flex-row items-center gap-6">
            <CircularScore value={global} size={160} />
            <div className="flex-1">
              <div className="text-xs uppercase tracking-wider text-slate-400 font-bold">Global AI-Search Health</div>
              <div className="text-2xl font-black mt-1">{global >= 80 ? 'Excellent' : global >= 60 ? 'Good — room to grow' : global >= 40 ? 'Needs work' : 'Critical attention'}</div>
              <p className="text-sm text-slate-300 mt-2">Last scanned: {new Date(latest.last_scanned_at).toLocaleString()}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {VECTORS.map(v => {
              const score = latest[v.key] || 0;
              return (
                <div key={v.key} className="bg-white border border-gray-100 rounded-2xl p-4 hover:shadow-lg transition">
                  <div className={`text-xs uppercase tracking-wider font-bold bg-gradient-to-r ${v.color} bg-clip-text text-transparent`}>{v.label}</div>
                  <div className="text-3xl font-black mt-1">{score}<span className="text-sm text-gray-400 font-normal">/100</span></div>
                  <div className="text-[11px] text-gray-500 mt-1">{v.subtitle}</div>
                  <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full bg-gradient-to-r ${v.color}`} style={{ width: `${score}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          {data?.history?.length > 1 && (
            <div className="bg-white border border-gray-100 rounded-2xl p-4">
              <h3 className="text-sm font-black mb-3">Score history (last {data.history.length} audits)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-gray-500"><tr className="text-left"><th className="py-1.5">Scanned</th><th>AEO</th><th>GEO</th><th>Entity</th><th>Rep.</th><th>Conv.</th></tr></thead>
                  <tbody>
                    {data.history.slice(0, 10).map((h: any, i: number) => (
                      <tr key={i} className="border-t border-gray-100">
                        <td className="py-1.5">{new Date(h.last_scanned_at).toLocaleString()}</td>
                        <td>{h.score_aeo}</td><td>{h.score_geo}</td><td>{h.score_entity}</td>
                        <td>{h.score_reputation}</td><td>{h.score_conversational}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
