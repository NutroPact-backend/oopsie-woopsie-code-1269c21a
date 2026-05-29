// @ts-nocheck
import { useState } from 'react';
import { Link, useSearch } from 'wouter';
import { Search, Sparkles } from 'lucide-react';
import { useServerFn } from '@tanstack/react-start';
import { formatPrice, calculateDiscount } from '@/lib/utils';
import API from '@/lib/api';
import { aiSearch } from '@/lib/aiSearch.functions';
import QuickBuyButtons from '@/components/QuickBuyButtons';

type Citation = { type: 'product' | 'blog'; title: string; url: string; snippet?: string };

export default function SearchPage() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const [query, setQuery] = useState(params.get('q') || '');
  const [mode, setMode] = useState<'normal' | 'ai'>('normal');
  const [products, setProducts] = useState<any[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [aiAnswer, setAiAnswer] = useState<string>('');
  const [aiCitations, setAiCitations] = useState<Citation[]>([]);

  const askAI = useServerFn(aiSearch);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    setAiAnswer('');
    setAiCitations([]);
    try {
      if (mode === 'ai') {
        const res = await askAI({ data: { query: query.trim() } });
        setAiAnswer(res.answer);
        setAiCitations(res.citations);
        setProducts([]);
      } else {
        const { data } = await API.get(`/products?search=${encodeURIComponent(query)}`);
        setProducts(data);
      }
    } catch {
      if (mode === 'ai') setAiAnswer('Something went wrong. Please try again.');
      else setProducts([]);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-black mb-4">SEARCH</h1>
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setMode('normal')}
          className={`px-4 py-2 rounded-full text-sm font-bold transition ${mode === 'normal' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
          Products
        </button>
        <button
          onClick={() => setMode('ai')}
          className={`px-4 py-2 rounded-full text-sm font-bold transition flex items-center gap-1.5 ${mode === 'ai' ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
          <Sparkles size={14} /> Ask AI
        </button>
      </div>
      <form onSubmit={handleSearch} className="flex gap-3 mb-10">
        <input value={query} onChange={e => setQuery(e.target.value)}
          placeholder={mode === 'ai' ? 'Ask anything about NutroPact products...' : 'Search products...'}
          className="flex-1 border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-orange-500 transition text-lg" />
        <button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-xl font-bold transition flex items-center gap-2">
          {mode === 'ai' ? <Sparkles size={20} /> : <Search size={20} />}
          {mode === 'ai' ? 'Ask' : 'Search'}
        </button>
      </form>

      {loading && <div className="text-center py-12"><div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full mx-auto"></div></div>}

      {searched && !loading && mode === 'ai' && (
        <div className="space-y-6">
          {aiAnswer && (
            <div className="bg-gradient-to-br from-orange-50 to-pink-50 border border-orange-200 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-3 text-orange-600 font-bold text-sm uppercase tracking-wide">
                <Sparkles size={16} /> AI Answer
              </div>
              <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{aiAnswer}</p>
            </div>
          )}
          {aiCitations.length > 0 && (
            <div>
              <h2 className="font-bold text-gray-700 mb-3 text-sm uppercase tracking-wide">Sources</h2>
              <div className="grid gap-3">
                {aiCitations.map((c, i) => (
                  <Link key={i} href={c.url}
                    className="block bg-white border border-gray-200 rounded-xl p-4 hover:border-orange-500 hover:shadow-sm transition">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${c.type === 'product' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                        {c.type}
                      </span>
                      <span className="font-bold text-gray-900">{c.title}</span>
                    </div>
                    {c.snippet && <p className="text-sm text-gray-600 line-clamp-2">{c.snippet}</p>}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {searched && !loading && mode === 'normal' && (
        <>
          <p className="text-gray-500 mb-6">{products.length} results for "{query}"</p>
          {products.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-5xl mb-4">🔍</p>
              <p className="font-bold text-gray-600">No products found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {products.map(product => (
                <Link key={product._id} href={`/products/${product.slug}`}
                  className="bg-white rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all overflow-hidden group">
                  <div className="bg-gray-100 h-48 flex items-center justify-center relative">
                    {product.images?.[0] ? <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover" loading="lazy" decoding="async" /> : <span className="text-6xl">🥛</span>}
                    {product.comparePrice > product.price && (
                      <span className="absolute top-2 left-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">{calculateDiscount(product.price, product.comparePrice)}% OFF</span>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-gray-800 text-sm line-clamp-2 group-hover:text-orange-500 transition">{product.name}</h3>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="font-black text-gray-900">{formatPrice(product.price)}</span>
                      {product.comparePrice > product.price && <span className="text-gray-400 line-through text-sm">{formatPrice(product.comparePrice)}</span>}
                    </div>
                    <QuickBuyButtons product={product} size="sm" className="mt-3" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
