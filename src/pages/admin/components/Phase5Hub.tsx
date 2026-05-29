// @ts-nocheck
import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Trophy, Truck, Activity, Loader2, AlertTriangle, Plus, Trash2, ShieldAlert, ShoppingCart, Scale, Radio, ExternalLink, Copy, Check } from 'lucide-react';
import {
  guardianLeaderboard,
  distributorHealth,
  listDistributors,
  saveDistributor,
  deleteDistributor,
  velocityCheck,
  listMarketplaceListings,
  submitMarketplaceListing,
  updateMarketplaceListing,
  listLegalCases,
  getLegalCase,
  updateLegalCase,
  generateCeaseDesist,
} from '@/lib/product-auth.functions';

type Section = 'guardians' | 'defense' | 'distributors' | 'marketplace' | 'legal' | 'nfc';

export default function Phase5Hub() {
  const [tab, setTab] = useState<Section>('guardians');
  const tabs: { id: Section; label: string }[] = [
    { id: 'guardians', label: '🏆 Guardians' },
    { id: 'defense', label: '⚡ Defense' },
    { id: 'distributors', label: '🚚 Distributors' },
    { id: 'marketplace', label: '🛒 Marketplace' },
    { id: 'legal', label: '⚖️ Legal' },
    { id: 'nfc', label: '📡 NFC tags' },
  ];
  return (
    <div className="bg-white rounded-2xl border-2 border-emerald-200 overflow-hidden">
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-4 border-b border-emerald-100">
        <h3 className="font-black text-lg text-emerald-900">🛡️ Phase 5: Active Defense & Brand Intelligence</h3>
        <p className="text-xs text-gray-600 mt-0.5">Guardians, predictive defense, distributors, marketplace hunting, legal toolkit, NFC.</p>
        <div className="flex gap-2 mt-3 flex-wrap">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${
                tab === t.id ? 'bg-emerald-600 text-white' : 'bg-white text-emerald-700 border border-emerald-200 hover:border-emerald-400'
              }`}>{t.label}</button>
          ))}
        </div>
      </div>
      <div className="p-4">
        {tab === 'guardians' && <GuardiansPanel />}
        {tab === 'defense' && <DefensePanel />}
        {tab === 'distributors' && <DistributorsPanel />}
        {tab === 'marketplace' && <MarketplacePanel />}
        {tab === 'legal' && <LegalPanel />}
        {tab === 'nfc' && <NFCPanel />}
      </div>
    </div>
  );
}

/* ───────── Guardians ───────── */
function GuardiansPanel() {
  const fn = useServerFn(guardianLeaderboard);
  const [data, setData] = useState<any>(null);
  useEffect(() => { fn({}).then(setData); }, []);
  if (!data) return <Loader2 className="animate-spin text-emerald-600" />;
  return (
    <div>
      <p className="text-xs text-gray-500 mb-3">Top customers protecting the brand. Refreshes seasonally.</p>
      {data.entries.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">No Guardians yet.</p>
      ) : (
        <ol className="space-y-1.5">
          {data.entries.slice(0, 20).map((e: any) => (
            <li key={e.rank} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2 text-sm">
              <span className="w-7 h-7 rounded-full bg-white grid place-items-center font-black text-xs">{e.rank}</span>
              <span className="flex-1 font-semibold truncate">{e.name}</span>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${tierClass(e.tier)}`}>{e.tier}</span>
              <span className="font-black text-emerald-700 w-14 text-right text-xs">{e.points} pt</span>
            </li>
          ))}
        </ol>
      )}
      <p className="text-[11px] text-gray-400 mt-3">🌐 Public view: <a href="/verify/wall" target="_blank" className="text-emerald-700 underline font-bold">/verify/wall</a></p>
    </div>
  );
}
function tierClass(t: string) {
  if (t === 'platinum') return 'bg-slate-200 text-slate-900';
  if (t === 'gold') return 'bg-yellow-200 text-yellow-900';
  if (t === 'silver') return 'bg-gray-200 text-gray-800';
  return 'bg-orange-200 text-orange-900';
}

/* ───────── Defense ───────── */
function DefensePanel() {
  const fn = useServerFn(velocityCheck);
  const [data, setData] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try { setData(await fn({})); } catch (e: any) { alert(e.message); } finally { setBusy(false); }
  };
  useEffect(() => { run(); }, []);
  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-3">
        <div>
          <h4 className="font-bold text-sm">Velocity anomaly detection</h4>
          <p className="text-xs text-gray-500">10× spike vs 7-day baseline = cloning suspect.</p>
        </div>
        <button onClick={run} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg px-3 py-1.5 disabled:opacity-50 flex items-center gap-1.5">
          {busy ? <Loader2 className="animate-spin" size={12} /> : <Activity size={12} />} Re-scan
        </button>
      </div>
      {data && (
        <>
          <p className="text-xs text-gray-600 mb-2">Last 1h: <b>{data.totalLast1h}</b> scans · <b className={data.anomalies.length > 0 ? 'text-red-600' : 'text-green-600'}>{data.anomalies.length}</b> anomalies</p>
          {data.anomalies.length === 0 ? (
            <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">✅ No suspicious spikes detected.</p>
          ) : (
            <ul className="space-y-1.5">
              {data.anomalies.map((a: any, i: number) => (
                <li key={i} className="bg-red-50 border border-red-200 rounded-lg p-2 flex items-center gap-2 text-xs">
                  <ShieldAlert size={14} className="text-red-600 shrink-0" />
                  <span className="font-bold capitalize flex-1">{a.city}</span>
                  <span className="text-gray-600">{a.last1h} scans · baseline {a.baselineHourly}/h</span>
                  <span className="font-black text-red-700">{a.spike}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

/* ───────── Distributors ───────── */
function DistributorsPanel() {
  const list = useServerFn(listDistributors);
  const health = useServerFn(distributorHealth);
  const save = useServerFn(saveDistributor);
  const del = useServerFn(deleteDistributor);
  const [items, setItems] = useState<any[]>([]);
  const [healthMap, setHealthMap] = useState<Record<string, any>>({});
  const [form, setForm] = useState({ name: '', region: '', contact_name: '', contact_phone: '', contact_email: '', status: 'active' as 'active' | 'suspended' | 'investigation' });
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    const [a, b] = await Promise.all([list({}), health({})]);
    setItems(a.distributors || []);
    const m: Record<string, any> = {};
    (b.distributors || []).forEach((d: any) => { m[d.id] = d; });
    setHealthMap(m);
  };
  useEffect(() => { refresh(); }, []);

  const add = async () => {
    if (!form.name.trim()) return alert('Name required');
    setBusy(true);
    try {
      await save({ data: form });
      setForm({ name: '', region: '', contact_name: '', contact_phone: '', contact_email: '', status: 'active' });
      await refresh();
    } catch (e: any) { alert(e.message); } finally { setBusy(false); }
  };
  const updateStatus = async (id: string, status: 'active' | 'suspended' | 'investigation') => {
    const d = items.find(x => x.id === id); if (!d) return;
    await save({ data: { id, name: d.name, region: d.region || '', status } });
    await refresh();
  };
  const remove = async (id: string) => {
    if (!confirm('Delete distributor?')) return;
    await del({ data: { id } }); await refresh();
  };

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-3">
        <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Name *" className="border rounded-lg px-2 py-1.5 text-xs md:col-span-2" />
        <input value={form.region} onChange={e => setForm({ ...form, region: e.target.value })} placeholder="Region" className="border rounded-lg px-2 py-1.5 text-xs" />
        <input value={form.contact_phone} onChange={e => setForm({ ...form, contact_phone: e.target.value })} placeholder="Phone" className="border rounded-lg px-2 py-1.5 text-xs" />
        <input value={form.contact_email} onChange={e => setForm({ ...form, contact_email: e.target.value })} placeholder="Email" className="border rounded-lg px-2 py-1.5 text-xs" />
        <button onClick={add} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg px-2 py-1.5 flex items-center justify-center gap-1 disabled:opacity-50">
          <Plus size={12} /> Add
        </button>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-4">No distributors yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map(d => {
            const h = healthMap[d.id];
            const auto = h && h.flagRate >= 5;
            return (
              <li key={d.id} className="bg-gray-50 rounded-lg p-2.5 flex items-center gap-2 text-xs">
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate">{d.name} <span className="text-gray-400 font-normal">· {d.region || '—'}</span></p>
                  <p className="text-[10px] text-gray-500 truncate">{d.contact_phone || ''} {d.contact_email ? '· ' + d.contact_email : ''}</p>
                </div>
                {h && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    h.health === 'critical' ? 'bg-red-100 text-red-800' :
                    h.health === 'warning' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
                  }`}>{h.flagRate}% flagged · {h.totalCodes} codes</span>
                )}
                <select value={d.status} onChange={e => updateStatus(d.id, e.target.value as any)}
                  className={`text-[10px] font-bold rounded-full px-2 py-0.5 border-0 ${
                    d.status === 'suspended' ? 'bg-red-100 text-red-800' :
                    d.status === 'investigation' ? 'bg-yellow-100 text-yellow-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                  <option value="active">active</option>
                  <option value="investigation">investigation</option>
                  <option value="suspended">suspended</option>
                </select>
                {auto && d.status === 'active' && (
                  <button onClick={() => updateStatus(d.id, 'suspended')} title="Auto-suspend recommended (>5% flag rate)"
                    className="text-red-600 hover:text-red-800"><AlertTriangle size={14} /></button>
                )}
                <button onClick={() => remove(d.id)} className="text-gray-400 hover:text-red-600"><Trash2 size={12} /></button>
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-[11px] text-gray-400 mt-3">Auto-suspend hint appears when distributor's flagged code rate ≥ 5%.</p>
    </div>
  );
}

/* ───────── Marketplace ───────── */
function MarketplacePanel() {
  const list = useServerFn(listMarketplaceListings);
  const submit = useServerFn(submitMarketplaceListing);
  const upd = useServerFn(updateMarketplaceListing);
  const [items, setItems] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ platform: 'amazon' as 'amazon'|'flipkart'|'meesho'|'jiomart'|'other', listing_url: '', seller_name: '', listed_price: '', our_mrp: '', paste_text: '' });

  const refresh = async () => { const r = await list({}); setItems(r.listings || []); };
  useEffect(() => { refresh(); }, []);

  const analyze = async () => {
    if (!form.listing_url) return alert('Listing URL required');
    setBusy(true);
    try {
      await submit({ data: {
        platform: form.platform,
        listing_url: form.listing_url,
        seller_name: form.seller_name || undefined,
        listed_price: form.listed_price ? Number(form.listed_price) : undefined,
        our_mrp: form.our_mrp ? Number(form.our_mrp) : undefined,
        paste_text: form.paste_text || undefined,
      }});
      setForm({ platform: 'amazon', listing_url: '', seller_name: '', listed_price: '', our_mrp: '', paste_text: '' });
      await refresh();
    } catch (e: any) { alert(e.message); } finally { setBusy(false); }
  };
  const setStatus = async (id: string, status: 'open'|'takedown_sent'|'resolved'|'dismissed') => {
    await upd({ data: { id, status } }); await refresh();
  };

  return (
    <div>
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
        <h4 className="font-bold text-sm flex items-center gap-1"><ShoppingCart size={14} /> Submit suspicious listing</h4>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mt-2">
          <select value={form.platform} onChange={e => setForm({...form, platform: e.target.value as any})} className="border rounded-lg px-2 py-1.5 text-xs">
            <option value="amazon">Amazon</option><option value="flipkart">Flipkart</option><option value="meesho">Meesho</option><option value="jiomart">JioMart</option><option value="other">Other</option>
          </select>
          <input value={form.listing_url} onChange={e => setForm({...form, listing_url: e.target.value})} placeholder="Listing URL *" className="border rounded-lg px-2 py-1.5 text-xs md:col-span-3" />
          <input value={form.seller_name} onChange={e => setForm({...form, seller_name: e.target.value})} placeholder="Seller" className="border rounded-lg px-2 py-1.5 text-xs" />
          <button onClick={analyze} disabled={busy} className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg px-2 py-1.5 disabled:opacity-50 flex items-center justify-center gap-1">
            {busy ? <Loader2 className="animate-spin" size={12} /> : '🤖'} Analyze
          </button>
          <input type="number" value={form.listed_price} onChange={e => setForm({...form, listed_price: e.target.value})} placeholder="Listed ₹" className="border rounded-lg px-2 py-1.5 text-xs" />
          <input type="number" value={form.our_mrp} onChange={e => setForm({...form, our_mrp: e.target.value})} placeholder="Our MRP ₹" className="border rounded-lg px-2 py-1.5 text-xs" />
          <textarea value={form.paste_text} onChange={e => setForm({...form, paste_text: e.target.value})} placeholder="Paste listing text (optional, helps AI)" rows={2} className="border rounded-lg px-2 py-1.5 text-xs md:col-span-4" />
        </div>
        <p className="text-[10px] text-amber-700 mt-2">Gemini analyzes price, seller, description → returns verdict + confidence.</p>
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-4">No listings submitted yet.</p>
      ) : (
        <ul className="space-y-2">
          {items.map(l => (
            <li key={l.id} className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase shrink-0 ${
                  l.ai_verdict === 'likely_counterfeit' ? 'bg-red-200 text-red-900' :
                  l.ai_verdict === 'suspicious' ? 'bg-amber-200 text-amber-900' :
                  l.ai_verdict === 'authentic' ? 'bg-green-200 text-green-900' : 'bg-gray-200 text-gray-700'
                }`}>{(l.ai_verdict || 'unknown').replace('_',' ')} · {l.ai_confidence || 0}%</span>
                <div className="flex-1 min-w-0">
                  <a href={l.listing_url} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-blue-700 hover:underline flex items-center gap-1 truncate">
                    {l.platform} · {l.seller_name || 'unknown seller'} <ExternalLink size={10} />
                  </a>
                  <p className="text-[11px] text-gray-600 mt-0.5">₹{l.listed_price ?? '—'} vs MRP ₹{l.our_mrp ?? '—'} {l.discount_pct !== null ? `(${l.discount_pct}% off)` : ''}</p>
                  {l.ai_notes && <p className="text-[10px] text-gray-500 mt-1 italic">{l.ai_notes}</p>}
                </div>
                <select value={l.status} onChange={e => setStatus(l.id, e.target.value as any)} className="text-[10px] font-bold rounded-full px-2 py-0.5 border bg-white">
                  <option value="open">open</option>
                  <option value="takedown_sent">takedown sent</option>
                  <option value="resolved">resolved</option>
                  <option value="dismissed">dismissed</option>
                </select>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ───────── Legal ───────── */
function LegalPanel() {
  const list = useServerFn(listLegalCases);
  const get = useServerFn(getLegalCase);
  const upd = useServerFn(updateLegalCase);
  const gen = useServerFn(generateCeaseDesist);
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState<any>(null);
  const [recipient, setRecipient] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const refresh = async () => { const r = await list({}); setItems(r.cases || []); };
  useEffect(() => { refresh(); }, []);

  const create = async () => {
    setBusy(true);
    try {
      const r = await gen({ data: { recipient: recipient || undefined, brand: 'NutroPact' } });
      setRecipient('');
      await refresh();
      const full = await get({ data: { id: r.case.id } });
      setOpen(full.case);
    } catch (e: any) { alert(e.message); } finally { setBusy(false); }
  };
  const openCase = async (id: string) => { const r = await get({ data: { id } }); setOpen(r.case); };
  const setStatus = async (id: string, status: any) => { await upd({ data: { id, status } }); await refresh(); };
  const copyDoc = async () => {
    await navigator.clipboard.writeText(open.body_markdown);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div>
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-3 flex items-center gap-2">
        <Scale size={16} className="text-purple-700" />
        <input value={recipient} onChange={e => setRecipient(e.target.value)} placeholder="Recipient (optional)" className="border rounded-lg px-2 py-1.5 text-xs flex-1" />
        <button onClick={create} disabled={busy} className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg px-3 py-1.5 disabled:opacity-50">
          {busy ? <Loader2 className="animate-spin" size={12} /> : '+ Generate C&D'}
        </button>
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-4">No legal cases yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map(c => (
            <li key={c.id} className="bg-gray-50 rounded-lg p-2 flex items-center gap-2 text-xs">
              <button onClick={() => openCase(c.id)} className="flex-1 text-left truncate font-bold text-purple-800 hover:underline">{c.subject}</button>
              <span className="text-[10px] text-gray-500">{new Date(c.created_at).toLocaleDateString()}</span>
              <select value={c.status} onChange={e => setStatus(c.id, e.target.value)} className="text-[10px] font-bold rounded-full px-2 py-0.5 border bg-white">
                <option value="draft">draft</option><option value="sent">sent</option><option value="acknowledged">ack</option><option value="resolved">resolved</option><option value="escalated">escalated</option>
              </select>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <div className="fixed inset-0 bg-black/60 z-50 grid place-items-center p-4" onClick={() => setOpen(null)}>
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-3 border-b flex items-center gap-2">
              <h3 className="font-black text-sm flex-1 truncate">{open.subject}</h3>
              <button onClick={copyDoc} className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg px-3 py-1.5 flex items-center gap-1">
                {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? 'Copied' : 'Copy'}
              </button>
              <button onClick={() => setOpen(null)} className="text-gray-400 hover:text-gray-700">✕</button>
            </div>
            <pre className="flex-1 overflow-auto p-4 text-xs whitespace-pre-wrap font-mono text-gray-800">{open.body_markdown}</pre>
            <p className="text-[10px] text-gray-500 p-2 border-t bg-amber-50">⚠️ Draft only. Review with qualified legal counsel before dispatch.</p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────── NFC ───────── */
function NFCPanel() {
  const verifyHost = typeof window !== 'undefined' ? window.location.origin : 'https://nutropact.com';
  const sample = `${verifyHost}/verify/NP240001-ABCD1234`;
  return (
    <div className="space-y-3 text-sm">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <h4 className="font-bold flex items-center gap-2"><Radio size={14} className="text-blue-600" /> NFC tap-to-verify (NTAG 213/215/216)</h4>
        <p className="text-xs text-gray-600 mt-1">Same product code, two trigger surfaces: QR (camera) + NFC (tap). NFC counter auto-increments per tap — clones can be detected without an app.</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-3">
        <h5 className="font-bold text-xs mb-2">📦 Hardware (BOM)</h5>
        <ul className="text-xs space-y-1 list-disc pl-5 text-gray-700">
          <li><b>NTAG 213</b> — ₹6-10/unit · 144 bytes · sufficient for verify URL</li>
          <li><b>NTAG 424 DNA</b> — ₹25-35/unit · adds SUN (cryptographic one-time authentication) — recommended for high-value SKUs</li>
          <li>Vendors: Inkode, Identiv, Cardlogix (bulk 1000+)</li>
        </ul>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-3">
        <h5 className="font-bold text-xs mb-2">⚙️ Programming guide (NXP TagWriter Android app)</h5>
        <ol className="text-xs space-y-1 list-decimal pl-5 text-gray-700">
          <li>Generate codes via this admin → Phase 1 panel</li>
          <li>Export CSV → batch URLs (one per row)</li>
          <li>NXP TagWriter → "Write multiple tags" → URI record</li>
          <li>For NTAG 424 DNA: enable SUN mode → URL template:<br/>
            <code className="block bg-gray-100 p-2 rounded mt-1 text-[10px] break-all">{sample}?nfc=%c&ctr=%i</code>
          </li>
          <li>Server reads <code>nfc</code> + <code>ctr</code> params, validates SUN MAC, increments counter</li>
        </ol>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
        <h5 className="font-bold text-xs mb-1">🛡️ Anti-clone logic (already in verifyAuthCode)</h5>
        <p className="text-xs text-gray-700">If NFC counter drops or repeats → status auto-set to <code className="bg-white px-1 rounded">flagged_duplicate</code> + admin alert. NTAG 424 DNA's CMAC ensures URL can't be copied to another tag.</p>
      </div>

      <p className="text-[11px] text-gray-400">Cost-effective rollout: NTAG 213 on bulk SKUs (whey 1kg+), NTAG 424 DNA on premium creatine & limited editions.</p>
    </div>
  );
}
