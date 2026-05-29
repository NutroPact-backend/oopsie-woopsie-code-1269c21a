// @ts-nocheck
import { useEffect, useState } from 'react';
import axios from 'axios';
import { Save, Wallet, CreditCard, Smartphone, Banknote, Percent, Shield, Eye, EyeOff, Tag, Plus, Trash2, GripVertical } from 'lucide-react';
import { TabHelp } from "./_TabHelp";


const AdminAPI = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });
AdminAPI.interceptors.request.use(c => {
  const t = sessionStorage.getItem('np_admin_token');
  if (t) c.headers['x-admin-token'] = t;
  return c;
});

type RewardCfg = {
  type?: 'percent' | 'fixed';
  value?: number;
  maxDiscount?: number;   // coupon cap
  maxCredit?: number;     // wallet cap
  minOrder?: number;      // coupon min
  expiryDays?: number;    // coupon/wallet validity (blank = never)
};

type MethodOffer = {
  id: string;
  method: 'cod' | 'partial_cod' | 'razorpay' | 'phonepe' | 'payu' | 'upi' | 'any_online';
  kind: 'discount' | 'fee';                 // discount = customer saves; fee = extra charged (instant only)
  type: 'percent' | 'fixed';
  value: number;
  maxDiscount?: number;
  minOrder?: number;
  label: string;
  description?: string;
  active: boolean;
  rewardType?: 'instant' | 'coupon' | 'wallet';  // when customer earns the benefit
  reward?: RewardCfg;                              // config for coupon/wallet rewards
};

type Payments = {
  codEnabled?: boolean;
  codLabel?: string;
  codFeeBelow?: number;       // free above this order value
  codFeeAmount?: number;      // fee charged below threshold
  partialCod?: { enabled?: boolean; type?: 'fixed' | 'percent'; value?: number; label?: string };
  priorityShipping?: { enabled?: boolean; amount?: number; label?: string; description?: string };
  razorpay?: { enabled?: boolean; keyId?: string; keySecret?: string };
  phonepe?: { enabled?: boolean; merchantId?: string; saltKey?: string; saltIndex?: string };
  payu?: { enabled?: boolean; merchantKey?: string; merchantSalt?: string; mode?: 'test' | 'live' };
  upiEnabled?: boolean;
  upiId?: string;
  methodOffers?: MethodOffer[];
};


function Field({ label, help, children }: { label: string; help?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-bold text-gray-500 block mb-1">{label}</label>
      {children}
      {help && <p className="text-xs text-gray-400 mt-1">{help}</p>}
    </div>
  );
}

function Txt({ value, onChange, placeholder, type = 'text' }:
  { value: any; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input type={type} value={value ?? ''} onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400" />
  );
}

function Secret({ value, onChange, placeholder }:
  { value: any; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex gap-2">
      <input type={show ? 'text' : 'password'} value={value ?? ''} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 border rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-orange-400" />
      <button type="button" onClick={() => setShow(s => !s)}
        className="shrink-0 px-3 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-500">
        {show ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  );
}

function Num({ value, onChange, placeholder }:
  { value: any; onChange: (v: number) => void; placeholder?: string }) {
  return (
    <input type="number" value={value ?? ''} onChange={e => onChange(Number(e.target.value) || 0)}
      placeholder={placeholder}
      className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400" />
  );
}

function Toggle({ on, onChange, label, sub }: { on: boolean; onChange: (v: boolean) => void; label: string; sub?: string }) {
  return (
    <button type="button" onClick={() => onChange(!on)}
      className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border-2 transition text-left ${on ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
      <div>
        <p className="text-sm font-bold">{label}</p>
        {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
      </div>
      <div className={`w-10 h-6 rounded-full relative transition ${on ? 'bg-green-500' : 'bg-gray-300'}`}>
        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition ${on ? 'left-[18px]' : 'left-0.5'}`} />
      </div>
    </button>
  );
}

function Card({ icon, title, sub, children }: { icon: React.ReactNode; title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl p-5 border border-gray-100 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-500">{icon}</div>
        <div>
          <h3 className="font-black text-gray-800">{title}</h3>
          {sub && <p className="text-xs text-gray-500">{sub}</p>}
        </div>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export default function PaymentGatewaysTab() {
  const [settings, setSettings] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    AdminAPI.get('/admin/settings').then(r => setSettings(r.data || {})).catch(() => setSettings({}));
  }, []);

  if (!settings) return <div className="space-y-3">{[...Array(6)].map((_, i) =>
    <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div>;

  const p: Payments = settings.payments ?? {};
  const setP = (patch: Partial<Payments>) => setSettings((prev: any) => ({ ...prev, payments: { ...(prev.payments ?? {}), ...patch } }));
  const setSub = <K extends keyof Payments>(key: K, patch: any) =>
    setP({ [key]: { ...((p[key] as any) ?? {}), ...patch } } as any);

  const save = async () => {
    setSaving(true);
    try {
      await AdminAPI.put('/admin/settings', settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch { alert('Save failed'); }
    setSaving(false);
  };

  const partial = p.partialCod ?? {};
  const priority = p.priorityShipping ?? {};
  const rzp = p.razorpay ?? {};
  const pp = p.phonepe ?? {};
  const payu = p.payu ?? {};

  return (
    <div className="space-y-6 max-w-3xl">
      <TabHelp topic="payments" />
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-black">Payment Gateways</h2>
          <p className="text-sm text-gray-500">Enable methods & add API keys. Customers see only enabled options at checkout.</p>
        </div>
        <button onClick={save} disabled={saving}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition ${saved ? 'bg-green-500 text-white' : 'bg-orange-500 text-white hover:bg-orange-600'} disabled:opacity-50`}>
          <Save size={15} />{saved ? 'Saved!' : saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800 flex gap-2">
        <Shield size={14} className="shrink-0 mt-0.5" />
        <span>Keys are stored in your backend settings. For production, move secret keys (Razorpay/PhonePe/PayU secrets) into Lovable Cloud secrets and read them server-side. Public IDs are safe to keep here.</span>
      </div>

      {/* COD */}
      <Card icon={<Banknote size={18} />} title="Cash on Delivery (COD)" sub="Pay in cash when order is delivered">
        <Toggle on={!!p.codEnabled} onChange={v => setP({ codEnabled: v })} label="Enable COD" sub="Show COD as a payment option" />
        {p.codEnabled && (
          <div className="grid sm:grid-cols-2 gap-3 pt-2">
            <Field label="Label shown at checkout"><Txt value={p.codLabel} onChange={v => setP({ codLabel: v })} placeholder="Cash on Delivery" /></Field>
            <Field label="COD fee (₹)" help="Charged when order is below threshold"><Num value={p.codFeeAmount} onChange={v => setP({ codFeeAmount: v })} placeholder="49" /></Field>
            <Field label="Free COD above (₹)" help="Waive fee for orders above this amount"><Num value={p.codFeeBelow} onChange={v => setP({ codFeeBelow: v })} placeholder="500" /></Field>
          </div>
        )}
      </Card>

      {/* Partial COD */}
      <Card icon={<Percent size={18} />} title="Partial COD (Advance + COD)" sub="Customer pays a portion online, rest on delivery">
        <Toggle on={!!partial.enabled} onChange={v => setSub('partialCod', { enabled: v })}
          label="Enable Partial COD" sub="Reduces fake orders & RTOs" />
        {partial.enabled && (
          <div className="grid sm:grid-cols-3 gap-3 pt-2">
            <Field label="Type">
              <select value={partial.type || 'percent'} onChange={e => setSub('partialCod', { type: e.target.value })}
                className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400">
                <option value="percent">Percentage of order</option>
                <option value="fixed">Fixed amount (₹)</option>
              </select>
            </Field>
            <Field label={partial.type === 'fixed' ? 'Advance amount (₹)' : 'Advance %'}>
              <Num value={partial.value} onChange={v => setSub('partialCod', { value: v })}
                placeholder={partial.type === 'fixed' ? '99' : '20'} />
            </Field>
            <Field label="Label">
              <Txt value={partial.label} onChange={v => setSub('partialCod', { label: v })} placeholder="Pay advance & rest on delivery" />
            </Field>
          </div>
        )}
      </Card>

      {/* Priority / Fast Delivery */}
      <Card icon={<Percent size={18} />} title="⚡ Fast Delivery (Priority Shipping)" sub="Customer pays extra to get pickup within minutes instead of the default 2-hour wait">
        <Toggle on={!!priority.enabled} onChange={v => setSub('priorityShipping', { enabled: v })}
          label="Enable Fast Delivery option at checkout" sub="Shows a toggle at checkout with the configured extra charge" />
        {priority.enabled && (
          <div className="grid sm:grid-cols-3 gap-3 pt-2">
            <Field label="Extra charge (₹)" help="Added to order total when customer opts in">
              <Num value={priority.amount} onChange={v => setSub('priorityShipping', { amount: v })} placeholder="99" />
            </Field>
            <Field label="Label">
              <Txt value={priority.label} onChange={v => setSub('priorityShipping', { label: v })} placeholder="⚡ Fast delivery" />
            </Field>
            <Field label="Description">
              <Txt value={priority.description} onChange={v => setSub('priorityShipping', { description: v })} placeholder="Priority pickup in ~10 mins" />
            </Field>
          </div>
        )}
      </Card>

      {/* Razorpay */}
      <Card icon={<CreditCard size={18} />} title="Razorpay" sub="UPI, Cards, NetBanking, Wallets">
        <Toggle on={!!rzp.enabled} onChange={v => setSub('razorpay', { enabled: v })} label="Enable Razorpay" />
        {rzp.enabled && (
          <div className="grid sm:grid-cols-2 gap-3 pt-2">
            <Field label="Key ID" help="Public — starts with rzp_test_ or rzp_live_">
              <Txt value={rzp.keyId} onChange={v => setSub('razorpay', { keyId: v })} placeholder="rzp_live_xxxxxxxxxx" />
            </Field>
            <Field label="Key Secret" help="Keep this private">
              <Secret value={rzp.keySecret} onChange={v => setSub('razorpay', { keySecret: v })} placeholder="••••••••••" />
            </Field>
          </div>
        )}
      </Card>

      {/* PhonePe */}
      <Card icon={<Smartphone size={18} />} title="PhonePe" sub="PhonePe payment gateway (PG)">
        <Toggle on={!!pp.enabled} onChange={v => setSub('phonepe', { enabled: v })} label="Enable PhonePe" />
        {pp.enabled && (
          <div className="grid sm:grid-cols-3 gap-3 pt-2">
            <Field label="Merchant ID"><Txt value={pp.merchantId} onChange={v => setSub('phonepe', { merchantId: v })} placeholder="MERCHANTUAT" /></Field>
            <Field label="Salt Key"><Secret value={pp.saltKey} onChange={v => setSub('phonepe', { saltKey: v })} placeholder="••••••••" /></Field>
            <Field label="Salt Index"><Txt value={pp.saltIndex} onChange={v => setSub('phonepe', { saltIndex: v })} placeholder="1" /></Field>
          </div>
        )}
      </Card>

      {/* PayU */}
      <Card icon={<CreditCard size={18} />} title="PayU" sub="PayU Money / PayU BIZ">
        <Toggle on={!!payu.enabled} onChange={v => setSub('payu', { enabled: v })} label="Enable PayU" />
        {payu.enabled && (
          <div className="grid sm:grid-cols-3 gap-3 pt-2">
            <Field label="Merchant Key"><Txt value={payu.merchantKey} onChange={v => setSub('payu', { merchantKey: v })} placeholder="gtKFFx" /></Field>
            <Field label="Merchant Salt"><Secret value={payu.merchantSalt} onChange={v => setSub('payu', { merchantSalt: v })} placeholder="••••••••" /></Field>
            <Field label="Mode">
              <select value={payu.mode || 'test'} onChange={e => setSub('payu', { mode: e.target.value })}
                className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400">
                <option value="test">Test</option>
                <option value="live">Live</option>
              </select>
            </Field>
          </div>
        )}
      </Card>

      {/* UPI Direct */}
      <Card icon={<Wallet size={18} />} title="UPI Direct" sub="Direct UPI (no gateway fees)">
        <Toggle on={!!p.upiEnabled} onChange={v => setP({ upiEnabled: v })} label="Enable UPI Direct" />
        {p.upiEnabled && (
          <Field label="UPI ID" help="Your VPA — e.g. nutropact@hdfc">
            <Txt value={p.upiId} onChange={v => setP({ upiId: v })} placeholder="business@bank" />
          </Field>
        )}
      </Card>

      {/* Payment Method Offers */}
      <Card icon={<Tag size={18} />} title="Payment Method Offers" sub="Reward (or charge) customers based on payment method — pushes them toward your preferred gateway">
        <PaymentMethodOffers
          offers={p.methodOffers ?? []}
          onChange={list => setP({ methodOffers: list })}
          enabledMethods={{
            cod: !!p.codEnabled,
            partial_cod: !!partial.enabled,
            razorpay: !!rzp.enabled,
            phonepe: !!pp.enabled,
            payu: !!payu.enabled,
            upi: !!p.upiEnabled,
          }}
        />
      </Card>

      <div className="flex justify-end pt-2">

        <button onClick={save} disabled={saving}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition ${saved ? 'bg-green-500 text-white' : 'bg-orange-500 text-white hover:bg-orange-600'} disabled:opacity-50`}>
          <Save size={15} />{saved ? 'Saved!' : saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

const METHOD_LABELS: Record<MethodOffer['method'], string> = {
  cod: 'Cash on Delivery',
  partial_cod: 'Partial COD',
  razorpay: 'Razorpay',
  phonepe: 'PhonePe',
  payu: 'PayU',
  upi: 'UPI Direct',
  any_online: 'Any Online Payment',
};

function PaymentMethodOffers({
  offers, onChange, enabledMethods,
}: {
  offers: MethodOffer[];
  onChange: (list: MethodOffer[]) => void;
  enabledMethods: Record<string, boolean>;
}) {
  const update = (id: string, patch: Partial<MethodOffer>) =>
    onChange(offers.map(o => o.id === id ? { ...o, ...patch } : o));
  const remove = (id: string) => onChange(offers.filter(o => o.id !== id));
  const add = () => onChange([
    ...offers,
    {
      id: `mo_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      method: 'razorpay',
      kind: 'discount',
      type: 'percent',
      value: 5,
      label: '5% extra off on Razorpay',
      active: true,
    },
  ]);

  return (
    <div className="space-y-3">
      {offers.length === 0 && (
        <div className="text-xs text-gray-500 bg-gray-50 border border-dashed rounded-xl p-4 text-center">
          No payment offers yet. Add one to encourage a specific payment method.
        </div>
      )}

      {offers.map((o, idx) => {
        const isEnabled = o.method === 'any_online' ? true : enabledMethods[o.method];
        return (
          <div key={o.id} className={`rounded-xl border-2 p-4 space-y-3 ${o.active ? 'border-orange-200 bg-orange-50/40' : 'border-gray-200 bg-white'}`}>
            <div className="flex items-center gap-2">
              <GripVertical size={14} className="text-gray-300" />
              <span className="text-xs font-bold text-gray-400">#{idx + 1}</span>
              <input
                value={o.label}
                onChange={e => update(o.id, { label: e.target.value })}
                placeholder="e.g. Pay with UPI & get 5% off"
                className="flex-1 border rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none focus:border-orange-400"
              />
              <button onClick={() => update(o.id, { active: !o.active })}
                className={`text-xs font-bold px-3 py-2 rounded-lg ${o.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {o.active ? 'Active' : 'Off'}
              </button>
              <button onClick={() => remove(o.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
            </div>

            {!isEnabled && o.method !== 'any_online' && (
              <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1">
                Method "{METHOD_LABELS[o.method]}" is currently disabled — offer will not show.
              </p>
            )}

            <div className="grid sm:grid-cols-4 gap-3">
              <Field label="Payment Method">
                <select value={o.method} onChange={e => update(o.id, { method: e.target.value as MethodOffer['method'] })}
                  className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400">
                  {Object.entries(METHOD_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Field>
              <Field label="When customer gets it" help="Instant = at checkout. Others = after delivery.">
                <select
                  value={o.rewardType || 'instant'}
                  onChange={e => update(o.id, { rewardType: e.target.value as any })}
                  className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400">
                  <option value="instant">⚡ Instant (at checkout)</option>
                  <option value="coupon">🎁 Coupon (after delivery)</option>
                  <option value="wallet">💰 NutroPay credit (after delivery)</option>
                </select>
              </Field>

              {(!o.rewardType || o.rewardType === 'instant') && (
                <>
                  <Field label="Effect">
                    <select value={o.kind} onChange={e => update(o.id, { kind: e.target.value as MethodOffer['kind'] })}
                      className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400">
                      <option value="discount">Discount (customer saves)</option>
                      <option value="fee">Extra fee (customer pays more)</option>
                    </select>
                  </Field>
                  <Field label="Type">
                    <select value={o.type} onChange={e => update(o.id, { type: e.target.value as MethodOffer['type'] })}
                      className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400">
                      <option value="percent">Percentage (%)</option>
                      <option value="fixed">Fixed (₹)</option>
                    </select>
                  </Field>
                  <Field label={o.type === 'percent' ? 'Value (%)' : 'Value (₹)'}>
                    <Num value={o.value} onChange={v => update(o.id, { value: v })} placeholder={o.type === 'percent' ? '5' : '50'} />
                  </Field>
                  {o.kind === 'discount' && o.type === 'percent' && (
                    <Field label="Max discount (₹)" help="Cap for % discount">
                      <Num value={o.maxDiscount} onChange={v => update(o.id, { maxDiscount: v })} placeholder="200" />
                    </Field>
                  )}
                  <Field label="Min order (₹)" help="Offer applies above this">
                    <Num value={o.minOrder} onChange={v => update(o.id, { minOrder: v })} placeholder="0" />
                  </Field>
                </>
              )}

              {(o.rewardType === 'coupon' || o.rewardType === 'wallet') && (
                <>
                  <Field label="Reward type">
                    <select
                      value={o.reward?.type || 'percent'}
                      onChange={e => update(o.id, { reward: { ...(o.reward || {}), type: e.target.value as any } })}
                      className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400">
                      <option value="percent">% of order</option>
                      <option value="fixed">Fixed ₹</option>
                    </select>
                  </Field>
                  <Field label={(o.reward?.type || 'percent') === 'percent' ? 'Reward %' : 'Reward ₹'}>
                    <Num value={o.reward?.value} onChange={v => update(o.id, { reward: { ...(o.reward || {}), value: v } })}
                      placeholder={(o.reward?.type || 'percent') === 'percent' ? '10' : '100'} />
                  </Field>
                  {o.rewardType === 'wallet' && (
                    <Field label="Max NutroPay credit (₹)" help="Cap per order. Blank = no cap.">
                      <Num value={o.reward?.maxCredit} onChange={v => update(o.id, { reward: { ...(o.reward || {}), maxCredit: v } })} placeholder="500" />
                    </Field>
                  )}
                  {o.rewardType === 'coupon' && (
                    <>
                      <Field label="Max discount (₹)" help="Cap for the issued coupon">
                        <Num value={o.reward?.maxDiscount} onChange={v => update(o.id, { reward: { ...(o.reward || {}), maxDiscount: v } })} placeholder="300" />
                      </Field>
                      <Field label="Min order on next use (₹)">
                        <Num value={o.reward?.minOrder} onChange={v => update(o.id, { reward: { ...(o.reward || {}), minOrder: v } })} placeholder="500" />
                      </Field>
                    </>
                  )}
                  <Field label="Validity (days)" help="How long the reward is valid. Blank = never expires.">
                    <Num value={o.reward?.expiryDays} onChange={v => update(o.id, { reward: { ...(o.reward || {}), expiryDays: v } })} placeholder="90" />
                  </Field>
                  <Field label="Min order to qualify (₹)">
                    <Num value={o.minOrder} onChange={v => update(o.id, { minOrder: v })} placeholder="0" />
                  </Field>
                </>
              )}

              <div className="sm:col-span-4">
                <Field label="Description (shown to customer)">
                  <Txt value={o.description} onChange={v => update(o.id, { description: v })}
                    placeholder={o.rewardType === 'wallet' ? 'Earn 10% in NutroPay after delivery'
                      : o.rewardType === 'coupon' ? 'Get a coupon for your next order after delivery'
                      : 'Instant 5% off, max ₹200'} />
                </Field>
              </div>
            </div>
          </div>
        );
      })}

      <button onClick={add}
        className="w-full border-2 border-dashed border-orange-300 text-orange-600 hover:bg-orange-50 rounded-xl py-3 text-sm font-bold flex items-center justify-center gap-2">
        <Plus size={14} /> Add Payment Offer
      </button>

      <div className="text-[11px] text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
        Tip: Use a small discount (e.g. 2–5% on UPI/Razorpay) and a fee on COD to push customers toward prepaid — this reduces RTO costs.
      </div>
    </div>
  );
}
