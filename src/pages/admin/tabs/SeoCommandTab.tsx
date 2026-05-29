// @ts-nocheck
import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import {
  seoKeywordResearch, seoTrackKeyword, seoListTrackedKeywords, seoDeleteTrackedKeyword,
  seoDomainOverview,
  seoListCompetitors, seoAddCompetitor, seoCompetitorBacklinks, seoSaveBacklinkOpportunity, seoListBacklinkOpportunities,
  seoListPages, seoSuggestMeta, seoSavePageMeta,
  seoRunAudit, seoListAuditRuns, seoListAuditIssues,
  seoGscOverview, seoGscListSitemaps, seoGscSubmitSitemap, seoGscInspectUrl,
  seoRunInsights, seoLatestInsights,
  seoGenerateInternalLinks, seoListLinkSuggestions, seoUpdateLinkSuggestion,
} from '@/lib/seo.functions';
import { Search, Link2, Globe, Wrench, BarChart3, Sparkles, Trash2, Plus, Loader2, ExternalLink, Brain, Network, Check, X } from 'lucide-react';
import { TabHelp } from './_TabHelp';


type SubTab = 'overview' | 'insights' | 'keywords' | 'competitors' | 'links' | 'onpage' | 'audit' | 'gsc';

const SUBTABS: { id: SubTab; label: string; icon: any }[] = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'insights', label: 'AI Insights', icon: Brain },
  { id: 'keywords', label: 'Keyword Research', icon: Search },
  { id: 'competitors', label: 'Competitor Backlinks', icon: Link2 },
  { id: 'links', label: 'Internal Links', icon: Network },
  { id: 'onpage', label: 'On-Page Optimizer', icon: Sparkles },
  { id: 'audit', label: 'Technical Audit', icon: Wrench },
  { id: 'gsc', label: 'Search Console', icon: Globe },
];


export default function SeoCommandTab() {
  const [sub, setSub] = useState<SubTab>('overview');
  return (
    <div className="space-y-4">
      <TabHelp topic="seoCommand" />
      <div>
        <h2 className="text-2xl font-black">SEO Command Center</h2>
        <p className="text-sm text-gray-500">
          Semrush + Google Search Console + AI-powered on-page optimizer + technical crawler.
          Keys: <code className="bg-gray-100 px-1 rounded">SEMRUSH_API_KEY</code>, <code className="bg-gray-100 px-1 rounded">GOOGLE_SERVICE_ACCOUNT_JSON</code>, <code className="bg-gray-100 px-1 rounded">GSC_SITE_URL</code>.
        </p>
      </div>
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-1">
        {SUBTABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setSub(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-t-lg font-medium ${sub === t.id ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
              <Icon size={14} /> {t.label}
            </button>
          );
        })}
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        {sub === 'overview' && <OverviewPanel />}
        {sub === 'insights' && <InsightsPanel />}
        {sub === 'keywords' && <KeywordsPanel />}
        {sub === 'competitors' && <CompetitorsPanel />}
        {sub === 'links' && <LinksPanel />}
        {sub === 'onpage' && <OnPagePanel />}
        {sub === 'audit' && <AuditPanel />}
        {sub === 'gsc' && <GscPanel />}

      </div>
    </div>
  );
}

// ─── 1. OVERVIEW ───
function OverviewPanel() {
  const domainOverview = useServerFn(seoDomainOverview);
  const gscOverview = useServerFn(seoGscOverview);
  const [domain, setDomain] = useState('nutropact.com');
  const [semrush, setSemrush] = useState<any>(null);
  const [gsc, setGsc] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const [s, g] = await Promise.all([
      domainOverview({ data: { domain } }).catch(e => ({ error: e.message })),
      gscOverview({ data: { days: 28 } }).catch(e => ({ error: e.message })),
    ]);
    setSemrush(s); setGsc(g); setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input value={domain} onChange={e => setDomain(e.target.value)} className="flex-1 px-3 py-2 border rounded-lg text-sm" placeholder="yourdomain.com" />
        <button onClick={load} disabled={loading} className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-bold disabled:opacity-50">
          {loading ? <Loader2 className="animate-spin" size={16} /> : 'Fetch'}
        </button>
      </div>
      {semrush?.error && <ErrBox label="Semrush" msg={semrush.error} />}
      {gsc?.error && <ErrBox label="GSC" msg={gsc.error} />}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Authority Rank" value={semrush?.overview?.Rk ?? '—'} />
        <Stat label="Organic Keywords" value={semrush?.overview?.Or ?? '—'} />
        <Stat label="Organic Traffic (est)" value={semrush?.overview?.Ot ?? '—'} />
        <Stat label="Paid Keywords" value={semrush?.overview?.Ad ?? '—'} />
        <Stat label="GSC Clicks (28d)" value={gsc?.totals?.clicks ?? '—'} />
        <Stat label="GSC Impressions" value={gsc?.totals?.impressions ?? '—'} />
        <Stat label="GSC CTR" value={gsc?.totals?.ctr ? (gsc.totals.ctr * 100).toFixed(2) + '%' : '—'} />
        <Stat label="Avg Position" value={gsc?.totals?.position ? Number(gsc.totals.position).toFixed(1) : '—'} />
      </div>
      {semrush?.topKeywords?.length > 0 && (
        <div>
          <h3 className="text-sm font-bold mb-2">Top Ranking Keywords (Semrush)</h3>
          <SimpleTable rows={semrush.topKeywords.slice(0, 10)} cols={['Ph','Po','Nq','Cp']} headers={['Keyword','Position','Volume','CPC']} />
        </div>
      )}
    </div>
  );
}

// ─── 2. KEYWORDS ───
function KeywordsPanel() {
  const research = useServerFn(seoKeywordResearch);
  const track = useServerFn(seoTrackKeyword);
  const list = useServerFn(seoListTrackedKeywords);
  const del = useServerFn(seoDeleteTrackedKeyword);
  const [kw, setKw] = useState('');
  const [result, setResult] = useState<any>(null);
  const [tracked, setTracked] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = () => list().then(r => setTracked(r.items));
  useEffect(() => { refresh(); }, []);

  const search = async () => {
    if (!kw.trim()) return;
    setLoading(true);
    const r = await research({ data: { keyword: kw.trim() } }).catch(e => ({ error: e.message }));
    setResult(r); setLoading(false);
  };

  const addToTracker = async (k: string, vol?: any, kd?: any, cpc?: any) => {
    await track({ data: { keyword: k, volume: vol ? Number(vol) : null, difficulty: kd ? Number(kd) : null, cpc: cpc ? Number(cpc) : null } });
    refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input value={kw} onChange={e => setKw(e.target.value)} onKeyDown={e => e.key === 'Enter' && search()}
          className="flex-1 px-3 py-2 border rounded-lg text-sm" placeholder="e.g. whey protein india" />
        <button onClick={search} disabled={loading} className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-bold disabled:opacity-50">
          {loading ? <Loader2 className="animate-spin" size={16} /> : 'Research'}
        </button>
      </div>
      {result?.error && <ErrBox label="Semrush" msg={result.error} />}
      {result?.overview && (
        <div className="bg-orange-50 p-3 rounded-lg flex flex-wrap gap-4 text-sm">
          <span><b>Volume:</b> {result.overview.Nq}</span>
          <span><b>CPC:</b> ${result.overview.Cp}</span>
          <span><b>Competition:</b> {result.overview.Co}</span>
          <span><b>Results:</b> {result.overview.Nr}</span>
          <button onClick={() => addToTracker(result.overview.Ph, result.overview.Nq, null, result.overview.Cp)}
            className="ml-auto px-3 py-1 bg-orange-500 text-white rounded text-xs font-bold">+ Track</button>
        </div>
      )}
      {result?.related?.length > 0 && (
        <div>
          <h3 className="text-sm font-bold mb-2">Related Keywords</h3>
          <KwTable rows={result.related} onAdd={addToTracker} />
        </div>
      )}
      {result?.questions?.length > 0 && (
        <div>
          <h3 className="text-sm font-bold mb-2">Question Keywords</h3>
          <KwTable rows={result.questions} onAdd={addToTracker} />
        </div>
      )}
      <div>
        <h3 className="text-sm font-bold mb-2">Tracked Keywords ({tracked.length})</h3>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50"><tr>
              <th className="text-left p-2">Keyword</th><th className="text-right p-2">Vol</th>
              <th className="text-right p-2">KD</th><th className="text-right p-2">CPC</th>
              <th className="p-2 w-12"></th>
            </tr></thead>
            <tbody>
              {tracked.map(t => (
                <tr key={t.id} className="border-t">
                  <td className="p-2 font-medium">{t.keyword}</td>
                  <td className="p-2 text-right">{t.current_volume ?? '—'}</td>
                  <td className="p-2 text-right">{t.current_kd ?? '—'}</td>
                  <td className="p-2 text-right">{t.current_cpc ?? '—'}</td>
                  <td className="p-2"><button onClick={async () => { await del({ data: { id: t.id } }); refresh(); }}><Trash2 size={14} className="text-red-500" /></button></td>
                </tr>
              ))}
              {tracked.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-gray-400">No tracked keywords yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KwTable({ rows, onAdd }: { rows: any[]; onAdd: (k: string, v?: any, kd?: any, cpc?: any) => void }) {
  return (
    <div className="border rounded-lg overflow-hidden max-h-80 overflow-y-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 sticky top-0"><tr>
          <th className="text-left p-2">Keyword</th><th className="text-right p-2">Vol</th>
          <th className="text-right p-2">KD%</th><th className="text-right p-2">CPC</th><th className="p-2"></th>
        </tr></thead>
        <tbody>{rows.map((r, i) => (
          <tr key={i} className="border-t">
            <td className="p-2">{r.Ph}</td>
            <td className="p-2 text-right">{r.Nq}</td>
            <td className="p-2 text-right">{r.Kd ?? '—'}</td>
            <td className="p-2 text-right">{r.Cp}</td>
            <td className="p-2"><button onClick={() => onAdd(r.Ph, r.Nq, r.Kd, r.Cp)} className="text-orange-500 hover:underline text-xs">+ Track</button></td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

// ─── 3. COMPETITORS ───
function CompetitorsPanel() {
  const list = useServerFn(seoListCompetitors);
  const add = useServerFn(seoAddCompetitor);
  const fetchBl = useServerFn(seoCompetitorBacklinks);
  const saveOp = useServerFn(seoSaveBacklinkOpportunity);
  const listOps = useServerFn(seoListBacklinkOpportunities);
  const [comps, setComps] = useState<any[]>([]);
  const [ops, setOps] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [newLabel, setNewLabel] = useState('');

  const refresh = async () => {
    const [c, o] = await Promise.all([list(), listOps()]);
    setComps(c.items); setOps(o.items);
  };
  useEffect(() => { refresh(); }, []);

  const analyze = async (c: any) => {
    setSelected(c); setLoading(true);
    const r = await fetchBl({ data: { domain: c.domain } }).catch(e => ({ error: e.message }));
    setResult(r); setLoading(false);
  };

  const addOp = async (sourceDomain: string, ascore?: any) => {
    await saveOp({ data: { sourceDomain, competitorDomain: selected.domain, authorityScore: ascore ? Number(ascore) : null } });
    refresh();
  };

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-2">
        <input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="Label (e.g. MuscleBlaze)" className="px-3 py-2 border rounded-lg text-sm" />
        <div className="flex gap-2">
          <input value={newDomain} onChange={e => setNewDomain(e.target.value)} placeholder="domain.com" className="flex-1 px-3 py-2 border rounded-lg text-sm" />
          <button onClick={async () => { if (newDomain && newLabel) { await add({ data: { domain: newDomain, label: newLabel } }); setNewDomain(''); setNewLabel(''); refresh(); } }}
            className="px-3 py-2 bg-gray-900 text-white rounded-lg text-sm"><Plus size={14} /></button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {comps.map(c => (
          <button key={c.id} onClick={() => analyze(c)} className={`px-3 py-1.5 rounded-lg text-sm ${selected?.id === c.id ? 'bg-orange-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>
            {c.label} <span className="text-xs opacity-60">({c.domain})</span>
          </button>
        ))}
      </div>
      {loading && <div className="text-center py-8"><Loader2 className="animate-spin inline" /></div>}
      {result?.error && <ErrBox label="Semrush" msg={result.error} />}
      {result?.overview && (
        <div className="bg-orange-50 p-3 rounded-lg flex flex-wrap gap-4 text-sm">
          <span><b>Authority:</b> {result.overview.ascore}</span>
          <span><b>Total backlinks:</b> {result.overview.total}</span>
          <span><b>Ref domains:</b> {result.overview.domains_num}</span>
          <span><b>Follow:</b> {result.overview.follows_num}</span>
        </div>
      )}
      {result?.topReferring?.length > 0 && (
        <div>
          <h3 className="text-sm font-bold mb-2">Top Referring Domains — Backlink Opportunities</h3>
          <div className="border rounded-lg overflow-hidden max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0"><tr>
                <th className="text-left p-2">Domain</th><th className="text-right p-2">AScore</th>
                <th className="text-right p-2">Backlinks</th><th className="text-left p-2">Country</th><th className="p-2"></th>
              </tr></thead>
              <tbody>{result.topReferring.map((r: any, i: number) => (
                <tr key={i} className="border-t">
                  <td className="p-2"><a href={`https://${r.domain}`} target="_blank" rel="noopener" className="text-blue-600 hover:underline">{r.domain}</a></td>
                  <td className="p-2 text-right">{r.domain_ascore}</td>
                  <td className="p-2 text-right">{r.backlinks_num}</td>
                  <td className="p-2">{r.country}</td>
                  <td className="p-2"><button onClick={() => addOp(r.domain, r.domain_ascore)} className="text-orange-500 text-xs hover:underline">+ Save</button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}
      <div>
        <h3 className="text-sm font-bold mb-2">Saved Opportunities ({ops.length})</h3>
        <div className="border rounded-lg overflow-hidden max-h-72 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0"><tr>
              <th className="text-left p-2">Source Domain</th><th className="text-right p-2">AScore</th>
              <th className="text-left p-2">From Competitors</th><th className="text-left p-2">Status</th>
            </tr></thead>
            <tbody>{ops.map((o: any) => (
              <tr key={o.id} className="border-t">
                <td className="p-2">{o.source_domain}</td>
                <td className="p-2 text-right">{o.authority_score ?? '—'}</td>
                <td className="p-2 text-xs">{(o.competitors_with_link || []).join(', ')}</td>
                <td className="p-2"><span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">{o.status}</span></td>
              </tr>
            ))}{ops.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-gray-400">No saved opportunities</td></tr>}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── 4. ON-PAGE ───
function OnPagePanel() {
  const listPages = useServerFn(seoListPages);
  const suggest = useServerFn(seoSuggestMeta);
  const save = useServerFn(seoSavePageMeta);
  const [pages, setPages] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [keyword, setKeyword] = useState('');
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [h1, setH1] = useState('');
  const [aiResult, setAiResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const refresh = () => listPages().then(r => setPages(r.pages));
  useEffect(() => { refresh(); }, []);

  const pick = (p: any) => {
    setSelected(p);
    setTitle(p.override?.title || ''); setDesc(p.override?.description || ''); setH1(p.override?.h1 || '');
    setAiResult(null); setKeyword('');
  };

  const generate = async () => {
    if (!selected) return;
    setLoading(true);
    const r = await suggest({ data: { route: selected.route, currentTitle: title, keyword } }).catch(e => ({ error: e.message, suggestion: null }));
    setAiResult(r);
    if (r.suggestion) { setTitle(r.suggestion.title || ''); setDesc(r.suggestion.description || ''); setH1(r.suggestion.h1 || ''); }
    setLoading(false);
  };

  const apply = async () => {
    if (!selected) return;
    await save({ data: { route: selected.route, title, description: desc, h1, aiSuggestions: aiResult?.suggestion } });
    refresh(); alert('Saved. Visible on next deploy.');
  };

  return (
    <div className="grid md:grid-cols-[260px_1fr] gap-4">
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-3 py-2 text-xs font-bold text-gray-600">Pages</div>
        <div className="max-h-96 overflow-y-auto">
          {pages.map(p => (
            <button key={p.route} onClick={() => pick(p)}
              className={`block w-full text-left px-3 py-2 text-sm border-t ${selected?.route === p.route ? 'bg-orange-50' : 'hover:bg-gray-50'}`}>
              <div className="font-medium">{p.defaultTitle}</div>
              <div className="text-xs text-gray-500 flex items-center gap-1">
                {p.route} {p.override && <span className="text-green-600">●</span>}
              </div>
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        {!selected && <div className="text-center text-gray-400 py-12">Select a page from the left</div>}
        {selected && (
          <>
            <div className="flex gap-2">
              <input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="Target keyword (optional)" className="flex-1 px-3 py-2 border rounded-lg text-sm" />
              <button onClick={generate} disabled={loading} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-bold disabled:opacity-50 flex items-center gap-1">
                {loading ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />} AI Suggest
              </button>
            </div>
            {aiResult?.error && <ErrBox label="AI" msg={aiResult.error} />}
            <Field label={`Title (${title.length}/60)`}>
              <input value={title} onChange={e => setTitle(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
            </Field>
            <Field label={`Description (${desc.length}/160)`}>
              <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} className="w-full px-3 py-2 border rounded-lg text-sm" />
            </Field>
            <Field label="H1">
              <input value={h1} onChange={e => setH1(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" />
            </Field>
            <button onClick={apply} className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-bold">Save Meta</button>
            <p className="text-xs text-gray-500">Saved overrides are stored in <code>seo_page_meta</code>. Wire them into your route <code>head()</code> functions to apply on render.</p>
          </>
        )}
      </div>
    </div>
  );
}

// ─── 5. AUDIT ───
function AuditPanel() {
  const run = useServerFn(seoRunAudit);
  const listRuns = useServerFn(seoListAuditRuns);
  const listIssues = useServerFn(seoListAuditIssues);
  const [baseUrl, setBaseUrl] = useState(typeof window !== 'undefined' ? window.location.origin : 'https://nutropact.com');
  const [maxPages, setMaxPages] = useState(20);
  const [runs, setRuns] = useState<any[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [selectedRun, setSelectedRun] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = () => listRuns().then(r => setRuns(r.runs));
  useEffect(() => { refresh(); }, []);

  const start = async () => {
    setLoading(true);
    try {
      const r = await run({ data: { baseUrl, maxPages } });
      refresh(); openRun(r.runId);
    } catch (e: any) { alert('Audit failed: ' + e.message); }
    setLoading(false);
  };

  const openRun = async (id: string) => {
    setSelectedRun(id);
    const r = await listIssues({ data: { runId: id } });
    setIssues(r.issues);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <input value={baseUrl} onChange={e => setBaseUrl(e.target.value)} className="flex-1 min-w-60 px-3 py-2 border rounded-lg text-sm" placeholder="https://yoursite.com" />
        <input type="number" value={maxPages} onChange={e => setMaxPages(Number(e.target.value))} min={1} max={50} className="w-24 px-3 py-2 border rounded-lg text-sm" />
        <button onClick={start} disabled={loading} className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-bold disabled:opacity-50">
          {loading ? <Loader2 className="animate-spin" size={16} /> : 'Run Audit'}
        </button>
      </div>
      <div className="grid md:grid-cols-[280px_1fr] gap-4">
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-3 py-2 text-xs font-bold text-gray-600">Past Runs</div>
          <div className="max-h-96 overflow-y-auto">
            {runs.map(r => (
              <button key={r.id} onClick={() => openRun(r.id)}
                className={`block w-full text-left px-3 py-2 text-xs border-t ${selectedRun === r.id ? 'bg-orange-50' : 'hover:bg-gray-50'}`}>
                <div className="flex justify-between"><span>{new Date(r.started_at).toLocaleString()}</span><span className={r.status === 'complete' ? 'text-green-600' : r.status === 'failed' ? 'text-red-600' : 'text-yellow-600'}>{r.status}</span></div>
                <div className="text-gray-500">{r.pages_crawled} pages • {r.total_issues} issues</div>
                {r.status === 'complete' && (
                  <div className="text-xs flex gap-2 mt-1">
                    <span className="text-red-600">{r.critical_count}C</span>
                    <span className="text-yellow-600">{r.warning_count}W</span>
                    <span className="text-gray-500">{r.notice_count}N</span>
                  </div>
                )}
              </button>
            ))}
            {runs.length === 0 && <div className="p-4 text-center text-gray-400 text-xs">No runs yet</div>}
          </div>
        </div>
        <div>
          {issues.length === 0 && <div className="text-center text-gray-400 py-12 text-sm">Select a run to view issues</div>}
          {issues.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50"><tr>
                  <th className="text-left p-2">Severity</th><th className="text-left p-2">Issue</th>
                  <th className="text-left p-2">URL</th>
                </tr></thead>
                <tbody>{issues.map(i => (
                  <tr key={i.id} className="border-t">
                    <td className="p-2"><span className={`px-2 py-0.5 rounded text-xs ${i.severity === 'critical' ? 'bg-red-100 text-red-700' : i.severity === 'warning' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}`}>{i.severity}</span></td>
                    <td className="p-2"><div className="font-medium">{i.message}</div>{i.recommendation && <div className="text-xs text-gray-500">{i.recommendation}</div>}</td>
                    <td className="p-2"><a href={i.url} target="_blank" rel="noopener" className="text-blue-600 hover:underline text-xs flex items-center gap-1">{i.url.length > 50 ? i.url.slice(0, 50) + '…' : i.url}<ExternalLink size={10} /></a></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── 6. GSC ───
function GscPanel() {
  const overview = useServerFn(seoGscOverview);
  const listSm = useServerFn(seoGscListSitemaps);
  const submitSm = useServerFn(seoGscSubmitSitemap);
  const inspect = useServerFn(seoGscInspectUrl);
  const [days, setDays] = useState(28);
  const [data, setData] = useState<any>(null);
  const [sitemaps, setSitemaps] = useState<any[]>([]);
  const [newSm, setNewSm] = useState('');
  const [inspectUrl, setInspectUrl] = useState('');
  const [inspectResult, setInspectResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const [o, s] = await Promise.all([
      overview({ data: { days } }).catch(e => ({ error: e.message })),
      listSm().catch(e => ({ error: e.message, sitemaps: [] })),
    ]);
    setData(o); setSitemaps(s.sitemaps || []); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center">
        <select value={days} onChange={e => setDays(Number(e.target.value))} className="px-3 py-2 border rounded-lg text-sm">
          <option value={7}>Last 7 days</option><option value={28}>Last 28 days</option><option value={90}>Last 90 days</option>
        </select>
        <button onClick={load} disabled={loading} className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-bold disabled:opacity-50">
          {loading ? <Loader2 className="animate-spin" size={16} /> : 'Refresh'}
        </button>
        {data?.site && <span className="text-xs text-gray-500 ml-auto">Site: <code>{data.site}</code></span>}
      </div>
      {data?.error && <ErrBox label="GSC" msg={data.error} />}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Clicks" value={data?.totals?.clicks ?? '—'} />
        <Stat label="Impressions" value={data?.totals?.impressions ?? '—'} />
        <Stat label="CTR" value={data?.totals?.ctr ? (data.totals.ctr * 100).toFixed(2) + '%' : '—'} />
        <Stat label="Position" value={data?.totals?.position ? Number(data.totals.position).toFixed(1) : '—'} />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <h3 className="text-sm font-bold mb-2">Top Queries</h3>
          <div className="border rounded-lg overflow-hidden max-h-80 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0"><tr><th className="text-left p-2">Query</th><th className="text-right p-2">Clicks</th><th className="text-right p-2">Impr</th></tr></thead>
              <tbody>{(data?.topQueries || []).map((q: any, i: number) => (
                <tr key={i} className="border-t"><td className="p-2">{q.keys?.[0]}</td><td className="p-2 text-right">{q.clicks}</td><td className="p-2 text-right">{q.impressions}</td></tr>
              ))}</tbody>
            </table>
          </div>
        </div>
        <div>
          <h3 className="text-sm font-bold mb-2">Top Pages</h3>
          <div className="border rounded-lg overflow-hidden max-h-80 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0"><tr><th className="text-left p-2">Page</th><th className="text-right p-2">Clicks</th><th className="text-right p-2">Impr</th></tr></thead>
              <tbody>{(data?.topPages || []).map((q: any, i: number) => (
                <tr key={i} className="border-t"><td className="p-2 text-xs">{q.keys?.[0]}</td><td className="p-2 text-right">{q.clicks}</td><td className="p-2 text-right">{q.impressions}</td></tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      </div>
      <div>
        <h3 className="text-sm font-bold mb-2">Sitemaps</h3>
        <div className="flex gap-2 mb-2">
          <input value={newSm} onChange={e => setNewSm(e.target.value)} placeholder="https://yoursite.com/sitemap.xml" className="flex-1 px-3 py-2 border rounded-lg text-sm" />
          <button onClick={async () => { if (!newSm) return; await submitSm({ data: { sitemapUrl: newSm } }).catch(e => alert(e.message)); setNewSm(''); load(); }}
            className="px-3 py-2 bg-gray-900 text-white rounded-lg text-sm">Submit</button>
        </div>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50"><tr><th className="text-left p-2">Path</th><th className="text-left p-2">Last Submitted</th><th className="text-right p-2">URLs</th></tr></thead>
            <tbody>{sitemaps.map((s: any, i: number) => (
              <tr key={i} className="border-t"><td className="p-2 text-xs">{s.path}</td><td className="p-2 text-xs">{s.lastSubmitted ? new Date(s.lastSubmitted).toLocaleString() : '—'}</td><td className="p-2 text-right">{s.contents?.[0]?.submitted ?? '—'}</td></tr>
            ))}{sitemaps.length === 0 && <tr><td colSpan={3} className="p-4 text-center text-gray-400 text-xs">No sitemaps submitted</td></tr>}</tbody>
          </table>
        </div>
      </div>
      <div>
        <h3 className="text-sm font-bold mb-2">URL Inspection</h3>
        <div className="flex gap-2">
          <input value={inspectUrl} onChange={e => setInspectUrl(e.target.value)} placeholder="https://yoursite.com/page" className="flex-1 px-3 py-2 border rounded-lg text-sm" />
          <button onClick={async () => { if (!inspectUrl) return; const r = await inspect({ data: { inspectionUrl: inspectUrl } }).catch(e => ({ error: e.message, result: null })); setInspectResult(r); }}
            className="px-3 py-2 bg-gray-900 text-white rounded-lg text-sm">Inspect</button>
        </div>
        {inspectResult?.error && <div className="mt-2"><ErrBox label="GSC" msg={inspectResult.error} /></div>}
        {inspectResult?.result && (
          <pre className="mt-2 bg-gray-900 text-green-400 text-xs p-3 rounded-lg overflow-auto max-h-80">{JSON.stringify(inspectResult.result, null, 2)}</pre>
        )}
      </div>
    </div>
  );
}

// ─── Helpers ───
function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-xl font-black mt-1">{value}</div>
    </div>
  );
}
function ErrBox({ label, msg }: { label: string; msg: string }) {
  return <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm"><b>{label} error:</b> {msg}</div>;
}
function Field({ label, children }: { label: string; children: any }) {
  return <div><label className="text-xs font-bold text-gray-600 block mb-1">{label}</label>{children}</div>;
}
function SimpleTable({ rows, cols, headers }: { rows: any[]; cols: string[]; headers: string[] }) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50"><tr>{headers.map(h => <th key={h} className="text-left p-2">{h}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i} className="border-t">{cols.map(c => <td key={c} className="p-2">{r[c]}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

// ─── PHASE 4: AI INSIGHTS ───
function InsightsPanel() {
  const runFn = useServerFn(seoRunInsights);
  const listFn = useServerFn(seoLatestInsights);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    try { const r = await listFn(); setRows(r.rows || []); } finally { setLoading(false); }
  };
  useEffect(() => { refresh(); }, []);

  const run = async () => {
    setRunning(true); setErr(null);
    try {
      const r: any = await runFn({ data: { periodDays: 7 } });
      if (r.error) setErr(r.error); else await refresh();
    } catch (e: any) { setErr(e.message); }
    finally { setRunning(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-lg">AI SEO Insights</h3>
          <p className="text-sm text-gray-500">Daily digest powered by Gemini — auto-runs every day at 5 AM UTC.</p>
        </div>
        <button onClick={run} disabled={running}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 disabled:opacity-60">
          {running ? <Loader2 size={14} className="animate-spin" /> : <Brain size={14} />}
          {running ? 'Generating...' : 'Generate now'}
        </button>
      </div>
      {err && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded text-sm">{err}</div>}
      {loading && <div className="text-sm text-gray-500">Loading…</div>}
      {!loading && rows.length === 0 && (
        <div className="text-sm text-gray-500 p-6 text-center bg-gray-50 rounded border border-dashed">
          No insights yet. Click "Generate now" to create your first AI digest.
        </div>
      )}
      <div className="space-y-4">
        {rows.map((r) => (
          <div key={r.id} className="border border-gray-200 rounded-lg p-4 bg-gradient-to-br from-purple-50/30 to-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500">{new Date(r.generated_at).toLocaleString()} · last {r.period_days}d</span>
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">{r.model}</span>
            </div>
            {r.summary && <p className="text-sm text-gray-800 mb-3 font-medium">{r.summary}</p>}
            <div className="space-y-2">
              {(r.insights || []).map((i: any, idx: number) => (
                <div key={idx} className="border-l-4 pl-3 py-1.5 text-sm" style={{
                  borderColor: i.severity === 'high' ? '#ef4444' : i.severity === 'medium' ? '#f59e0b' : '#10b981',
                }}>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{i.title}</span>
                    <span className="text-[10px] uppercase tracking-wide bg-gray-100 px-1.5 rounded">{i.type}</span>
                  </div>
                  <p className="text-gray-600 text-xs mt-0.5">{i.body}</p>
                  {i.action_url && (
                    <a href={i.action_url} target="_blank" rel="noopener" className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1">
                      {i.action_url} <ExternalLink size={10} />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── PHASE 4: INTERNAL LINK SUGGESTIONS ───
function LinksPanel() {
  const genFn = useServerFn(seoGenerateInternalLinks);
  const listFn = useServerFn(seoListLinkSuggestions);
  const updateFn = useServerFn(seoUpdateLinkSuggestion);
  const [rows, setRows] = useState<any[]>([]);
  const [running, setRunning] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'applied' | 'dismissed'>('pending');

  const refresh = async () => {
    const r = await listFn();
    setRows(r.rows || []);
  };
  useEffect(() => { refresh(); }, []);

  const generate = async () => {
    setRunning(true);
    try { await genFn(); await refresh(); } finally { setRunning(false); }
  };

  const update = async (id: string, status: 'applied' | 'dismissed') => {
    await updateFn({ data: { id, status } });
    await refresh();
  };

  const filtered = filter === 'all' ? rows : rows.filter((r) => r.status === filter);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-lg">Internal Link Suggestions</h3>
          <p className="text-sm text-gray-500">AI-suggested links between your pages — improves crawl depth & ranking distribution.</p>
        </div>
        <button onClick={generate} disabled={running}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 disabled:opacity-60">
          {running ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {running ? 'Analyzing...' : 'Generate suggestions'}
        </button>
      </div>
      <div className="flex gap-2 text-xs">
        {(['pending', 'applied', 'dismissed', 'all'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-2.5 py-1 rounded ${filter === f ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
            {f} ({f === 'all' ? rows.length : rows.filter((r) => r.status === f).length})
          </button>
        ))}
      </div>
      {filtered.length === 0 && (
        <div className="text-sm text-gray-500 p-6 text-center bg-gray-50 rounded border border-dashed">
          No suggestions in this view. Click "Generate suggestions" to start.
        </div>
      )}
      <div className="space-y-2">
        {filtered.map((s) => (
          <div key={s.id} className="border border-gray-200 rounded-lg p-3 flex items-center gap-3 text-sm">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <code className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded truncate">{s.source_path}</code>
                <span className="text-gray-400">→</span>
                <code className="text-xs bg-green-50 text-green-700 px-1.5 py-0.5 rounded truncate">{s.target_path}</code>
                <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded">score {Number(s.score).toFixed(2)}</span>
              </div>
              <div className="mt-1 text-xs">
                Anchor: <span className="font-semibold">"{s.anchor_text}"</span>
                {s.reason && <span className="text-gray-500"> · {s.reason}</span>}
              </div>
            </div>
            {s.status === 'pending' && (
              <div className="flex gap-1">
                <button onClick={() => update(s.id, 'applied')} title="Mark as applied"
                  className="p-1.5 bg-green-100 hover:bg-green-200 text-green-700 rounded"><Check size={14} /></button>
                <button onClick={() => update(s.id, 'dismissed')} title="Dismiss"
                  className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded"><X size={14} /></button>
              </div>
            )}
            {s.status !== 'pending' && (
              <span className={`text-xs px-2 py-1 rounded ${s.status === 'applied' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {s.status}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
