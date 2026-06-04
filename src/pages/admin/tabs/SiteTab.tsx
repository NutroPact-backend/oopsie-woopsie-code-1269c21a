// @ts-nocheck
import { useState, useEffect, useRef } from 'react';
import { Save, Globe, Bell, Search, Zap, Palette, MessageCircle, Image, Upload, FileText, Plus, Trash2, RotateCcw } from 'lucide-react';
import { useSimpleUpload } from '@/lib/useSimpleUpload';
import { TabHelp } from './_TabHelp';

import API from '@/lib/api';
const AdminAPI = API;
function Field({ label, help, children }: { label: string; help?: string; children: React.ReactNode }) {
  return (
    <div>
      <TabHelp topic="site" />
      <label className="text-xs font-bold text-gray-500 block mb-1">{label}</label>
      {children}
      {help && <p className="text-xs text-gray-400 mt-1">{help}</p>}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = 'text' }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input type={type} value={value || ''} onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400" />
  );
}

function ImgUploadField({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const { uploadFile, isUploading, progress } = useSimpleUpload({ onSuccess: (url: string) => onChange(url) });
  return (
    <div className="flex gap-2">
      <input type="text" value={value || ''} onChange={e => onChange(e.target.value)}
        placeholder={placeholder || 'https://...'}
        className="flex-1 border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400 min-w-0" />
      {isUploading ? (
        <div className="shrink-0 px-3 flex items-center text-xs text-gray-400 font-bold">{progress}%</div>
      ) : (
        <button type="button" onClick={() => fileRef.current?.click()}
          className="shrink-0 px-3 py-2 bg-gray-100 hover:bg-orange-50 text-gray-500 hover:text-orange-500 rounded-xl text-xs font-bold border border-gray-200 flex items-center gap-1 transition">
          <Upload size={12} /> Upload
        </button>
      )}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={async e => {
        const f = e.target.files?.[0]; if (!f || !f.type.startsWith('image/')) return;
        await uploadFile(f); if (fileRef.current) fileRef.current.value = '';
      }} />
    </div>
  );
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 text-sm font-medium text-gray-700">{label}</div>
      <div className="flex items-center gap-2">
        <input type="color" value={value || '#ffffff'} onChange={e => onChange(e.target.value)}
          className="w-9 h-9 rounded-lg border cursor-pointer p-0.5" />
        <input type="text" value={value || ''} onChange={e => onChange(e.target.value)}
          className="w-24 border rounded-lg px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-orange-400" />
      </div>
    </div>
  );
}

export default function SiteTab() {
  const [s, setS] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    AdminAPI.get('/admin/settings').then(r => setS(r.data)).catch(() => setS({}));
  }, []);

  const set = (k: string, v: any) => setS((prev: any) => ({ ...prev, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await AdminAPI.put('/admin/settings', s);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch { alert('Save failed'); }
    setSaving(false);
  };

  if (!s) return <div className="space-y-3">{[...Array(6)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />)}</div>;

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-black">Site Settings</h2><p className="text-sm text-gray-500">Logo, SEO, branding, integrations</p></div>
        <button onClick={save} disabled={saving}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition ${saved ? 'bg-green-500 text-white' : 'bg-orange-500 text-white hover:bg-orange-600'} disabled:opacity-50`}>
          <Save size={15} />{saved ? 'Saved!' : saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Branding */}
      <section className="bg-white rounded-2xl p-5 border border-gray-100 space-y-4">
        <h3 className="font-black text-gray-800 flex items-center gap-2"><Image size={16} className="text-orange-500" />Branding</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Site Name"><Input value={s.siteName} onChange={v => set('siteName', v)} placeholder="NutroPact" /></Field>
          <Field label="Tagline"><Input value={s.siteTagline} onChange={v => set('siteTagline', v)} placeholder="Premium Supplements" /></Field>
          <Field label="Logo" help="Upload a file or paste a URL (PNG/SVG recommended)">
            <ImgUploadField value={s.logo || ''} onChange={v => set('logo', v)} placeholder="https://... or upload →" />
            {s.logo && <img src={s.logo} alt="Logo preview" className="mt-2 h-12 object-contain border rounded-lg p-1" />}
          </Field>
          <Field label="Favicon" help="Upload or paste URL — 16×16 or 32×32 ICO/PNG">
            <ImgUploadField value={s.favicon || ''} onChange={v => set('favicon', v)} placeholder="https://... or upload →" />
            {s.favicon && <img src={s.favicon} alt="Favicon preview" className="mt-2 h-8 w-8 object-contain border rounded p-0.5" />}
          </Field>
          <Field label="Contact Email"><Input value={s.email} onChange={v => set('email', v)} placeholder="support@example.com" /></Field>
          <Field label="Contact Phone"><Input value={s.phone} onChange={v => set('phone', v)} placeholder="+91 99999 99999" /></Field>
        </div>
        <Field label="Address / Office Location">
          <textarea value={s.address || ''} onChange={e => set('address', e.target.value)} rows={2}
            placeholder="123 Street, City, State, PIN"
            className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400 resize-none" />
        </Field>
      </section>

      {/* WhatsApp */}
      <section className="bg-white rounded-2xl p-5 border border-gray-100 space-y-4">
        <h3 className="font-black text-gray-800 flex items-center gap-2"><MessageCircle size={16} className="text-green-500" />WhatsApp Floating Button</h3>
        <Field label="WhatsApp Number" help="Include country code, no +, no spaces. E.g. 919876543210. Leave blank to hide the button.">
          <Input value={s.whatsappNumber} onChange={v => set('whatsappNumber', v)} placeholder="919876543210" />
        </Field>
        <Field label="WhatsApp Pre-filled Message">
          <Input value={s.whatsappMessage} onChange={v => set('whatsappMessage', v)} placeholder="Hi, I'd like to know more about your products!" />
        </Field>
      </section>

      {/* Customer Support — cancellation chatbot + returns */}
      <section className="bg-white rounded-2xl p-5 border border-gray-100 space-y-4">
        <h3 className="font-black text-gray-800 flex items-center gap-2"><RotateCcw size={16} className="text-red-500" />Cancellation & Returns</h3>
        <Field label="Cancellation Chatbot URL" help="Customer clicks 'Need to cancel?' on their order and lands here. Use {order} placeholder to inject order number (e.g. https://wa.me/919999999999?text=Cancel%20{order}). Leave blank to hide the button.">
          <Input value={s.cancellationChatbotUrl} onChange={v => set('cancellationChatbotUrl', v)} placeholder="https://wa.me/91xxxxxxxxxx?text=Cancel%20order%20{order}" />
        </Field>
        <Field label="Default Return Link Expiry (minutes)" help="How long return links stay valid after you generate them. 5-1440 minutes (24 hr max).">
          <Input type="number" value={String(s.returnLinkExpiryMinutes ?? 30)} onChange={v => set('returnLinkExpiryMinutes', Math.max(5, Math.min(1440, Number(v) || 30)))} placeholder="30" />
        </Field>
      </section>

      {/* GST / Invoicing */}
      <section className="bg-white rounded-2xl p-5 border border-gray-100 space-y-4">
        <h3 className="font-black text-gray-800 flex items-center gap-2"><FileText size={16} className="text-blue-500" />GST & Invoicing</h3>
        <p className="text-xs text-gray-500 -mt-2">Seller details printed on every Tax Invoice. Items use product HSN / GST %; missing values fall back to defaults below.</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Seller Legal Name" help="Registered business name on GSTIN">
            <Input value={(s.gst?.legalName) || ''} onChange={v => set('gst', { ...(s.gst || {}), legalName: v })} placeholder="ACME Foods Pvt Ltd" />
          </Field>
          <Field label="GSTIN" help="15-char GSTIN of seller">
            <Input value={(s.gst?.gstin) || s.gstin || ''} onChange={v => set('gst', { ...(s.gst || {}), gstin: v.toUpperCase() })} placeholder="27ABCDE1234F1Z5" />
          </Field>
          <Field label="Seller State Code" help="2-digit GST state code (e.g. 27 = Maharashtra, 07 = Delhi). Used to decide CGST+SGST vs IGST.">
            <Input value={(s.gst?.stateCode) || ''} onChange={v => set('gst', { ...(s.gst || {}), stateCode: v.replace(/\D/g, '').slice(0,2) })} placeholder="27" />
          </Field>
          <Field label="Invoice Prefix" help="E.g. INV → INV-202605-00001">
            <Input value={(s.gst?.invoicePrefix) || 'INV'} onChange={v => set('gst', { ...(s.gst || {}), invoicePrefix: v.toUpperCase().slice(0,8) })} placeholder="INV" />
          </Field>
          <Field label="Default HSN Code" help="Used when product has no HSN">
            <Input value={(s.gst?.defaultHsn) || '2106'} onChange={v => set('gst', { ...(s.gst || {}), defaultHsn: v })} placeholder="2106" />
          </Field>
          <Field label="Default GST Rate %" help="Used when product has no rate set">
            <Input type="number" value={String(s.gst?.defaultGstRate ?? 5)} onChange={v => set('gst', { ...(s.gst || {}), defaultGstRate: Math.max(0, Math.min(28, Number(v) || 0)) })} placeholder="5" />
          </Field>
        </div>
        <Field label="Seller Address (printed on invoice)">
          <textarea value={(s.gst?.address) || s.address || ''} onChange={e => set('gst', { ...(s.gst || {}), address: e.target.value })} rows={2}
            placeholder="Registered office address with PIN"
            className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400 resize-none" />
        </Field>
        <p className="text-xs text-gray-400">Schedule cron POST <code className="bg-gray-100 px-1.5 py-0.5 rounded">/api/public/auto-invoice</code> every 15 min to auto-generate invoices + email customers.</p>
      </section>

      {/* Inventory */}
      <section className="bg-white rounded-2xl p-5 border border-gray-100 space-y-4">
        <h3 className="font-black text-gray-800 flex items-center gap-2"><Zap size={16} className="text-yellow-500" />Inventory</h3>
        <p className="text-xs text-gray-500 -mt-2">Stock auto-decrements whenever an order is placed. The Add-to-cart button is hidden for out-of-stock products.</p>
        <Field label="Low Stock Alert Threshold" help="Jab kisi product ka stock is number ke barabar ya kam ho jaye, admin ko notification milega.">
          <Input type="number" value={String(s.inventory?.lowStockThreshold ?? 5)} onChange={v => set('inventory', { ...(s.inventory || {}), lowStockThreshold: Math.max(0, Math.min(1000, Number(v) || 0)) })} placeholder="5" />
        </Field>
      </section>

      {/* Announcement Bar */}
      <section className="bg-white rounded-2xl p-5 border border-gray-100 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-gray-800 flex items-center gap-2"><Bell size={16} className="text-orange-500" />Announcement Bar</h3>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={!!s.announcementEnabled} onChange={e => set('announcementEnabled', e.target.checked)} className="w-4 h-4 accent-orange-500" />
            <span className="text-sm font-semibold">{s.announcementEnabled ? 'Enabled' : 'Disabled'}</span>
          </label>
        </div>

        <Field label="Announcement Messages" help="Add multiple messages — they auto-slide with a short pause.">
          {(() => {
            const msgs: string[] = Array.isArray(s.announcementMessages) && s.announcementMessages.length
              ? s.announcementMessages
              : (s.announcementText ? [s.announcementText] : ['']);
            const update = (next: string[]) => {
              set('announcementMessages', next);
              set('announcementText', next[0] || ''); // back-compat
            };
            return (
              <div className="space-y-2">
                {msgs.map((m, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      value={m}
                      onChange={e => { const n = [...msgs]; n[i] = e.target.value; update(n); }}
                      placeholder={`Message ${i + 1} — e.g. 🎉 Free delivery on orders above ₹999!`}
                      className="flex-1 border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                    />
                    {msgs.length > 1 && (
                      <button type="button" onClick={() => update(msgs.filter((_, j) => j !== i))}
                        className="px-3 rounded-xl text-xs font-bold text-red-500 hover:bg-red-50">Remove</button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => update([...msgs, ''])}
                  className="text-xs font-bold text-orange-500 hover:underline">+ Add another message</button>
              </div>
            );
          })()}
        </Field>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Slide Interval (seconds)" help="Har message kitni der dikhe before next slide.">
            <Input type="number" value={String(s.announcementInterval ?? 4)} onChange={v => set('announcementInterval', Math.max(1, Number(v) || 4))} />
          </Field>
          <Field label="Transition" help="Slide animation style.">
            <select value={s.announcementTransition || 'fade'} onChange={e => set('announcementTransition', e.target.value)}
              className="w-full border rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-orange-400">
              <option value="fade">Fade</option>
              <option value="slide-up">Slide Up</option>
              <option value="none">None (instant)</option>
            </select>
          </Field>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <ColorRow label="Background Color" value={s.announcementBg || '#f97316'} onChange={v => set('announcementBg', v)} />
          <ColorRow label="Text Color" value={s.announcementColor || '#ffffff'} onChange={v => set('announcementColor', v)} />
        </div>

        {s.announcementEnabled && (
          <div className="rounded-xl overflow-hidden text-center text-sm py-2 px-4 font-semibold"
            style={{ backgroundColor: s.announcementBg || '#f97316', color: s.announcementColor || '#fff' }}>
            {(Array.isArray(s.announcementMessages) && s.announcementMessages.length ? s.announcementMessages : [s.announcementText]).filter(Boolean).join('  •  ') || '— preview —'}
          </div>
        )}
      </section>


      {/* SEO */}
      <section className="bg-white rounded-2xl p-5 border border-gray-100 space-y-4">
        <h3 className="font-black text-gray-800 flex items-center gap-2"><Search size={16} className="text-blue-500" />SEO Settings</h3>
        <Field label="SEO Title" help="Shown in browser tab and Google. ~60 characters.">
          <Input value={s.seoTitle} onChange={v => set('seoTitle', v)} placeholder="NutroPact — Premium Supplements India" />
          <div className="text-xs text-gray-400 mt-1">{(s.seoTitle || '').length}/60 chars</div>
        </Field>
        <Field label="Meta Description" help="Shown in Google search results. ~160 characters.">
          <textarea value={s.seoDescription || ''} onChange={e => set('seoDescription', e.target.value)} rows={3}
            placeholder="Lab-tested protein, creatine, pre-workout supplements..."
            className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400 resize-none" />
          <div className="text-xs text-gray-400 mt-1">{(s.seoDescription || '').length}/160 chars</div>
        </Field>
        <Field label="Keywords (comma separated)" help="Optional. Not used much by Google anymore.">
          <Input value={s.seoKeywords} onChange={v => set('seoKeywords', v)} placeholder="whey protein india, creatine, pre-workout" />
        </Field>
      </section>

      {/* Pixels & Analytics */}
      <section className="bg-white rounded-2xl p-5 border border-gray-100 space-y-4">
        <h3 className="font-black text-gray-800 flex items-center gap-2"><Zap size={16} className="text-purple-500" />Analytics & Pixels</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Facebook Pixel ID" help="e.g. 123456789012345">
            <Input value={s.facebookPixelId} onChange={v => set('facebookPixelId', v)} placeholder="123456789012345" />
          </Field>
          <Field label="Google Analytics ID" help="e.g. G-XXXXXXXXXX">
            <Input value={s.googleAnalyticsId} onChange={v => set('googleAnalyticsId', v)} placeholder="G-XXXXXXXXXX" />
          </Field>
          <Field label="Google Tag Manager ID" help="e.g. GTM-XXXXXXX">
            <Input value={s.googleTagManagerId} onChange={v => set('googleTagManagerId', v)} placeholder="GTM-XXXXXXX" />
          </Field>
          <Field label="Snapchat Pixel ID">
            <Input value={s.snapchatPixelId} onChange={v => set('snapchatPixelId', v)} placeholder="your-snap-pixel-id" />
          </Field>
        </div>
      </section>

      {/* Header & Footer Colors */}
      <section className="bg-white rounded-2xl p-5 border border-gray-100 space-y-4">
        <h3 className="font-black text-gray-800 flex items-center gap-2"><Palette size={16} className="text-pink-500" />Header & Footer Colors</h3>
        <div className="grid sm:grid-cols-2 gap-y-4 gap-x-8">
          <div className="space-y-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Header</p>
            <ColorRow label="Background" value={s.headerBg || '#ffffff'} onChange={v => set('headerBg', v)} />
            <ColorRow label="Text" value={s.headerText || '#111111'} onChange={v => set('headerText', v)} />
            <ColorRow label="Accent / Logo" value={s.headerAccent || '#f97316'} onChange={v => set('headerAccent', v)} />
            <ColorRow label="Border" value={s.headerBorder || '#e5e5e5'} onChange={v => set('headerBorder', v)} />
          </div>
          <div className="space-y-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Footer</p>
            <ColorRow label="Background" value={s.footerBg || '#58b385'} onChange={v => set('footerBg', v)} />
            <ColorRow label="Text" value={s.footerText || '#000000'} onChange={v => set('footerText', v)} />
            <Field label="Copyright Text">
              <Input value={s.footerCopyright} onChange={v => set('footerCopyright', v)} placeholder="© 2026 YourStore. All rights reserved." />
            </Field>
          </div>
        </div>
      </section>

      {/* Brand & Button Colors */}
      <section className="bg-white rounded-2xl p-5 border border-gray-100 space-y-4">
        <h3 className="font-black text-gray-800 flex items-center gap-2"><Palette size={16} className="text-orange-500" />Brand & Button Colors</h3>
        <p className="text-xs text-gray-400">These colors apply to buttons, links, highlights, and accents site-wide. Changes take effect immediately after saving.</p>
        <div className="grid sm:grid-cols-2 gap-y-4 gap-x-8">
          <div className="space-y-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Primary / Brand</p>
            <ColorRow label="Primary (buttons, links)" value={s.primaryColor || '#f97316'} onChange={v => set('primaryColor', v)} />
            <ColorRow label="Primary Text (on buttons)" value={s.primaryTextColor || '#ffffff'} onChange={v => set('primaryTextColor', v)} />
            <ColorRow label="Primary Hover" value={s.primaryHoverColor || '#ea6a10'} onChange={v => set('primaryHoverColor', v)} />
            <ColorRow label="Accent / Highlight" value={s.accentColor || '#f97316'} onChange={v => set('accentColor', v)} />
          </div>
          <div className="space-y-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Page & Text</p>
            <ColorRow label="Page Background" value={s.pageBg || '#ffffff'} onChange={v => set('pageBg', v)} />
            <ColorRow label="Body Text" value={s.bodyText || '#111111'} onChange={v => set('bodyText', v)} />
            <ColorRow label="Muted / Secondary Text" value={s.mutedText || '#6b7280'} onChange={v => set('mutedText', v)} />
            <ColorRow label="Card Background" value={s.cardBg || '#ffffff'} onChange={v => set('cardBg', v)} />
          </div>
        </div>
        {/* Preview */}
        <div className="mt-2 p-4 bg-gray-50 rounded-xl">
          <p className="text-xs font-bold text-gray-500 mb-3">Preview</p>
          <div className="flex items-center gap-3 flex-wrap">
            <button style={{ backgroundColor: s.primaryColor || '#f97316', color: s.primaryTextColor || '#fff' }}
              className="px-5 py-2.5 rounded-xl font-bold text-sm">Primary Button</button>
            <button style={{ border: `2px solid ${s.primaryColor || '#f97316'}`, color: s.primaryColor || '#f97316', backgroundColor: 'transparent' }}
              className="px-5 py-2.5 rounded-xl font-bold text-sm">Outline Button</button>
            <span style={{ color: s.accentColor || '#f97316' }} className="font-bold text-sm">Accent Link</span>
            <div style={{ backgroundColor: s.cardBg || '#fff', color: s.bodyText || '#111' }}
              className="px-4 py-2 rounded-xl border border-gray-100 text-sm font-medium shadow-sm">Card Text</div>
          </div>
        </div>
      </section>

      {/* Social Media */}
      <SocialLinksEditor value={s.socialLinks} legacy={{ instagram: s.instagram, facebook: s.facebook, youtube: s.youtube, twitter: s.twitter }} onChange={(v) => set('socialLinks', v)} />




      <div className="flex justify-end">

        <button onClick={save} disabled={saving}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition ${saved ? 'bg-green-500 text-white' : 'bg-orange-500 text-white hover:bg-orange-600'} disabled:opacity-50`}>
          <Save size={15} />{saved ? 'Saved!' : saving ? 'Saving...' : 'Save All Settings'}
        </button>
      </div>
    </div>
  );
}


// ============== SOCIAL LINKS EDITOR ==============
function SocialLinksEditor({ value, legacy, onChange }: { value: any[] | undefined; legacy: { instagram?: string; facebook?: string; youtube?: string; twitter?: string }; onChange: (v: any[]) => void }) {
  const items: any[] = Array.isArray(value) ? value : (() => {
    const seeded: any[] = [];
    if (legacy.instagram) seeded.push({ label: 'Instagram', url: legacy.instagram, icon: '' });
    if (legacy.facebook)  seeded.push({ label: 'Facebook',  url: legacy.facebook,  icon: '' });
    if (legacy.youtube)   seeded.push({ label: 'YouTube',   url: legacy.youtube,   icon: '' });
    if (legacy.twitter)   seeded.push({ label: 'Twitter / X', url: legacy.twitter, icon: '' });
    return seeded;
  })();

  const update = (i: number, k: string, v: string) => onChange(items.map((it, idx) => idx === i ? { ...it, [k]: v } : it));
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const add = () => onChange([...items, { label: '', url: '', icon: '' }]);
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir; if (j < 0 || j >= items.length) return;
    const n = [...items]; [n[i], n[j]] = [n[j], n[i]]; onChange(n);
  };

  return (
    <section className="bg-white rounded-2xl p-5 border border-gray-100 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="font-black text-gray-800 flex items-center gap-2"><Globe size={16} className="text-indigo-500" />Social Media Links</h3>
        <button onClick={add} className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 text-white rounded-lg text-xs font-bold hover:bg-orange-600 transition">
          <Plus size={13} /> Add Link
        </button>
      </div>

      {items.length === 0 && (
        <p className="text-xs text-gray-400 italic">No social links yet. Click "Add Link" to create one.</p>
      )}

      <div className="space-y-3">
        {items.map((it, i) => (
          <div key={i} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
            <div className="flex items-start gap-3">
              <div className="shrink-0">
                <div className="w-14 h-14 rounded-xl border-2 border-dashed border-gray-200 bg-white flex items-center justify-center overflow-hidden">
                  {it.icon
                    ? <img src={it.icon} alt={it.label || ''} className="w-full h-full object-contain" />
                    : <Image size={20} className="text-gray-300" />}
                </div>
              </div>

              <div className="flex-1 min-w-0 space-y-2">
                <div className="grid sm:grid-cols-2 gap-2">
                  <Field label="Label">
                    <Input value={it.label} onChange={(v) => update(i, 'label', v)} placeholder="Instagram" />
                  </Field>
                  <Field label="URL">
                    <Input value={it.url} onChange={(v) => update(i, 'url', v)} placeholder="https://instagram.com/yourpage" />
                  </Field>
                </div>
                <Field label="Icon image" help="Square PNG/SVG works best (e.g. 64×64).">
                  <ImgUploadField value={it.icon} onChange={(v) => update(i, 'icon', v)} placeholder="https://... or upload" />
                </Field>
              </div>

              <div className="flex flex-col items-center gap-1 shrink-0 pt-5">
                <button onClick={() => move(i, -1)} disabled={i === 0} className="text-gray-300 hover:text-gray-600 disabled:opacity-20 text-xs leading-none" aria-label="Move up">▲</button>
                <button onClick={() => move(i, 1)} disabled={i === items.length - 1} className="text-gray-300 hover:text-gray-600 disabled:opacity-20 text-xs leading-none" aria-label="Move down">▼</button>
                <button onClick={() => remove(i)} className="text-red-400 hover:text-red-600 mt-1" aria-label="Remove"><Trash2 size={14} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-400">These links power the footer's "Follow Us" section by default.</p>
    </section>
  );
}


