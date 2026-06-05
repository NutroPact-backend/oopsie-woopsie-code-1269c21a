// @ts-nocheck
import { useEffect, useState } from 'react';
import { Plus, Trash2, Save, Eye, EyeOff, Copy, ExternalLink, ChevronDown, ChevronRight, X, ArrowUp, ArrowDown, Image as ImageIcon, Type, AlignLeft, MousePointerClick, LayoutGrid, Link2, Minus, Upload } from 'lucide-react';
import API from '@/lib/api';
import { TabHelp } from "./_TabHelp";
import { useBulkSelection, BulkActionBar, SelectCheckbox } from '../components/BulkSelect';
import { useSimpleUpload } from '@/lib/useSimpleUpload';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';

type PageType = 'products' | 'content' | 'redirect' | 'builder';

export type BuilderSection =
  | { id: string; type: 'banner'; image?: string; title?: string; subtitle?: string; ctaLabel?: string; ctaHref?: string; align?: 'left' | 'center'; overlay?: boolean }
  | { id: string; type: 'heading'; title: string; subtitle?: string; align?: 'left' | 'center' }
  | { id: string; type: 'text'; html: string }
  | { id: string; type: 'image'; src: string; alt?: string; href?: string; rounded?: boolean }
  | { id: string; type: 'products'; title?: string; productIds?: string[]; categories?: string[]; sort?: '' | 'price_asc' | 'price_desc' | 'rating'; limit?: number; columns?: 2 | 3 | 4 }
  | { id: string; type: 'cta'; title?: string; description?: string; buttonLabel?: string; buttonHref?: string; bg?: string; fg?: string }
  | { id: string; type: 'links'; title?: string; items: { label: string; href: string; image?: string; description?: string }[] }
  | { id: string; type: 'spacer'; size?: 'sm' | 'md' | 'lg' };

export interface CustomPage {
  id: string;
  title: string;
  slug: string;
  enabled: boolean;
  type: PageType;
  subtitle?: string;
  heroImage?: string;
  // products type
  categories?: string[];
  tags?: string[];
  productIds?: string[];
  sort?: '' | 'price_asc' | 'price_desc' | 'rating';
  // content type
  content?: string;
  // redirect type
  redirectTo?: string;
  // builder type
  sections?: BuilderSection[];
  // SEO
  metaTitle?: string;
  metaDescription?: string;
  // Background image (fixed, responsive layer behind page content)
  bgImage?: string;
  bgOpacity?: number;     // 0..1
  bgEnabled?: boolean;
  bgPosition?: string;    // e.g. "center"
  bgSize?: string;        // e.g. "cover" | "contain"
  bgRepeat?: string;      // e.g. "no-repeat" | "repeat"
  bgBlendMode?: string;   // e.g. "normal"
}

import { useCategoryNames } from '@/hooks/useCategories';
const FALLBACK_CATEGORIES = ['Protein', 'Creatine', 'Pre-Workout', 'Mass Gainer', 'Vitamins', 'BCAA', 'Fat Burner'];

function toSlug(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default function PagesTab() {
  const [settings, setSettings] = useState<any>(null);
  const [pages, setPages] = useState<CustomPage[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string>('');
  const perms = useAdminPermissions();
  const canEditBg = perms.has('pages.manage_background');

  useEffect(() => {
    (async () => {
      const [s, p] = await Promise.all([
        API.get('/admin/settings').catch(() => ({ data: {} })),
        API.get('/products').catch(() => ({ data: [] })),
      ]);
      setSettings(s.data || {});
      setPages(Array.isArray(s.data?.customPages) ? s.data.customPages : []);
      setProducts(p.data || []);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const next = { ...(settings || {}), customPages: pages };
      await API.put('/admin/settings', next);
      setSettings(next);
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
    } catch {
      alert('Save failed');
    }
    setSaving(false);
  };

  const addPage = () => {
    const id = crypto.randomUUID();
    const newPage: CustomPage = {
      id,
      title: 'New Page',
      slug: `page-${pages.length + 1}`,
      enabled: true,
      type: 'products',
      categories: [],
      tags: [],
      productIds: [],
      sort: '',
    };
    setPages([newPage, ...pages]);
    setExpanded(id);
  };

  const update = (id: string, patch: Partial<CustomPage>) =>
    setPages(ps => ps.map(p => (p.id === id ? { ...p, ...patch } : p)));

  const remove = (id: string) => {
    if (!confirm('Delete this page?')) return;
    setPages(ps => ps.filter(p => p.id !== id));
  };

  const bulk = useBulkSelection(pages, (p) => p.id);

  const copyLink = (slug: string, id: string) => {
    const url = `${window.location.origin}/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(''), 1500);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <TabHelp topic="pages" />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black">Pages</h2>
          <p className="text-sm text-gray-500">
            Create custom pages for navigation dropdowns. Each page gets its own URL like
            <code className="mx-1 bg-gray-100 px-1.5 rounded text-orange-600">/your-slug</code>
            that you can paste in Header → Navigation.
          </p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition ${
            saved ? 'bg-green-500 text-white' : 'bg-orange-500 text-white hover:bg-orange-600'
          } disabled:opacity-50`}
        >
          <Save size={15} />
          {saved ? 'Saved!' : saving ? 'Saving…' : 'Save Pages'}
        </button>
      </div>

      <button
        onClick={addPage}
        className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-2xl text-gray-500 hover:border-orange-400 hover:text-orange-500 w-full justify-center font-semibold text-sm transition"
      >
        <Plus size={16} /> Add New Page
      </button>

      {pages.length === 0 && (
        <div className="bg-gray-50 rounded-2xl p-10 text-center text-gray-400">
          No custom pages yet. Click <strong>Add New Page</strong> to create your first.
        </div>
      )}

      <BulkActionBar
        count={bulk.count}
        ids={Array.from(bulk.selected)}
        onClear={bulk.clear}
        actions={[
          { key: 'enable', label: 'Enable', color: 'bg-green-600 hover:bg-green-700',
            run: (ids) => { setPages(ps => ps.map(p => ids.includes(p.id) ? { ...p, enabled: true } : p)); } },
          { key: 'disable', label: 'Disable', color: 'bg-gray-600 hover:bg-gray-700',
            run: (ids) => { setPages(ps => ps.map(p => ids.includes(p.id) ? { ...p, enabled: false } : p)); } },
          { key: 'delete', label: 'Delete', color: 'bg-red-600 hover:bg-red-700', confirm: 'Delete {n} pages? Click Save Pages after to persist.',
            run: (ids) => { setPages(ps => ps.filter(p => !ids.includes(p.id))); } },
        ]}
      />
      {pages.length > 0 && (
        <label className="flex items-center gap-2 text-xs font-bold text-gray-600 px-1">
          <SelectCheckbox checked={bulk.allSelected} indeterminate={bulk.someSelected} onChange={bulk.toggleAll} />
          Select all ({pages.length})
        </label>
      )}

      <div className="space-y-3">
        {pages.map(page => {
          const isOpen = expanded === page.id;
          return (
            <div key={page.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="flex items-center gap-3 p-4">
                <SelectCheckbox checked={bulk.isSelected(page.id)} onChange={() => bulk.toggleOne(page.id)} />
                <button
                  onClick={() => setExpanded(isOpen ? null : page.id)}
                  className="shrink-0 text-gray-400 hover:text-gray-700"
                >
                  {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-sm truncate">{page.title || '(untitled)'}</p>
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                        page.type === 'products'
                          ? 'bg-blue-50 text-blue-600'
                          : page.type === 'content'
                          ? 'bg-purple-50 text-purple-600'
                          : 'bg-amber-50 text-amber-600'
                      }`}
                    >
                      {page.type}
                    </span>
                    {!page.enabled && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 uppercase">
                        Disabled
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 font-mono truncate">/{page.slug}</p>
                </div>
                <button
                  onClick={() => copyLink(page.slug, page.id)}
                  title="Copy URL"
                  className="shrink-0 flex items-center gap-1 px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-500 hover:border-orange-300 hover:text-orange-600 transition"
                >
                  <Copy size={12} /> {copiedId === page.id ? 'Copied!' : 'Copy link'}
                </button>
                <a
                  href={`/${page.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 p-2 text-gray-400 hover:text-orange-500"
                  title="Open page"
                >
                  <ExternalLink size={14} />
                </a>
                <button
                  onClick={() => update(page.id, { enabled: !page.enabled })}
                  className="shrink-0 p-2 text-gray-400 hover:text-gray-700"
                  title={page.enabled ? 'Disable' : 'Enable'}
                >
                  {page.enabled ? <Eye size={15} /> : <EyeOff size={15} />}
                </button>
                <button
                  onClick={() => remove(page.id)}
                  className="shrink-0 p-2 text-red-400 hover:text-red-600"
                  title="Delete"
                >
                  <Trash2 size={15} />
                </button>
              </div>

              {isOpen && (
                <div className="border-t border-gray-100 p-5 space-y-4 bg-gray-50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-gray-500 block mb-1">Title</label>
                      <input
                        value={page.title}
                        onChange={e =>
                          update(page.id, {
                            title: e.target.value,
                            // auto-fill slug if user hasn't customized
                            slug: page.slug === toSlug(page.title) || !page.slug ? toSlug(e.target.value) : page.slug,
                          })
                        }
                        className="w-full bg-white border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 block mb-1">
                        Slug (URL) — final URL: <span className="text-orange-600">/{page.slug || '...'}</span>
                      </label>
                      <input
                        value={page.slug}
                        onChange={e => update(page.id, { slug: toSlug(e.target.value) })}
                        className="w-full bg-white border rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-orange-400"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs font-bold text-gray-500 block mb-1">Subtitle</label>
                      <input
                        value={page.subtitle || ''}
                        onChange={e => update(page.id, { subtitle: e.target.value })}
                        placeholder="Short tagline under the title"
                        className="w-full bg-white border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs font-bold text-gray-500 block mb-1">Hero image / video (optional)</label>
                      <MediaInput
                        value={page.heroImage || ''}
                        onChange={url => update(page.id, { heroImage: url })}
                        placeholder="https://… or upload image/video →"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-2">Page Type</label>
                    <div className="flex flex-wrap gap-2">
                      {(['products', 'builder', 'content', 'redirect'] as PageType[]).map(t => (
                        <button
                          key={t}
                          onClick={() => update(page.id, { type: t })}
                          className={`px-4 py-2 rounded-xl text-xs font-bold border transition capitalize ${
                            page.type === t
                              ? 'bg-orange-500 text-white border-orange-500'
                              : 'bg-white border-gray-200 text-gray-500 hover:border-orange-300'
                          }`}
                        >
                          {t === 'products'
                            ? '🛒 Product Listing'
                            : t === 'builder'
                            ? '🧱 Page Builder'
                            : t === 'content'
                            ? '📄 Raw HTML'
                            : '↗ Redirect'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {page.type === 'products' && (
                    <ProductFilterEditor page={page} products={products} update={update} />
                  )}

                  {page.type === 'builder' && (
                    <SectionsEditor page={page} products={products} update={update} />
                  )}

                  {page.type === 'content' && (
                    <div>
                      <label className="text-xs font-bold text-gray-500 block mb-1">Content (HTML or plain text)</label>
                      <textarea
                        value={page.content || ''}
                        onChange={e => update(page.id, { content: e.target.value })}
                        rows={10}
                        placeholder="Write your page content. HTML tags are supported."
                        className="w-full bg-white border rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-orange-400"
                      />
                    </div>
                  )}

                  {page.type === 'redirect' && (
                    <div>
                      <label className="text-xs font-bold text-gray-500 block mb-1">Redirect to URL</label>
                      <input
                        value={page.redirectTo || ''}
                        onChange={e => update(page.id, { redirectTo: e.target.value })}
                        placeholder="/products?category=Protein  or  https://..."
                        className="w-full bg-white border rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-orange-400"
                      />
                    </div>
                  )}

                  {canEditBg && (
                    <BackgroundEditor page={page} update={update} />
                  )}

                  <details className="bg-white rounded-xl border border-gray-200 p-3">
                    <summary className="text-xs font-bold text-gray-500 cursor-pointer">SEO (optional)</summary>
                    <div className="mt-3 space-y-2">
                      <input
                        value={page.metaTitle || ''}
                        onChange={e => update(page.id, { metaTitle: e.target.value })}
                        placeholder="Meta Title"
                        className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                      />
                      <textarea
                        value={page.metaDescription || ''}
                        onChange={e => update(page.id, { metaDescription: e.target.value })}
                        placeholder="Meta Description"
                        rows={2}
                        className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                      />
                    </div>
                  </details>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-blue-50 rounded-xl p-4 text-xs text-blue-700 leading-relaxed">
        <strong>How to use in navigation:</strong> After saving, copy a page link and open
        <strong> Header & Announcement → Navigation</strong>. Edit a dropdown item and paste the
        link (e.g. <code className="bg-white px-1 rounded">/p/protein-isolate</code>) in the
        href field.
      </div>
    </div>
  );
}

function ProductFilterEditor({
  page,
  products,
  update,
}: {
  page: CustomPage;
  products: any[];
  update: (id: string, patch: Partial<CustomPage>) => void;
}) {
  const [search, setSearch] = useState('');
  const selectedIds = new Set(page.productIds || []);
  const cats = new Set(page.categories || []);
  const catNames = useCategoryNames();
  const CATEGORIES = catNames.length ? catNames : FALLBACK_CATEGORIES;
  const allTags = Array.from(
    new Set(products.flatMap(p => (Array.isArray(p.tags) ? p.tags : [])).filter(Boolean))
  ) as string[];

  const filtered = products.filter(p => {
    const s = search.toLowerCase().trim();
    if (!s) return true;
    return (p.name || '').toLowerCase().includes(s) || (p.category || '').toLowerCase().includes(s);
  });

  const toggleId = (id: string) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    update(page.id, { productIds: Array.from(next) });
  };

  const toggleCat = (c: string) => {
    const next = new Set(cats);
    next.has(c) ? next.delete(c) : next.add(c);
    update(page.id, { categories: Array.from(next) });
  };

  return (
    <div className="space-y-4 bg-white rounded-xl border border-gray-200 p-4">
      <div>
        <label className="text-xs font-bold text-gray-500 block mb-2">
          Filter by category (any selected)
        </label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(c => (
            <button
              key={c}
              onClick={() => toggleCat(c)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition ${
                cats.has(c)
                  ? 'bg-orange-500 border-orange-500 text-white'
                  : 'bg-white border-gray-200 text-gray-500 hover:border-orange-300'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {allTags.length > 0 && (
        <div>
          <label className="text-xs font-bold text-gray-500 block mb-2">Filter by tag</label>
          <div className="flex flex-wrap gap-2">
            {allTags.map(t => {
              const sel = (page.tags || []).includes(t);
              return (
                <button
                  key={t}
                  onClick={() => {
                    const next = new Set(page.tags || []);
                    sel ? next.delete(t) : next.add(t);
                    update(page.id, { tags: Array.from(next) });
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition ${
                    sel
                      ? 'bg-purple-500 border-purple-500 text-white'
                      : 'bg-white border-gray-200 text-gray-500 hover:border-purple-300'
                  }`}
                >
                  #{t}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <label className="text-xs font-bold text-gray-500 block mb-2">Sort order</label>
        <select
          value={page.sort || ''}
          onChange={e => update(page.id, { sort: e.target.value as any })}
          className="border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400 bg-white"
        >
          <option value="">Featured (newest)</option>
          <option value="rating">Best rating</option>
          <option value="price_asc">Price: low → high</option>
          <option value="price_desc">Price: high → low</option>
        </select>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold text-gray-500">
            Pick specific products ({selectedIds.size} selected) — overrides filters
          </label>
          {selectedIds.size > 0 && (
            <button
              onClick={() => update(page.id, { productIds: [] })}
              className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1"
            >
              <X size={11} /> Clear
            </button>
          )}
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search products by name or category…"
          className="w-full border rounded-xl px-3 py-2 text-sm mb-2 focus:outline-none focus:border-orange-400"
        />
        <div className="max-h-72 overflow-y-auto border rounded-xl divide-y">
          {filtered.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-6">No products match</p>
          )}
          {filtered.map(p => (
            <label
              key={p._id || p.id}
              className="flex items-center gap-3 px-3 py-2 hover:bg-orange-50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedIds.has(p._id || p.id)}
                onChange={() => toggleId(p._id || p.id)}
                className="accent-orange-500"
              />
              {p.images?.[0] && (
                <img
                  src={p.images[0]}
                  alt=""
                  className="w-8 h-8 rounded-lg object-cover border"
                  loading="lazy"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{p.name}</p>
                <p className="text-[11px] text-gray-400">{p.category}</p>
              </div>
              <span className="text-xs text-gray-500 shrink-0">₹{p.price}</span>
            </label>
          ))}
        </div>
        <p className="text-[11px] text-gray-400 mt-2">
          Tip: leave this empty to use category/tag filters above. Selecting products here
          overrides the filters and shows exactly these.
        </p>
      </div>
    </div>
  );
}

// ─── Sections Editor (Page Builder) ──────────────────────────────────────────

const SECTION_TYPES: { type: BuilderSection['type']; label: string; icon: React.ReactNode; desc: string }[] = [
  { type: 'banner',   label: 'Banner',        icon: <ImageIcon size={14} />,        desc: 'Hero image + title + CTA' },
  { type: 'heading',  label: 'Heading',       icon: <Type size={14} />,             desc: 'Title and subtitle' },
  { type: 'text',     label: 'Text / HTML',   icon: <AlignLeft size={14} />,        desc: 'Rich paragraph block' },
  { type: 'image',    label: 'Image',         icon: <ImageIcon size={14} />,        desc: 'Single image (clickable)' },
  { type: 'products', label: 'Product Grid',  icon: <LayoutGrid size={14} />,       desc: 'Pick products / category' },
  { type: 'cta',      label: 'CTA Strip',     icon: <MousePointerClick size={14} />,desc: 'Colored band with button' },
  { type: 'links',    label: 'Link Cards',    icon: <Link2 size={14} />,            desc: 'Grid of clickable cards' },
  { type: 'spacer',   label: 'Spacer',        icon: <Minus size={14} />,            desc: 'Vertical breathing room' },
];

function newSection(type: BuilderSection['type']): BuilderSection {
  const id = crypto.randomUUID();
  switch (type) {
    case 'banner':   return { id, type, title: 'Big bold title', subtitle: 'Short tagline', ctaLabel: 'Shop now', ctaHref: '/products', align: 'center', overlay: true };
    case 'heading':  return { id, type, title: 'Section heading', subtitle: '', align: 'left' };
    case 'text':     return { id, type, html: 'Write something compelling here. HTML allowed.' };
    case 'image':    return { id, type, src: '', alt: '', href: '', rounded: true };
    case 'products': return { id, type, title: 'Featured products', productIds: [], categories: [], sort: '', limit: 8, columns: 4 };
    case 'cta':      return { id, type, title: 'Ready to start?', description: 'Join thousands of happy customers.', buttonLabel: 'Get started', buttonHref: '/products', bg: '#111827', fg: '#ffffff' };
    case 'links':    return { id, type, title: 'Explore', items: [{ label: 'Link 1', href: '/', image: '', description: '' }] };
    case 'spacer':   return { id, type, size: 'md' };
  }
}

function SectionsEditor({ page, products, update }: { page: CustomPage; products: any[]; update: (id: string, patch: Partial<CustomPage>) => void }) {
  const sections = page.sections || [];
  const setSections = (next: BuilderSection[]) => update(page.id, { sections: next });
  const add = (type: BuilderSection['type']) => setSections([...sections, newSection(type)]);
  const remove = (i: number) => setSections(sections.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir; if (j < 0 || j >= sections.length) return;
    const n = [...sections]; [n[i], n[j]] = [n[j], n[i]]; setSections(n);
  };
  const patch = (i: number, p: Partial<BuilderSection>) =>
    setSections(sections.map((s, idx) => (idx === i ? ({ ...s, ...p } as BuilderSection) : s)));

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-xl border border-gray-200 p-3">
        <p className="text-xs font-bold text-gray-500 mb-2">Add a section</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {SECTION_TYPES.map(s => (
            <button key={s.type} type="button" onClick={() => add(s.type)}
              className="flex items-start gap-2 p-2.5 rounded-xl border border-gray-200 hover:border-orange-400 hover:bg-orange-50 text-left transition">
              <span className="text-orange-500 mt-0.5">{s.icon}</span>
              <div className="min-w-0">
                <p className="text-xs font-bold text-gray-800">{s.label}</p>
                <p className="text-[10px] text-gray-400 truncate">{s.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {sections.length === 0 && (
        <div className="bg-gray-50 rounded-xl p-6 text-center text-xs text-gray-400">
          Empty page. Add your first section above.
        </div>
      )}

      {sections.map((s, i) => (
        <div key={s.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-100">
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">{s.type}</span>
            <span className="text-xs text-gray-500 truncate flex-1">
              {('title' in s && s.title) || ('src' in s && s.src) || ('html' in s && s.html?.slice(0, 40)) || '—'}
            </span>
            <button onClick={() => move(i, -1)} disabled={i === 0} className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-20"><ArrowUp size={13} /></button>
            <button onClick={() => move(i, 1)} disabled={i === sections.length - 1} className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-20"><ArrowDown size={13} /></button>
            <button onClick={() => remove(i)} className="p-1 text-red-400 hover:text-red-600"><Trash2 size={13} /></button>
          </div>
          <div className="p-3 space-y-2">
            <SectionFields section={s} products={products} onChange={(p) => patch(i, p)} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[11px] font-bold text-gray-500 block mb-1">{label}</label>
      {children}
    </div>
  );
}
const inp = 'w-full border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-orange-400';

function MediaInput({ value, onChange, accept = 'image/*,video/*', placeholder = 'https://… or upload →', bucket = 'page-backgrounds', className = '' }: { value: string; onChange: (url: string) => void; accept?: string; placeholder?: string; bucket?: string; className?: string }) {
  const { uploadFile, isUploading, progress } = useSimpleUpload({ bucket });
  return (
    <div className={`flex gap-2 items-center ${className}`}>
      <input
        className="flex-1 bg-white border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400 min-w-0"
        placeholder={placeholder}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
      />
      <label className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-bold cursor-pointer shrink-0 inline-flex items-center gap-1.5">
        <Upload size={12} /> {isUploading ? `${progress}%` : 'Upload'}
        <input type="file" accept={accept} className="hidden" onChange={async e => {
          const f = e.target.files?.[0]; if (!f) return;
          const url = await uploadFile(f);
          if (url) onChange(url);
          e.target.value = '';
        }} />
      </label>
      {value && (
        <button type="button" onClick={() => onChange('')} className="px-2.5 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold shrink-0">Clear</button>
      )}
    </div>
  );
}

function SectionFields({ section, products, onChange }: { section: BuilderSection; products: any[]; onChange: (p: Partial<BuilderSection>) => void }) {
  switch (section.type) {
    case 'banner':
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <Field label="Image / video"><MediaInput value={section.image || ''} onChange={url => onChange({ image: url } as any)} /></Field>
          <Field label="Align"><select className={inp} value={section.align || 'center'} onChange={e => onChange({ align: e.target.value as any } as any)}><option value="left">Left</option><option value="center">Center</option></select></Field>
          <Field label="Title"><input className={inp} value={section.title || ''} onChange={e => onChange({ title: e.target.value } as any)} /></Field>
          <Field label="Subtitle"><input className={inp} value={section.subtitle || ''} onChange={e => onChange({ subtitle: e.target.value } as any)} /></Field>
          <Field label="Button label"><input className={inp} value={section.ctaLabel || ''} onChange={e => onChange({ ctaLabel: e.target.value } as any)} /></Field>
          <Field label="Button link"><input className={inp} value={section.ctaHref || ''} onChange={e => onChange({ ctaHref: e.target.value } as any)} placeholder="/products or /p/slug" /></Field>
          <label className="flex items-center gap-2 text-xs font-semibold text-gray-600"><input type="checkbox" checked={section.overlay !== false} onChange={e => onChange({ overlay: e.target.checked } as any)} className="accent-orange-500" /> Dark overlay for text contrast</label>
        </div>
      );
    case 'heading':
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <Field label="Title"><input className={inp} value={section.title} onChange={e => onChange({ title: e.target.value } as any)} /></Field>
          <Field label="Align"><select className={inp} value={section.align || 'left'} onChange={e => onChange({ align: e.target.value as any } as any)}><option value="left">Left</option><option value="center">Center</option></select></Field>
          <Field label="Subtitle"><input className={inp} value={section.subtitle || ''} onChange={e => onChange({ subtitle: e.target.value } as any)} /></Field>
        </div>
      );
    case 'text':
      return <Field label="HTML / text"><textarea rows={6} className={inp + ' font-mono'} value={section.html} onChange={e => onChange({ html: e.target.value } as any)} /></Field>;
    case 'image':
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <Field label="Image / video"><MediaInput value={section.src} onChange={url => onChange({ src: url } as any)} /></Field>
          <Field label="Alt text"><input className={inp} value={section.alt || ''} onChange={e => onChange({ alt: e.target.value } as any)} /></Field>
          <Field label="Click link (optional)"><input className={inp} value={section.href || ''} onChange={e => onChange({ href: e.target.value } as any)} /></Field>
          <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 mt-5"><input type="checkbox" checked={section.rounded !== false} onChange={e => onChange({ rounded: e.target.checked } as any)} className="accent-orange-500" /> Rounded corners</label>
        </div>
      );
    case 'products': {
      const cats = ['Protein', 'Creatine', 'Pre-Workout', 'Mass Gainer', 'Vitamins', 'BCAA', 'Fat Burner'];
      const selected = new Set(section.productIds || []);
      const catSet = new Set(section.categories || []);
      return (
        <div className="space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <Field label="Section title"><input className={inp} value={section.title || ''} onChange={e => onChange({ title: e.target.value } as any)} /></Field>
            <Field label="Sort"><select className={inp} value={section.sort || ''} onChange={e => onChange({ sort: e.target.value as any } as any)}>
              <option value="">Featured</option><option value="rating">Best rating</option><option value="price_asc">Price ↑</option><option value="price_desc">Price ↓</option>
            </select></Field>
            <Field label="Limit"><input type="number" className={inp} value={section.limit ?? 8} onChange={e => onChange({ limit: Number(e.target.value) || 8 } as any)} /></Field>
            <Field label="Columns"><select className={inp} value={String(section.columns ?? 4)} onChange={e => onChange({ columns: Number(e.target.value) as any } as any)}><option value="2">2</option><option value="3">3</option><option value="4">4</option></select></Field>
          </div>
          <Field label="Categories (any selected)">
            <div className="flex flex-wrap gap-1.5">
              {cats.map(c => {
                const on = catSet.has(c);
                return <button key={c} type="button" onClick={() => { const n = new Set(catSet); on ? n.delete(c) : n.add(c); onChange({ categories: Array.from(n) } as any); }}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${on ? 'bg-orange-500 text-white border-orange-500' : 'bg-white border-gray-200 text-gray-500 hover:border-orange-300'}`}>{c}</button>;
              })}
            </div>
          </Field>
          <Field label={`Pick specific products (${selected.size} selected — overrides category)`}>
            <div className="max-h-44 overflow-y-auto border rounded-lg divide-y bg-white">
              {products.map(p => {
                const id = p._id || p.id;
                return (
                  <label key={id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-orange-50 cursor-pointer text-xs">
                    <input type="checkbox" className="accent-orange-500" checked={selected.has(id)} onChange={() => { const n = new Set(selected); n.has(id) ? n.delete(id) : n.add(id); onChange({ productIds: Array.from(n) } as any); }} />
                    {p.images?.[0] && <img src={p.images[0]} alt="" className="w-6 h-6 rounded object-cover" loading="lazy" />}
                    <span className="flex-1 truncate">{p.name}</span>
                    <span className="text-gray-400">{p.category}</span>
                  </label>
                );
              })}
            </div>
          </Field>
        </div>
      );
    }
    case 'cta':
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <Field label="Title"><input className={inp} value={section.title || ''} onChange={e => onChange({ title: e.target.value } as any)} /></Field>
          <Field label="Description"><input className={inp} value={section.description || ''} onChange={e => onChange({ description: e.target.value } as any)} /></Field>
          <Field label="Button label"><input className={inp} value={section.buttonLabel || ''} onChange={e => onChange({ buttonLabel: e.target.value } as any)} /></Field>
          <Field label="Button link"><input className={inp} value={section.buttonHref || ''} onChange={e => onChange({ buttonHref: e.target.value } as any)} /></Field>
          <Field label="Background color"><input type="color" className="w-full h-9 border rounded-lg" value={section.bg || '#111827'} onChange={e => onChange({ bg: e.target.value } as any)} /></Field>
          <Field label="Text color"><input type="color" className="w-full h-9 border rounded-lg" value={section.fg || '#ffffff'} onChange={e => onChange({ fg: e.target.value } as any)} /></Field>
        </div>
      );
    case 'links': {
      const items = section.items || [];
      const setItems = (next: typeof items) => onChange({ items: next } as any);
      return (
        <div className="space-y-2">
          <Field label="Section title"><input className={inp} value={section.title || ''} onChange={e => onChange({ title: e.target.value } as any)} /></Field>
          {items.map((it, i) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center bg-gray-50 rounded-lg p-2">
              <input className={inp + ' md:col-span-3'} placeholder="Label" value={it.label} onChange={e => setItems(items.map((x, idx) => idx === i ? { ...x, label: e.target.value } : x))} />
              <input className={inp + ' md:col-span-3 font-mono'} placeholder="/p/slug or /products" value={it.href} onChange={e => setItems(items.map((x, idx) => idx === i ? { ...x, href: e.target.value } : x))} />
              <input className={inp + ' md:col-span-3'} placeholder="Image URL (opt)" value={it.image || ''} onChange={e => setItems(items.map((x, idx) => idx === i ? { ...x, image: e.target.value } : x))} />
              <input className={inp + ' md:col-span-2'} placeholder="Description" value={it.description || ''} onChange={e => setItems(items.map((x, idx) => idx === i ? { ...x, description: e.target.value } : x))} />
              <button onClick={() => setItems(items.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600 md:col-span-1"><Trash2 size={13} /></button>
            </div>
          ))}
          <button onClick={() => setItems([...items, { label: 'New link', href: '/', image: '', description: '' }])} className="text-xs font-bold text-orange-600 hover:underline flex items-center gap-1"><Plus size={12} /> Add link</button>
        </div>
      );
    }
    case 'spacer':
      return <Field label="Size"><select className={inp} value={section.size || 'md'} onChange={e => onChange({ size: e.target.value as any } as any)}><option value="sm">Small</option><option value="md">Medium</option><option value="lg">Large</option></select></Field>;
  }
}

function BackgroundEditor({ page, update }: { page: CustomPage; update: (id: string, patch: Partial<CustomPage>) => void }) {
  const { uploadFile, isUploading } = useSimpleUpload({ bucket: 'page-backgrounds' });
  const opacity = typeof page.bgOpacity === 'number' ? page.bgOpacity : 0.15;
  const enabled = page.bgEnabled !== false;

  return (
    <details className="bg-white rounded-xl border border-orange-200 p-3" open={!!page.bgImage}>
      <summary className="text-xs font-bold text-orange-600 cursor-pointer flex items-center gap-2">
        <ImageIcon size={14} /> Page Background Image (fully responsive)
      </summary>
      <div className="mt-3 space-y-3">
        <p className="text-xs text-gray-500">Add an image that fills the screen behind this page's content. Stays sharp on mobile, tablet and desktop.</p>

        <div className="flex gap-3 items-start">
          <input
            className="flex-1 bg-white border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
            placeholder="https://… or upload →"
            value={page.bgImage || ''}
            onChange={e => update(page.id, { bgImage: e.target.value })}
          />
          <label className="px-3 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-bold cursor-pointer shrink-0 inline-flex items-center gap-1.5">
            <Upload size={12} /> {isUploading ? '...' : 'Upload'}
            <input type="file" accept="image/*" className="hidden" onChange={async e => {
              const f = e.target.files?.[0]; if (!f) return;
              const url = await uploadFile(f);
              if (url) update(page.id, { bgImage: url, bgEnabled: true });
            }} />
          </label>
          {page.bgImage && (
            <button
              type="button"
              onClick={() => update(page.id, { bgImage: '', bgEnabled: false })}
              className="px-3 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold shrink-0"
            >Remove</button>
          )}
        </div>

        {page.bgImage && (
          <div className="rounded-xl overflow-hidden border border-gray-200" style={{ aspectRatio: '16 / 7', backgroundImage: `url(${page.bgImage})`, backgroundSize: page.bgSize || 'cover', backgroundPosition: page.bgPosition || 'center', backgroundRepeat: page.bgRepeat || 'no-repeat', opacity }} />
        )}

        <div>
          <label className="flex items-center justify-between text-xs font-bold text-gray-600 mb-1">
            <span>Transparency (opacity)</span>
            <span className="text-orange-600">{Math.round(opacity * 100)}%</span>
          </label>
          <input
            type="range" min={0} max={100} step={1}
            value={Math.round(opacity * 100)}
            onChange={e => update(page.id, { bgOpacity: Number(e.target.value) / 100 })}
            className="w-full accent-orange-500"
          />
        </div>

        <label className="flex items-center gap-2 text-xs font-semibold text-gray-700">
          <input type="checkbox" checked={enabled} onChange={e => update(page.id, { bgEnabled: e.target.checked })} />
          Show background on this page
        </label>

        <details className="bg-gray-50 rounded-lg p-2">
          <summary className="text-[11px] font-bold text-gray-500 cursor-pointer">Advanced (position / size / repeat)</summary>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <select className="border rounded-lg px-2 py-1.5 text-xs bg-white" value={page.bgPosition || 'center'} onChange={e => update(page.id, { bgPosition: e.target.value })}>
              <option value="center">center</option>
              <option value="top">top</option>
              <option value="bottom">bottom</option>
              <option value="left">left</option>
              <option value="right">right</option>
            </select>
            <select className="border rounded-lg px-2 py-1.5 text-xs bg-white" value={page.bgSize || 'cover'} onChange={e => update(page.id, { bgSize: e.target.value })}>
              <option value="cover">cover (fill)</option>
              <option value="contain">contain (fit)</option>
              <option value="auto">auto</option>
            </select>
            <select className="border rounded-lg px-2 py-1.5 text-xs bg-white" value={page.bgRepeat || 'no-repeat'} onChange={e => update(page.id, { bgRepeat: e.target.value })}>
              <option value="no-repeat">no-repeat</option>
              <option value="repeat">tile</option>
              <option value="repeat-x">repeat X</option>
              <option value="repeat-y">repeat Y</option>
            </select>
          </div>
        </details>
      </div>
    </details>
  );
}
