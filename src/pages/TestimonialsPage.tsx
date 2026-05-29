// @ts-nocheck
import { useEffect, useState, useMemo } from 'react';
import { Link } from 'wouter';
import { BadgeCheck, Star, ThumbsUp, PlayCircle, Camera, Package, ChevronDown } from 'lucide-react';
import { useSEO } from '@/lib/useSEO';
import API from '@/lib/api';

function StarBar({ count, total, label }: { count: number; total: number; label: string }) {
  const pct = total ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-10 text-right text-gray-500">{label}</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-2 bg-yellow-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-6 text-gray-400">{count}</span>
    </div>
  );
}

function ReviewCard({ r }: { r: any }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = r.comment?.length > 220;
  return (
    <article className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-3">
        <img src={r.avatar || `https://i.pravatar.cc/80?u=${r.name}`} alt={r.name}
          className="w-11 h-11 rounded-full object-cover border-2 border-orange-100 shrink-0"  loading="lazy" decoding="async"/>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="font-bold text-sm">{r.name}</p>
            {r.verified && <BadgeCheck size={13} className="text-emerald-500 fill-emerald-500 stroke-white shrink-0" />}
          </div>
          <p className="text-xs text-gray-400">
            {r.variant && <span className="mr-2 text-orange-500 font-medium">{r.variant}</span>}
            {r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : ''}
          </p>
        </div>
        <div className="text-yellow-400 text-base shrink-0">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</div>
      </div>

      {r.title && <p className="font-bold text-sm mb-1 text-gray-800">{r.title}</p>}
      <p className="text-gray-600 text-sm leading-relaxed flex-1">
        {isLong && !expanded ? r.comment.slice(0, 220) + '…' : r.comment}
        {isLong && (
          <button onClick={() => setExpanded(!expanded)} className="ml-1 text-orange-500 font-semibold text-xs hover:underline">
            {expanded ? 'Show less' : 'Read more'}
          </button>
        )}
      </p>

      {r.images?.length > 0 && (
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          {r.images.map((img: string, j: number) => (
            <img key={j} src={img} alt="" className="w-16 h-16 object-cover rounded-xl flex-shrink-0 border border-gray-100"  loading="lazy" decoding="async"/>
          ))}
        </div>
      )}

      {r.video && (
        <div className="mt-3">
          <video src={r.video} controls className="w-full max-h-36 object-cover rounded-xl border" preload="none" />
        </div>
      )}

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
        {r.productName ? (
          <Link href={`/products/${r.productSlug}`} className="text-xs text-orange-500 hover:underline font-semibold flex items-center gap-1 max-w-[60%] truncate">
            <Package size={10} className="shrink-0" /> {r.productName}
          </Link>
        ) : <span />}
        {(r.helpful || 0) > 0 && (
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <ThumbsUp size={11} /> {r.helpful} helpful
          </span>
        )}
      </div>
    </article>
  );
}

export default function TestimonialsPage() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [starFilter, setStarFilter] = useState(0);
  const [withMedia, setWithMedia] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState('all');
  const [showAll, setShowAll] = useState(false);
  const PAGE_SIZE = 12;

  useSEO({
    title: 'Customer Reviews & Testimonials',
    description: 'Real reviews from real NutroPact customers. See what our athletes say about our protein, creatine, pre-workout and more.',
    keywords: 'NutroPact reviews, supplement reviews india, customer testimonials',
  });

  useEffect(() => {
    Promise.all([
      API.get('/testimonials'),
      API.get('/testimonials/products').catch(() => ({ data: [] })),
    ]).then(([rv, pr]) => {
      setReviews(rv.data || []);
      setProducts(pr.data || []);
    }).catch(() => setReviews([])).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => reviews.filter(r => {
    if (starFilter && r.rating !== starFilter) return false;
    if (withMedia && !r.images?.length && !r.video) return false;
    if (selectedProduct !== 'all' && r.productId !== selectedProduct) return false;
    return true;
  }), [reviews, starFilter, withMedia, selectedProduct]);

  const displayed = showAll ? filtered : filtered.slice(0, PAGE_SIZE);

  const avgRating = reviews.length ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1) : '0';
  const ratingBreakdown = [5,4,3,2,1].map(n => ({ star: n, count: reviews.filter(r => r.rating === n).length }));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white py-16 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-orange-400 font-bold text-sm uppercase tracking-widest mb-3">Verified Reviews</p>
          <h1 className="text-5xl font-black mb-3">What Our Customers Say</h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">Real results from real athletes. Every review is from a genuine customer.</p>
          {!loading && (
            <div className="flex items-center justify-center gap-8 mt-10 flex-wrap">
              <div className="text-center">
                <p className="text-6xl font-black text-orange-400">{avgRating}</p>
                <div className="flex justify-center text-yellow-400 text-xl mt-1">{'★'.repeat(Math.round(Number(avgRating)))}</div>
                <p className="text-gray-400 text-sm mt-1">Average Rating</p>
              </div>
              <div className="w-px h-20 bg-gray-700" />
              <div className="text-center">
                <p className="text-6xl font-black text-orange-400">{reviews.length}</p>
                <p className="text-gray-400 text-sm mt-1">Total Reviews</p>
              </div>
              <div className="w-px h-20 bg-gray-700" />
              <div className="text-center">
                <p className="text-6xl font-black text-orange-400">{reviews.filter(r => r.images?.length || r.video).length}</p>
                <p className="text-gray-400 text-sm mt-1">Photo/Video Reviews</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-5">
            {/* Rating breakdown */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h3 className="font-black text-gray-800 mb-4">Rating Breakdown</h3>
              <div className="space-y-2">
                {ratingBreakdown.map(({ star, count }) => (
                  <button key={star} onClick={() => setStarFilter(starFilter === star ? 0 : star)}
                    className={`w-full transition rounded-lg px-1 py-0.5 ${starFilter === star ? 'bg-orange-50' : 'hover:bg-gray-50'}`}>
                    <StarBar count={count} total={reviews.length} label={`${star}★`} />
                  </button>
                ))}
              </div>
            </div>

            {/* Product filter */}
            {products.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <h3 className="font-black text-gray-800 mb-3">Filter by Product</h3>
                <div className="space-y-1">
                  <button onClick={() => setSelectedProduct('all')}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold transition ${selectedProduct === 'all' ? 'bg-orange-500 text-white' : 'hover:bg-gray-50 text-gray-700'}`}>
                    All Products
                  </button>
                  {products.map(p => (
                    <button key={p._id} onClick={() => setSelectedProduct(selectedProduct === p._id ? 'all' : p._id)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold transition flex items-center gap-2 ${selectedProduct === p._id ? 'bg-orange-500 text-white' : 'hover:bg-gray-50 text-gray-700'}`}>
                      {p.image && <img src={p.image} alt="" className="w-7 h-7 rounded-lg object-cover shrink-0"  loading="lazy" decoding="async"/>}
                      <span className="line-clamp-1">{p.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Main reviews area */}
          <div className="lg:col-span-3">
            {/* Filter bar */}
            <div className="flex flex-wrap gap-3 mb-6 items-center">
              <span className="text-sm font-bold text-gray-600">Stars:</span>
              {[0,5,4,3,2,1].map(s => (
                <button key={s} onClick={() => setStarFilter(s === starFilter ? 0 : s)}
                  className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition ${starFilter === s ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
                  {s === 0 ? 'All' : `${s} ★`}
                </button>
              ))}
              <button onClick={() => setWithMedia(!withMedia)}
                className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition flex items-center gap-1.5 ${withMedia ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
                <Camera size={12} /> Photos/Video
              </button>
              <span className="ml-auto text-sm text-gray-500 font-medium">{filtered.length} review{filtered.length !== 1 ? 's' : ''}</span>
            </div>

            {loading ? (
              <div className="grid sm:grid-cols-2 gap-4">
                {[...Array(6)].map((_, i) => <div key={i} className="h-52 bg-gray-100 rounded-2xl animate-pulse" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20 text-gray-400 bg-white rounded-2xl border">
                <Star size={40} className="mx-auto mb-3 opacity-20" />
                <p className="font-semibold text-lg">No reviews match this filter</p>
                <button onClick={() => { setStarFilter(0); setWithMedia(false); setSelectedProduct('all'); }}
                  className="mt-4 px-4 py-2 bg-orange-100 text-orange-700 font-bold rounded-xl text-sm hover:bg-orange-200 transition">
                  Clear filters
                </button>
              </div>
            ) : (
              <>
                <div className="grid sm:grid-cols-2 gap-5">
                  {displayed.map((r, i) => <ReviewCard key={r._id || i} r={r} />)}
                </div>
                {filtered.length > PAGE_SIZE && !showAll && (
                  <div className="mt-8 text-center">
                    <button onClick={() => setShowAll(true)}
                      className="flex items-center gap-2 mx-auto px-8 py-3.5 bg-white border-2 border-gray-200 hover:border-orange-400 hover:text-orange-600 rounded-xl font-bold text-sm transition">
                      <ChevronDown size={16} /> Load all {filtered.length} reviews
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
