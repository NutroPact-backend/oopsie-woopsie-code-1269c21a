import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import API from '@/lib/api';
import { Search, Clock, Tag, ArrowRight, BookOpen, TrendingUp, Star } from 'lucide-react';
import { T } from '@/lib/useContentT';

const CATEGORIES = ['All', 'Nutrition', 'Science', 'Guides', 'Lifestyle', 'Recipes', 'General'];

function timeAgo(dateStr: string) {
  const d = new Date(dateStr);
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? '1 month ago' : `${months} months ago`;
}

function PostCard({ post, featured = false }: { post: any; featured?: boolean }) {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  if (featured) {
    return (
      <Link href={`${base}/blog/${post.slug}`}>
        <div className="group relative rounded-3xl overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800 cursor-pointer h-80 flex flex-col justify-end">
          {post.image && (
            <img src={post.image} alt={post.title} className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-50 transition-opacity duration-500"  loading="lazy" decoding="async"/>
          )}
          {!post.image && (
            <div className="absolute inset-0 bg-gradient-to-br from-orange-600 to-orange-900 opacity-80" />
          )}
          <div className="relative p-8">
            <div className="flex items-center gap-3 mb-3">
              <span className="bg-orange-500 text-white text-xs font-black px-3 py-1 rounded-full flex items-center gap-1">
                <Star size={10} /> <T>FEATURED</T>
              </span>
              <span className="bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full"><T>{post.category}</T></span>
            </div>
            <h2 className="text-white text-2xl font-black leading-tight mb-3 group-hover:text-orange-300 transition-colors"><T>{post.title}</T></h2>
            <p className="text-gray-300 text-sm line-clamp-2 mb-4"><T>{post.excerpt}</T></p>
            <div className="flex items-center gap-4 text-gray-400 text-xs">
              <span className="flex items-center gap-1"><Clock size={12} /> {post.readTime} <T>min read</T></span>
              <span>{timeAgo(post.createdAt)}</span>
              <span className="flex items-center gap-1 ml-auto text-orange-400 font-bold group-hover:translate-x-1 transition-transform"><T>Read Article</T> <ArrowRight size={14} /></span>
            </div>
          </div>
        </div>
      </Link>
    );
  }
  return (
    <Link href={`${base}/blog/${post.slug}`}>
      <div className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col h-full">
        {post.image ? (
          <div className="h-48 overflow-hidden bg-gray-100">
            <img src={post.image} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"  loading="lazy" decoding="async"/>
          </div>
        ) : (
          <div className="h-48 bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center">
            <BookOpen size={40} className="text-orange-300" />
          </div>
        )}
        <div className="p-5 flex flex-col flex-1">
          <div className="flex items-center gap-2 mb-3">
            <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2.5 py-1 rounded-full"><T>{post.category}</T></span>
            <span className="text-xs text-gray-400 flex items-center gap-1"><Clock size={11} /> {post.readTime} <T>min</T></span>
          </div>
          <h3 className="font-black text-gray-900 text-base leading-snug mb-2 group-hover:text-orange-600 transition-colors line-clamp-2 flex-1"><T>{post.title}</T></h3>
          <p className="text-gray-500 text-sm line-clamp-2 mb-4"><T>{post.excerpt}</T></p>
          <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-black">{post.author?.[0] || 'N'}</div>
              <span className="text-xs text-gray-500 font-medium">{post.author}</span>
            </div>
            <span className="text-xs text-gray-400">{timeAgo(post.createdAt)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function BlogPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    API.get('/blog').then(r => { setPosts(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const featured = posts.find(p => p.featured);
  const filtered = posts.filter(p => {
    const matchCat = activeCategory === 'All' || p.category === activeCategory;
    const q = search.toLowerCase();
    const matchSearch = !q || p.title.toLowerCase().includes(q) || p.excerpt.toLowerCase().includes(q) || (p.tags || []).some((t: string) => t.toLowerCase().includes(q));
    return matchCat && matchSearch && !p.featured;
  });

  const allCategories = ['All', ...Array.from(new Set(posts.map(p => p.category).filter(Boolean)))];

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-700 px-4 py-2 rounded-full text-sm font-bold mb-4">
          <TrendingUp size={14} /> <T>Expert Supplement Knowledge</T>
        </div>
        <h1 className="text-5xl font-black text-gray-900 mb-4"><T>NutroPact Blog</T></h1>
        <p className="text-gray-500 text-lg max-w-xl mx-auto"><T>Science-backed guides, nutrition tips, and training insights — written by experts, simplified for you.</T></p>
      </div>

      {/* Search */}
      <div className="relative max-w-xl mx-auto mb-10">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search articles, topics, supplements..."
          className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-gray-200 bg-white shadow-sm focus:outline-none focus:border-orange-400 text-sm"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-bold"><T>Clear</T></button>
        )}
      </div>

      {/* Category pills */}
      <div className="flex gap-2 flex-wrap justify-center mb-10">
        {allCategories.map(cat => (
          <button key={cat} onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${activeCategory === cat ? 'bg-orange-500 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:border-orange-300 hover:text-orange-600'}`}>
            <T>{cat}</T>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => <div key={i} className="h-72 rounded-2xl bg-gray-100 animate-pulse" />)}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-24 text-gray-400">
          <BookOpen size={48} className="mx-auto mb-4 opacity-30" />
          <p className="font-bold text-gray-500 text-lg"><T>No articles yet</T></p>
          <p className="text-sm"><T>Check back soon for expert supplement guides</T></p>
        </div>
      ) : (
        <>
          {/* Featured post */}
          {featured && !search && activeCategory === 'All' && (
            <div className="mb-10">
              <PostCard post={featured} featured />
            </div>
          )}

          {/* Grid */}
          {filtered.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map(post => <PostCard key={post._id} post={post} />)}
            </div>
          ) : (
            <div className="text-center py-20 text-gray-400">
              <Search size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-bold text-gray-500"><T>No articles found</T></p>
              <p className="text-sm mt-1"><T>Try a different search or category</T></p>
            </div>
          )}

          {/* Popular tags */}
          {!search && (
            <div className="mt-16 p-8 bg-orange-50 rounded-3xl">
              <h3 className="font-black text-gray-800 mb-4 flex items-center gap-2"><Tag size={16} className="text-orange-500" /> <T>Popular Topics</T></h3>
              <div className="flex flex-wrap gap-2">
                {Array.from(new Set(posts.flatMap(p => p.tags || []))).slice(0, 20).map(tag => (
                  <button key={tag} onClick={() => { setSearch(tag); setActiveCategory('All'); }}
                    className="px-3 py-1.5 bg-white text-orange-700 rounded-full text-xs font-bold border border-orange-200 hover:bg-orange-500 hover:text-white hover:border-orange-500 transition-all">
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
