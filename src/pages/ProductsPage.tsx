import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from '@tanstack/react-router';
import { ShoppingCart, Zap } from 'lucide-react';
import { formatPrice, calculateDiscount } from '@/lib/utils';
import { useSEO } from '@/lib/useSEO';
import { useCartStore } from '@/store/cartStore';
import { trackAddToCart } from '@/lib/analytics';
import { useCategories } from '@/hooks/useCategories';
import { useServerFn } from '@tanstack/react-start';
import { getGrowthBoosters } from '@/lib/growthBoosters.functions';
import API from '@/lib/api';
import { T } from '@/lib/useContentT';

interface Product {
  _id: string;
  name: string;
  slug: string;
  price: number;
  comparePrice: number;
  images: string[];
  category: string;
  ratings: number;
  numReviews: number;
  stock?: number;
  pixels?: any;
}

const FALLBACK_CATEGORIES = ['Protein', 'Creatine', 'Pre-Workout', 'Mass Gainer', 'Vitamins', 'BCAA'];
const SORT_OPTIONS = [
  { value: '', label: 'Featured' },
  { value: 'rating', label: 'Best Rating' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
];

const categoryDescriptions: Record<string, string> = {
  Protein: 'Premium whey protein isolate and concentrates for muscle building and recovery.',
  Creatine: 'Pure creatine monohydrate for strength, power, and athletic performance.',
  'Pre-Workout': 'High-performance pre-workout formulas for explosive energy and focus.',
  'Mass Gainer': 'High-calorie mass gainers to support muscle growth for hard gainers.',
  Vitamins: 'Essential vitamins and minerals for overall health, immunity, and performance.',
  BCAA: 'Branched-chain amino acids for muscle recovery and endurance.',
};

function ProductCard({ product }: { product: Product }) {
  const discount = product.comparePrice > product.price ? calculateDiscount(product.price, product.comparePrice) : 0;
  const addItem = useCartStore(s => s.addItem);
  const navigate = useNavigate();
  const oos = (product.stock ?? 1) === 0;

  const quickAdd = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (oos) return;
    addItem({ id: product._id, name: product.name, price: product.price, image: product.images?.[0] || '', flavor: '', size: '', quantity: 1, category: product.category, pixels: product.pixels });
    trackAddToCart({ id: product._id, name: product.name, price: product.price, category: product.category, pixels: product.pixels });
  };
  const buyNow = (e: React.MouseEvent) => { quickAdd(e); navigate({ to: '/checkout' }); };

  return (
    <div className="group relative bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
      <Link to="/products/$slug" params={{ slug: product.slug }} className="block">
        <div className="relative bg-gray-50 aspect-square overflow-hidden">
          {discount > 0 && (
            <span className="absolute top-3 left-3 z-10 bg-green-500 text-white text-xs font-black px-2 py-1 rounded-full">
              {discount}% OFF
            </span>
          )}
          {product.images?.[0]
            ? <img src={product.images[0]} alt={product.name} width={400} height={400} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" decoding="async"/>
            : <div className="w-full h-full flex items-center justify-center text-4xl font-black text-gray-200">NP</div>}
        </div>
        <div className="p-4 pb-2">
          <p className="text-xs text-gray-400 font-medium mb-1"><T>{product.category}</T></p>
          <h3 className="font-bold text-gray-900 leading-tight line-clamp-2 min-h-[2.5rem]"><T>{product.name}</T></h3>
          <div className="flex items-center gap-1.5 mt-2">
            <span className="text-yellow-500 text-xs">{'★'.repeat(Math.round(product.ratings || 0))}</span>
            <span className="text-xs text-gray-400">({product.numReviews || 0})</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-black text-lg text-gray-900">{formatPrice(product.price)}</span>
            {product.comparePrice > product.price && (
              <span className="text-sm text-gray-400 line-through">{formatPrice(product.comparePrice)}</span>
            )}
          </div>
        </div>
      </Link>
      <div className="px-3 pb-3 mt-auto flex gap-2">
        <button onClick={quickAdd} disabled={oos}
          aria-label="Add to cart"
          className="flex-1 h-9 inline-flex items-center justify-center gap-1.5 rounded-xl border-2 border-gray-900 text-gray-900 text-xs font-black hover:bg-gray-900 hover:text-white transition disabled:opacity-40 disabled:cursor-not-allowed">
          <ShoppingCart size={13} /> <T>Add</T>
        </button>
        <button onClick={buyNow} disabled={oos}
          aria-label="Buy now"
          className="flex-1 h-9 inline-flex items-center justify-center gap-1.5 rounded-xl bg-orange-500 text-white text-xs font-black hover:bg-orange-600 transition disabled:opacity-40 disabled:cursor-not-allowed">
          <Zap size={13} /> <T>Buy</T>
        </button>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const params = new URLSearchParams(location.searchStr || '');
  const category = params.get('category') || '';
  const [sort, setSort] = useState('');
  const [activeCat, setActiveCat] = useState(category);
  const [minRating, setMinRating] = useState(0);
  const [ratingFilterEnabled, setRatingFilterEnabled] = useState(false);
  const getCfg = useServerFn(getGrowthBoosters);
  const { data: catRows } = useCategories();
  const CATEGORIES = catRows.length ? catRows.filter(c => !c.parent_id).map(c => c.name) : FALLBACK_CATEGORIES;
  const activeCatRow = catRows.find(c => c.name === activeCat);

  useEffect(() => {
    getCfg({}).then((c: any) => setRatingFilterEnabled(!!c?.ratingFilter?.enabled)).catch(() => {});
  }, []);


  useSEO({
    title: category ? `${category} Supplements` : 'All Supplements',
    description: category
      ? activeCatRow?.seo_description || activeCatRow?.description || categoryDescriptions[category] || `Shop ${category} supplements at NutroPact. Lab tested, authentic, fast delivery.`
      : 'Shop all premium supplements — protein, creatine, pre-workout, mass gainer, vitamins & more. Lab tested quality. Free delivery above ₹999.',
    keywords: category
      ? activeCatRow?.seo_keywords || `${category.toLowerCase()} supplements india, buy ${category.toLowerCase()} online, NutroPact ${category.toLowerCase()}`
      : 'buy supplements online india, protein powder, creatine, pre-workout, mass gainer',
  });

  useEffect(() => { setActiveCat(category); }, [category]);

  useEffect(() => {
    setLoading(true);
    const q = new URLSearchParams();
    if (activeCat) q.set('category', activeCat);
    if (sort) q.set('sort', sort);
    API.get(`/products${q.toString() ? `?${q}` : ''}`)
      .then(r => setProducts(r.data))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [activeCat, sort]);

  const filteredProducts = minRating > 0 ? products.filter(p => (p.ratings || 0) >= minRating) : products;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 mb-2">
          {activeCat ? <T>{activeCat.toUpperCase()}</T> : <T>ALL SUPPLEMENTS</T>}
        </h1>
        {activeCat && (activeCatRow?.description || categoryDescriptions[activeCat]) && (
          <p className="text-gray-500 max-w-2xl"><T>{activeCatRow?.description || categoryDescriptions[activeCat]}</T></p>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => setActiveCat('')}
          className={`px-4 py-2 rounded-full text-sm font-semibold border transition ${!activeCat ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
          <T>All</T>
        </button>
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setActiveCat(cat)}
            className={`px-4 py-2 rounded-full text-sm font-semibold border transition ${activeCat === cat ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
            <T>{cat}</T>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <p className="text-gray-500 text-sm">{loading ? <T>Loading...</T> : <><T>{`${filteredProducts.length} product${filteredProducts.length !== 1 ? 's' : ''} found`}</T></>}</p>
        <div className="flex flex-wrap items-center gap-2">
          {ratingFilterEnabled && (
            <select value={minRating} onChange={e => setMinRating(Number(e.target.value))}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400 bg-white">
              <option value={0}>All Ratings</option>
              <option value={4}>★ 4 & up</option>
              <option value={3}>★ 3 & up</option>
              <option value={2}>★ 2 & up</option>
            </select>
          )}
          <select value={sort} onChange={e => setSort(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400 bg-white">
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <div key={i} className="bg-gray-100 rounded-2xl h-80 animate-pulse" />)}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-24">
          <p className="text-5xl mb-4">📦</p>
          <p className="text-xl font-bold text-gray-600"><T>No products found</T></p>
          <p className="text-gray-400 mt-2"><T>Try a different category or rating filter</T></p>
          <button onClick={() => { setActiveCat(''); setMinRating(0); }} className="mt-6 bg-orange-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-orange-600 transition">
            <T>View All Products</T>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredProducts.map(p => <ProductCard key={p._id} product={p} />)}
        </div>
      )}

      <section className="mt-16 bg-gray-50 rounded-2xl p-8 text-center">
        <h2 className="text-xl font-black mb-2"><T>Why Choose NutroPact?</T></h2>
        <div className="grid sm:grid-cols-4 gap-6 mt-6">
          {[
            { icon: '🧪', title: 'Lab Tested', desc: 'Every batch tested for purity' },
            { icon: '🏅', title: '100% Authentic', desc: 'No counterfeits, ever' },
            { icon: '🚚', title: 'Free Delivery', desc: 'On orders above ₹999' },
            { icon: '↩️', title: 'Easy Returns', desc: '7-day hassle-free returns' },
          ].map((item, i) => (
            <div key={i} className="text-center">
              <p className="text-3xl mb-2">{item.icon}</p>
              <p className="font-bold text-gray-900"><T>{item.title}</T></p>
              <p className="text-sm text-gray-500 mt-1"><T>{item.desc}</T></p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
