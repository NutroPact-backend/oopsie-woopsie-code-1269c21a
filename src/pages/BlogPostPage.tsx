// @ts-nocheck
import { useState, useEffect } from 'react';
import { Link, useRoute } from 'wouter';
import API from '@/lib/api';
import { Clock, Tag, ArrowLeft, BookOpen, ChevronRight, Share2, Check } from 'lucide-react';

function timeAgo(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

function renderMarkdown(text: string): string {
  return text
    .replace(/^## (.+)$/gm, '<h2 class="text-2xl font-black text-gray-900 mt-10 mb-4">$1</h2>')
    .replace(/^### (.+)$/gm, '<h3 class="text-xl font-bold text-gray-800 mt-8 mb-3">$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-gray-900">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="italic">$1</em>')
    .replace(/^- (.+)$/gm, '<li class="flex gap-2 items-start py-1"><span class="text-orange-500 font-black mt-0.5">•</span><span>$1</span></li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li class="flex gap-2 items-start py-1"><span class="text-orange-500 font-black w-5 shrink-0">$1.</span><span>$2</span></li>')
    .replace(/(<li[\s\S]*?<\/li>)(\n(<li[\s\S]*?<\/li>))*/g, '<ul class="space-y-1 my-4 pl-0">$&</ul>')
    .replace(/\|(.+)\|\n\|[-| ]+\|\n((?:\|.+\|\n?)+)/g, (_, header, body) => {
      const ths = header.split('|').filter((s: string) => s.trim()).map((h: string) => `<th class="px-4 py-2 text-left font-bold text-gray-700 bg-orange-50">${h.trim()}</th>`).join('');
      const trs = body.trim().split('\n').map((row: string) => {
        const tds = row.split('|').filter((s: string) => s.trim()).map((cell: string) => `<td class="px-4 py-2 text-gray-600">${cell.trim()}</td>`).join('');
        return `<tr class="border-t border-gray-100">${tds}</tr>`;
      }).join('');
      return `<div class="overflow-x-auto my-6 rounded-xl border border-gray-200"><table class="w-full text-sm"><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table></div>`;
    })
    .replace(/\n\n/g, '</p><p class="text-gray-600 leading-relaxed my-4">')
    .replace(/\n/g, '<br/>');
}

function RelatedCard({ post }: { post: any }) {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return (
    <Link href={`${base}/blog/${post.slug}`}>
      <div className="group flex gap-4 p-4 rounded-2xl hover:bg-orange-50 transition-colors cursor-pointer">
        <div className="w-16 h-16 rounded-xl overflow-hidden bg-orange-100 flex-shrink-0 flex items-center justify-center">
          {post.image ? <img src={post.image} alt={post.title} className="w-full h-full object-cover"  loading="lazy" decoding="async"/> : <BookOpen size={20} className="text-orange-300" />}
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-xs text-orange-600 font-bold">{post.category}</span>
          <p className="text-sm font-bold text-gray-800 group-hover:text-orange-600 transition-colors line-clamp-2 mt-0.5">{post.title}</p>
          <p className="text-xs text-gray-400 mt-1 flex items-center gap-1"><Clock size={10} /> {post.readTime} min read</p>
        </div>
      </div>
    </Link>
  );
}

export default function BlogPostPage() {
  const [, params] = useRoute('/blog/:slug');
  const slug = params?.slug;
  const [post, setPost] = useState<any>(null);
  const [related, setRelated] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    Promise.all([
      API.get(`/blog/${slug}`),
      API.get('/blog'),
    ]).then(([postRes, allRes]) => {
      setPost(postRes.data);
      setRelated(allRes.data.filter((p: any) => p.slug !== slug && p.category === postRes.data.category).slice(0, 3));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [slug]);

  const share = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 space-y-6">
        <div className="h-8 bg-gray-100 rounded-xl animate-pulse w-32" />
        <div className="h-12 bg-gray-100 rounded-xl animate-pulse" />
        <div className="h-4 bg-gray-100 rounded-xl animate-pulse w-48" />
        <div className="h-72 bg-gray-100 rounded-3xl animate-pulse" />
        {[...Array(5)].map((_, i) => <div key={i} className="h-4 bg-gray-100 rounded-xl animate-pulse" />)}
      </div>
    );
  }

  if (!post) {
    return (
      <div className="text-center py-32">
        <BookOpen size={48} className="mx-auto text-gray-200 mb-4" />
        <h2 className="text-2xl font-black text-gray-700 mb-2">Article not found</h2>
        <p className="text-gray-400 mb-6">This article may have been moved or deleted.</p>
        <Link href={`${base}/blog`}><button className="bg-orange-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-orange-600 transition">Browse All Articles</button></Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex gap-8">
        {/* Main content */}
        <article className="flex-1 min-w-0">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-gray-400 mb-8">
            <Link href={`${base}/blog`}><span className="hover:text-orange-500 transition-colors cursor-pointer font-medium">Blog</span></Link>
            <ChevronRight size={14} />
            <span className="text-orange-500 font-medium">{post.category}</span>
          </nav>

          {/* Category + title */}
          <div className="mb-6">
            <span className="bg-orange-100 text-orange-700 text-sm font-bold px-3 py-1 rounded-full">{post.category}</span>
            <h1 className="text-4xl font-black text-gray-900 leading-tight mt-4 mb-4">{post.title}</h1>
            <p className="text-xl text-gray-500 leading-relaxed">{post.excerpt}</p>
          </div>

          {/* Meta */}
          <div className="flex items-center gap-4 py-5 border-y border-gray-100 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-white font-black">
                {post.authorAvatar ? <img src={post.authorAvatar} alt={post.author} className="w-full h-full rounded-full object-cover"  loading="lazy" decoding="async"/> : post.author?.[0] || 'N'}
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800">{post.author}</p>
                <p className="text-xs text-gray-400">{timeAgo(post.createdAt)}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-sm text-gray-400 ml-auto">
              <Clock size={14} />
              <span>{post.readTime} min read</span>
            </div>
            <button onClick={share} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-orange-500 transition-colors font-medium">
              {copied ? <><Check size={14} /> Copied!</> : <><Share2 size={14} /> Share</>}
            </button>
          </div>

          {/* Hero image */}
          {post.image && (
            <div className="rounded-3xl overflow-hidden mb-10 aspect-video bg-gray-100">
              <img src={post.image} alt={post.title} className="w-full h-full object-cover"  loading="lazy" decoding="async"/>
            </div>
          )}

          {/* Content */}
          <div
            className="prose max-w-none text-gray-600 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: `<p class="text-gray-600 leading-relaxed my-4">${renderMarkdown(post.content)}</p>` }}
          />

          {/* Tags */}
          {post.tags?.length > 0 && (
            <div className="mt-12 pt-8 border-t border-gray-100">
              <p className="text-sm font-bold text-gray-500 mb-3 flex items-center gap-2"><Tag size={14} /> Tags</p>
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag: string) => (
                  <Link key={tag} href={`${base}/blog`}>
                    <span className="px-3 py-1.5 bg-gray-100 hover:bg-orange-100 text-gray-600 hover:text-orange-700 rounded-full text-xs font-bold transition-colors cursor-pointer">#{tag}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Back link */}
          <div className="mt-10">
            <Link href={`${base}/blog`}>
              <button className="flex items-center gap-2 text-orange-600 font-bold hover:gap-3 transition-all">
                <ArrowLeft size={16} /> Back to Blog
              </button>
            </Link>
          </div>
        </article>

        {/* Sidebar */}
        <aside className="w-72 shrink-0 hidden lg:block">
          <div className="sticky top-8 space-y-6">
            {related.length > 0 && (
              <div className="bg-white border border-gray-100 rounded-2xl p-5">
                <h3 className="font-black text-gray-800 mb-4 text-sm">Related Articles</h3>
                <div className="space-y-1">
                  {related.map(p => <RelatedCard key={p._id} post={p} />)}
                </div>
              </div>
            )}
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white">
              <h3 className="font-black text-lg mb-2">Ready to start?</h3>
              <p className="text-orange-100 text-sm mb-4">Shop our lab-tested, certified supplements backed by real science.</p>
              <Link href={`${base}/products`}>
                <button className="w-full bg-white text-orange-600 py-2.5 rounded-xl font-black text-sm hover:bg-orange-50 transition">Shop Now</button>
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
