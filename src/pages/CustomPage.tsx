// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useNavigate } from '@tanstack/react-router';
import { ShoppingCart, Zap } from 'lucide-react';
import API from '@/lib/api';
import { useSettings } from '@/lib/useSettings';
import { useSEO } from '@/lib/useSEO';
import { useCartStore } from '@/store/cartStore';
import { trackAddToCart } from '@/lib/analytics';
import { formatPrice, calculateDiscount } from '@/lib/utils';
import type { CustomPage, BuilderSection } from './admin/tabs/PagesTab';

function ProductCard({ product }: { product: any }) {
  const discount =
    product.comparePrice > product.price ? calculateDiscount(product.price, product.comparePrice) : 0;
  const addItem = useCartStore(s => s.addItem);
  const navigate = useNavigate();
  const oos = (product.stock ?? 1) === 0;
  const quickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (oos) return;
    addItem({
      id: product._id,
      name: product.name,
      price: product.price,
      image: product.images?.[0] || '',
      flavor: '',
      size: '',
      quantity: 1,
      category: product.category,
      pixels: product.pixels,
    });
    trackAddToCart({
      id: product._id,
      name: product.name,
      price: product.price,
      category: product.category,
      pixels: product.pixels,
    });
  };
  const buyNow = (e: React.MouseEvent) => {
    quickAdd(e);
    navigate({ to: '/checkout' });
  };

  return (
    <div className="group relative bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
      <Link to="/products/$slug" params={{ slug: product.slug }} className="block">
        <div className="relative bg-gray-50 aspect-square overflow-hidden">
          {discount > 0 && (
            <span className="absolute top-3 left-3 z-10 bg-green-500 text-white text-xs font-black px-2 py-1 rounded-full">
              {discount}% OFF
            </span>
          )}
          {product.images?.[0] ? (
            <img
              src={product.images[0]}
              alt={product.name}
              width={400}
              height={400}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl font-black text-gray-200">NP</div>
          )}
        </div>
        <div className="p-4 pb-2">
          <p className="text-xs text-gray-400 font-medium mb-1">{product.category}</p>
          <h3 className="font-bold text-gray-900 leading-tight line-clamp-2 min-h-[2.5rem]">
            {product.name}
          </h3>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-black text-lg text-gray-900">{formatPrice(product.price)}</span>
            {product.comparePrice > product.price && (
              <span className="text-sm text-gray-400 line-through">{formatPrice(product.comparePrice)}</span>
            )}
          </div>
        </div>
      </Link>
      <div className="px-3 pb-3 mt-auto flex gap-2">
        <button
          onClick={quickAdd}
          disabled={oos}
          className="flex-1 h-9 inline-flex items-center justify-center gap-1.5 rounded-xl border-2 border-gray-900 text-gray-900 text-xs font-black hover:bg-gray-900 hover:text-white transition disabled:opacity-40"
        >
          <ShoppingCart size={13} /> Add
        </button>
        <button
          onClick={buyNow}
          disabled={oos}
          className="flex-1 h-9 inline-flex items-center justify-center gap-1.5 rounded-xl bg-orange-500 text-white text-xs font-black hover:bg-orange-600 transition disabled:opacity-40"
        >
          <Zap size={13} /> Buy
        </button>
      </div>
    </div>
  );
}

export default function CustomPageView() {
  const params = useParams({ from: '/p/$slug' }) as { slug: string };
  const slug = params.slug;
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const page: CustomPage | undefined = useMemo(
    () => (settings?.customPages || []).find((p: CustomPage) => p.slug === slug),
    [settings, slug]
  );

  useSEO({
    title: page?.metaTitle || page?.title || 'Page',
    description: page?.metaDescription || page?.subtitle || '',
  });

  useEffect(() => {
    if (!page) return;
    if (page.type === 'redirect' && page.redirectTo) {
      if (/^https?:\/\//i.test(page.redirectTo)) {
        window.location.href = page.redirectTo;
      } else {
        navigate({ to: page.redirectTo });
      }
      return;
    }
    if (page.type !== 'products' && page.type !== 'builder') {
      setLoading(false);
      return;
    }
    setLoading(true);
    API.get('/products')
      .then(r => {
        const all: any[] = r.data || [];
        if (page.type === 'builder') {
          setProducts(all);
          return;
        }
        let list = all;
        const ids = page.productIds || [];
        if (ids.length > 0) {
          const set = new Set(ids);
          list = all.filter(p => set.has(p._id) || set.has(p.id));
        } else {
          const cats = page.categories || [];
          const tags = page.tags || [];
          if (cats.length) list = list.filter(p => cats.includes(p.category));
          if (tags.length) list = list.filter(p => Array.isArray(p.tags) && p.tags.some((t: string) => tags.includes(t)));
        }
        if (page.sort === 'price_asc') list = [...list].sort((a, b) => a.price - b.price);
        else if (page.sort === 'price_desc') list = [...list].sort((a, b) => b.price - a.price);
        else if (page.sort === 'rating') list = [...list].sort((a, b) => (b.ratings || 0) - (a.ratings || 0));
        setProducts(list);
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [page, navigate]);

  if (!settings) {
    return <div className="min-h-[40vh] flex items-center justify-center text-gray-400">Loading…</div>;
  }

  if (!page || !page.enabled) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center">
        <p className="text-6xl mb-4">🔍</p>
        <h1 className="text-3xl font-black mb-2">Page not found</h1>
        <p className="text-gray-500 mb-6">
          The page <code className="bg-gray-100 px-2 py-0.5 rounded">/p/{slug}</code> doesn't exist or has been
          disabled.
        </p>
        <Link
          to="/"
          className="inline-block bg-orange-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-orange-600 transition"
        >
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 relative">
      {page.bgImage && page.bgEnabled !== false && (
        <div
          aria-hidden
          style={{
            position: 'fixed',
            top: 0, left: 0,
            width: '100vw', height: '100dvh',
            zIndex: -1,
            pointerEvents: 'none',
            backgroundImage: `url(${page.bgImage})`,
            backgroundPosition: page.bgPosition || 'center',
            backgroundSize: page.bgSize || 'cover',
            backgroundRepeat: page.bgRepeat || 'no-repeat',
            opacity: typeof page.bgOpacity === 'number' ? page.bgOpacity : 0.15,
            mixBlendMode: (page.bgBlendMode as any) || 'normal',
          }}
        />
      )}
      <header className="mb-10">
        {page.heroImage && (
          <div className="relative w-full aspect-[3/1] rounded-3xl overflow-hidden mb-6 bg-gray-100">
            <img
              src={page.heroImage}
              alt={page.title}
              className="w-full h-full object-cover"
              loading="eager"
            />
          </div>
        )}
        <h1 className="text-4xl md:text-5xl font-black text-gray-900">{page.title}</h1>
        {page.subtitle && <p className="mt-3 text-lg text-gray-500 max-w-2xl">{page.subtitle}</p>}
      </header>

      {page.type === 'content' && (
        <article
          className="prose max-w-3xl text-gray-700 leading-relaxed whitespace-pre-wrap"
          dangerouslySetInnerHTML={{ __html: page.content || '' }}
        />
      )}

      {page.type === 'products' && (
        <>
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-gray-100 rounded-2xl h-80 animate-pulse" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-24">
              <p className="text-5xl mb-4">📦</p>
              <p className="text-xl font-bold text-gray-600">No products in this collection yet</p>
              <Link
                to="/products"
                className="inline-block mt-6 bg-orange-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-orange-600 transition"
              >
                Browse all products
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map(p => (
                <ProductCard key={p._id} product={p} />
              ))}
            </div>
          )}
        </>
      )}

      {page.type === 'builder' && (
        <div className="space-y-12 -mx-4">
          {(page.sections || []).map(sec => (
            <SectionRenderer key={sec.id} section={sec} allProducts={products} />
          ))}
        </div>
      )}

      {page.type === 'redirect' && (
        <p className="text-gray-400 text-center py-12">Redirecting…</p>
      )}
    </div>
  );
}

function SectionRenderer({ section, allProducts }: { section: BuilderSection; allProducts: any[] }) {
  switch (section.type) {
    case 'banner': {
      const align = section.align === 'left' ? 'items-start text-left' : 'items-center text-center';
      return (
        <section className="relative w-full overflow-hidden rounded-3xl mx-4 min-h-[280px] md:min-h-[420px] flex bg-gray-900">
          {section.image && <img src={section.image} alt={section.title || ''} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />}
          {section.overlay !== false && <div className="absolute inset-0 bg-black/45" />}
          <div className={`relative flex flex-col justify-center p-8 md:p-14 w-full ${align} text-white`}>
            {section.title && <h2 className="text-3xl md:text-5xl font-black max-w-3xl">{section.title}</h2>}
            {section.subtitle && <p className="mt-3 text-base md:text-lg text-white/85 max-w-2xl">{section.subtitle}</p>}
            {section.ctaLabel && section.ctaHref && (
              <Link to={section.ctaHref as any} className="mt-6 inline-block bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-3 rounded-full">{section.ctaLabel}</Link>
            )}
          </div>
        </section>
      );
    }
    case 'heading':
      return (
        <section className={`px-4 ${section.align === 'center' ? 'text-center' : ''}`}>
          <h2 className="text-2xl md:text-4xl font-black text-gray-900">{section.title}</h2>
          {section.subtitle && <p className="mt-2 text-gray-500 md:text-lg">{section.subtitle}</p>}
        </section>
      );
    case 'text':
      return <article className="prose max-w-3xl mx-auto px-4 text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: section.html }} />;
    case 'image': {
      const img = <img src={section.src} alt={section.alt || ''} className={`w-full h-auto ${section.rounded !== false ? 'rounded-3xl' : ''}`} loading="lazy" />;
      return <div className="px-4">{section.href ? <Link to={section.href as any}>{img}</Link> : img}</div>;
    }
    case 'products': {
      let list = allProducts;
      const ids = section.productIds || [];
      if (ids.length) {
        const s = new Set(ids);
        list = list.filter(p => s.has(p._id) || s.has(p.id));
      } else if (section.categories && section.categories.length) {
        list = list.filter(p => section.categories!.includes(p.category));
      }
      if (section.sort === 'price_asc') list = [...list].sort((a, b) => a.price - b.price);
      else if (section.sort === 'price_desc') list = [...list].sort((a, b) => b.price - a.price);
      else if (section.sort === 'rating') list = [...list].sort((a, b) => (b.ratings || 0) - (a.ratings || 0));
      list = list.slice(0, section.limit ?? 8);
      const cols = section.columns ?? 4;
      const colClass = cols === 2 ? 'md:grid-cols-2' : cols === 3 ? 'md:grid-cols-3' : 'md:grid-cols-3 lg:grid-cols-4';
      return (
        <section className="px-4">
          {section.title && <h2 className="text-2xl md:text-3xl font-black text-gray-900 mb-5">{section.title}</h2>}
          {list.length === 0 ? (
            <p className="text-sm text-gray-400">No products match this section.</p>
          ) : (
            <div className={`grid grid-cols-2 ${colClass} gap-4`}>
              {list.map(p => <ProductCard key={p._id || p.id} product={p} />)}
            </div>
          )}
        </section>
      );
    }
    case 'cta':
      return (
        <section className="mx-4 rounded-3xl p-8 md:p-12 text-center" style={{ background: section.bg || '#111827', color: section.fg || '#ffffff' }}>
          {section.title && <h2 className="text-2xl md:text-4xl font-black">{section.title}</h2>}
          {section.description && <p className="mt-2 opacity-85 max-w-2xl mx-auto">{section.description}</p>}
          {section.buttonLabel && section.buttonHref && (
            <Link to={section.buttonHref as any} className="mt-6 inline-block bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-3 rounded-full">{section.buttonLabel}</Link>
          )}
        </section>
      );
    case 'links':
      return (
        <section className="px-4">
          {section.title && <h2 className="text-2xl md:text-3xl font-black text-gray-900 mb-5">{section.title}</h2>}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {(section.items || []).map((it, i) => (
              <Link key={i} to={it.href as any} className="group block bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition overflow-hidden">
                {it.image && <img src={it.image} alt={it.label} className="w-full aspect-[4/3] object-cover group-hover:scale-105 transition" loading="lazy" />}
                <div className="p-4">
                  <p className="font-bold text-gray-900">{it.label}</p>
                  {it.description && <p className="text-xs text-gray-500 mt-1">{it.description}</p>}
                </div>
              </Link>
            ))}
          </div>
        </section>
      );
    case 'spacer': {
      const h = section.size === 'lg' ? 'h-24' : section.size === 'sm' ? 'h-6' : 'h-12';
      return <div className={h} />;
    }
  }
}
