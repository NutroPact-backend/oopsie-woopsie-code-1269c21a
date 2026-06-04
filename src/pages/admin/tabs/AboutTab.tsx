// @ts-nocheck
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Save, FileText, Plus, Trash2, Upload } from 'lucide-react';
import { useSimpleUpload } from '@/lib/useSimpleUpload';
import { TabHelp } from "./_TabHelp";

const AdminAPI = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });
AdminAPI.interceptors.request.use(config => {
  const token = sessionStorage.getItem('np_admin_token');
  if (token) config.headers['x-admin-token'] = token;
  return config;
});

function Field({ label, help, children }: { label: string; help?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-bold text-gray-500 block mb-1">{label}</label>
      {children}
      {help && <p className="text-xs text-gray-400 mt-1">{help}</p>}
    </div>
  );
}

function Input({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input type="text" value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400" />
  );
}

function Textarea({ value, onChange, placeholder, rows = 3 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea value={value || ''} onChange={e => onChange(e.target.value)} rows={rows} placeholder={placeholder}
      className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400 resize-none" />
  );
}

function ImgUploadField({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const { uploadFile, isUploading, progress } = useSimpleUpload({ onSuccess: (url: string) => onChange(url) });
  return (
    <div className="flex gap-2 items-center">
      {value && <img src={value} alt="" className="w-10 h-10 rounded-lg object-cover border shrink-0" />}
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

export default function AboutTab() {
  const [a, setA] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    AdminAPI.get('/admin/settings').then(r => setA(r.data?.aboutPage || {})).catch(() => setA({}));
  }, []);

  const set = (k: string, v: any) => setA((prev: any) => ({ ...prev, [k]: v }));
  const setArr = (k: string, idx: number, patch: any) => {
    const arr = [...(a?.[k] || [])];
    arr[idx] = { ...arr[idx], ...patch };
    set(k, arr);
  };
  const addItem = (k: string, item: any) => set(k, [...(a?.[k] || []), item]);
  const removeItem = (k: string, idx: number) => set(k, (a?.[k] || []).filter((_: any, i: number) => i !== idx));

  const save = async () => {
    setSaving(true);
    try {
      await AdminAPI.put('/admin/settings', { aboutPage: a });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch { alert('Save failed'); }
    setSaving(false);
  };

  if (!a) return <div className="space-y-3">{[...Array(6)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />)}</div>;

  const badges: string[] = Array.isArray(a.badges) ? a.badges : [];
  const stats: any[] = Array.isArray(a.stats) ? a.stats : [];
  const story: any[] = Array.isArray(a.story) ? a.story : [];
  const pillars: any[] = Array.isArray(a.pillars) ? a.pillars : [];
  const certs: any[] = Array.isArray(a.certs) ? a.certs : [];
  const lab = a.labReport || {};
  const compounds: any[] = Array.isArray(lab.compounds) ? lab.compounds : [];
  const setLab = (patch: any) => set('labReport', { ...lab, ...patch });
  const setCompound = (idx: number, patch: any) => {
    const arr = [...compounds];
    arr[idx] = { ...arr[idx], ...patch };
    setLab({ compounds: arr });
  };
  const addCompound = () => setLab({ compounds: [...compounds, { name: '', value: '', status: 'PASS' }] });
  const removeCompound = (idx: number) => setLab({ compounds: compounds.filter((_, i) => i !== idx) });


  return (
    <div className="space-y-6 max-w-4xl">
      <TabHelp topic="about" />
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-black flex items-center gap-2"><FileText size={18} className="text-orange-500" /> About Page Editor</h2>
          <p className="text-sm text-gray-500">Everything is edited from here. Sensible defaults are used when fields are left empty.</p>
        </div>
        <div className="flex items-center gap-2">
          <a href="/about" target="_blank" rel="noopener" className="text-xs font-bold text-orange-500 hover:underline px-3 py-2">View page →</a>
          <button onClick={save} disabled={saving}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition ${saved ? 'bg-green-500 text-white' : 'bg-orange-500 text-white hover:bg-orange-600'} disabled:opacity-50`}>
            <Save size={15} />{saved ? 'Saved!' : saving ? 'Saving...' : 'Save About Page'}
          </button>
        </div>
      </div>

      <section className="bg-white rounded-2xl p-5 border border-gray-100 space-y-6">
        {/* HERO */}
        <div className="space-y-4">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Hero Section</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Kicker (small caps text)"><Input value={a.kicker} onChange={v => set('kicker', v)} placeholder="OUR STORY" /></Field>
            <Field label="CTA Button Label"><Input value={a.ctaButton} onChange={v => set('ctaButton', v)} placeholder="Shop the range" /></Field>
          </div>
          <Field label="Main Title (H1)"><Textarea value={a.title} onChange={v => set('title', v)} placeholder="Built for athletes who refuse to compromise." rows={2} /></Field>
          <Field label="Subtitle / Intro"><Textarea value={a.subtitle} onChange={v => set('subtitle', v)} placeholder="Short intro paragraph..." rows={3} /></Field>
          <Field label="Hero Image"><ImgUploadField value={a.heroImage || ''} onChange={v => set('heroImage', v)} /></Field>
          <Field label="Trust Badges (one per line)">
            <Textarea value={badges.join('\n')} onChange={v => set('badges', v.split('\n').map(s => s.trim()).filter(Boolean))} placeholder={'FSSAI Approved\nMade in India\nLab Tested'} rows={4} />
          </Field>
        </div>

        {/* STATS */}
        <div className="space-y-3 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Stats Strip</p>
            <button type="button" onClick={() => addItem('stats', { value: '0', label: 'New stat' })}
              className="text-xs font-bold text-orange-500 hover:underline flex items-center gap-1"><Plus size={12} /> Add stat</button>
          </div>
          {stats.map((st, i) => (
            <div key={i} className="grid grid-cols-[1fr_2fr_auto] gap-2 items-center">
              <Input value={st.value} onChange={v => setArr('stats', i, { value: v })} placeholder="50K+" />
              <Input value={st.label} onChange={v => setArr('stats', i, { label: v })} placeholder="Athletes served" />
              <button type="button" onClick={() => removeItem('stats', i)} className="p-2 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>

        {/* MISSION & VISION */}
        <div className="space-y-4 pt-4 border-t border-gray-100">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Mission & Vision</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Mission Title"><Input value={a.missionTitle} onChange={v => set('missionTitle', v)} placeholder="Our Mission" /></Field>
            <Field label="Vision Title"><Input value={a.visionTitle} onChange={v => set('visionTitle', v)} placeholder="Our Vision" /></Field>
            <Field label="Mission Text"><Textarea value={a.missionText} onChange={v => set('missionText', v)} rows={4} /></Field>
            <Field label="Vision Text"><Textarea value={a.visionText} onChange={v => set('visionText', v)} rows={4} /></Field>
          </div>
        </div>

        {/* STORY BLOCKS */}
        <div className="space-y-3 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Story Chapters</p>
            <button type="button" onClick={() => addItem('story', { heading: '', text: '', image: '' })}
              className="text-xs font-bold text-orange-500 hover:underline flex items-center gap-1"><Plus size={12} /> Add chapter</button>
          </div>
          {story.map((b, i) => (
            <div key={i} className="rounded-xl border border-gray-100 p-4 space-y-3 bg-gray-50/40">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-400">CHAPTER {String(i + 1).padStart(2, '0')}</span>
                <button type="button" onClick={() => removeItem('story', i)} className="text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
              </div>
              <Input value={b.heading} onChange={v => setArr('story', i, { heading: v })} placeholder="Chapter heading" />
              <Textarea value={b.text} onChange={v => setArr('story', i, { text: v })} placeholder="Paragraph..." rows={3} />
              <ImgUploadField value={b.image || ''} onChange={v => setArr('story', i, { image: v })} placeholder="Chapter image URL or upload" />
            </div>
          ))}
        </div>

        {/* PILLARS */}
        <div className="space-y-3 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Pillars / Values</p>
            <button type="button" onClick={() => addItem('pillars', { icon: '⭐', title: '', text: '' })}
              className="text-xs font-bold text-orange-500 hover:underline flex items-center gap-1"><Plus size={12} /> Add pillar</button>
          </div>
          {pillars.map((pl, i) => (
            <div key={i} className="grid grid-cols-[60px_1fr_2fr_auto] gap-2 items-center">
              <Input value={pl.icon} onChange={v => setArr('pillars', i, { icon: v })} placeholder="🧪" />
              <Input value={pl.title} onChange={v => setArr('pillars', i, { title: v })} placeholder="Title" />
              <Input value={pl.text} onChange={v => setArr('pillars', i, { text: v })} placeholder="Short description" />
              <button type="button" onClick={() => removeItem('pillars', i)} className="p-2 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>

        {/* CERTIFICATIONS */}
        <div className="space-y-3 pt-4 border-t border-gray-100">
          <Field label="Certifications Section Title"><Input value={a.certsTitle} onChange={v => set('certsTitle', v)} placeholder="Certifications & Standards" /></Field>
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Certifications</p>
            <button type="button" onClick={() => addItem('certs', { image: '', label: '' })}
              className="text-xs font-bold text-orange-500 hover:underline flex items-center gap-1"><Plus size={12} /> Add cert</button>
          </div>
          {certs.map((c, i) => (
            <div key={i} className="grid grid-cols-[1fr_2fr_auto] gap-2 items-center">
              <Input value={c.label} onChange={v => setArr('certs', i, { label: v })} placeholder="FSSAI" />
              <ImgUploadField value={c.image || ''} onChange={v => setArr('certs', i, { image: v })} placeholder="Logo URL (optional)" />
              <button type="button" onClick={() => removeItem('certs', i)} className="p-2 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>

        {/* FOUNDER */}
        <div className="space-y-4 pt-4 border-t border-gray-100">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Founder Note</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Founder Name"><Input value={a.founderName} onChange={v => set('founderName', v)} placeholder="Rohan Mehta" /></Field>
            <Field label="Founder Role"><Input value={a.founderRole} onChange={v => set('founderRole', v)} placeholder="Founder & Head of Formulation" /></Field>
          </div>
          <Field label="Founder Photo"><ImgUploadField value={a.founderImage || ''} onChange={v => set('founderImage', v)} /></Field>
          <Field label="Founder Quote"><Textarea value={a.founderQuote} onChange={v => set('founderQuote', v)} placeholder={'"We don\'t sell supplements. We sell trust..."'} rows={3} /></Field>
        </div>

        {/* LAB REPORT BANNER (unique) */}
        <div className="space-y-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">🧪 Lab Report Banner (unique)</p>
              <p className="text-[11px] text-gray-400 mt-1">A paper-style Certificate of Analysis with animated VERIFIED stamp + ticker. Shows below the hero.</p>
            </div>
            <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
              <input type="checkbox" checked={lab.enabled !== false} onChange={e => setLab({ enabled: e.target.checked })} />
              Show on About page
            </label>
          </div>
          <Field label="Section Title"><Input value={lab.title} onChange={v => setLab({ title: v })} placeholder="Every batch. Open lab. Zero secrets." /></Field>
          <Field label="Section Subtitle"><Textarea value={lab.subtitle} onChange={v => setLab({ subtitle: v })} rows={2} placeholder="Each NutroPact tub ships with a real third-party COA..." /></Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Batch Number"><Input value={lab.batchNumber} onChange={v => setLab({ batchNumber: v })} placeholder="NP-20260520-A1" /></Field>
            <Field label="Test Date"><Input value={lab.testDate} onChange={v => setLab({ testDate: v })} placeholder="2026-05-20" /></Field>
            <Field label="Lab Name"><Input value={lab.labName} onChange={v => setLab({ labName: v })} placeholder="Eurofins Analytical Services" /></Field>
            <Field label="Certificate Number"><Input value={lab.certNumber} onChange={v => setLab({ certNumber: v })} placeholder="NABL/2025/0042" /></Field>
            <Field label="Signatory Name"><Input value={lab.signatureName} onChange={v => setLab({ signatureName: v })} placeholder="Dr. A. Verma" /></Field>
            <Field label="Signatory Role"><Input value={lab.signatureRole} onChange={v => setLab({ signatureRole: v })} placeholder="Lab Director, NABL" /></Field>
            <Field label="Stamp Text"><Input value={lab.stampText} onChange={v => setLab({ stampText: v })} placeholder="VERIFIED" /></Field>
          </div>
          <Field label="Footer Note"><Textarea value={lab.footerNote} onChange={v => setLab({ footerNote: v })} rows={2} placeholder="Scan the QR on your tub or visit /coa with your batch number..." /></Field>

          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tested Parameters</p>
              <button type="button" onClick={addCompound} className="text-xs font-bold text-orange-500 hover:underline flex items-center gap-1"><Plus size={12} /> Add parameter</button>
            </div>
            {compounds.map((c, i) => (
              <div key={i} className="grid grid-cols-[2fr_1.2fr_1fr_auto] gap-2 items-center">
                <Input value={c.name} onChange={v => setCompound(i, { name: v })} placeholder="Whey Protein" />
                <Input value={c.value} onChange={v => setCompound(i, { value: v })} placeholder="24.8 g" />
                <Input value={c.status} onChange={v => setCompound(i, { status: v })} placeholder="PASS" />
                <button type="button" onClick={() => removeCompound(i)} className="p-2 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
              </div>
            ))}
            {compounds.length === 0 && <p className="text-[11px] text-gray-400">Khaali chhodne par 6 default parameters (Whey, BCAA, Heavy Metals, etc.) dikhenge.</p>}
          </div>
        </div>

        {/* CTA */}
        <div className="space-y-4 pt-4 border-t border-gray-100">

          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Bottom CTA Banner</p>
          <Field label="CTA Title"><Input value={a.ctaTitle} onChange={v => set('ctaTitle', v)} placeholder="Train with nutrition you can actually trust." /></Field>
          <Field label="CTA Subtitle"><Input value={a.ctaText} onChange={v => set('ctaText', v)} placeholder="Browse the full range..." /></Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Button Text"><Input value={a.ctaButton} onChange={v => set('ctaButton', v)} placeholder="Shop the range" /></Field>
            <Field label="Button Link"><Input value={a.ctaLink} onChange={v => set('ctaLink', v)} placeholder="/products" /></Field>
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <button onClick={save} disabled={saving}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition ${saved ? 'bg-green-500 text-white' : 'bg-orange-500 text-white hover:bg-orange-600'} disabled:opacity-50`}>
          <Save size={15} />{saved ? 'Saved!' : saving ? 'Saving...' : 'Save About Page'}
        </button>
      </div>
    </div>
  );
}
