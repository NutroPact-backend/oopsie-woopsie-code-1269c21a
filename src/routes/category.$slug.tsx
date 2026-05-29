import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { fetchCategories, type Category } from '@/hooks/useCategories';
import { formatPrice, calculateDiscount } from '@/lib/utils';
import { ShoppingCart, Zap } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { trackAddToCart } from '@/lib/analytics';
import API from '@/lib/api';
import { getCategorySeo } from '@/lib/categories.functions';
import VideoSections from '@/components/video-sections/VideoSections';

interface Product {
  _id: string; name: string; slug: string; price: number; comparePrice: number;
  images: string[]; category: string; ratings: number; numReviews: number; stock?: number; pixels?: any;
}

function clip(s: string, max = 160) {
  const t = (s || '').replace(/\s+/g, ' ').trim();
  return t.length > max ? t.slice(0, max - 1).trimEnd() + '…' : t;
}

export const Route = createFileRoute('/category/$slug')({
  // Loader runs server-side during SSR — head() receives DB-driven values
  // so crawlers + social scrapers see unique, stable meta per slug without
  // any client-side DOM patching.
  loader: ({ params }) =>
    getCategorySeo({ data: { slug: params.slug } }).catch(() => null),
  head: ({ params, loaderData }) => {
    const seo = loaderData as Awaited<ReturnType<typeof getCategorySeo>>;
    const niceName = params.slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    const name = seo?.name || niceName;
    const url = `/category/${params.slug}`;
    const title = seo?.seo_title
      || `${name} — Shop ${name} Supplements Online | NutroPact`;
    const description = clip(
      seo?.seo_description
        || seo?.description
        || `Explore our ${name} collection at NutroPact. Premium-quality ${name.toLowerCase()} supplements with lab-tested ingredients, fast delivery across India, and 100% authentic guarantee.`
    );
    const meta: any[] = [
      { title },
      { name: 'description', content: description },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: url },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
    ];
    // Fallback chain: category image_url → site default OG image.
    // Always emit og:image + twitter:image so social previews never fall back
    // to a blank card when a category has no custom image set.
    const ogImage = seo?.image_url || '/og-image.jpg';
    meta.push({ property: 'og:image', content: ogImage });
    meta.push({ property: 'og:image:alt', content: `${name} — NutroPact` });
    meta.push({ name: 'twitter:image', content: ogImage });
    return {
      meta,
      links: [{ rel: 'canonical', href: url }],
      scripts: [{
        type: 'application/ld+json',
        children: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: '/' },
            { '@type': 'ListItem', position: 2, name: 'Categories', item: '/products' },
            { '@type': 'ListItem', position: 3, name, item: url },
          ],
        }),
      }],
    };
  },
  component: CategoryPage,
});




function CategoryPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const [cat, setCat] = useState<Category | null>(null);
  const [subs, setSubs] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setLoading(true);
      const { data: c } = await supabase.from('categories').select('*').eq('slug', slug).maybeSingle();
      if (!alive) return;
      if (!c) { setCat(null); setLoading(false); return; }
      setCat(c as Category);
      const all = await fetchCategories();
      if (!alive) return;
      setSubs(all.filter(x => x.parent_id === c.id));
      try {
        const r = await API.get(`/products?category=${encodeURIComponent(c.name)}`);
        if (alive) setProducts(r.data || []);
      } catch { if (alive) setProducts([]); }
      if (alive) setLoading(false);
    };
    load();
    return () => { alive = false; };
  }, [slug]);



  const addItem = useCartStore(s => s.addItem);

  if (!loading && !cat) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center">
        <p className="text-6xl mb-4">🔍</p>
        <h1 className="text-2xl font-black">Category not found</h1>
        <p className="text-gray-500 mt-2">It may have been removed or renamed.</p>
        <Link to="/products" className="inline-block mt-6 bg-orange-500 text-white px-6 py-3 rounded-xl font-bold">Browse all products</Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <VideoSections placement="category" id={(cat as any)?.id || (cat as any)?._id || slug} />
      {/* Hero */}
      {cat && (
        <section className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-orange-50 to-amber-50 mb-8 p-6 sm:p-10">
          {cat.image_url && <img src={cat.image_url} alt="" width={1600} height={400} loading="eager" decoding="async" className="absolute inset-0 w-full h-full object-cover opacity-25" />}
          <div className="relative">
            {cat.icon && <p className="text-5xl mb-2">{cat.icon}</p>}
            <h1 className="text-3xl sm:text-4xl font-black text-gray-900">{cat.name}</h1>
            {cat.description && <p className="text-gray-600 mt-2 max-w-2xl">{cat.description}</p>}
          </div>
        </section>
      )}

      {/* Sub-categories */}
      {subs.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-black mb-3">Shop by type</h2>
          <div className="flex flex-wrap gap-2">
            {subs.map(s => (
              <Link key={s.id} to="/category/$slug" params={{ slug: s.slug }}
                className="inline-flex items-center gap-2 bg-white border rounded-full px-4 py-2 text-sm font-semibold hover:border-orange-400">
                {s.icon} {s.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Products */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{loading ? 'Loading…' : `${products.length} product${products.length !== 1 ? 's' : ''}`}</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <div key={i} className="bg-gray-100 rounded-2xl h-80 animate-pulse" />)}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">📦</p>
          <p className="font-bold text-gray-600">No products in this category yet</p>
          <Link to="/products" className="inline-block mt-4 bg-orange-500 text-white px-6 py-3 rounded-xl font-bold">View all products</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map(p => {
            const oos = (p.stock ?? 1) === 0;
            const discount = p.comparePrice > p.price ? calculateDiscount(p.price, p.comparePrice) : 0;
            return (
              <div key={p._id} className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition overflow-hidden flex flex-col">
                <Link to="/products/$slug" params={{ slug: p.slug }} className="block">
                  <div className="relative bg-gray-50 aspect-square overflow-hidden">
                    {discount > 0 && <span className="absolute top-3 left-3 z-10 bg-green-500 text-white text-xs font-black px-2 py-1 rounded-full">{discount}% OFF</span>}
                    {p.images?.[0] ? <img src={p.images[0]} alt={p.name} width={400} height={400} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform" /> : <div className="w-full h-full flex items-center justify-center text-4xl font-black text-gray-200">NP</div>}
                  </div>
                  <div className="p-4 pb-2">
                    <p className="text-xs text-gray-400 font-medium mb-1">{p.category}</p>
                    <h3 className="font-bold text-gray-900 leading-tight line-clamp-2 min-h-[2.5rem]">{p.name}</h3>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="font-black text-lg">{formatPrice(p.price)}</span>
                      {p.comparePrice > p.price && <span className="text-sm text-gray-400 line-through">{formatPrice(p.comparePrice)}</span>}
                    </div>
                  </div>
                </Link>
                <div className="px-3 pb-3 mt-auto flex gap-2">
                  <button disabled={oos} onClick={() => { addItem({ id: p._id, name: p.name, price: p.price, image: p.images?.[0] || '', flavor: '', size: '', quantity: 1, category: p.category, pixels: p.pixels }); trackAddToCart({ id: p._id, name: p.name, price: p.price, category: p.category, pixels: p.pixels }); }}
                    className="flex-1 h-9 inline-flex items-center justify-center gap-1.5 rounded-xl border-2 border-gray-900 text-gray-900 text-xs font-black hover:bg-gray-900 hover:text-white disabled:opacity-40"><ShoppingCart size={13} /> Add</button>
                  <button disabled={oos} onClick={() => { addItem({ id: p._id, name: p.name, price: p.price, image: p.images?.[0] || '', flavor: '', size: '', quantity: 1, category: p.category, pixels: p.pixels }); navigate({ to: '/checkout' }); }}
                    className="flex-1 h-9 inline-flex items-center justify-center gap-1.5 rounded-xl bg-orange-500 text-white text-xs font-black hover:bg-orange-600 disabled:opacity-40"><Zap size={13} /> Buy</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
