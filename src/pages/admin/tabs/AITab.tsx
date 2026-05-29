// @ts-nocheck
import { useEffect, useState } from 'react';
import axios from 'axios';
import { Save, Sparkles, Bot, Key, Eye, EyeOff, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { TabHelp } from "./_TabHelp";

const AdminAPI = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });

// Free Google Gemini models (generativelanguage.googleapis.com)
const MODELS = [
  { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash — fast, free, recommended' },
  { id: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite — fastest & cheapest' },
  { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash — stable & free' },
  { id: 'gemini-1.5-flash-8b', label: 'Gemini 1.5 Flash 8B — ultra cheap' },
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash — newest, balanced' },
  { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro — best reasoning (slower)' },
];

const DEFAULTS = {
  enabled: true,
  model: 'gemini-2.0-flash',
  systemPrompt: "You are NutroPact's helpful shopping assistant. Answer the user's question in 3-5 short sentences using ONLY the catalog, blog and FAQ snippets provided. If the answer isn't in the context, say so and suggest contacting support. Be honest, concise, and friendly. Mention specific product names when relevant. Do not invent products or prices.",
  maxProducts: 8,
  maxBlogs: 5,
  useFaqs: true,
  maxFaqs: 6,
  searchBarLabel: 'Ask AI',
  searchBarPlaceholder: 'Ask anything about our products…',
  emptyHint: 'Try: "Best protein for muscle gain" or "Pre-workout without caffeine"',
};

export default function AITab() {
  const [s, setS] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // API key (admin-only app_secrets table — NOT public site_settings)
  const [apiKey, setApiKey] = useState('');
  const [apiKeyMasked, setApiKeyMasked] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [keySaving, setKeySaving] = useState(false);
  const [keySaved, setKeySaved] = useState(false);

  useEffect(() => {
    AdminAPI.get('/admin/settings').then(r => {
      setS({ ...DEFAULTS, ...(r.data?.ai || {}) });
    }).catch(() => setS({ ...DEFAULTS }));

    supabase.from('app_secrets' as any).select('value').eq('key', 'gemini_api_key').maybeSingle()
      .then(({ data }: any) => {
        const v = (data?.value || '').trim();
        if (v) setApiKeyMasked('••••••••' + v.slice(-4));
      });
  }, []);

  const set = (k: string, v: any) => setS((p: any) => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      const cur = await AdminAPI.get('/admin/settings').then(r => r.data || {});
      await AdminAPI.put('/admin/settings', { ...cur, ai: s });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch { alert('Save failed'); }
    setSaving(false);
  };

  const saveApiKey = async () => {
    const v = apiKey.trim();
    if (!v) return alert('Paste a Gemini API key first');
    setKeySaving(true);
    try {
      const { error } = await supabase.from('app_secrets' as any).upsert(
        { key: 'gemini_api_key', value: v } as any,
        { onConflict: 'key' },
      );
      if (error) throw error;
      setApiKey('');
      setApiKeyMasked('••••••••' + v.slice(-4));
      setKeySaved(true);
      setTimeout(() => setKeySaved(false), 2500);
    } catch (e: any) {
      alert('Failed to save key: ' + (e?.message || 'unknown error'));
    }
    setKeySaving(false);
  };

  const clearApiKey = async () => {
    if (!confirm('Remove saved Gemini API key? AI search will stop working until a new key is set.')) return;
    const { error } = await supabase.from('app_secrets' as any).delete().eq('key', 'gemini_api_key');
    if (error) return alert('Failed: ' + error.message);
    setApiKeyMasked('');
    setApiKey('');
  };

  if (!s) return <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />)}</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <TabHelp topic="ai" />
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-black flex items-center gap-2"><Sparkles size={18} className="text-orange-500" /> AI Search Settings</h2>
          <p className="text-sm text-gray-500">Site ke andar AI search bar (Ask AI) ko yahan se control karo. Powered by Google Gemini (free tier).</p>
        </div>
        <div className="flex items-center gap-2">
          <a href="/search" target="_blank" rel="noopener" className="text-xs font-bold text-orange-500 hover:underline px-3 py-2">Test on /search →</a>
          <button onClick={save} disabled={saving}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition ${saved ? 'bg-green-500 text-white' : 'bg-orange-500 text-white hover:bg-orange-600'} disabled:opacity-50`}>
            <Save size={15} />{saved ? 'Saved!' : saving ? 'Saving...' : 'Save AI Settings'}
          </button>
        </div>
      </div>

      {/* ─── Gemini API Key (admin-only) ─── */}
      <section className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h3 className="font-black text-sm flex items-center gap-2"><Key size={14} className="text-orange-500" /> Gemini API Key</h3>
            <p className="text-xs text-gray-500 mt-1">
              Free key{' '}
              <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer"
                className="text-orange-600 hover:underline inline-flex items-center gap-1">
                aistudio.google.com/apikey <ExternalLink size={11} />
              </a>{' '}se le lo (1500 free requests/day). Key sirf admins ko visible hai.
            </p>
          </div>
          {apiKeyMasked && (
            <span className="text-xs font-mono px-2 py-1 rounded bg-green-50 text-green-700 border border-green-200">
              Active: {apiKeyMasked}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={apiKeyMasked ? 'Enter new key to replace…' : 'AIza…'}
              className="w-full border rounded-xl px-3 py-2.5 text-sm font-mono pr-10 focus:outline-none focus:border-orange-400"
              autoComplete="off"
              spellCheck={false}
            />
            <button type="button" onClick={() => setShowKey(v => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700">
              {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          <button onClick={saveApiKey} disabled={keySaving || !apiKey.trim()}
            className={`px-4 py-2.5 rounded-xl font-bold text-sm transition whitespace-nowrap ${keySaved ? 'bg-green-500 text-white' : 'bg-orange-500 text-white hover:bg-orange-600'} disabled:opacity-50`}>
            {keySaved ? 'Saved!' : keySaving ? 'Saving…' : 'Save Key'}
          </button>
          {apiKeyMasked && (
            <button onClick={clearApiKey} className="px-3 py-2.5 rounded-xl text-sm text-red-600 hover:bg-red-50 font-bold">
              Remove
            </button>
          )}
        </div>
        <p className="text-[11px] text-gray-400">
          Key admin-only DB (app_secrets) me securely save hoti hai. Server function yahin se padhta hai — env variable change karne ki zaroorat nahi.
        </p>
      </section>


      <section className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={s.enabled} onChange={e => set('enabled', e.target.checked)} className="w-5 h-5 accent-orange-500" />
          <div>
            <p className="font-bold text-sm flex items-center gap-1"><Bot size={14} className="text-orange-500" /> Enable AI Search</p>
            <p className="text-xs text-gray-500">Off karne par /search page sirf normal product search dikhayega.</p>
          </div>
        </label>
      </section>

      <section className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
        <h3 className="font-black text-sm">AI Model</h3>
        <select value={s.model} onChange={e => set('model', e.target.value)}
          className="w-full border rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-orange-400">
          {MODELS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
        </select>
        <p className="text-xs text-gray-400">Sasta = jaldi & kam cost. Bada model = behtar answers but slow & mehnga.</p>
      </section>

      <section className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
        <h3 className="font-black text-sm">System Prompt</h3>
        <textarea value={s.systemPrompt} onChange={e => set('systemPrompt', e.target.value)} rows={6}
          className="w-full border rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-orange-400 resize-y" />
        <p className="text-xs text-gray-400">Yahan AI ko batao kaisa behave kare — tone, language, kya allow hai kya nahi.</p>
      </section>

      <section className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
        <h3 className="font-black text-sm">Context Limits</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1">Max products to consider</label>
            <input type="number" min={1} max={20} value={s.maxProducts}
              onChange={e => set('maxProducts', Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
              className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1">Max blog posts to consider</label>
            <input type="number" min={0} max={20} value={s.maxBlogs}
              onChange={e => set('maxBlogs', Math.max(0, Math.min(20, Number(e.target.value) || 0)))}
              className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400" />
          </div>
        </div>
        <p className="text-xs text-gray-400">Zyada items = behtar answers but slow + mehnga. 5–8 sweet spot hai.</p>
      </section>

      <section className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
        <h3 className="font-black text-sm">FAQ Knowledge Base</h3>
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={s.useFaqs !== false} onChange={e => set('useFaqs', e.target.checked)} className="w-5 h-5 accent-orange-500" />
          <div>
            <p className="font-bold text-sm">Use FAQs as AI context</p>
            <p className="text-xs text-gray-500">AI shipping, returns, payments jaisi FAQs ka answer FAQ section se denge.</p>
          </div>
        </label>
        <div>
          <label className="text-xs font-bold text-gray-500 block mb-1">Max FAQs to consider</label>
          <input type="number" min={0} max={20} value={s.maxFaqs}
            onChange={e => set('maxFaqs', Math.max(0, Math.min(20, Number(e.target.value) || 0)))}
            disabled={s.useFaqs === false}
            className="w-full sm:w-1/2 border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400 disabled:bg-gray-50 disabled:opacity-60" />
        </div>
        <p className="text-xs text-gray-400">Tip: FAQs admin → FAQ tab se manage karo. Jo FAQ enabled hain wahi AI ko milte hain.</p>
      </section>

      <section className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
        <h3 className="font-black text-sm">UI Text</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1">Tab label</label>
            <input value={s.searchBarLabel} onChange={e => set('searchBarLabel', e.target.value)}
              className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1">Input placeholder</label>
            <input value={s.searchBarPlaceholder} onChange={e => set('searchBarPlaceholder', e.target.value)}
              className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-bold text-gray-500 block mb-1">Empty-state hint</label>
            <input value={s.emptyHint} onChange={e => set('emptyHint', e.target.value)}
              className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400" />
          </div>
        </div>
      </section>
    </div>
  );
}
