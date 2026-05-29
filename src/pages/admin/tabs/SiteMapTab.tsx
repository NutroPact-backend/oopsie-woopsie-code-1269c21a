// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, ExternalLink, Link2, AlertTriangle, RefreshCw, Search, Package, FileText, Layout, PanelBottom, List, Globe, Sparkles, Map as MapIcon } from 'lucide-react';
import API from '@/lib/api';
import type { CustomPage } from './PagesTab';
import PlacementsView from './PlacementsView';
import { TabHelp } from "./_TabHelp";

type Ref = { where: string; label: string; href?: string };
type NodeKind = 'page' | 'product' | 'route' | 'external';
type Node = {
  id: string;
  kind: NodeKind;
  title: string;
  href: string;
  status?: 'ok' | 'missing' | 'disabled' | 'external';
  refs: Ref[];
};

const KNOWN_ROUTES = new Set([
  '/', '/products', '/about', '/contact', '/cart', '/checkout', '/account', '/login',
  '/track-order', '/blog', '/faq', '/testimonials', '/shipping', '/privacy', '/terms',
  '/refund', '/search', '/combo',
]);

function normalize(href?: string): string {
  if (!href) return '';
  return href.trim().split('?')[0].split('#')[0].replace(/\/+$/, '') || '/';
}

function isExternal(href: string) { return /^https?:\/\//i.test(href); }

export default function SiteMapTab() {
  const [settings, setSettings] = useState<any>(null);
  const [homepage, setHomepage] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [pages, setPages] = useState<CustomPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const load = async () => {
    setLoading(true);
    const [s, h, p] = await Promise.all([
      API.get('/admin/settings').catch(() => ({ data: {} })),
      API.get('/admin/homepage').catch(() => ({ data: {} })),
      API.get('/products').catch(() => ({ data: [] })),
    ]);
    setSettings(s.data || {});
    setHomepage(h.data || {});
    setProducts(p.data || []);
    setPages(Array.isArray(s.data?.customPages) ? s.data.customPages : []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  // Build reference index: for each href, list places it's referenced
  const refIndex = useMemo(() => {
    const map = new Map<string, Ref[]>();
    const push = (href: string | undefined, ref: Ref) => {
      const k = normalize(href);
      if (!k) return;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(ref);
    };

    // Header nav
    (settings?.navLinks || []).forEach((l: any) => {
      if (l.children) {
        l.children.forEach((c: any) => push(c.href, { where: `Header → ${l.label}`, label: c.label, href: c.href }));
      } else {
        push(l.href, { where: 'Header nav', label: l.label, href: l.href });
      }
    });

    // Footer blocks
    (settings?.footer?.blocks || []).forEach((b: any) => {
      (b.links || []).forEach((c: any) => push(c.href, { where: `Footer → ${b.title || b.type}`, label: c.label, href: c.href }));
    });

    // Announcement bar
    if (settings?.announcement?.link) push(settings.announcement.link, { where: 'Announcement bar', label: settings.announcement.text || '(text)', href: settings.announcement.link });

    // Homepage sections
    (homepage?.sections || []).forEach((sec: any) => {
      (sec.slides || []).forEach((sl: any) => push(sl.btnLink || sl.link, { where: `Homepage → ${sec.name || sec.type}`, label: sl.btnText || '(slide)', href: sl.btnLink || sl.link }));
      (sec.tiles || []).forEach((t: any) => push(t.link, { where: `Homepage → ${sec.name || sec.type}`, label: t.bottomText?.text || '(tile)', href: t.link }));
      (sec.productIds || []).forEach((pid: string) => {
        const prod = products.find(p => (p._id || p.id) === pid);
        if (prod) push(`/products/${prod.slug}`, { where: `Homepage → ${sec.name || sec.type}`, label: prod.name, href: `/products/${prod.slug}` });
      });
    });

    // Custom page references
    pages.forEach(pg => {
      if (pg.type === 'redirect' && pg.redirectTo) push(pg.redirectTo, { where: `Page “${pg.title}” redirect`, label: pg.title, href: pg.redirectTo });
      if (pg.type === 'builder') {
        (pg.sections || []).forEach((s: any) => {
          if (s.type === 'banner') push(s.ctaHref, { where: `Page “${pg.title}” → banner`, label: s.ctaLabel || s.title, href: s.ctaHref });
          if (s.type === 'cta') push(s.buttonHref, { where: `Page “${pg.title}” → CTA`, label: s.buttonLabel, href: s.buttonHref });
          if (s.type === 'image') push(s.href, { where: `Page “${pg.title}” → image`, label: s.alt || '(image)', href: s.href });
          if (s.type === 'links') (s.items || []).forEach((it: any) => push(it.href, { where: `Page “${pg.title}” → links`, label: it.label, href: it.href }));
          if (s.type === 'products') {
            (s.productIds || []).forEach((pid: string) => {
              const prod = products.find(p => (p._id || p.id) === pid);
              if (prod) push(`/products/${prod.slug}`, { where: `Page “${pg.title}” → products`, label: prod.name, href: `/products/${prod.slug}` });
            });
          }
        });
      }
      if (pg.type === 'products') {
        (pg.productIds || []).forEach((pid: string) => {
          const prod = products.find(p => (p._id || p.id) === pid);
          if (prod) push(`/products/${prod.slug}`, { where: `Page “${pg.title}”`, label: prod.name, href: `/products/${prod.slug}` });
        });
      }
    });

    return map;
  }, [settings, homepage, products, pages]);

  // Build node lists
  const nodes = useMemo<Node[]>(() => {
    const out: Node[] = [];
    // Pages
    pages.forEach(pg => {
      const href = `/p/${pg.slug}`;
      out.push({
        id: 'page:' + pg.id,
        kind: 'page',
        title: pg.title || '(untitled)',
        href,
        status: pg.enabled ? 'ok' : 'disabled',
        refs: refIndex.get(normalize(href)) || [],
      });
    });
    // Products
    products.forEach((p: any) => {
      const href = `/products/${p.slug}`;
      out.push({
        id: 'prod:' + (p._id || p.id),
        kind: 'product',
        title: p.name,
        href,
        status: p.isActive === false ? 'disabled' : 'ok',
        refs: refIndex.get(normalize(href)) || [],
      });
    });
    // Known core routes
    KNOWN_ROUTES.forEach(r => {
      out.push({
        id: 'route:' + r,
        kind: 'route',
        title: r === '/' ? 'Home' : r.replace(/^\//, '').replace(/-/g, ' '),
        href: r,
        status: 'ok',
        refs: refIndex.get(normalize(r)) || [],
      });
    });
    // External + unknown internal hrefs that ARE referenced but not in our catalog
    const known = new Set(out.map(n => normalize(n.href)));
    refIndex.forEach((refs, key) => {
      if (known.has(key)) return;
      const ext = isExternal(key);
      out.push({
        id: 'unk:' + key,
        kind: ext ? 'external' : 'route',
        title: key,
        href: key,
        status: ext ? 'external' : 'missing',
        refs,
      });
    });
    return out;
  }, [pages, products, refIndex]);

  const filtered = nodes.filter(n => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return n.title.toLowerCase().includes(q) || n.href.toLowerCase().includes(q) || n.refs.some(r => r.where.toLowerCase().includes(q));
  });

  const groups: { key: NodeKind; label: string; icon: React.ReactNode }[] = [
    { key: 'page', label: 'Custom Pages', icon: <FileText size={14} /> },
    { key: 'product', label: 'Products', icon: <Package size={14} /> },
    { key: 'route', label: 'Built-in Routes', icon: <Globe size={14} /> },
    { key: 'external', label: 'External Links', icon: <ExternalLink size={14} /> },
  ];

  const orphans = nodes.filter(n => (n.kind === 'page' || n.kind === 'product') && n.refs.length === 0);
  const broken = nodes.filter(n => n.status === 'missing');

  const [mode, setMode] = useState<'placements' | 'map'>('placements');

  return (
    <div className="space-y-6 max-w-5xl">
      <TabHelp topic="sitemap" />
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-black">Site Map & Placements</h2>
          <p className="text-sm text-gray-500">Pick any product or page and add it to homepage rails, page sections, header dropdowns, or footer columns in one click.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex p-1 bg-gray-100 rounded-xl">
            <button onClick={() => setMode('placements')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition ${mode === 'placements' ? 'bg-white shadow-sm text-orange-600' : 'text-gray-500'}`}>
              <Sparkles size={12} /> Placements
            </button>
            <button onClick={() => setMode('map')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition ${mode === 'map' ? 'bg-white shadow-sm text-orange-600' : 'text-gray-500'}`}>
              <MapIcon size={12} /> Site map
            </button>
          </div>
          <button onClick={load} className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border hover:bg-gray-50">
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
      </div>

      {mode === 'placements' ? <PlacementsView /> : <MapView
        loading={loading} pages={pages} products={products} broken={broken} orphans={orphans}
        filtered={filtered} groups={groups} open={open} setOpen={setOpen} search={search} setSearch={setSearch}
      />}
    </div>
  );
}

function MapView({ loading, pages, products, broken, orphans, filtered, groups, open, setOpen, search, setSearch }: any) {
  return (
    <div className="space-y-6">
      {/* map view */}



      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Custom pages" value={pages.length} icon={<FileText size={16} />} color="bg-blue-50 text-blue-600" />
        <Stat label="Products" value={products.length} icon={<Package size={16} />} color="bg-green-50 text-green-600" />
        <Stat label="Orphans (unlinked)" value={orphans.length} icon={<AlertTriangle size={16} />} color="bg-amber-50 text-amber-600" />
        <Stat label="Broken links" value={broken.length} icon={<AlertTriangle size={16} />} color="bg-red-50 text-red-600" />
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by title, URL, or location…"
          className="w-full pl-9 pr-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:border-orange-400" />
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : (
        <div className="space-y-6">
          {broken.length > 0 && (
            <Group title="⚠ Broken links (referenced but no destination)" icon={<AlertTriangle size={14} />} nodes={broken} open={open} setOpen={setOpen} accent="border-red-200 bg-red-50/40" />
          )}
          {orphans.length > 0 && (
            <Group title="🌱 Orphans (pages/products not linked anywhere)" icon={<AlertTriangle size={14} />} nodes={orphans.filter((o: any) => filtered.includes(o))} open={open} setOpen={setOpen} accent="border-amber-200 bg-amber-50/40" />
          )}
          {groups.map((g: any) => {
            const items = filtered.filter((n: any) => n.kind === g.key);
            if (items.length === 0) return null;
            return <Group key={g.key} title={`${g.label} (${items.length})`} icon={g.icon} nodes={items} open={open} setOpen={setOpen} />;
          })}

        </div>
      )}
    </div>
  );
}

function Stat({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>{icon}</div>
      <div>
        <p className="text-xl font-black">{value}</p>
        <p className="text-[11px] text-gray-500">{label}</p>
      </div>
    </div>
  );
}

function Group({ title, icon, nodes, open, setOpen, accent }: { title: string; icon: React.ReactNode; nodes: Node[]; open: Record<string, boolean>; setOpen: (v: Record<string, boolean>) => void; accent?: string }) {
  return (
    <div className={`rounded-2xl border ${accent || 'border-gray-100 bg-white'} overflow-hidden`}>
      <div className="px-4 py-2.5 border-b border-gray-100 flex items-center gap-2">
        <span className="text-orange-500">{icon}</span>
        <p className="text-xs font-black uppercase tracking-wider text-gray-700">{title}</p>
      </div>
      <div className="divide-y divide-gray-50">
        {nodes.map(n => {
          const isOpen = !!open[n.id];
          return (
            <div key={n.id}>
              <button onClick={() => setOpen({ ...open, [n.id]: !isOpen })} className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 text-left">
                {isOpen ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
                <span className="text-sm font-semibold truncate flex-1">{n.title}</span>
                <span className="text-[11px] font-mono text-gray-400 truncate hidden md:inline max-w-xs">{n.href}</span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${n.status === 'missing' ? 'bg-red-100 text-red-700' : n.status === 'disabled' ? 'bg-gray-100 text-gray-500' : n.status === 'external' ? 'bg-purple-100 text-purple-700' : n.refs.length === 0 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                  {n.status === 'missing' ? 'BROKEN' : n.status === 'disabled' ? 'OFF' : `${n.refs.length} link${n.refs.length === 1 ? '' : 's'}`}
                </span>
                {!isExternal(n.href) && n.status !== 'missing' && (
                  <a href={n.href} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="text-gray-400 hover:text-orange-500"><ExternalLink size={13} /></a>
                )}
              </button>
              {isOpen && (
                <div className="px-4 pb-3 pl-10 bg-gray-50/60 space-y-1">
                  {n.refs.length === 0 ? (
                    <p className="text-xs text-gray-400 italic py-1">Not linked from anywhere yet — this is an orphan.</p>
                  ) : (
                    n.refs.map((r, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs py-1">
                        <Link2 size={11} className="text-gray-400 shrink-0" />
                        <span className="text-gray-500 shrink-0">{r.where}</span>
                        <span className="text-gray-300">·</span>
                        <span className="font-semibold text-gray-700 truncate">{r.label}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
