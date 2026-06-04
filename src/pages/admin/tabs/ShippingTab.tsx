// @ts-nocheck
import { useEffect, useState } from 'react';
import axios from 'axios';
import { Save, Truck, MapPin, CheckCircle, XCircle, Loader2, ExternalLink, Plus, Trash2, Star } from 'lucide-react';
import { TabHelp } from "./_TabHelp";


const AdminAPI = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });


type CarrierId = 'shiprocket' | 'delhivery' | 'bluedart' | 'shipmozo' | 'ekart' | 'amazon_shipping' | 'indiapost' | 'dtdc';

type Field = { key: string; label: string; type?: 'text' | 'password' | 'select'; options?: string[]; placeholder?: string; hint?: string };
type Kind = 'aggregator' | 'direct';

const CARRIERS: { id: CarrierId; name: string; logo: string; docsUrl: string; status: 'full' | 'partial' | 'manual'; kind: Kind; commission: string; description: string; fields: Field[] }[] = [
  // ───────── Aggregators ─────────
  {
    id: 'shiprocket', name: 'Shiprocket', logo: '🚀', status: 'full', kind: 'aggregator',
    commission: '₹0 platform fee · per-shipment markup ~₹2–8 over courier rate',
    docsUrl: 'https://apidocs.shiprocket.in/',
    description: 'India ka #1 multi-courier aggregator. Ek hi API se Delhivery, Bluedart, Ekart, DTDC, India Post — sab.',
    fields: [
      { key: 'email', label: 'Login Email', placeholder: 'you@store.com' },
      { key: 'password', label: 'Login Password', type: 'password' },
      { key: 'pickupLocation', label: 'Pickup Location Nickname', placeholder: 'Primary', hint: 'Shiprocket dashboard → Settings → Pickup Addresses se' },
      { key: 'channelId', label: 'Channel ID (optional)', placeholder: 'leave blank for default' },
    ],
  },
  {
    id: 'shipmozo', name: 'Shipmozo', logo: '🛵', status: 'full', kind: 'aggregator',
    commission: 'Subscription tiers · 0% commission on COD remittance in lower plans',
    docsUrl: 'https://docs.shipmozo.com/',
    description: 'Multi-courier aggregator with competitive rates.',
    fields: [
      { key: 'publicKey', label: 'Public Key' },
      { key: 'privateKey', label: 'Private Key', type: 'password' },
    ],
  },

  // ───────── Direct Carriers ─────────
  {
    id: 'delhivery', name: 'Delhivery', logo: '📦', status: 'full', kind: 'direct',
    commission: 'Contract-based slab rates · COD fee ~1.5–2% or ₹35 (whichever higher)',
    docsUrl: 'https://track.delhivery.com/api-portal/',
    description: 'Direct integration. India ke 18,500+ pincodes par delivery.',
    fields: [
      { key: 'apiToken', label: 'API Token', type: 'password', hint: 'Delhivery One panel → API & Webhooks' },
      { key: 'clientName', label: 'Client / Warehouse Name', placeholder: 'YOUR-CLIENT-NAME' },
      { key: 'mode', label: 'Environment', type: 'select', options: ['production', 'staging'] },
    ],
  },
  {
    id: 'bluedart', name: 'Bluedart', logo: '✈️', status: 'partial', kind: 'direct',
    commission: 'Premium contract rates · fuel surcharge ~25–35% + COD fee 2%',
    docsUrl: 'https://www.bluedart.com/web/guest/apiintegration',
    description: 'Premium express + air. Requires merchant contract for API access.',
    fields: [
      { key: 'licenseKey', label: 'License Key', type: 'password' },
      { key: 'loginId', label: 'Login ID' },
      { key: 'customerCode', label: 'Customer Code' },
      { key: 'areaCode', label: 'Origin Area Code', placeholder: 'BOM' },
    ],
  },
  {
    id: 'dtdc', name: 'DTDC', logo: '🚚', status: 'partial', kind: 'direct',
    commission: 'Contract slab rates · COD fee ~1.75% or ₹30',
    docsUrl: 'https://apipreprod.dtdc.in/',
    description: 'Pan-India courier. Use direct DTDC API or via Shiprocket.',
    fields: [
      { key: 'accessToken', label: 'Access Token', type: 'password' },
      { key: 'customerCode', label: 'Customer Code' },
    ],
  },
  {
    id: 'ekart', name: 'Ekart Logistics', logo: '🛒', status: 'manual', kind: 'direct',
    commission: 'Negotiated merchant rates · no public rate card',
    docsUrl: 'https://ekartlogistics.com/contactus',
    description: 'Flipkart-owned. No public self-serve API — onboarding through Ekart sales team. Use via Shiprocket instead, or store credentials here once you have merchant access.',
    fields: [
      { key: 'merchantCode', label: 'Merchant Code' },
      { key: 'apiKey', label: 'API Key', type: 'password' },
    ],
  },
  {
    id: 'amazon_shipping', name: 'Amazon Shipping', logo: '📮', status: 'manual', kind: 'direct',
    commission: 'Per-shipment slab (~₹40–80 base) · no COD support',
    docsUrl: 'https://developer-docs.amazon.com/sp-api/',
    description: 'Amazon Shipping (Easy Ship / MCF). SP-API merchant onboarding required. Aggregator (Shiprocket) recommended for now.',
    fields: [
      { key: 'sellerId', label: 'Seller ID' },
      { key: 'refreshToken', label: 'SP-API Refresh Token', type: 'password' },
      { key: 'clientId', label: 'LWA Client ID' },
      { key: 'clientSecret', label: 'LWA Client Secret', type: 'password' },
    ],
  },
  {
    id: 'indiapost', name: 'India Post', logo: '🏤', status: 'manual', kind: 'direct',
    commission: 'Govt rate card · cheapest for remote pincodes · COD fee ~₹25',
    docsUrl: 'https://www.indiapost.gov.in/VAS/Pages/Businesssolutions/E-CommercePortal.aspx',
    description: 'eCommerce portal contract required. No public REST API. Best route: Shiprocket → India Post.',
    fields: [
      { key: 'customerId', label: 'eCom Customer ID' },
      { key: 'apiKey', label: 'API Key', type: 'password' },
    ],
  },
];

const STATUS_BADGE = {
  full: { label: 'Full API', cls: 'bg-green-100 text-green-700' },
  partial: { label: 'Contract API', cls: 'bg-amber-100 text-amber-700' },
  manual: { label: 'Manual / Aggregator', cls: 'bg-gray-100 text-gray-600' },
};

type PickupLocation = { id: string; label: string; name: string; phone: string; address: string; city: string; state: string; pincode: string; isDefault?: boolean };

const emptyLoc = (): PickupLocation => ({ id: `loc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`, label: 'Warehouse', name: '', phone: '', address: '', city: '', state: '', pincode: '', isDefault: false });

const DEFAULTS = {
  defaultCarrier: '' as CarrierId | '',
  originPincode: '',
  originAddress: { name: '', phone: '', address: '', city: '', state: '', pincode: '' },
  pickupLocations: [] as PickupLocation[],
  carriers: {} as Partial<Record<CarrierId, Record<string, any> & { enabled?: boolean }>>,
  automation: { enabled: true, delayMinutes: 120, priorityDelayMinutes: 10, volumetricDivisor: 5000 } as { enabled?: boolean; delayMinutes?: number; priorityDelayMinutes?: number; volumetricDivisor?: number },
};

export default function ShippingTab() {
  const [s, setS] = useState<typeof DEFAULTS | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [openId, setOpenId] = useState<CarrierId | null>(null);
  const [testing, setTesting] = useState<CarrierId | null>(null);
  const [testResult, setTestResult] = useState<Record<string, { ok: boolean; msg: string }>>({});


  useEffect(() => {
    AdminAPI.get('/admin/settings')
      .then(r => {
        const sh = r.data?.shipping || {};
        // Migrate single originAddress → first pickupLocation if missing
        let locs: PickupLocation[] = Array.isArray(sh.pickupLocations) ? sh.pickupLocations : [];
        if (locs.length === 0 && (sh.originAddress?.pincode || sh.originPincode)) {
          locs = [{ ...emptyLoc(), label: 'Primary', ...sh.originAddress, pincode: sh.originAddress?.pincode || sh.originPincode || '', isDefault: true }];
        }
        if (locs.length > 0 && !locs.some(l => l.isDefault)) locs[0].isDefault = true;
        setS({ ...DEFAULTS, ...sh, carriers: { ...DEFAULTS.carriers, ...(sh.carriers || {}) }, originAddress: { ...DEFAULTS.originAddress, ...(sh.originAddress || {}) }, pickupLocations: locs, automation: { ...DEFAULTS.automation, ...(sh.automation || {}) } });
      })
      .catch(() => setS({ ...DEFAULTS }));
  }, []);


  const setField = (k: string, v: any) => setS(p => p ? { ...p, [k]: v } : p);
  const setOrigin = (k: string, v: string) => setS(p => p ? { ...p, originAddress: { ...p.originAddress, [k]: v } } : p);
  const setCarrier = (id: CarrierId, k: string, v: any) => setS(p => p ? { ...p, carriers: { ...p.carriers, [id]: { ...(p.carriers[id] || {}), [k]: v } } } : p);
  const toggleCarrier = (id: CarrierId, on: boolean) => setCarrier(id, 'enabled', on);
  const setAuto = (k: string, v: any) => setS(p => p ? { ...p, automation: { ...(p.automation || {}), [k]: v } } : p);

  const setLoc = (id: string, k: keyof PickupLocation, v: any) => setS(p => p ? { ...p, pickupLocations: p.pickupLocations.map(l => l.id === id ? { ...l, [k]: v } : l) } : p);
  const addLoc = () => setS(p => p ? { ...p, pickupLocations: [...p.pickupLocations, { ...emptyLoc(), label: `Warehouse ${p.pickupLocations.length + 1}`, isDefault: p.pickupLocations.length === 0 }] } : p);
  const removeLoc = (id: string) => setS(p => {
    if (!p) return p;
    const next = p.pickupLocations.filter(l => l.id !== id);
    if (next.length && !next.some(l => l.isDefault)) next[0].isDefault = true;
    return { ...p, pickupLocations: next };
  });
  const makeDefaultLoc = (id: string) => setS(p => p ? { ...p, pickupLocations: p.pickupLocations.map(l => ({ ...l, isDefault: l.id === id })) } : p);

  const save = async () => {
    if (!s) return;
    setSaving(true);
    try {
      // Sync default pickup location into legacy originAddress/originPincode fields so existing carrier adapters keep working
      const def = s.pickupLocations.find(l => l.isDefault) || s.pickupLocations[0];
      const merged = def
        ? { ...s, originAddress: { name: def.name, phone: def.phone, address: def.address, city: def.city, state: def.state, pincode: def.pincode }, originPincode: def.pincode || s.originPincode }
        : s;
      const cur = await AdminAPI.get('/admin/settings').then(r => r.data || {});
      await AdminAPI.put('/admin/settings', { ...cur, shipping: merged });
      setSaved(true); setTimeout(() => setSaved(false), 2500);
    } catch { alert('Save failed'); }
    setSaving(false);
  };


  const test = async (id: CarrierId) => {
    setTesting(id);
    try {
      await save();
      const r = await fetch('/api/shipping/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ carrier: id }),
      });
      const text = await r.text();
      let j: any = {};
      try { j = JSON.parse(text); } catch { j = { ok: false, error: `Server returned non-JSON (HTTP ${r.status})` }; }
      setTestResult(p => ({ ...p, [id]: { ok: !!j?.ok, msg: j?.message || j?.error || (j?.ok ? 'OK' : `HTTP ${r.status}`) } }));
    } catch (e: any) {
      setTestResult(p => ({ ...p, [id]: { ok: false, msg: e?.message || 'Test failed' } }));
    }
    setTesting(null);
  };


  if (!s) return <div className="space-y-3">{[...Array(6)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div>;

  const enabledCarriers = (Object.entries(s.carriers) as [CarrierId, any][]).filter(([, v]) => v?.enabled).map(([k]) => k);

  return (
    <div className="space-y-6 max-w-4xl">
      <TabHelp topic="shipping" />
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-black flex items-center gap-2"><Truck size={18} className="text-orange-500" /> Shipping & Logistics</h2>
          <p className="text-sm text-gray-500">Just paste the API keys — shipment creation / rate fetch happens automatically.</p>
        </div>
        <button onClick={save} disabled={saving}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition ${saved ? 'bg-green-500 text-white' : 'bg-orange-500 text-white hover:bg-orange-600'} disabled:opacity-50`}>
          <Save size={15} />{saved ? 'Saved!' : saving ? 'Saving…' : 'Save All'}
        </button>
      </div>

      {/* Pickup / Origin — multiple addresses */}
      <section className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h3 className="font-black text-sm flex items-center gap-2"><MapPin size={14} className="text-orange-500" /> Pickup / Origin Addresses</h3>
            <p className="text-xs text-gray-400 mt-0.5">You can add multiple warehouses. Pickup happens from the default one (admin can override per order).</p>
          </div>
          <button onClick={addLoc} className="text-xs font-bold px-3 py-2 rounded-lg bg-orange-500 text-white hover:bg-orange-600 inline-flex items-center gap-1.5">
            <Plus size={12} /> Add Address
          </button>
        </div>

        {s.pickupLocations.length === 0 && (
          <div className="text-xs text-gray-500 bg-gray-50 border border-dashed border-gray-200 rounded-xl p-4 text-center">
            No pickup address configured. <button onClick={addLoc} className="text-orange-500 font-bold hover:underline">+ Add your first warehouse</button>
          </div>
        )}

        {s.pickupLocations.map((loc, idx) => (
          <div key={loc.id} className={`rounded-xl border p-4 space-y-3 ${loc.isDefault ? 'border-orange-200 bg-orange-50/30' : 'border-gray-100 bg-gray-50/40'}`}>
            <div className="flex items-center gap-2 flex-wrap">
              <input value={loc.label} onChange={e => setLoc(loc.id, 'label', e.target.value)} placeholder={`Warehouse ${idx + 1}`}
                className="flex-1 min-w-[140px] border rounded-lg px-3 py-1.5 text-sm font-bold focus:outline-none focus:border-orange-400" />
              {loc.isDefault ? (
                <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-orange-500 text-white inline-flex items-center gap-1"><Star size={10} fill="white" /> DEFAULT</span>
              ) : (
                <button onClick={() => makeDefaultLoc(loc.id)} className="text-[11px] font-bold text-orange-600 hover:underline inline-flex items-center gap-1"><Star size={11} /> Make default</button>
              )}
              <button onClick={() => removeLoc(loc.id)} disabled={s.pickupLocations.length === 1} className="text-[11px] font-bold text-red-500 hover:text-red-600 disabled:opacity-30 inline-flex items-center gap-1">
                <Trash2 size={11} /> Remove
              </button>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <input value={loc.name} onChange={e => setLoc(loc.id, 'name', e.target.value)} placeholder="Contact name" className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" />
              <input value={loc.phone} onChange={e => setLoc(loc.id, 'phone', e.target.value)} placeholder="Phone" className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" />
              <input value={loc.address} onChange={e => setLoc(loc.id, 'address', e.target.value)} placeholder="Street address" className="sm:col-span-2 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" />
              <input value={loc.city} onChange={e => setLoc(loc.id, 'city', e.target.value)} placeholder="City" className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" />
              <input value={loc.state} onChange={e => setLoc(loc.id, 'state', e.target.value)} placeholder="State" className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" />
              <input value={loc.pincode} onChange={e => setLoc(loc.id, 'pincode', e.target.value)} placeholder="Pincode (6 digits)" maxLength={6}
                className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" />
            </div>
          </div>
        ))}
      </section>

      {/* Automation */}
      <section className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h3 className="font-black text-sm flex items-center gap-2">🤖 Shipment Automation</h3>
            <p className="text-xs text-gray-400 mt-0.5">Once confirmed, the order is automatically packed, rate-compared, and booked. Defaults are fine for most setups.</p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer shrink-0">
            <input type="checkbox" checked={s.automation?.enabled !== false} onChange={e => setAuto('enabled', e.target.checked)} className="w-4 h-4 accent-orange-500" />
            <span className="text-xs font-bold text-gray-600">Enabled</span>
          </label>
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[11px] font-bold text-gray-500 block mb-1">Normal delay (mins)</label>
            <input type="number" min={0} value={s.automation?.delayMinutes ?? 120} onChange={e => setAuto('delayMinutes', Number(e.target.value) || 0)}
              className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400" />
            <p className="text-[10px] text-gray-400 mt-1">Minutes after the order is placed before auto-ship triggers. Default 120.</p>
          </div>
          <div>
            <label className="text-[11px] font-bold text-gray-500 block mb-1">Priority delay (mins)</label>
            <input type="number" min={0} value={s.automation?.priorityDelayMinutes ?? 10} onChange={e => setAuto('priorityDelayMinutes', Number(e.target.value) || 0)}
              className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400" />
            <p className="text-[10px] text-gray-400 mt-1">Delay for fast-delivery orders. Default 10.</p>
          </div>
          <div>
            <label className="text-[11px] font-bold text-gray-500 block mb-1">Volumetric divisor</label>
            <input type="number" min={1000} value={s.automation?.volumetricDivisor ?? 5000} onChange={e => setAuto('volumetricDivisor', Number(e.target.value) || 5000)}
              className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400" />
            <p className="text-[10px] text-gray-400 mt-1">(L×W×H)/divisor → volumetric weight in kg. Indian couriers typically use 5000.</p>
          </div>
        </div>
      </section>



      {/* Default carrier */}
      <section className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
        <h3 className="font-black text-sm">Default Carrier</h3>
        <p className="text-xs text-gray-400 -mt-2">New orders ship through this carrier (admin can override).</p>
        <select value={s.defaultCarrier || ''} onChange={e => setField('defaultCarrier', e.target.value)}
          className="w-full sm:w-80 border rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-orange-400">
          <option value="">— Select default —</option>
          {enabledCarriers.map(id => {
            const c = CARRIERS.find(x => x.id === id)!;
            return <option key={id} value={id}>{c.logo} {c.name}</option>;
          })}
        </select>
        {enabledCarriers.length === 0 && <p className="text-xs text-amber-600">⚠ No carrier enabled yet — enable one below.</p>}
      </section>

      {/* Carriers list — grouped by kind */}
      {(['aggregator', 'direct'] as Kind[]).map(kind => {
        const list = CARRIERS.filter(c => c.kind === kind);
        const heading = kind === 'aggregator' ? 'Aggregators' : 'Direct Carriers';
        const sub = kind === 'aggregator'
          ? 'Multiple couriers from a single login. They charge commission/markup but onboarding is fast.'
          : 'Direct courier contracts. Apni slab rates, no aggregator markup — but separate KYC each.';
        return (
          <section key={kind} className="space-y-3">
            <div className="px-1">
              <h3 className="font-black text-sm">{heading}</h3>
              <p className="text-[11px] text-gray-400">{sub}</p>
            </div>
            {list.map(c => {
              const cfg = s.carriers[c.id] || {};
              const isOpen = openId === c.id;
              const badge = STATUS_BADGE[c.status];
              const res = testResult[c.id];
              return (
                <div key={c.id} className={`bg-white rounded-2xl border transition ${cfg.enabled ? 'border-orange-200 shadow-sm' : 'border-gray-100'}`}>
                  <div className="flex items-center gap-3 p-4">
                    <div className="text-2xl">{c.logo}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-black text-sm">{c.name}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 uppercase">{c.kind}</span>
                        {cfg.enabled && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">ENABLED</span>}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{c.description}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">💰 {c.commission}</p>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer shrink-0">
                      <input type="checkbox" checked={!!cfg.enabled} onChange={e => toggleCarrier(c.id, e.target.checked)} className="w-4 h-4 accent-orange-500" />
                      <span className="text-xs font-bold text-gray-500">On</span>
                    </label>
                    <button onClick={() => setOpenId(isOpen ? null : c.id)} className="text-xs font-bold text-orange-500 hover:underline px-3">{isOpen ? 'Close' : 'Configure'}</button>
                  </div>
                  {isOpen && (
                    <div className="border-t border-gray-100 p-4 space-y-3 bg-gray-50/50">
                      <p className="text-xs text-gray-500">{c.description}</p>
                      <p className="text-[11px] text-gray-500"><b>Pricing:</b> {c.commission}</p>
                      <a href={c.docsUrl} target="_blank" rel="noopener" className="text-xs font-bold text-orange-500 hover:underline inline-flex items-center gap-1">API docs <ExternalLink size={11} /></a>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {c.fields.map(f => (
                          <div key={f.key} className={f.type === 'select' || c.fields.length === 1 ? 'sm:col-span-2' : ''}>
                            <label className="text-[11px] font-bold text-gray-500 block mb-1">{f.label}</label>
                            {f.type === 'select' ? (
                              <select value={cfg[f.key] || ''} onChange={e => setCarrier(c.id, f.key, e.target.value)}
                                className="w-full border rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-orange-400">
                                <option value="">—</option>
                                {f.options!.map(o => <option key={o} value={o}>{o}</option>)}
                              </select>
                            ) : (
                              <input type={f.type === 'password' ? 'password' : 'text'} value={cfg[f.key] || ''} onChange={e => setCarrier(c.id, f.key, e.target.value)} placeholder={f.placeholder}
                                className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400" />
                            )}
                            {f.hint && <p className="text-[10px] text-gray-400 mt-0.5">{f.hint}</p>}
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 pt-2">
                        <button onClick={() => test(c.id)} disabled={testing === c.id || !cfg.enabled}
                          className="text-xs font-bold px-3 py-2 rounded-lg bg-gray-900 text-white hover:bg-black disabled:opacity-50 inline-flex items-center gap-1.5">
                          {testing === c.id ? <Loader2 size={12} className="animate-spin" /> : null} Test Connection
                        </button>
                        {res && (
                          <span className={`text-xs font-bold inline-flex items-center gap-1 ${res.ok ? 'text-green-600' : 'text-red-500'}`}>
                            {res.ok ? <CheckCircle size={12} /> : <XCircle size={12} />} {res.msg}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        );
      })}


      <p className="text-xs text-gray-400 px-1">
        💡 Tip: <b>Aggregators</b> (Shiprocket/Shipmozo) are the fastest to start with — you pay a small markup but get all couriers from one panel. <b>Direct carriers</b> have no commission but each needs its own KYC + minimum volume. You can enable both — the carrier chosen on each order is the one that routes.
      </p>
    </div>
  );
}
