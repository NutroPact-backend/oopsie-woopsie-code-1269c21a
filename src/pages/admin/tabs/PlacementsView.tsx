// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import { Search, Package, FileText, Check, Plus, X, Save, Layout, PanelBottom, Menu, Layers, Sparkles, ExternalLink } from 'lucide-react';
import API from '@/lib/api';
import type { CustomPage, BuilderSection } from './PagesTab';
import { TabHelp } from './_TabHelp';

type Item =
  | { kind: 'product'; id: string; title: string; slug: string; href: string }
  | { kind: 'page'; id: string; title: string; slug: string; href: string };

type ProductSlot = {
  area: 'homepage' | 'custom-page';
  areaId: string;          // homepage section index OR page id
  areaTitle: string;       // human area name (e.g. "Homepage → Best Sellers")
  sectionId?: string;      // builder section id (custom-page builder)
  sectionKind: 'homepage-products' | 'page-products' | 'page-builder-products';
  sectionTitle: string;    // section/grid display name
  has: boolean;
};

type LinkSlot = {
  area: 'header' | 'footer';
  containerId: string;     // nav index or footer block id/index
  containerTitle: string;  // "Header nav" or "Footer → Quick links"
  has: boolean;
};

export default function PlacementsView() {
  const [settings, setSettings] = useState<any>(null);
  const [homepage, setHomepage] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [pages, setPages] = useState<CustomPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [picker, setPicker] = useState('');
  const [selected, setSelected] = useState<Item | null>(null);
  const [filter, setFilter] = useState<'all' | 'product' | 'page'>('all');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = async () => {
    setLoading(true);
    const [s, h, p] = await Promise.all([
      API.get('/admin/settings').catch(() => ({ data: {} })),
      API.get('/admin/homepage').catch(() => ({ data: {} })),
      API.get('/products').catch(() => ({ data: [] })),
    ]);
    setSettings(s.data || {});
    setHomepage(h.data || { sections: [] });
    setProducts(p.data || []);
    setPages(Array.isArray(s.data?.customPages) ? s.data.customPages : []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  // Build searchable items list
  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];
    products.forEach((p: any) => out.push({
      kind: 'product', id: p._id || p.id, title: p.name, slug: p.slug, href: `/products/${p.slug}`,
    }));
    pages.forEach(pg => out.push({
      kind: 'page', id: pg.id, title: pg.title, slug: pg.slug, href: `/p/${pg.slug}`,
    }));
    return out;
  }, [products, pages]);

  const filteredItems = items.filter(i => {
    if (filter !== 'all' && i.kind !== filter) return false;
    const q = picker.trim().toLowerCase();
    if (!q) return true;
    return i.title.toLowerCase().includes(q) || i.slug.toLowerCase().includes(q);
  }).slice(0, 50);

  // ---- Compute slots for the selected item ----
  const productSlots = useMemo<ProductSlot[]>(() => {
    if (!selected || selected.kind !== 'product') return [];
    const out: ProductSlot[] = [];
    // Homepage product sections
    (homepage?.sections || []).forEach((sec: any, i: number) => {
      if (sec?.type === 'products' || Array.isArray(sec?.productIds)) {
        const ids: string[] = sec.productIds || [];
        out.push({
          area: 'homepage', areaId: String(i),
          areaTitle: 'Homepage', sectionKind: 'homepage-products',
          sectionTitle: sec.name || sec.title || sec.type || `Section ${i + 1}`,
          has: ids.includes(selected.id),
        });
      }
    });
    // Custom pages — type:products
    pages.forEach(pg => {
      if (pg.type === 'products') {
        out.push({
          area: 'custom-page', areaId: pg.id,
          areaTitle: `Page “${pg.title}”`, sectionKind: 'page-products',
          sectionTitle: 'Product list',
          has: (pg.productIds || []).includes(selected.id),
        });
      }
      // Builder pages — sections of type:products
      if (pg.type === 'builder') {
        (pg.sections || []).forEach((s: BuilderSection) => {
          if (s.type === 'products') {
            out.push({
              area: 'custom-page', areaId: pg.id,
              sectionId: s.id,
              areaTitle: `Page “${pg.title}”`, sectionKind: 'page-builder-products',
              sectionTitle: (s as any).title || 'Product grid',
              has: ((s as any).productIds || []).includes(selected.id),
            });
          }
        });
      }
    });
    return out;
  }, [selected, homepage, pages]);

  const linkSlots = useMemo<LinkSlot[]>(() => {
    if (!selected) return [];
    const href = selected.href;
    const out: LinkSlot[] = [];
    // Header — top level only (we add to a dropdown if user wants; for now top-level)
    const navHas = (settings?.navLinks || []).some((l: any) =>
      l.href === href || (l.children || []).some((c: any) => c.href === href)
    );
    out.push({ area: 'header', containerId: 'top', containerTitle: 'Header nav (top level)', has: navHas });
    // Each header dropdown
    (settings?.navLinks || []).forEach((l: any, i: number) => {
      if (l.children) {
        const has = (l.children || []).some((c: any) => c.href === href);
        out.push({ area: 'header', containerId: `dd:${i}`, containerTitle: `Header → ${l.label}`, has });
      }
    });
    // Footer blocks
    (settings?.footer?.blocks || []).forEach((b: any, i: number) => {
      if (Array.isArray(b.links)) {
        const has = (b.links || []).some((c: any) => c.href === href);
        out.push({ area: 'footer', containerId: `blk:${i}`, containerTitle: `Footer → ${b.title || b.type || 'Block'}`, has });
      }
    });
    return out;
  }, [selected, settings]);

  // ---- Mutators ----
  const toggleProductSlot = (slot: ProductSlot) => {
    if (!selected || selected.kind !== 'product') return;
    const pid = selected.id;
    if (slot.area === 'homepage') {
      const idx = Number(slot.areaId);
      const secs = [...(homepage?.sections || [])];
      const sec = { ...secs[idx] };
      const ids = new Set<string>(sec.productIds || []);
      slot.has ? ids.delete(pid) : ids.add(pid);
      sec.productIds = Array.from(ids);
      secs[idx] = sec;
      setHomepage({ ...homepage, sections: secs });
    } else {
      setPages(ps => ps.map(pg => {
        if (pg.id !== slot.areaId) return pg;
        if (slot.sectionKind === 'page-products') {
          const ids = new Set<string>(pg.productIds || []);
          slot.has ? ids.delete(pid) : ids.add(pid);
          return { ...pg, productIds: Array.from(ids) };
        }
        if (slot.sectionKind === 'page-builder-products') {
          const sections = (pg.sections || []).map(s => {
            if (s.id !== slot.sectionId || s.type !== 'products') return s;
            const ids = new Set<string>((s as any).productIds || []);
            slot.has ? ids.delete(pid) : ids.add(pid);
            return { ...s, productIds: Array.from(ids) } as BuilderSection;
          });
          return { ...pg, sections };
        }
        return pg;
      }));
    }
  };

  const toggleLinkSlot = (slot: LinkSlot) => {
    if (!selected) return;
    const href = selected.href;
    const label = selected.title;
    const next = { ...(settings || {}) };
    if (slot.area === 'header') {
      const links = [...(next.navLinks || [])];
      if (slot.containerId === 'top') {
        if (slot.has) {
          // remove top-level link with this href
          next.navLinks = links.filter((l: any) => l.href !== href);
        } else {
          next.navLinks = [...links, { label, href }];
        }
      } else {
        const i = Number(slot.containerId.split(':')[1]);
        const parent = { ...links[i] };
        const children = [...(parent.children || [])];
        if (slot.has) parent.children = children.filter((c: any) => c.href !== href);
        else parent.children = [...children, { label, href }];
        links[i] = parent;
        next.navLinks = links;
      }
    } else {
      const footer = { ...(next.footer || {}) };
      const blocks = [...(footer.blocks || [])];
      const i = Number(slot.containerId.split(':')[1]);
      const blk = { ...blocks[i] };
      const links = [...(blk.links || [])];
      if (slot.has) blk.links = links.filter((c: any) => c.href !== href);
      else blk.links = [...links, { label, href }];
      blocks[i] = blk;
      footer.blocks = blocks;
      next.footer = footer;
    }
    setSettings(next);
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      await Promise.all([
        API.put('/admin/settings', { ...(settings || {}), customPages: pages }),
        API.put('/admin/homepage', { sections: homepage?.sections || [] }),
      ]);
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
    } catch {
      alert('Save failed');
    }
    setSaving(false);
  };

  // ---- Render ----
  if (loading) return <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div>;

  return (
    <div className="grid md:grid-cols-[340px_1fr] gap-5">
      <TabHelp topic="placements" />
      {/* LEFT — picker */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden flex flex-col h-[calc(100vh-220px)] min-h-[500px]">
        <div className="p-3 border-b border-gray-100">
          <p className="text-[11px] font-black uppercase tracking-wider text-gray-500 mb-2">1. Pick what to place</p>
          <div className="relative mb-2">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={picker} onChange={e => setPicker(e.target.value)} placeholder="Search products & pages…"
              className="w-full pl-7 pr-2 py-2 border rounded-xl text-sm focus:outline-none focus:border-orange-400" />
          </div>
          <div className="flex gap-1">
            {(['all', 'product', 'page'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`flex-1 text-[11px] font-bold py-1.5 rounded-lg ${filter === f ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                {f === 'all' ? 'All' : f === 'product' ? 'Products' : 'Pages'}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-y-auto flex-1 divide-y divide-gray-50">
          {filteredItems.map(it => {
            const isSel = selected && selected.kind === it.kind && selected.id === it.id;
            return (
              <button key={it.kind + ':' + it.id} onClick={() => setSelected(it)}
                className={`w-full text-left p-3 hover:bg-orange-50/50 flex items-center gap-2 ${isSel ? 'bg-orange-50' : ''}`}>
                <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${it.kind === 'product' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                  {it.kind === 'product' ? <Package size={13} /> : <FileText size={13} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold truncate">{it.title}</p>
                  <p className="text-[11px] text-gray-400 font-mono truncate">{it.href}</p>
                </div>
                {isSel && <Check size={14} className="text-orange-500 shrink-0" />}
              </button>
            );
          })}
          {filteredItems.length === 0 && <p className="p-6 text-xs text-gray-400 text-center">No items match.</p>}
        </div>
      </div>

      {/* RIGHT — slots */}
      <div className="space-y-4">
        {!selected ? (
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl border border-orange-100 p-10 text-center">
            <Sparkles size={28} className="mx-auto text-orange-500 mb-3" />
            <h3 className="text-lg font-black">Pick a product or page to manage its placements</h3>
            <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
              You'll see every section on the site where it can appear — homepage product rails, custom-page grids, header dropdowns, and footer columns — with one-click add/remove.
            </p>
          </div>
        ) : (
          <>
            {/* Header bar */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 flex-wrap">
              <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${selected.kind === 'product' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                {selected.kind === 'product' ? <Package size={18} /> : <FileText size={18} />}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Managing placements for</p>
                <p className="text-base font-black truncate">{selected.title}</p>
                <a href={selected.href} target="_blank" rel="noreferrer" className="text-[11px] font-mono text-orange-600 hover:underline inline-flex items-center gap-1">
                  {selected.href} <ExternalLink size={10} />
                </a>
              </div>
              <button onClick={saveAll} disabled={saving}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black ${saved ? 'bg-green-500 text-white' : 'bg-orange-500 text-white hover:bg-orange-600'} disabled:opacity-50`}>
                <Save size={14} /> {saved ? 'Saved!' : saving ? 'Saving…' : 'Save placements'}
              </button>
            </div>

            {/* Product slots — only for products */}
            {selected.kind === 'product' && (
              <SlotGroup title="Product rails (homepage & custom pages)" icon={<Layout size={14} />}
                empty="No product rails defined yet. Create them in Homepage Builder or Pages."
                count={productSlots.length}
                badge={`${productSlots.filter(s => s.has).length} active`}>
                {productSlots.map((s, i) => (
                  <SlotRow key={i} title={s.sectionTitle} subtitle={s.areaTitle}
                    has={s.has} onToggle={() => toggleProductSlot(s)} />
                ))}
              </SlotGroup>
            )}

            {/* Link slots — for everything */}
            <SlotGroup title="Header navigation" icon={<Menu size={14} />}
              empty="No nav items yet." count={linkSlots.filter(s => s.area === 'header').length}
              badge={`${linkSlots.filter(s => s.area === 'header' && s.has).length} active`}>
              {linkSlots.filter(s => s.area === 'header').map((s, i) => (
                <SlotRow key={i} title={s.containerTitle} subtitle={s.has ? 'Link already added' : `Will add: ${selected.title}`}
                  has={s.has} onToggle={() => toggleLinkSlot(s)} />
              ))}
            </SlotGroup>

            <SlotGroup title="Footer columns" icon={<PanelBottom size={14} />}
              empty="No footer link columns yet. Add some in Footer settings."
              count={linkSlots.filter(s => s.area === 'footer').length}
              badge={`${linkSlots.filter(s => s.area === 'footer' && s.has).length} active`}>
              {linkSlots.filter(s => s.area === 'footer').map((s, i) => (
                <SlotRow key={i} title={s.containerTitle} subtitle={s.has ? 'Link already added' : `Will add: ${selected.title}`}
                  has={s.has} onToggle={() => toggleLinkSlot(s)} />
              ))}
            </SlotGroup>

            <div className="bg-blue-50 rounded-xl p-3 text-[11px] text-blue-700 flex gap-2">
              <Layers size={14} className="shrink-0 mt-0.5" />
              <span>Changes are local until you hit <strong>Save placements</strong>. Tip: to create a new homepage rail or page section, use the Homepage or Pages tabs first — it'll show up here automatically.</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SlotGroup({ title, icon, count, badge, empty, children }: { title: string; icon: React.ReactNode; count: number; badge?: string; empty: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-gray-100 flex items-center gap-2">
        <span className="text-orange-500">{icon}</span>
        <p className="text-xs font-black uppercase tracking-wider text-gray-700 flex-1">{title}</p>
        {badge && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-600">{badge}</span>}
      </div>
      {count === 0 ? (
        <p className="p-5 text-xs text-gray-400 italic text-center">{empty}</p>
      ) : (
        <div className="divide-y divide-gray-50">{children}</div>
      )}
    </div>
  );
}

function SlotRow({ title, subtitle, has, onToggle }: { title: string; subtitle: string; has: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold truncate">{title}</p>
        <p className="text-[11px] text-gray-400 truncate">{subtitle}</p>
      </div>
      <button onClick={onToggle}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black border transition shrink-0 ${has ? 'border-green-300 bg-green-50 text-green-700 hover:bg-red-50 hover:border-red-300 hover:text-red-600' : 'border-gray-200 text-gray-500 hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50'}`}>
        {has ? <><Check size={11} /> Added</> : <><Plus size={11} /> Add here</>}
      </button>
    </div>
  );
}
