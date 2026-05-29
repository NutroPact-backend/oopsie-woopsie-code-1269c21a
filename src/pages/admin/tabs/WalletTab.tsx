// @ts-nocheck
import { useEffect, useState } from 'react';
import API from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { TabHelp } from "./_TabHelp";
import {
  Wallet, Search, Plus, Minus, History, Gift, Users, TrendingUp, TrendingDown,
  Clock, Zap, Settings as SettingsIcon, Layers, Save, AlertTriangle, RefreshCw,
  ToggleLeft, ToggleRight, BadgeIndianRupee, ShieldCheck,
} from 'lucide-react';

type WalletRow = { userId: string; balance: number; updatedAt: string; profile?: { name: string; email: string; phone: string } | null };
type Txn = { id: string; userId: string; amount: number; type: string; source: string; orderId?: string; note?: string; createdAt: string; expiresAt?: string };
type UserCoupon = { id: string; userId: string; code: string; discountType: string; value: number; minOrder: number; used: boolean; expiresAt?: string; sourceOrderId?: string; createdAt: string };
type Rule = {
  id?: string; code: string; name: string; trigger: string;
  rewardType: 'fixed' | 'percent'; rewardValue: number;
  maxCredit?: number | null; minOrder?: number; expiryDays?: number | null;
  maxPerUser?: number | null; enabled: boolean; mode: 'automatic' | 'manual';
  notes?: string; sortOrder?: number;
};
type WalletSettings = {
  enabled: boolean; currency: string; displayName: string;
  minRedemption: number; maxRedemptionPercent: number; maxRedemptionAmount?: number | null;
  minOrderToRedeem: number; allowOnCOD: boolean; allowOnPrepaid: boolean;
  maxBalancePerUser?: number | null; maxDailyCreditPerUser?: number | null;
  defaultExpiryDays?: number | null; expiryReminderDays: number;
  roundingMode: 'floor' | 'round' | 'ceil';
  notifyOnCredit: boolean; notifyOnDebit: boolean; notifyOnExpiry: boolean;
};

type Section = 'overview' | 'wallets' | 'transactions' | 'rules' | 'bulk' | 'settings' | 'coupons';

const TRIGGER_LABELS: Record<string, string> = {
  signup: 'On Signup',
  first_order: 'On First Order',
  every_order: 'On Every Order',
  order_delivered: 'On Order Delivered',
  birthday: 'On Birthday',
  referral_signup: 'On Referral Signup',
  referral_first_order: 'On Referral First Order',
  review_submitted: 'On Review Submitted',
  manual: 'Manual Only',
};

export default function WalletTab() {
  const [section, setSection] = useState<Section>('overview');

  return (
    <div className="space-y-6">
      <TabHelp topic="wallet" />
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-black flex items-center gap-2"><Wallet size={24} /> NutroPay & Rewards</h2>
          <p className="text-sm text-gray-500 mt-1">Banking-grade NutroPay, automation rules, redemption controls, bulk operations</p>
        </div>
      </header>

      <nav className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {([
          ['overview', 'Overview', <TrendingUp size={14} />],
          ['wallets', 'NutroPay Accounts', <Users size={14} />],
          ['transactions', 'Transactions', <History size={14} />],
          ['rules', 'Automation Rules', <Zap size={14} />],
          ['bulk', 'Bulk Actions', <Layers size={14} />],
          ['settings', 'Settings', <SettingsIcon size={14} />],
          ['coupons', 'Auto Coupons', <Gift size={14} />],
        ] as const).map(([id, label, icon]) => (
          <button key={id} onClick={() => setSection(id)}
            className={`px-3 py-2 font-bold text-sm border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${section === id ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
            {icon} {label}
          </button>
        ))}
      </nav>

      {section === 'overview' && <OverviewPanel />}
      {section === 'wallets' && <WalletsPanel />}
      {section === 'transactions' && <TransactionsPanel />}
      {section === 'rules' && <RulesPanel />}
      {section === 'bulk' && <BulkPanel />}
      {section === 'settings' && <SettingsPanel />}
      {section === 'coupons' && <CouponsPanel />}
    </div>
  );
}

// ─────────────── OVERVIEW ───────────────
function OverviewPanel() {
  const [s, setS] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { API.get('/admin/wallet/overview').then(r => setS(r.data)); }, []);
  const runExpiry = async () => {
    if (!confirm('Run expiry sweep now? This deducts expired credits from users.')) return;
    setBusy(true);
    try { const r = await API.post('/admin/wallet/expire-now'); alert(`Expired ${r.data.expired} NutroPay accounts.`); }
    finally { setBusy(false); }
  };
  if (!s) return <div className="text-gray-400 text-sm">Loading overview...</div>;
  const cards = [
    { label: 'Total Outstanding', value: formatPrice(s.totalBalance), icon: <BadgeIndianRupee />, tone: 'orange' },
    { label: 'Active NutroPay Accounts', value: `${s.activeWallets} / ${s.totalWallets}`, icon: <Users />, tone: 'blue' },
    { label: 'Credits (30d)', value: formatPrice(s.credits30d), icon: <TrendingUp />, tone: 'green' },
    { label: 'Debits (30d)', value: formatPrice(s.debits30d), icon: <TrendingDown />, tone: 'red' },
    { label: 'Expired (30d)', value: formatPrice(s.expires30d), icon: <Clock />, tone: 'gray' },
    { label: 'Expiring in 7d', value: `${formatPrice(s.expiringSoonAmount)} · ${s.expiringSoonCount} credits`, icon: <AlertTriangle />, tone: 'yellow' },
    { label: 'Active Coupons', value: s.activeCoupons, icon: <Gift />, tone: 'purple' },
  ];
  const toneCls: Record<string, string> = {
    orange: 'bg-orange-50 text-orange-700', blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700', red: 'bg-red-50 text-red-700',
    gray: 'bg-gray-100 text-gray-700', yellow: 'bg-yellow-50 text-yellow-700',
    purple: 'bg-purple-50 text-purple-700',
  };
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map(c => (
          <div key={c.label} className="bg-white rounded-2xl border p-4">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${toneCls[c.tone]}`}>{c.icon}</div>
            <div className="text-xs text-gray-500 font-bold uppercase mt-3">{c.label}</div>
            <div className="text-xl font-black mt-1">{c.value}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border p-5">
        <h3 className="font-black text-lg mb-1">Quick Actions</h3>
        <p className="text-sm text-gray-500 mb-4">Maintenance operations — run any time.</p>
        <div className="flex flex-wrap gap-2">
          <button onClick={runExpiry} disabled={busy}
            className="px-4 py-2 rounded-lg bg-yellow-500 text-white font-bold text-sm flex items-center gap-2 disabled:opacity-50">
            <RefreshCw size={14} className={busy ? 'animate-spin' : ''} /> Run Expiry Sweep Now
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────── WALLETS LIST ───────────────
function WalletsPanel() {
  const [wallets, setWallets] = useState<WalletRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [adj, setAdj] = useState<{ w: WalletRow; type: 'credit' | 'debit'; amt: string; note: string; expiry: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try { const r = await API.get('/admin/wallets'); setWallets(r.data || []); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = wallets.filter(w => {
    if (!search) return true;
    const s = search.toLowerCase();
    return w.profile?.email?.toLowerCase().includes(s) || w.profile?.phone?.includes(search) || w.profile?.name?.toLowerCase().includes(s);
  });

  const submitAdj = async () => {
    if (!adj) return;
    const amount = Number(adj.amt) * (adj.type === 'credit' ? 1 : -1);
    if (!amount) return alert('Enter valid amount');
    await API.post('/admin/wallet/adjust', {
      userId: adj.w.userId, amount, note: adj.note || `Manual ${adj.type}`,
      expiresAt: adj.expiry ? new Date(adj.expiry).toISOString() : null,
    });
    setAdj(null);
    load();
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, email, phone..." className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm" />
      </div>
      {loading ? <div className="text-gray-400 text-sm">Loading...</div> : filtered.length === 0 ? (
        <div className="text-center py-10 bg-gray-50 rounded-xl text-gray-500 text-sm">No NutroPay accounts found.</div>
      ) : (
        <div className="bg-white rounded-xl border overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="text-left p-3">Customer</th>
                <th className="text-left p-3">Contact</th>
                <th className="text-right p-3">Balance</th>
                <th className="text-left p-3">Updated</th>
                <th className="text-right p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(w => (
                <tr key={w.userId} className="border-t hover:bg-gray-50">
                  <td className="p-3 font-bold">{w.profile?.name || '—'}</td>
                  <td className="p-3 text-gray-600">
                    <div>{w.profile?.email || '—'}</div>
                    <div className="text-xs text-gray-400">{w.profile?.phone || ''}</div>
                  </td>
                  <td className="p-3 text-right font-black text-orange-600">{formatPrice(Number(w.balance))}</td>
                  <td className="p-3 text-xs text-gray-500">{new Date(w.updatedAt).toLocaleDateString()}</td>
                  <td className="p-3 text-right">
                    <button onClick={() => setAdj({ w, type: 'credit', amt: '', note: '', expiry: '' })}
                      className="text-xs px-3 py-1 rounded bg-orange-500 text-white font-bold">Adjust</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {adj && (
        <Modal onClose={() => setAdj(null)} title="Adjust NutroPay">
          <p className="text-sm text-gray-500 mb-4">{adj.w.profile?.name || adj.w.userId} · Current <b>{formatPrice(Number(adj.w.balance))}</b></p>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <button onClick={() => setAdj({ ...adj, type: 'credit' })}
              className={`p-3 rounded-xl border-2 font-bold flex items-center justify-center gap-2 ${adj.type === 'credit' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500'}`}>
              <Plus size={16} /> Credit
            </button>
            <button onClick={() => setAdj({ ...adj, type: 'debit' })}
              className={`p-3 rounded-xl border-2 font-bold flex items-center justify-center gap-2 ${adj.type === 'debit' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 text-gray-500'}`}>
              <Minus size={16} /> Debit
            </button>
          </div>
          <Field label="Amount (₹)"><input type="number" value={adj.amt} onChange={e => setAdj({ ...adj, amt: e.target.value })} className="w-full px-3 py-2 border rounded-lg" autoFocus /></Field>
          <Field label="Note"><input value={adj.note} onChange={e => setAdj({ ...adj, note: e.target.value })} placeholder="Reason" className="w-full px-3 py-2 border rounded-lg" /></Field>
          {adj.type === 'credit' && (
            <Field label="Expiry (optional)"><input type="date" value={adj.expiry} onChange={e => setAdj({ ...adj, expiry: e.target.value })} className="w-full px-3 py-2 border rounded-lg" /></Field>
          )}
          <div className="flex gap-2 mt-4">
            <button onClick={() => setAdj(null)} className="flex-1 py-2 rounded-lg border font-bold">Cancel</button>
            <button onClick={submitAdj} className="flex-1 py-2 rounded-lg bg-orange-500 text-white font-bold">Apply</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─────────────── TRANSACTIONS ───────────────
function TransactionsPanel() {
  const [txns, setTxns] = useState<Txn[]>([]);
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');
  useEffect(() => { API.get('/admin/wallet-transactions').then(r => setTxns(r.data || [])); }, []);
  const filtered = txns.filter(t => {
    if (typeFilter !== 'all' && t.type !== typeFilter) return false;
    if (search && !(t.userId.includes(search) || t.note?.toLowerCase().includes(search.toLowerCase()) || t.orderId?.includes(search))) return false;
    return true;
  });
  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search user/order/note"
          className="flex-1 min-w-[200px] px-3 py-2 border rounded-lg text-sm" />
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="px-3 py-2 border rounded-lg text-sm font-bold">
          <option value="all">All Types</option>
          <option value="credit">Credit</option>
          <option value="debit">Debit</option>
          <option value="expire">Expire</option>
        </select>
      </div>
      {filtered.length === 0 ? (
        <div className="text-center py-10 bg-gray-50 rounded-xl text-gray-500 text-sm">No transactions match.</div>
      ) : (
        <div className="bg-white rounded-xl border overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="text-left p-3">Date</th>
                <th className="text-left p-3">Type</th>
                <th className="text-left p-3">Source</th>
                <th className="text-left p-3">Note</th>
                <th className="text-left p-3">Order</th>
                <th className="text-right p-3">Amount</th>
                <th className="text-left p-3">Expires</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id} className="border-t">
                  <td className="p-3 text-xs whitespace-nowrap">{new Date(t.createdAt).toLocaleString()}</td>
                  <td className="p-3"><Badge tone={t.type === 'credit' ? 'green' : t.type === 'debit' ? 'red' : 'gray'}>{t.type.toUpperCase()}</Badge></td>
                  <td className="p-3 text-xs text-gray-600">{t.source}</td>
                  <td className="p-3 text-xs">{t.note || '—'}</td>
                  <td className="p-3 text-xs text-gray-500">{t.orderId || '—'}</td>
                  <td className={`p-3 text-right font-black ${Number(t.amount) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {Number(t.amount) >= 0 ? '+' : ''}{formatPrice(Number(t.amount))}
                  </td>
                  <td className="p-3 text-xs text-gray-500">{t.expiresAt ? new Date(t.expiresAt).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─────────────── RULES (AUTOMATION ENGINE) ───────────────
function RulesPanel() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [edit, setEdit] = useState<Rule | null>(null);

  const load = async () => { const r = await API.get('/admin/wallet/rules'); setRules(r.data || []); };
  useEffect(() => { load(); }, []);

  const save = async (r: Rule) => {
    await API.post('/admin/wallet/rule-save', r);
    setEdit(null);
    load();
  };
  const toggleEnabled = async (r: Rule) => { await API.post('/admin/wallet/rule-save', { ...r, enabled: !r.enabled }); load(); };
  const toggleMode = async (r: Rule) => { await API.post('/admin/wallet/rule-save', { ...r, mode: r.mode === 'automatic' ? 'manual' : 'automatic' }); load(); };

  return (
    <div className="space-y-3">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800 flex items-start gap-2">
        <ShieldCheck size={16} className="mt-0.5 shrink-0" />
        <div>
          <b>How automation works:</b> "Automatic" fires the reward whenever the trigger event happens. "Manual" means the trigger only logs the eligibility — you credit the NutroPay yourself from the NutroPay Accounts tab. Idempotency built-in (one credit per order per rule).
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {rules.map(r => (
          <div key={r.id} className={`p-4 rounded-2xl border-2 ${r.enabled ? 'border-green-300 bg-green-50/30' : 'border-gray-200 bg-white'}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-black">{r.name}</h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-gray-100 rounded text-gray-500">{r.code}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">{TRIGGER_LABELS[r.trigger] || r.trigger}</p>
                <p className="text-sm font-bold text-orange-600 mt-2">
                  {r.rewardType === 'percent' ? `${r.rewardValue}%` : formatPrice(Number(r.rewardValue))} reward
                  {r.maxCredit ? ` (max ${formatPrice(Number(r.maxCredit))})` : ''}
                  {r.expiryDays ? ` · expires in ${r.expiryDays}d` : ' · never expires'}
                </p>
              </div>
              <button onClick={() => toggleEnabled(r)} className={r.enabled ? 'text-green-600' : 'text-gray-400'}>
                {r.enabled ? <ToggleRight size={36} /> : <ToggleLeft size={36} />}
              </button>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <button onClick={() => toggleMode(r)}
                className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${r.mode === 'automatic' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-700'}`}>
                {r.mode}
              </button>
              <button onClick={() => setEdit(r)} className="text-xs font-bold text-orange-600 ml-auto">Edit ▸</button>
            </div>
          </div>
        ))}
      </div>

      {edit && (
        <Modal onClose={() => setEdit(null)} title={`Edit Rule: ${edit.name}`}>
          <Field label="Name"><input value={edit.name} onChange={e => setEdit({ ...edit, name: e.target.value })} className="w-full px-3 py-2 border rounded-lg" /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Reward Type">
              <select value={edit.rewardType} onChange={e => setEdit({ ...edit, rewardType: e.target.value as any })} className="w-full px-3 py-2 border rounded-lg">
                <option value="fixed">Fixed (₹)</option>
                <option value="percent">Percent (%)</option>
              </select>
            </Field>
            <Field label="Reward Value"><input type="number" value={edit.rewardValue} onChange={e => setEdit({ ...edit, rewardValue: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-lg" /></Field>
            <Field label="Max Credit (₹)"><input type="number" value={edit.maxCredit ?? ''} onChange={e => setEdit({ ...edit, maxCredit: e.target.value ? Number(e.target.value) : null })} className="w-full px-3 py-2 border rounded-lg" placeholder="No cap" /></Field>
            <Field label="Min Order (₹)"><input type="number" value={edit.minOrder ?? 0} onChange={e => setEdit({ ...edit, minOrder: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-lg" /></Field>
            <Field label="Expiry (days)"><input type="number" value={edit.expiryDays ?? ''} onChange={e => setEdit({ ...edit, expiryDays: e.target.value ? Number(e.target.value) : null })} className="w-full px-3 py-2 border rounded-lg" placeholder="Never" /></Field>
            <Field label="Max Per User"><input type="number" value={edit.maxPerUser ?? ''} onChange={e => setEdit({ ...edit, maxPerUser: e.target.value ? Number(e.target.value) : null })} className="w-full px-3 py-2 border rounded-lg" placeholder="Unlimited" /></Field>
          </div>
          <Field label="Mode">
            <select value={edit.mode} onChange={e => setEdit({ ...edit, mode: e.target.value as any })} className="w-full px-3 py-2 border rounded-lg">
              <option value="automatic">Automatic (fire on trigger)</option>
              <option value="manual">Manual (just log, admin credits)</option>
            </select>
          </Field>
          <Field label="Internal Notes"><textarea value={edit.notes ?? ''} onChange={e => setEdit({ ...edit, notes: e.target.value })} rows={2} className="w-full px-3 py-2 border rounded-lg" /></Field>
          <div className="flex gap-2 mt-4">
            <button onClick={() => setEdit(null)} className="flex-1 py-2 rounded-lg border font-bold">Cancel</button>
            <button onClick={() => save(edit)} className="flex-1 py-2 rounded-lg bg-orange-500 text-white font-bold flex items-center justify-center gap-2"><Save size={14} /> Save</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─────────────── BULK ACTIONS ───────────────
function BulkPanel() {
  const [amount, setAmount] = useState('');
  const [segment, setSegment] = useState('all');
  const [expiryDays, setExpiryDays] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) return alert('Enter positive amount');
    if (!confirm(`Credit ₹${amt} to ALL ${segment} customers? This cannot be undone.`)) return;
    setBusy(true);
    try {
      const r = await API.post('/admin/wallet/bulk-credit', {
        amount: amt, segment, expiryDays: expiryDays ? Number(expiryDays) : null,
        note: note || 'Promotional bulk credit',
      });
      alert(`Credited ${r.data.credited} users with ₹${r.data.amount} each.`);
      setAmount(''); setNote('');
    } catch (e: any) { alert(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="max-w-2xl space-y-4">
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-xs text-yellow-800 flex items-start gap-2">
        <AlertTriangle size={16} className="mt-0.5 shrink-0" />
        <div><b>Use carefully.</b> Bulk credits are permanent. Test on a small segment first via the NutroPay Accounts tab.</div>
      </div>

      <div className="bg-white rounded-2xl border p-5 space-y-3">
        <h3 className="font-black text-lg">Bulk Credit NutroPay</h3>

        <Field label="Customer Segment">
          <select value={segment} onChange={e => setSegment(e.target.value)} className="w-full px-3 py-2 border rounded-lg font-bold">
            <option value="all">All registered customers</option>
            <option value="active">Active buyers (placed ≥1 order)</option>
            <option value="inactive">Inactive (never ordered)</option>
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount per user (₹)"><input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="100" className="w-full px-3 py-2 border rounded-lg" /></Field>
          <Field label="Expiry days (optional)"><input type="number" value={expiryDays} onChange={e => setExpiryDays(e.target.value)} placeholder="Never" className="w-full px-3 py-2 border rounded-lg" /></Field>
        </div>
        <Field label="Note (shown to user)"><input value={note} onChange={e => setNote(e.target.value)} placeholder="Festival bonus from NutroPact!" className="w-full px-3 py-2 border rounded-lg" /></Field>

        <button onClick={run} disabled={busy}
          className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black disabled:opacity-50 flex items-center justify-center gap-2">
          {busy ? <RefreshCw size={16} className="animate-spin" /> : <Layers size={16} />}
          {busy ? 'Crediting...' : 'Run Bulk Credit'}
        </button>
      </div>
    </div>
  );
}

// ─────────────── SETTINGS ───────────────
function SettingsPanel() {
  const [s, setS] = useState<WalletSettings | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { API.get('/admin/wallet/settings').then(r => setS(r.data)); }, []);

  if (!s) return <div className="text-gray-400 text-sm">Loading settings...</div>;
  const set = <K extends keyof WalletSettings>(k: K, v: WalletSettings[K]) => setS({ ...s, [k]: v });
  const save = async () => {
    setBusy(true);
    try { await API.post('/admin/wallet/settings-save', s); alert('Settings saved.'); } finally { setBusy(false); }
  };

  return (
    <div className="max-w-3xl space-y-4">
      <Card title="General">
        <Toggle label="NutroPay Enabled" desc="Master switch — disable to hide NutroPay everywhere" v={s.enabled} on={v => set('enabled', v)} />
        <Field label="Display Name"><input value={s.displayName} onChange={e => set('displayName', e.target.value)} className="w-full px-3 py-2 border rounded-lg" /></Field>
        <Field label="Currency Symbol"><input value={s.currency} onChange={e => set('currency', e.target.value)} className="w-20 px-3 py-2 border rounded-lg" /></Field>
      </Card>

      <Card title="Redemption Rules">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Min Redemption (₹)"><input type="number" value={s.minRedemption} onChange={e => set('minRedemption', Number(e.target.value))} className="w-full px-3 py-2 border rounded-lg" /></Field>
          <Field label="Max Redemption % of Order"><input type="number" value={s.maxRedemptionPercent} onChange={e => set('maxRedemptionPercent', Number(e.target.value))} className="w-full px-3 py-2 border rounded-lg" /></Field>
          <Field label="Max Redemption ₹ (cap)"><input type="number" value={s.maxRedemptionAmount ?? ''} onChange={e => set('maxRedemptionAmount', e.target.value ? Number(e.target.value) : null)} placeholder="No cap" className="w-full px-3 py-2 border rounded-lg" /></Field>
          <Field label="Min Order to Redeem (₹)"><input type="number" value={s.minOrderToRedeem} onChange={e => set('minOrderToRedeem', Number(e.target.value))} className="w-full px-3 py-2 border rounded-lg" /></Field>
        </div>
        <Toggle label="Allow on COD orders" v={s.allowOnCOD} on={v => set('allowOnCOD', v)} />
        <Toggle label="Allow on Prepaid orders" v={s.allowOnPrepaid} on={v => set('allowOnPrepaid', v)} />
      </Card>

      <Card title="Fraud & Limits">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Max Balance per User (₹)"><input type="number" value={s.maxBalancePerUser ?? ''} onChange={e => set('maxBalancePerUser', e.target.value ? Number(e.target.value) : null)} placeholder="No cap" className="w-full px-3 py-2 border rounded-lg" /></Field>
          <Field label="Max Daily Credit per User (₹)"><input type="number" value={s.maxDailyCreditPerUser ?? ''} onChange={e => set('maxDailyCreditPerUser', e.target.value ? Number(e.target.value) : null)} placeholder="No cap" className="w-full px-3 py-2 border rounded-lg" /></Field>
        </div>
      </Card>

      <Card title="Expiry Policy">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Default Expiry (days)"><input type="number" value={s.defaultExpiryDays ?? ''} onChange={e => set('defaultExpiryDays', e.target.value ? Number(e.target.value) : null)} placeholder="Never" className="w-full px-3 py-2 border rounded-lg" /></Field>
          <Field label="Expiry Reminder (days before)"><input type="number" value={s.expiryReminderDays} onChange={e => set('expiryReminderDays', Number(e.target.value))} className="w-full px-3 py-2 border rounded-lg" /></Field>
        </div>
        <Field label="Rounding Mode">
          <select value={s.roundingMode} onChange={e => set('roundingMode', e.target.value as any)} className="w-full px-3 py-2 border rounded-lg">
            <option value="floor">Floor (round down) — customer-friendly</option>
            <option value="round">Round (nearest)</option>
            <option value="ceil">Ceil (round up)</option>
          </select>
        </Field>
      </Card>

      <Card title="Notifications">
        <Toggle label="Notify on Credit" v={s.notifyOnCredit} on={v => set('notifyOnCredit', v)} />
        <Toggle label="Notify on Debit" v={s.notifyOnDebit} on={v => set('notifyOnDebit', v)} />
        <Toggle label="Notify on Expiry" v={s.notifyOnExpiry} on={v => set('notifyOnExpiry', v)} />
      </Card>

      <button onClick={save} disabled={busy}
        className="w-full py-3 rounded-xl bg-orange-500 text-white font-black disabled:opacity-50 flex items-center justify-center gap-2">
        <Save size={16} /> {busy ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  );
}

// ─────────────── COUPONS ───────────────
function CouponsPanel() {
  const [coupons, setCoupons] = useState<UserCoupon[]>([]);
  useEffect(() => { API.get('/admin/user-coupons').then(r => setCoupons(r.data || [])); }, []);
  return (
    <div className="space-y-3">
      <div className="text-sm text-gray-500 flex items-center gap-2"><Gift size={14} /> Auto-issued coupons after delivery (read-only ledger)</div>
      {coupons.length === 0 ? (
        <div className="text-center py-10 bg-gray-50 rounded-xl text-gray-500 text-sm">No coupons issued yet.</div>
      ) : (
        <div className="bg-white rounded-xl border overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr>
              <th className="text-left p-3">Code</th><th className="text-left p-3">User</th><th className="text-left p-3">Value</th>
              <th className="text-left p-3">Min Order</th><th className="text-left p-3">Source</th><th className="text-left p-3">Status</th><th className="text-left p-3">Expires</th>
            </tr></thead>
            <tbody>
              {coupons.map(c => (
                <tr key={c.id} className="border-t">
                  <td className="p-3 font-mono font-bold">{c.code}</td>
                  <td className="p-3 text-xs text-gray-500">{c.userId.slice(0, 8)}...</td>
                  <td className="p-3 font-bold text-orange-600">{c.discountType === 'percent' ? `${c.value}%` : formatPrice(Number(c.value))}</td>
                  <td className="p-3 text-xs">{formatPrice(Number(c.minOrder))}</td>
                  <td className="p-3 text-xs text-gray-500">{c.sourceOrderId || '—'}</td>
                  <td className="p-3"><Badge tone={c.used ? 'gray' : 'green'}>{c.used ? 'USED' : 'ACTIVE'}</Badge></td>
                  <td className="p-3 text-xs text-gray-500">{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : 'Never'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─────────────── shared UI bits ───────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block mb-3"><span className="text-xs font-bold text-gray-500 block mb-1">{label}</span>{children}</label>;
}
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="bg-white rounded-2xl border p-5"><h3 className="font-black text-base mb-3">{title}</h3><div className="space-y-2">{children}</div></div>;
}
function Toggle({ label, desc, v, on }: { label: string; desc?: string; v: boolean; on: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => on(!v)} className="w-full flex items-start justify-between gap-3 py-2 text-left">
      <div className="flex-1">
        <div className="text-sm font-bold">{label}</div>
        {desc && <div className="text-xs text-gray-500 mt-0.5">{desc}</div>}
      </div>
      {v ? <ToggleRight size={28} className="text-green-600 shrink-0" /> : <ToggleLeft size={28} className="text-gray-400 shrink-0" />}
    </button>
  );
}
function Badge({ tone, children }: { tone: 'green' | 'red' | 'gray' | 'yellow' | 'blue'; children: React.ReactNode }) {
  const cls = { green: 'bg-green-100 text-green-700', red: 'bg-red-100 text-red-700', gray: 'bg-gray-100 text-gray-700', yellow: 'bg-yellow-100 text-yellow-700', blue: 'bg-blue-100 text-blue-700' }[tone];
  return <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${cls}`}>{children}</span>;
}
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl font-black mb-4">{title}</h3>
        {children}
      </div>
    </div>
  );
}
