// @ts-nocheck
import { useState, useEffect, useRef } from 'react';
import { Save, Bell, Zap, ShoppingCart, Trash2, Plus, Image, Upload } from 'lucide-react';
import { useSimpleUpload } from '@/lib/useSimpleUpload';
import { TabHelp } from "./_TabHelp";
import { SelectCheckbox, BulkActionBar } from '@/pages/admin/components/BulkSelect';

import API from '@/lib/api';
const AdminAPI = API;
function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!value)} className={`relative inline-flex w-11 h-6 rounded-full transition-colors focus:outline-none ${value ? 'bg-orange-500' : 'bg-gray-300'}`}>
      <span className={`inline-block w-4 h-4 bg-white rounded-full shadow transition-transform mt-1 ${value ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

function Inp({ label, value, onChange, placeholder, type = 'text', help, rows, min, max }: any) {
  return (
    <div>
      {label && <label className="text-xs font-bold text-gray-500 block mb-1">{label}</label>}
      {rows ? (
        <textarea rows={rows} value={value ?? ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400 transition resize-none" />
      ) : (
        <input type={type} value={value ?? ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          min={min} max={max}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400 transition" />
      )}
      {help && <p className="text-xs text-gray-400 mt-0.5">{help}</p>}
    </div>
  );
}

function ImageField({ label, value, onChange, help, previewClass = 'w-16 h-16 rounded-xl' }: {
  label: string; value: string; onChange: (v: string) => void; help?: string; previewClass?: string;
}) {
  const [err, setErr] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { uploadFile, isUploading, progress } = useSimpleUpload({ onSuccess: (url: string) => { setErr(false); onChange(url); } });
  const url = value?.trim();
  return (
    <div>
      <label className="text-xs font-bold text-gray-500 block mb-1">{label}</label>
      <div className="flex items-center gap-3">
        <div className={`${previewClass} bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0 overflow-hidden`}>
          {url && !err ? (
            <img src={url} alt="Preview" className="w-full h-full object-cover" onError={() => setErr(true)} onLoad={() => setErr(false)} />
          ) : (
            <Image size={20} className="text-gray-300" />
          )}
        </div>
        <div className="flex-1 space-y-1.5">
          <div className="flex gap-2">
            <input
              type="url"
              value={value ?? ''}
              onChange={e => { setErr(false); onChange(e.target.value); }}
              placeholder="https://example.com/image.jpg"
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400 transition min-w-0"
            />
            {isUploading ? (
              <div className="shrink-0 px-2 flex items-center text-xs text-gray-400 font-bold">{progress}%</div>
            ) : (
              <button type="button" onClick={() => fileRef.current?.click()}
                className="shrink-0 px-2.5 py-2 bg-gray-100 hover:bg-orange-50 text-gray-500 hover:text-orange-500 rounded-xl text-xs font-bold border border-gray-200 flex items-center gap-1 transition">
                <Upload size={12} /> Upload
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={async e => {
              const f = e.target.files?.[0]; if (!f || !f.type.startsWith('image/')) return;
              await uploadFile(f); if (fileRef.current) fileRef.current.value = '';
            }} />
          </div>
          {help && <p className="text-xs text-gray-400">{help}</p>}
          {url && err && <p className="text-xs text-red-400">Image URL could not be loaded — check the link</p>}
        </div>
      </div>
    </div>
  );
}

function Section({ title, icon, description, enabled, onToggle, children }: {
  title: string; icon: React.ReactNode; description: string;
  enabled: boolean; onToggle: (v: boolean) => void; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="p-5 flex items-start justify-between gap-4 border-b border-gray-50">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0 text-orange-600">
            {icon}
          </div>
          <div>
            <p className="font-black text-gray-900">{title}</p>
            <p className="text-xs text-gray-500 mt-0.5">{description}</p>
          </div>
        </div>
        <Toggle value={enabled} onChange={onToggle} />
      </div>
      <div style={{ opacity: enabled ? 1 : 0.45, pointerEvents: enabled ? 'auto' : 'none' }}>
        {children}
      </div>
    </div>
  );
}

export default function PopupsTab() {
  const [settings, setSettings] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newBullet, setNewBullet] = useState('');
  const [newName, setNewName] = useState('');
  const [newCity, setNewCity] = useState('');
  const [selBullets, setSelBullets] = useState<Set<string>>(new Set());
  const [selNames, setSelNames] = useState<Set<string>>(new Set());
  const [selCities, setSelCities] = useState<Set<string>>(new Set());

  useEffect(() => {
    AdminAPI.get('/admin/settings').then(r => setSettings(r.data)).catch(() => {});
  }, []);

  const set = (k: string, v: any) => setSettings((s: any) => ({ ...s, [k]: v }));

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await AdminAPI.put('/admin/settings', {
        socialProofEnabled: settings.socialProofEnabled,
        socialProofShowDelay: settings.socialProofShowDelay,
        socialProofHideDelay: settings.socialProofHideDelay,
        socialProofInterval: settings.socialProofInterval,
        socialProofCustomNames: settings.socialProofCustomNames,
        socialProofCustomCities: settings.socialProofCustomCities,
        socialProofIconUrl: settings.socialProofIconUrl,
        exitIntentEnabled: settings.exitIntentEnabled,
        exitIntentTitle: settings.exitIntentTitle,
        exitIntentSubtitle: settings.exitIntentSubtitle,
        exitIntentCoupon: settings.exitIntentCoupon,
        exitIntentDiscountText: settings.exitIntentDiscountText,
        exitIntentBullets: settings.exitIntentBullets,
        exitIntentBtnText: settings.exitIntentBtnText,
        exitIntentImage: settings.exitIntentImage,
        abandonedCartEnabled: settings.abandonedCartEnabled,
        abandonedCartDelay: settings.abandonedCartDelay,
        abandonedCartTitle: settings.abandonedCartTitle,
        abandonedCartMessage: settings.abandonedCartMessage,
        abandonedCartBtnText: settings.abandonedCartBtnText,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch { } finally { setSaving(false); }
  };

  const bullets: string[] = settings?.exitIntentBullets || [];
  const customNames: string[] = settings?.socialProofCustomNames || [];
  const customCities: string[] = settings?.socialProofCustomCities || [];

  const addBullet = () => { const v = newBullet.trim(); if (!v) return; set('exitIntentBullets', [...bullets, v]); setNewBullet(''); };
  const removeBullet = (i: number) => set('exitIntentBullets', bullets.filter((_, idx) => idx !== i));
  const addName = () => { const v = newName.trim(); if (!v) return; set('socialProofCustomNames', [...customNames, v]); setNewName(''); };
  const removeName = (i: number) => set('socialProofCustomNames', customNames.filter((_, idx) => idx !== i));
  const addCity = () => { const v = newCity.trim(); if (!v) return; set('socialProofCustomCities', [...customCities, v]); setNewCity(''); };
  const removeCity = (i: number) => set('socialProofCustomCities', customCities.filter((_, idx) => idx !== i));

  if (!settings) return (
    <div className="space-y-4">
      <TabHelp topic="popups" />{[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-gray-900">Popups & Social Proof</h2>
          <p className="text-sm text-gray-500 mt-0.5">Control purchase notifications, exit offers, and abandoned cart reminders</p>
        </div>
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 text-white text-sm font-black rounded-xl hover:bg-orange-600 transition disabled:opacity-50">
          <Save size={15} />{saved ? 'Saved ✓' : saving ? 'Saving…' : 'Save All'}
        </button>
      </div>

      {/* ── Social Proof Notifications ── */}
      <Section
        title="Purchase Notifications"
        icon={<Bell size={18} />}
        description="Show random 'Someone just purchased...' pop-ups to boost trust"
        enabled={settings.socialProofEnabled !== false}
        onToggle={v => set('socialProofEnabled', v)}
      >
        <div className="p-5 space-y-5">
          <div className="grid grid-cols-3 gap-4">
            <Inp label="First show (seconds)" type="number" min={1} max={120}
              value={Math.round((settings.socialProofShowDelay ?? 8000) / 1000)}
              onChange={(v: string) => set('socialProofShowDelay', Number(v) * 1000)}
              help="Delay before 1st notification appears" />
            <Inp label="Display duration (seconds)" type="number" min={1} max={30}
              value={Math.round((settings.socialProofHideDelay ?? 5000) / 1000)}
              onChange={(v: string) => set('socialProofHideDelay', Number(v) * 1000)}
              help="How long each notification stays visible" />
            <Inp label="Repeat interval (seconds)" type="number" min={5} max={300}
              value={Math.round((settings.socialProofInterval ?? 18000) / 1000)}
              onChange={(v: string) => set('socialProofInterval', Number(v) * 1000)}
              help="Gap between notifications" />
          </div>

          <ImageField
            label="Notification Icon Image (optional)"
            value={settings.socialProofIconUrl ?? ''}
            onChange={v => set('socialProofIconUrl', v)}
            previewClass="w-12 h-12 rounded-xl"
            help="Paste any image URL to use as the icon. Leave blank to auto-show the purchased product's image."
          />

          <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 text-xs text-blue-700">
            <p className="font-bold mb-1">How images work</p>
            <p>By default each notification automatically shows the actual product image that was "purchased". Set a custom icon URL above to override with a fixed image (e.g. your logo or a package photo).</p>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-2">Custom Name Pool (optional)</label>
              <BulkActionBar count={selNames.size} ids={Array.from(selNames)} onClear={() => setSelNames(new Set())}
                actions={[{ key: 'del', label: 'Delete selected', color: 'bg-red-600 hover:bg-red-700', confirm: 'Delete {n} names?', run: (ids) => { set('socialProofCustomNames', customNames.filter(n => !ids.includes(n))); } }]} />
              <div className="border border-gray-200 rounded-xl p-3 space-y-2 min-h-[80px] max-h-[160px] overflow-y-auto">
                {customNames.map((n, i) => (
                  <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-1.5 text-sm">
                    <span className="flex items-center gap-2"><SelectCheckbox checked={selNames.has(n)} onChange={() => setSelNames(s => { const x = new Set(s); x.has(n) ? x.delete(n) : x.add(n); return x; })} />{n}</span>
                    <button onClick={() => removeName(i)} className="text-gray-300 hover:text-red-400 ml-2"><Trash2 size={12} /></button>
                  </div>
                ))}
                {customNames.length === 0 && <p className="text-xs text-gray-400 italic">Using built-in random pool</p>}
              </div>
              <div className="flex gap-2 mt-2">
                <input value={newName} onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addName()}
                  placeholder="e.g. Rahul S." className="flex-1 border border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:border-orange-400" />
                <button onClick={addName} className="px-3 py-1.5 bg-orange-500 text-white rounded-xl text-xs font-bold hover:bg-orange-600 transition"><Plus size={14} /></button>
              </div>
              <p className="text-xs text-gray-400 mt-1">Add 5+ names to override built-in pool</p>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 block mb-2">Custom City Pool (optional)</label>
              <BulkActionBar count={selCities.size} ids={Array.from(selCities)} onClear={() => setSelCities(new Set())}
                actions={[{ key: 'del', label: 'Delete selected', color: 'bg-red-600 hover:bg-red-700', confirm: 'Delete {n} cities?', run: (ids) => { set('socialProofCustomCities', customCities.filter(c => !ids.includes(c))); } }]} />
              <div className="border border-gray-200 rounded-xl p-3 space-y-2 min-h-[80px] max-h-[160px] overflow-y-auto">
                {customCities.map((c, i) => (
                  <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-1.5 text-sm">
                    <span className="flex items-center gap-2"><SelectCheckbox checked={selCities.has(c)} onChange={() => setSelCities(s => { const x = new Set(s); x.has(c) ? x.delete(c) : x.add(c); return x; })} />{c}</span>
                    <button onClick={() => removeCity(i)} className="text-gray-300 hover:text-red-400 ml-2"><Trash2 size={12} /></button>
                  </div>
                ))}
                {customCities.length === 0 && <p className="text-xs text-gray-400 italic">Using built-in random pool</p>}
              </div>
              <div className="flex gap-2 mt-2">
                <input value={newCity} onChange={e => setNewCity(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addCity()}
                  placeholder="e.g. Jaipur" className="flex-1 border border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:border-orange-400" />
                <button onClick={addCity} className="px-3 py-1.5 bg-orange-500 text-white rounded-xl text-xs font-bold hover:bg-orange-600 transition"><Plus size={14} /></button>
              </div>
              <p className="text-xs text-gray-400 mt-1">Add 3+ cities to override built-in pool</p>
            </div>
          </div>
        </div>
      </Section>

      {/* ── Exit Intent Popup ── */}
      <Section
        title="Exit Intent Offer Popup"
        icon={<Zap size={18} />}
        description="Show a discount popup when visitor moves mouse to close the tab"
        enabled={settings.exitIntentEnabled !== false}
        onToggle={v => set('exitIntentEnabled', v)}
      >
        <div className="p-5 space-y-4">
          <ImageField
            label="Offer Image (shown in popup header)"
            value={settings.exitIntentImage ?? ''}
            onChange={v => set('exitIntentImage', v)}
            previewClass="w-20 h-20 rounded-2xl"
            help="Paste a product or offer image URL. Leave blank to show the default lightning bolt icon."
          />

          <div className="grid grid-cols-2 gap-4">
            <Inp label="Popup Headline" value={settings.exitIntentTitle}
              onChange={(v: string) => set('exitIntentTitle', v)} placeholder="Wait! Don't Go." />
            <Inp label="Subheading" value={settings.exitIntentSubtitle}
              onChange={(v: string) => set('exitIntentSubtitle', v)} placeholder="Here's an exclusive offer just for you" />
            <Inp label="Coupon Code" value={settings.exitIntentCoupon}
              onChange={(v: string) => set('exitIntentCoupon', v.toUpperCase())} placeholder="FIRST10" />
            <Inp label="Discount Label (e.g. 10% OFF)" value={settings.exitIntentDiscountText}
              onChange={(v: string) => set('exitIntentDiscountText', v)} placeholder="10% OFF" />
          </div>
          <Inp label="Button Text" value={settings.exitIntentBtnText}
            onChange={(v: string) => set('exitIntentBtnText', v)} placeholder="Shop Now & Save 10%" />

          <div>
            <label className="text-xs font-bold text-gray-500 block mb-2">Trust Bullet Points</label>
            <BulkActionBar count={selBullets.size} ids={Array.from(selBullets)} onClear={() => setSelBullets(new Set())}
              actions={[{ key: 'del', label: 'Delete selected', color: 'bg-red-600 hover:bg-red-700', confirm: 'Delete {n} bullets?', run: (ids) => { set('exitIntentBullets', bullets.filter(b => !ids.includes(b))); } }]} />
            <div className="border border-gray-200 rounded-xl p-3 space-y-2 min-h-[60px]">
              {bullets.map((b, i) => (
                <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-1.5 text-sm">
                  <span className="flex items-center gap-2"><SelectCheckbox checked={selBullets.has(b)} onChange={() => setSelBullets(s => { const x = new Set(s); x.has(b) ? x.delete(b) : x.add(b); return x; })} /><span className="text-green-500">✓</span> {b}</span>
                  <button onClick={() => removeBullet(i)} className="text-gray-300 hover:text-red-400 ml-2"><Trash2 size={12} /></button>
                </div>
              ))}
              {bullets.length === 0 && <p className="text-xs text-gray-400 italic">No bullet points added</p>}
            </div>
            <div className="flex gap-2 mt-2">
              <input value={newBullet} onChange={e => setNewBullet(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addBullet()}
                placeholder="e.g. Free delivery above ₹999" className="flex-1 border border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:border-orange-400" />
              <button onClick={addBullet} className="px-3 py-1.5 bg-orange-500 text-white rounded-xl text-xs font-bold hover:bg-orange-600 transition"><Plus size={14} /></button>
            </div>
          </div>

          <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 text-xs text-orange-800">
            <p className="font-bold mb-1">When does this show?</p>
            <p>Triggers once per browser session when the user's mouse moves to the top of the screen (as if to close the tab). It won't show again after being closed.</p>
          </div>
        </div>
      </Section>

      {/* ── Abandoned Cart ── */}
      <Section
        title="Abandoned Cart Recovery"
        icon={<ShoppingCart size={18} />}
        description="Remind users with cart items who haven't checked out after a set delay"
        enabled={settings.abandonedCartEnabled !== false}
        onToggle={v => set('abandonedCartEnabled', v)}
      >
        <div className="p-5 space-y-4">
          <Inp label="Trigger delay (seconds after adding to cart)"
            type="number" min={30} max={3600}
            value={settings.abandonedCartDelay ?? 120}
            onChange={(v: string) => set('abandonedCartDelay', Number(v))}
            help="Default: 120 seconds (2 minutes). Popup only shows when user is NOT on cart/checkout page." />

          <div className="grid grid-cols-2 gap-4">
            <Inp label="Popup Title"
              value={settings.abandonedCartTitle}
              onChange={(v: string) => set('abandonedCartTitle', v)}
              placeholder="Items in your cart are going fast!" />
            <Inp label="Message"
              value={settings.abandonedCartMessage}
              onChange={(v: string) => set('abandonedCartMessage', v)}
              placeholder="Complete your order before they sell out." />
          </div>

          <Inp label="Button Text"
            value={settings.abandonedCartBtnText}
            onChange={(v: string) => set('abandonedCartBtnText', v)}
            placeholder="Complete Purchase" />

          <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-xs text-green-800">
            <p className="font-bold mb-1">How it works</p>
            <p>When a visitor adds a product to cart and then browses without checking out, this popup appears after the set delay. It shows their actual cart items with images and prices — once per session, only on non-checkout pages.</p>
          </div>
        </div>
      </Section>
    </div>
  );
}
