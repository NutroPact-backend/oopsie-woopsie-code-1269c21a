// @ts-nocheck
import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { getMarketingPublic } from '@/lib/marketing.functions';
import { CheckCircle2, XCircle, Globe, Zap, Eye } from 'lucide-react';
import { TabHelp } from './_TabHelp';

interface Row { label: string; ok: boolean; detail?: string }

export default function SeoDebugTab() {
  const fetchCfg = useServerFn(getMarketingPublic);
  const [cfg, setCfg] = useState<any>(null);
  const [domTags, setDomTags] = useState<{ metas: any[]; scripts: any[]; ldjson: any[] }>({ metas: [], scripts: [], ldjson: [] });

  useEffect(() => { fetchCfg().then((r: any) => setCfg(r.config || {})); }, [fetchCfg]);

  useEffect(() => {
    const metas = Array.from(document.querySelectorAll('meta')).map(m => ({
      name: m.getAttribute('name') || m.getAttribute('property') || '',
      content: m.getAttribute('content') || '',
    })).filter(m => m.name);
    const scripts = Array.from(document.querySelectorAll('script[src]')).map(s => s.getAttribute('src') || '');
    const ldjson = Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map(s => {
      try { return JSON.parse(s.textContent || ''); } catch { return null; }
    }).filter(Boolean);
    setDomTags({ metas, scripts, ldjson });
  }, []);

  if (!cfg) return <div className="p-8 text-sm text-gray-500">Loading SEO config…</div>;

  const verify: Row[] = [
    { label: 'Google Search Console', ok: !!cfg.gsc_verification, detail: cfg.gsc_verification?.slice(0, 20) },
    { label: 'Bing Webmaster', ok: !!cfg.bing_verification, detail: cfg.bing_verification?.slice(0, 20) },
    { label: 'Pinterest', ok: !!cfg.pinterest_verification, detail: cfg.pinterest_verification?.slice(0, 20) },
    { label: 'Yandex', ok: !!cfg.yandex_verification, detail: cfg.yandex_verification?.slice(0, 20) },
  ];
  const pixels: Row[] = [
    { label: 'Pinterest Tag', ok: !!cfg.pinterest_tag_id, detail: cfg.pinterest_tag_id },
    { label: 'LinkedIn Insight', ok: !!cfg.linkedin_partner_id, detail: cfg.linkedin_partner_id },
    { label: 'X / Twitter Pixel', ok: !!cfg.twitter_pixel_id, detail: cfg.twitter_pixel_id },
    { label: 'Reddit Pixel', ok: !!cfg.reddit_pixel_id, detail: cfg.reddit_pixel_id },
    { label: 'Quora Pixel', ok: !!cfg.quora_pixel_id, detail: cfg.quora_pixel_id },
  ];
  const capi: Row[] = [
    { label: 'FB Conversions API', ok: !!(cfg.fb_capi_pixel_id && cfg.fb_capi_access_token), detail: cfg.fb_capi_pixel_id },
    { label: 'GA4 Measurement Protocol', ok: !!(cfg.ga4_measurement_id && cfg.ga4_api_secret), detail: cfg.ga4_measurement_id },
  ];
  const og: Row[] = [
    { label: 'OG Site Name', ok: !!cfg.og_site_name, detail: cfg.og_site_name },
    { label: 'OG Default Image', ok: !!cfg.og_default_image, detail: cfg.og_default_image?.slice(0, 40) },
    { label: 'Twitter Handle', ok: !!cfg.twitter_site_handle, detail: cfg.twitter_site_handle },
  ];

  const Section = ({ title, icon, rows }: { title: string; icon: any; rows: Row[] }) => (
    <div className="bg-white border rounded-2xl overflow-hidden">
      <div className="px-5 py-3 border-b bg-gray-50 flex items-center gap-2 font-bold text-sm">{icon}{title}</div>
      <div className="divide-y">
        {rows.map((r, i) => (
          <div key={i} className="px-5 py-3 flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              {r.ok ? <CheckCircle2 size={16} className="text-green-600" /> : <XCircle size={16} className="text-gray-300" />}
              <span className={r.ok ? 'font-semibold text-gray-900' : 'text-gray-500'}>{r.label}</span>
            </div>
            <span className="text-xs text-gray-400 font-mono truncate max-w-[280px]">{r.detail || (r.ok ? 'active' : 'not configured')}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-4xl">
      <TabHelp topic="seoDebug" />
      <div>
        <h1 className="text-2xl font-black">SEO & Pixel Debug</h1>
        <p className="text-sm text-gray-500">Live view of what's configured in admin and what's actually injected on this admin page.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Section title="Search Engine Verification" icon={<Globe size={16} />} rows={verify} />
        <Section title="Open Graph / Twitter Defaults" icon={<Eye size={16} />} rows={og} />
        <Section title="Client Pixels" icon={<Zap size={16} />} rows={pixels} />
        <Section title="Server-Side Conversions API" icon={<Zap size={16} />} rows={capi} />
      </div>

      <details className="bg-white border rounded-2xl">
        <summary className="px-5 py-3 cursor-pointer font-bold text-sm">Live DOM &lt;meta&gt; tags ({domTags.metas.length})</summary>
        <div className="p-4 max-h-96 overflow-auto text-xs font-mono space-y-1">
          {domTags.metas.map((m, i) => (
            <div key={i} className="flex gap-2">
              <span className="text-blue-700 shrink-0">{m.name}</span>
              <span className="text-gray-500 truncate">{m.content}</span>
            </div>
          ))}
        </div>
      </details>

      <details className="bg-white border rounded-2xl">
        <summary className="px-5 py-3 cursor-pointer font-bold text-sm">Active JSON-LD blocks ({domTags.ldjson.length})</summary>
        <div className="p-4 max-h-96 overflow-auto text-xs font-mono space-y-3">
          {domTags.ldjson.map((j: any, i) => (
            <pre key={i} className="bg-gray-50 p-3 rounded border overflow-auto">{JSON.stringify(j, null, 2)}</pre>
          ))}
        </div>
      </details>

      <details className="bg-white border rounded-2xl">
        <summary className="px-5 py-3 cursor-pointer font-bold text-sm">External scripts loaded ({domTags.scripts.length})</summary>
        <div className="p-4 max-h-96 overflow-auto text-xs font-mono space-y-1">
          {domTags.scripts.map((s, i) => <div key={i} className="text-gray-600 truncate">{s}</div>)}
        </div>
      </details>

      <p className="text-xs text-gray-400">Tip: Storefront pages may inject more pixels/scripts than this admin page. Open the homepage in a new tab and view source to confirm.</p>
    </div>
  );
}
