// @ts-nocheck
import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { getAiSeoOverview, listSitemapUrls, generateSchemaSnippet } from '@/lib/aiSeoCenter.functions';
import { Check, X, Copy, FileCode, ExternalLink } from 'lucide-react';

const FILES = [
  { key: 'robots', label: '/robots.txt', path: '/robots.txt' },
  { key: 'sitemap', label: '/sitemap.xml', path: '/sitemap.xml' },
  { key: 'llms_txt', label: '/llms.txt', path: '/llms.txt' },
  { key: 'llms_full_txt', label: '/llms-full.txt', path: '/llms-full.txt' },
  { key: 'ai_txt', label: '/ai.txt', path: '/ai.txt' },
  { key: 'rss_xml', label: '/rss.xml', path: '/rss.xml' },
  { key: 'ai_context_json', label: '/api/public/ai-context', path: '/api/public/ai-context' },
];

const TEMPLATES: Record<string, any> = {
  faq: { items: [{ q: 'What is whey protein?', a: 'Whey protein is a fast-absorbing dairy-based complete protein.' }] },
  organization: { name: 'NutroPact', url: 'https://www.nutropact.com', logo: 'https://www.nutropact.com/favicon.svg', sameAs: ['https://instagram.com/nutropact'] },
  article: { headline: 'Best protein for muscle gain', description: 'A guide to choosing whey vs casein.', author: 'NutroPact Team', image: 'https://www.nutropact.com/og-image.jpg' },
  howto: { name: 'How to mix whey protein', steps: [{ name: 'Add water', text: 'Pour 200ml cold water into a shaker.' }, { name: 'Scoop', text: 'Add 1 scoop (30g) of protein.' }, { name: 'Shake', text: 'Shake for 15 seconds and drink.' }] },
  product: { name: 'Whey Isolate 1kg', description: 'Lab-tested 90% protein isolate.', image: 'https://www.nutropact.com/og-image.jpg', brand: 'NutroPact', price: 2499 },
  breadcrumb: { items: [{ name: 'Home', url: '/' }, { name: 'Products', url: '/products' }] },
};

export default function AuditEnginePanel() {
  const fetchOv = useServerFn(getAiSeoOverview);
  const fetchUrls = useServerFn(listSitemapUrls);
  const genSchema = useServerFn(generateSchemaSnippet);

  const [tech, setTech] = useState<any>(null);
  const [urls, setUrls] = useState<string[]>([]);
  const [schemaType, setSchemaType] = useState<string>('faq');
  const [payloadStr, setPayloadStr] = useState(JSON.stringify(TEMPLATES.faq, null, 2));
  const [output, setOutput] = useState('');
  const [genLoading, setGenLoading] = useState(false);

  useEffect(() => {
    fetchOv({ data: {} }).then(r => setTech(r?.latest?.checks?.technical || null)).catch(() => {});
    fetchUrls({ data: {} }).then(r => setUrls(r?.urls || [])).catch(() => {});
  }, []);

  useEffect(() => { setPayloadStr(JSON.stringify(TEMPLATES[schemaType], null, 2)); setOutput(''); }, [schemaType]);

  const generate = async () => {
    setGenLoading(true);
    try {
      const payload = JSON.parse(payloadStr);
      const r = await genSchema({ data: { type: schemaType, payload } });
      setOutput(r.html);
    } catch (e: any) { alert('Error: ' + e.message); }
    setGenLoading(false);
  };

  const copyOut = () => { navigator.clipboard.writeText(output); };

  return (
    <div className="space-y-6">
      <section className="bg-white border border-gray-100 rounded-2xl p-5">
        <h3 className="text-sm font-black mb-3">Technical Discovery Files</h3>
        <div className="grid sm:grid-cols-2 gap-2">
          {FILES.map(f => {
            const c = tech?.[f.key];
            const ok = c?.ok;
            return (
              <a key={f.key} href={f.path} target="_blank" rel="noopener" className="flex items-center justify-between p-3 rounded-xl border hover:bg-gray-50 transition group">
                <div className="flex items-center gap-2">
                  {ok === true ? <Check className="text-green-500" size={16} /> : ok === false ? <X className="text-red-500" size={16} /> : <span className="w-4 h-4 rounded-full bg-gray-200" />}
                  <code className="text-xs font-mono">{f.label}</code>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  {c?.status ? <span>{c.status}</span> : null}
                  {f.key === 'sitemap' && c?.url_count ? <span>{c.url_count} URLs</span> : null}
                  <ExternalLink size={12} className="opacity-0 group-hover:opacity-100" />
                </div>
              </a>
            );
          })}
        </div>
        {tech?.robots?.blocked_ai_bots?.length > 0 && (
          <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">
            <strong>Blocked AI bots:</strong> {tech.robots.blocked_ai_bots.join(', ')}
          </div>
        )}
      </section>

      <section className="bg-white border border-gray-100 rounded-2xl p-5">
        <h3 className="text-sm font-black mb-3 flex items-center gap-2"><FileCode size={16} className="text-orange-500" /> Schema & Structured Code Generator</h3>
        <div className="grid lg:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1">Type</label>
            <select value={schemaType} onChange={e => setSchemaType(e.target.value)}
              className="w-full border rounded-xl px-3 py-2 text-sm mb-3">
              <option value="faq">FAQPage</option>
              <option value="article">Article</option>
              <option value="organization">Organization</option>
              <option value="howto">HowTo</option>
              <option value="product">Product</option>
              <option value="breadcrumb">BreadcrumbList</option>
            </select>
            <label className="text-xs font-bold text-gray-500 block mb-1">Payload (JSON)</label>
            <textarea value={payloadStr} onChange={e => setPayloadStr(e.target.value)} rows={14}
              className="w-full border rounded-xl px-3 py-2 text-xs font-mono" />
            <button onClick={generate} disabled={genLoading}
              className="mt-2 w-full py-2 rounded-xl bg-orange-500 text-white text-sm font-bold hover:bg-orange-600 disabled:opacity-50">
              {genLoading ? 'Generating…' : 'Generate JSON-LD'}
            </button>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-gray-500">Output</label>
              {output && <button onClick={copyOut} className="text-xs flex items-center gap-1 text-orange-600 hover:text-orange-700"><Copy size={12} /> Copy</button>}
            </div>
            <pre className="border rounded-xl p-3 text-[11px] font-mono bg-slate-50 overflow-auto h-[420px] whitespace-pre-wrap">
{output || '// Click "Generate" to produce a <script type="application/ld+json"> block'}
            </pre>
          </div>
        </div>
      </section>

      <section className="bg-white border border-gray-100 rounded-2xl p-5">
        <h3 className="text-sm font-black mb-3">Sitemap URLs ({urls.length})</h3>
        <div className="max-h-80 overflow-y-auto border rounded-xl">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 sticky top-0"><tr><th className="text-left p-2 font-bold">URL</th><th className="text-left p-2 font-bold w-24">Type</th><th className="p-2 w-16"></th></tr></thead>
            <tbody>
              {urls.slice(0, 100).map((u, i) => {
                const path = u.replace(/^https?:\/\/[^/]+/, '');
                const type = path.startsWith('/products/') ? 'Product' : path.startsWith('/category/') ? 'Category' : path.startsWith('/blog/') ? 'Blog' : 'Page';
                return (
                  <tr key={i} className="border-t hover:bg-gray-50">
                    <td className="p-2 font-mono text-[11px] truncate max-w-md">{path}</td>
                    <td className="p-2"><span className="inline-block px-2 py-0.5 rounded text-[10px] bg-gray-100">{type}</span></td>
                    <td className="p-2"><a href={u} target="_blank" rel="noopener" className="text-orange-500"><ExternalLink size={12} /></a></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
