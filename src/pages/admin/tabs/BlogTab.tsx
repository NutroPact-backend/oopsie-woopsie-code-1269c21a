// @ts-nocheck
import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Edit2, Eye, EyeOff, Save, X, Upload, BookOpen, Calendar, Tag, ChevronDown, ChevronUp, Search,
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Heading1, Heading2, Heading3, List, ListOrdered, Quote,
  Link as LinkIcon, Image as ImageIcon, Code, Undo, Redo, AlignLeft, AlignCenter, AlignRight, Eraser, Search as SearchIcon } from 'lucide-react';
import { useSimpleUpload } from '@/lib/useSimpleUpload';
import { TabHelp } from "./_TabHelp";
import { useBulkSelection, BulkActionBar, SelectCheckbox, runForEach } from '@/pages/admin/components/BulkSelect';

import API from '@/lib/api';
const AdminAPI = API;
function toSlug(s: string) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

const EMPTY_POST = {
  title: '', slug: '', excerpt: '', content: '', coverImage: '', category: 'Nutrition',
  tags: '', author: 'NutroPact Team', readTime: '5 min', published: false,
  seoTitle: '', seoDescription: '', seoKeywords: '', ogImage: '', canonicalUrl: '', noIndex: false,
};

const CATEGORIES = ['Nutrition', 'Training', 'Supplements', 'Lifestyle', 'Science', 'Recipes', 'News'];

function RichTextEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { uploadFile, isUploading } = useSimpleUpload({
    bucket: 'blog-images',
    onSuccess: (url) => { exec('insertImage', url); },
  });
  const [showHtml, setShowHtml] = useState(false);

  // Initialize editor content only on mount / when switching post
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== (value || '')) {
      ref.current.innerHTML = value || '';
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exec = (cmd: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(cmd, false, arg);
    if (ref.current) onChange(ref.current.innerHTML);
  };

  const onInput = () => { if (ref.current) onChange(ref.current.innerHTML); };

  const Btn = ({ onClick, title, children }: any) => (
    <button type="button" onMouseDown={e => e.preventDefault()} onClick={onClick} title={title}
      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-orange-50 hover:text-orange-600 text-gray-600 transition">
      {children}
    </button>
  );

  return (
    <div className="border rounded-xl overflow-hidden focus-within:border-orange-400">
      <div className="flex flex-wrap gap-0.5 p-1.5 bg-gray-50 border-b">
        <Btn title="Heading 1" onClick={() => exec('formatBlock', '<h1>')}><Heading1 size={15} /></Btn>
        <Btn title="Heading 2" onClick={() => exec('formatBlock', '<h2>')}><Heading2 size={15} /></Btn>
        <Btn title="Heading 3" onClick={() => exec('formatBlock', '<h3>')}><Heading3 size={15} /></Btn>
        <Btn title="Paragraph" onClick={() => exec('formatBlock', '<p>')}><span className="text-xs font-bold">P</span></Btn>
        <div className="w-px h-6 bg-gray-200 mx-1 self-center" />
        <Btn title="Bold (Ctrl+B)" onClick={() => exec('bold')}><Bold size={14} /></Btn>
        <Btn title="Italic (Ctrl+I)" onClick={() => exec('italic')}><Italic size={14} /></Btn>
        <Btn title="Underline (Ctrl+U)" onClick={() => exec('underline')}><UnderlineIcon size={14} /></Btn>
        <Btn title="Strikethrough" onClick={() => exec('strikeThrough')}><Strikethrough size={14} /></Btn>
        <div className="w-px h-6 bg-gray-200 mx-1 self-center" />
        <Btn title="Bullet list" onClick={() => exec('insertUnorderedList')}><List size={14} /></Btn>
        <Btn title="Numbered list" onClick={() => exec('insertOrderedList')}><ListOrdered size={14} /></Btn>
        <Btn title="Quote" onClick={() => exec('formatBlock', '<blockquote>')}><Quote size={14} /></Btn>
        <Btn title="Code block" onClick={() => exec('formatBlock', '<pre>')}><Code size={14} /></Btn>
        <div className="w-px h-6 bg-gray-200 mx-1 self-center" />
        <Btn title="Align left" onClick={() => exec('justifyLeft')}><AlignLeft size={14} /></Btn>
        <Btn title="Align center" onClick={() => exec('justifyCenter')}><AlignCenter size={14} /></Btn>
        <Btn title="Align right" onClick={() => exec('justifyRight')}><AlignRight size={14} /></Btn>
        <div className="w-px h-6 bg-gray-200 mx-1 self-center" />
        <Btn title="Insert link" onClick={() => { const url = prompt('Enter URL:', 'https://'); if (url) exec('createLink', url); }}><LinkIcon size={14} /></Btn>
        <Btn title="Insert image (upload or URL)" onClick={() => fileRef.current?.click()}>
          {isUploading ? <span className="text-[10px] font-bold">…</span> : <ImageIcon size={14} />}
        </Btn>
        <Btn title="Insert image by URL" onClick={() => { const url = prompt('Image URL:', 'https://'); if (url) exec('insertImage', url); }}>
          <span className="text-[10px] font-bold">URL</span>
        </Btn>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={async e => {
          const f = e.target.files?.[0]; if (!f) return;
          await uploadFile(f); if (fileRef.current) fileRef.current.value = '';
        }} />
        <div className="w-px h-6 bg-gray-200 mx-1 self-center" />
        <Btn title="Clear formatting" onClick={() => exec('removeFormat')}><Eraser size={14} /></Btn>
        <Btn title="Undo" onClick={() => exec('undo')}><Undo size={14} /></Btn>
        <Btn title="Redo" onClick={() => exec('redo')}><Redo size={14} /></Btn>
        <div className="ml-auto">
          <button type="button" onClick={() => setShowHtml(s => !s)}
            className="px-2 h-8 rounded-lg text-[11px] font-bold text-gray-500 hover:bg-gray-100">
            {showHtml ? 'Visual' : 'HTML'}
          </button>
        </div>
      </div>
      {showHtml ? (
        <textarea value={value} onChange={e => { onChange(e.target.value); if (ref.current) ref.current.innerHTML = e.target.value; }}
          rows={14} className="w-full p-3 text-xs font-mono focus:outline-none resize-y" />
      ) : (
        <div ref={ref} contentEditable suppressContentEditableWarning onInput={onInput}
          className="prose prose-sm max-w-none p-4 min-h-[280px] focus:outline-none [&_h1]:text-2xl [&_h1]:font-black [&_h2]:text-xl [&_h2]:font-bold [&_h3]:text-lg [&_h3]:font-bold [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_blockquote]:border-l-4 [&_blockquote]:border-orange-300 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-gray-600 [&_pre]:bg-gray-100 [&_pre]:p-3 [&_pre]:rounded [&_a]:text-orange-600 [&_a]:underline [&_img]:rounded-lg [&_img]:my-2 [&_img]:max-w-full" />
      )}
    </div>
  );
}

function ImgUploadField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const { uploadFile, isUploading, progress } = useSimpleUpload({ onSuccess: onChange });
  return (
    <div>
      <div className="flex gap-2">
        <input type="text" value={value || ''} onChange={e => onChange(e.target.value)}
          placeholder="https://... or upload image →"
          className="flex-1 border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400 min-w-0" />
        {isUploading ? (
          <span className="shrink-0 px-3 flex items-center text-xs text-gray-400 font-bold">{progress}%</span>
        ) : (
          <button type="button" onClick={() => ref.current?.click()}
            className="shrink-0 px-3 py-2 bg-gray-100 hover:bg-orange-50 text-gray-500 hover:text-orange-500 rounded-xl text-xs font-bold border transition flex items-center gap-1">
            <Upload size={12} /> Upload
          </button>
        )}
        <input ref={ref} type="file" accept="image/*" className="hidden" onChange={async e => {
          const f = e.target.files?.[0]; if (!f) return;
          await uploadFile(f); if (ref.current) ref.current.value = '';
        }} />
      </div>
      {value && <img src={value} alt="Cover" className="mt-2 h-24 w-full object-cover rounded-xl border" />}
    </div>
  );
}

function BlogPostModal({ post, onClose, onSave }: { post: any; onClose: () => void; onSave: () => void }) {
  const [form, setForm] = useState(post ? { ...post, tags: Array.isArray(post.tags) ? post.tags.join(', ') : (post.tags || '') } : { ...EMPTY_POST });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.title.trim()) return alert('Title is required');
    setSaving(true);
    try {
      const payload = { ...form, tags: form.tags.split(',').map((t: string) => t.trim()).filter(Boolean), slug: form.slug || toSlug(form.title) };
      if (post?._id) await AdminAPI.put(`/admin/blog/${post._id}`, payload);
      else await AdminAPI.post('/admin/blog', payload);
      onSave(); onClose();
    } catch { alert('Failed to save post'); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h3 className="font-black text-lg">{post?._id ? 'Edit Blog Post' : 'New Blog Post'}</h3>
            <p className="text-xs text-gray-400 mt-0.5">Fill in the details for your blog post</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1">Title *</label>
            <input value={form.title} onChange={e => { set('title', e.target.value); if (!form.slug || form.slug === toSlug(form.title)) set('slug', toSlug(e.target.value)); }}
              placeholder="Complete Guide to Whey Protein..."
              className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">Slug (URL)</label>
              <input value={form.slug} onChange={e => set('slug', e.target.value)}
                placeholder="complete-guide-whey-protein"
                className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400 font-mono text-xs" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">Category</label>
              <select value={form.category} onChange={e => set('category', e.target.value)}
                className="w-full border rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-orange-400">
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">Author</label>
              <input value={form.author} onChange={e => set('author', e.target.value)}
                className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">Read Time</label>
              <input value={form.readTime} onChange={e => set('readTime', e.target.value)} placeholder="5 min"
                className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400" />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1">Cover Image</label>
            <ImgUploadField value={form.coverImage} onChange={v => set('coverImage', v)} />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1">Excerpt (short summary shown in listing)</label>
            <textarea value={form.excerpt} onChange={e => set('excerpt', e.target.value)} rows={2}
              placeholder="A brief 1–2 sentence summary that appears in the blog listing..."
              className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400 resize-none" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1">Content</label>
            <RichTextEditor value={form.content} onChange={v => set('content', v)} />
            <p className="text-[11px] text-gray-400 mt-1">Use the toolbar for headings, bold, lists, links, images and more. Switch to HTML to edit raw markup.</p>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1">Tags (comma separated)</label>
            <input value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="protein, muscle gain, nutrition"
              className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400" />
          </div>

          {/* SEO section */}
          <details className="bg-gray-50 rounded-xl border border-gray-200 group" open>
            <summary className="cursor-pointer p-3 flex items-center gap-2 font-bold text-sm text-gray-700">
              <SearchIcon size={14} className="text-orange-500" /> SEO & Social Preview
              <span className="ml-auto text-[10px] font-semibold text-gray-400 group-open:hidden">click to expand</span>
            </summary>
            <div className="p-3 pt-0 space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">
                  SEO Title <span className="text-gray-300 font-normal">({(form.seoTitle || form.title || '').length}/60)</span>
                </label>
                <input value={form.seoTitle} onChange={e => set('seoTitle', e.target.value)}
                  placeholder={form.title || 'Defaults to post title'}
                  className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">
                  Meta Description <span className="text-gray-300 font-normal">({(form.seoDescription || form.excerpt || '').length}/160)</span>
                </label>
                <textarea value={form.seoDescription} onChange={e => set('seoDescription', e.target.value)} rows={2}
                  placeholder={form.excerpt || 'Defaults to excerpt. Keep under 160 chars.'}
                  className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400 resize-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">Focus Keywords (comma separated)</label>
                <input value={form.seoKeywords} onChange={e => set('seoKeywords', e.target.value)}
                  placeholder="whey protein, muscle gain, india"
                  className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">Social Share Image (OG)</label>
                <ImgUploadField value={form.ogImage} onChange={v => set('ogImage', v)} />
                <p className="text-[11px] text-gray-400 mt-1">Falls back to Cover Image when empty. Recommended 1200×630.</p>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">Canonical URL (optional)</label>
                <input value={form.canonicalUrl} onChange={e => set('canonicalUrl', e.target.value)}
                  placeholder="https://nutropact.com/blog/your-post"
                  className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400" />
              </div>
              <label className="flex items-center gap-3 cursor-pointer p-2 bg-white rounded-xl border">
                <input type="checkbox" checked={!!form.noIndex} onChange={e => set('noIndex', e.target.checked)} className="w-4 h-4 accent-orange-500" />
                <div>
                  <p className="text-xs font-bold text-gray-800">Hide from search engines (noindex)</p>
                  <p className="text-[11px] text-gray-400">Enable for draft-like posts you don't want Google to list</p>
                </div>
              </label>

              {/* Google preview */}
              <div className="bg-white border rounded-xl p-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Google preview</p>
                <p className="text-[11px] text-green-700 truncate">nutropact.com › blog › {form.slug || 'your-post'}</p>
                <p className="text-base text-blue-700 leading-tight truncate">{form.seoTitle || form.title || 'Post title'}</p>
                <p className="text-xs text-gray-600 line-clamp-2">{form.seoDescription || form.excerpt || 'Meta description will appear here.'}</p>
              </div>
            </div>
          </details>

          <label className="flex items-center gap-3 cursor-pointer p-3 bg-gray-50 rounded-xl">
            <input type="checkbox" checked={form.published} onChange={e => set('published', e.target.checked)} className="w-4 h-4 accent-orange-500" />
            <div>
              <p className="text-sm font-bold text-gray-800">Published</p>
              <p className="text-xs text-gray-400">When enabled, this post appears publicly on the blog</p>
            </div>
          </label>
        </div>
        <div className="flex justify-end gap-3 p-5 border-t">
          <button onClick={onClose} className="px-5 py-2.5 border rounded-xl font-semibold text-sm hover:bg-gray-50">Cancel</button>
          <button onClick={save} disabled={saving} className="px-5 py-2.5 bg-orange-500 text-white rounded-xl font-black text-sm hover:bg-orange-600 disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Post'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BlogTab() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; post: any }>({ open: false, post: null });
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('All');

  const load = async () => {
    try { const { data } = await AdminAPI.get('/admin/blog'); setPosts(data); }
    catch { setPosts([]); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const del = async (id: string) => {
    if (!confirm('Delete this post?')) return;
    await AdminAPI.delete(`/admin/blog/${id}`);
    load();
  };

  const toggle = async (post: any) => {
    await AdminAPI.put(`/admin/blog/${post._id}`, { ...post, published: !post.published });
    load();
  };

  const allCats = ['All', ...Array.from(new Set(posts.map(p => p.category).filter(Boolean)))];
  const filtered = posts.filter(p => {
    if (catFilter !== 'All' && p.category !== catFilter) return false;
    if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const bulk = useBulkSelection(filtered, (p: any) => p._id);

  return (
    <div>
      <TabHelp topic="blog" />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-black">Blog Posts</h2>
          <p className="text-sm text-gray-500 mt-0.5">{posts.length} total · {posts.filter(p => p.published).length} published</p>
        </div>
        <button onClick={() => setModal({ open: true, post: null })}
          className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-orange-600 transition">
          <Plus size={15} /> New Post
        </button>
      </div>

      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search posts..."
            className="w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:border-orange-400" />
        </div>
        {allCats.map(cat => (
          <button key={cat} onClick={() => setCatFilter(cat)}
            className={`px-3 py-2 rounded-xl text-sm font-semibold border transition ${catFilter === cat ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'}`}>
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border p-16 text-center">
          <BookOpen size={40} className="text-gray-200 mx-auto mb-3" />
          <p className="font-bold text-gray-500 text-lg">No blog posts yet</p>
          <p className="text-sm text-gray-400 mt-1">Click "New Post" to write your first article</p>
        </div>
      ) : (
        <div className="space-y-3">
          <BulkActionBar
            count={bulk.count}
            ids={[...bulk.selected]}
            onClear={bulk.clear}
            actions={[
              { key: 'pub', label: 'Publish', color: 'bg-green-600 hover:bg-green-700', confirm: 'Publish {n} post(s)?', run: async (ids) => { await runForEach(ids, async (id) => { const p = posts.find(x => x._id === id); if (p) await AdminAPI.put(`/admin/blog/${id}`, { ...p, published: true }); }); load(); } },
              { key: 'unpub', label: 'Unpublish', color: 'bg-yellow-600 hover:bg-yellow-700', confirm: 'Unpublish {n} post(s)?', run: async (ids) => { await runForEach(ids, async (id) => { const p = posts.find(x => x._id === id); if (p) await AdminAPI.put(`/admin/blog/${id}`, { ...p, published: false }); }); load(); } },
              { key: 'del', label: 'Delete', color: 'bg-red-600 hover:bg-red-700', confirm: 'Delete {n} post(s)? This cannot be undone.', run: async (ids) => { await runForEach(ids, async (id) => { await AdminAPI.delete(`/admin/blog/${id}`); }); load(); } },
            ]}
          />
          <label className="flex items-center gap-2 text-xs font-bold text-gray-500 px-2">
            <SelectCheckbox checked={bulk.allSelected} indeterminate={bulk.someSelected} onChange={bulk.toggleAll} />
            Select all ({filtered.length})
          </label>
          {filtered.map(post => (
            <div key={post._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition overflow-hidden flex">
              <div className="pl-3 flex items-center">
                <SelectCheckbox checked={bulk.isSelected(post._id)} onChange={() => bulk.toggleOne(post._id)} />
              </div>
              {post.coverImage && (
                <div className="w-28 shrink-0 hidden sm:block">
                  <img src={post.coverImage} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex-1 p-4 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${post.published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {post.published ? 'Published' : 'Draft'}
                      </span>
                      {post.category && <span className="text-xs px-2 py-0.5 bg-orange-50 text-orange-600 rounded-full font-semibold">{post.category}</span>}
                      {post.readTime && <span className="text-xs text-gray-400 flex items-center gap-1"><Calendar size={10} /> {post.readTime} read</span>}
                    </div>
                    <p className="font-bold text-gray-900 truncate">{post.title}</p>
                    {post.excerpt && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{post.excerpt}</p>}
                    {post.tags?.length > 0 && (
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {post.tags.slice(0, 3).map((t: string) => <span key={t} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full flex items-center gap-0.5"><Tag size={9} />{t}</span>)}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => toggle(post)} title={post.published ? 'Unpublish' : 'Publish'}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg border transition ${post.published ? 'text-green-500 border-green-200 hover:bg-green-50' : 'text-gray-400 border-gray-200 hover:bg-gray-50'}`}>
                      {post.published ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>
                    <button onClick={() => setModal({ open: true, post })}
                      className="w-8 h-8 flex items-center justify-center rounded-lg border hover:bg-gray-50 text-gray-600 transition">
                      <Edit2 size={13} />
                    </button>
                    <button onClick={() => del(post._id)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg border border-red-100 hover:bg-red-50 text-red-400 transition">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal.open && <BlogPostModal post={modal.post} onClose={() => setModal({ open: false, post: null })} onSave={load} />}
    </div>
  );
}
