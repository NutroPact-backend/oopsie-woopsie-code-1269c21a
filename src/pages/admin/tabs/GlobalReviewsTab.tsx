// @ts-nocheck
import { useState, useEffect, useRef } from 'react';
import {
  Plus, Trash2, Edit2, Pin, BadgeCheck, Camera, PlayCircle,
  MessageSquare, X, Upload, Search, Star
} from 'lucide-react';
import { useSimpleUpload } from '@/lib/useSimpleUpload';
import { TabHelp } from "./_TabHelp";
import { useBulkSelection, BulkActionBar, SelectCheckbox, runForEach } from '@/pages/admin/components/BulkSelect';

import API from '@/lib/api';
const AdminAPI = API;
function AvatarUploader({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const { uploadFile, isUploading, progress } = useSimpleUpload({ onSuccess: onChange });
  return (
    <div className="flex items-center gap-3">
      <div className="relative w-14 h-14 shrink-0">
        <img src={value || 'https://i.pravatar.cc/56?u=default'} alt="" className="w-14 h-14 rounded-full object-cover border-2 border-gray-200" />
        <button type="button" onClick={() => ref.current?.click()}
          className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition">
          <Upload size={14} className="text-white" />
        </button>
      </div>
      <div className="flex-1 min-w-0">
        <input type="text" value={value || ''} onChange={e => onChange(e.target.value)}
          placeholder="Avatar URL or upload photo" className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400" />
        {isUploading && <p className="text-xs text-orange-500 mt-1 font-bold">Uploading... {progress}%</p>}
      </div>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={async e => {
        const f = e.target.files?.[0]; if (!f) return;
        await uploadFile(f); if (ref.current) ref.current.value = '';
      }} />
    </div>
  );
}

function ReviewPhotosUploader({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const { uploadFile, isUploading, progress } = useSimpleUpload({
    onSuccess: (url) => { const curr = value ? value.split(',').map(s => s.trim()).filter(Boolean) : []; onChange([...curr, url].join(', ')); },
  });
  return (
    <div>
      <label className="text-xs font-bold text-gray-500 block mb-1.5"><Camera size={11} className="inline mr-1" />Review Photos</label>
      <div className="flex gap-2 mb-2">
        <input type="text" value={value || ''} onChange={e => onChange(e.target.value)} placeholder="https://img1.jpg, https://img2.jpg"
          className="flex-1 border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400" />
        {isUploading ? (
          <span className="shrink-0 px-3 flex items-center text-xs font-bold text-orange-500">{progress}%</span>
        ) : (
          <button type="button" onClick={() => ref.current?.click()} className="shrink-0 px-3 py-2 bg-gray-100 hover:bg-orange-50 text-gray-500 hover:text-orange-500 rounded-xl text-xs font-bold border transition">
            <Upload size={12} />
          </button>
        )}
        <input ref={ref} type="file" accept="image/*" multiple className="hidden" onChange={async e => {
          const files = Array.from(e.target.files || []);
          for (const f of files) if (f.type.startsWith('image/')) await uploadFile(f);
          if (ref.current) ref.current.value = '';
        }} />
      </div>
    </div>
  );
}

function VideoUploader({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const { uploadFile, isUploading, progress } = useSimpleUpload({ onSuccess: onChange });
  return (
    <div>
      <label className="text-xs font-bold text-gray-500 block mb-1.5"><PlayCircle size={11} className="inline mr-1" />Review Video</label>
      <div className="flex gap-2">
        <input type="text" value={value || ''} onChange={e => onChange(e.target.value)} placeholder="Upload video or paste URL"
          className="flex-1 border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400" />
        {isUploading ? (
          <span className="shrink-0 px-3 flex items-center text-xs font-bold text-orange-500">{progress}%</span>
        ) : (
          <button type="button" onClick={() => ref.current?.click()} className="shrink-0 px-3 py-2 bg-gray-100 hover:bg-orange-50 text-gray-500 hover:text-orange-500 rounded-xl text-xs font-bold border transition">
            <Upload size={12} />
          </button>
        )}
        <input ref={ref} type="file" accept="video/*" className="hidden" onChange={async e => {
          const f = e.target.files?.[0]; if (!f) return;
          await uploadFile(f); if (ref.current) ref.current.value = '';
        }} />
      </div>
      {value && <video src={value} controls className="mt-2 w-full max-h-32 rounded-xl border" />}
    </div>
  );
}

const EMPTY = {
  name: '', avatar: '', rating: 5, title: '', comment: '', images: '', video: '',
  productId: '', variant: '', verified: true, pinned: false, createdAt: '',
  showOnHome: true, showOnTestimonials: true,
};

function ReviewModal({ review, products, onClose, onSave }: { review: any; products: any[]; onClose: () => void; onSave: () => void }) {
  const [form, setForm] = useState(review ? {
    ...review,
    images: Array.isArray(review.images) ? review.images.join(', ') : review.images || '',
    createdAt: review.createdAt ? new Date(review.createdAt).toISOString().slice(0, 10) : '',
  } : { ...EMPTY });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.name || !form.comment) return alert('Name and comment required');
    setSaving(true);
    try {
      const payload = {
        ...form,
        images: form.images.split(',').map((s: string) => s.trim()).filter(Boolean),
        createdAt: form.createdAt || new Date().toISOString(),
      };
      if (review?._id) await AdminAPI.put(`/admin/reviews/${review._id}`, payload);
      else await AdminAPI.post('/admin/reviews', payload);
      onSave(); onClose();
    } catch { alert('Failed to save review'); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl my-8" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h3 className="font-black">{review?._id ? 'Edit Review' : 'Add Manual Review'}</h3>
            <p className="text-xs text-gray-400 mt-0.5">Global review — can be linked to any product</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-2 hover:bg-gray-100 rounded-xl"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4 max-h-[72vh] overflow-y-auto">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">Customer Name *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)}
                className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">Display Picture</label>
              <AvatarUploader value={form.avatar} onChange={v => set('avatar', v)} />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">Rating</label>
              <div className="flex gap-1">
                {[1,2,3,4,5].map(n => (
                  <button key={n} type="button" onClick={() => set('rating', n)}
                    className={`text-xl transition ${n <= form.rating ? 'text-yellow-400' : 'text-gray-200'}`}>★</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">Review Date</label>
              <input type="date" value={form.createdAt} onChange={e => set('createdAt', e.target.value)}
                className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-gray-500 block mb-1">Product (optional)</label>
              <select value={form.productId} onChange={e => set('productId', e.target.value)}
                className="w-full border rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-orange-400">
                <option value="">— No specific product —</option>
                {products.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-gray-500 block mb-1">Review Title</label>
              <input value={form.title} onChange={e => set('title', e.target.value)}
                className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-gray-500 block mb-1">Review Comment *</label>
              <textarea value={form.comment} onChange={e => set('comment', e.target.value)} rows={4}
                className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400 resize-none" />
            </div>
            <div className="sm:col-span-2">
              <ReviewPhotosUploader value={form.images} onChange={v => set('images', v)} />
            </div>
            <div className="sm:col-span-2">
              <VideoUploader value={form.video} onChange={v => set('video', v)} />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">Variant</label>
              <input value={form.variant} onChange={e => set('variant', e.target.value)} placeholder="e.g. Chocolate, 1 kg"
                className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400" />
            </div>
            <div className="sm:col-span-2 grid sm:grid-cols-2 gap-3 pt-1">
              <label className="flex items-center gap-2 cursor-pointer p-3 border rounded-xl hover:bg-orange-50/50 transition">
                <input type="checkbox" checked={form.verified} onChange={e => set('verified', e.target.checked)} className="w-4 h-4 accent-orange-500" />
                <span className="text-sm font-semibold flex items-center gap-1"><BadgeCheck size={14} className="text-emerald-500" /> Verified Buyer</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer p-3 border rounded-xl hover:bg-orange-50/50 transition">
                <input type="checkbox" checked={form.pinned} onChange={e => set('pinned', e.target.checked)} className="w-4 h-4 accent-orange-500" />
                <span className="text-sm font-semibold flex items-center gap-1"><Pin size={14} className="text-orange-500" /> Pin to top</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer p-3 border rounded-xl hover:bg-orange-50/50 transition">
                <input type="checkbox" checked={form.showOnHome !== false} onChange={e => set('showOnHome', e.target.checked)} className="w-4 h-4 accent-orange-500" />
                <span className="text-sm font-semibold">🏠 Show on Homepage</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer p-3 border rounded-xl hover:bg-orange-50/50 transition">
                <input type="checkbox" checked={form.showOnTestimonials !== false} onChange={e => set('showOnTestimonials', e.target.checked)} className="w-4 h-4 accent-orange-500" />
                <span className="text-sm font-semibold">💬 Show on Testimonials Page</span>
              </label>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 p-5 border-t">
          <button onClick={onClose} className="px-5 py-2.5 border rounded-xl font-semibold text-sm hover:bg-gray-50">Cancel</button>
          <button onClick={save} disabled={saving} className="px-5 py-2.5 bg-orange-500 text-white rounded-xl font-black text-sm hover:bg-orange-600 disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Review'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GlobalReviewsTab() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; review: any }>({ open: false, review: null });
  const [search, setSearch] = useState('');
  const [ratingFilter, setRatingFilter] = useState(0);

  const load = async () => {
    try {
      const [rv, pr] = await Promise.all([AdminAPI.get('/admin/reviews'), AdminAPI.get('/admin/products')]);
      setReviews(rv.data || []);
      setProducts(pr.data || []);
    } catch { setReviews([]); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const del = async (id: string) => {
    if (!confirm('Delete this review?')) return;
    await AdminAPI.delete(`/admin/reviews/${id}`);
    load();
  };

  const togglePin = async (r: any) => {
    await AdminAPI.put(`/admin/reviews/${r._id}`, { ...r, pinned: !r.pinned });
    load();
  };

  const filtered = reviews.filter(r => {
    if (ratingFilter && r.rating !== ratingFilter) return false;
    if (search && !r.name.toLowerCase().includes(search.toLowerCase()) && !r.comment.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const bulk = useBulkSelection(filtered, (r: any) => r._id);

  const getProductName = (id: string) => products.find(p => p._id === id)?.name || '';

  return (
    <div>
      <TabHelp topic="globalReviews" />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-black">Manual Reviews</h2>
          <p className="text-sm text-gray-500 mt-0.5">{reviews.length} global reviews · fully manual control</p>
        </div>
        <button onClick={() => setModal({ open: true, review: null })}
          className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-orange-600 transition">
          <Plus size={15} /> Add Review
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-5">
        <p className="text-sm text-blue-700 font-semibold">These reviews appear on the Testimonials page and Homepage testimonials section (if rated 4★+). You can optionally link each review to a specific product.</p>
      </div>

      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search reviews..."
            className="w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:border-orange-400" />
        </div>
        {[0,5,4,3,2,1].map(n => (
          <button key={n} onClick={() => setRatingFilter(n === ratingFilter ? 0 : n)}
            className={`px-3 py-2 rounded-xl text-sm font-semibold border transition ${ratingFilter === n ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'}`}>
            {n === 0 ? 'All' : `${n}★`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border p-16 text-center">
          <MessageSquare size={40} className="text-gray-200 mx-auto mb-3" />
          <p className="font-bold text-gray-500 text-lg">No reviews yet</p>
          <p className="text-sm text-gray-400 mt-1">Add manual reviews to show on your testimonials page</p>
        </div>
      ) : (
        <div className="space-y-3">
          <BulkActionBar
            count={bulk.count}
            ids={[...bulk.selected]}
            onClear={bulk.clear}
            actions={[
              { key: 'pin', label: 'Pin', color: 'bg-orange-600 hover:bg-orange-700', confirm: 'Pin {n} review(s)?', run: async (ids) => { await runForEach(ids, async (id) => { const r = reviews.find(x => x._id === id); if (r) await AdminAPI.put(`/admin/reviews/${id}`, { ...r, pinned: true }); }); load(); } },
              { key: 'unpin', label: 'Unpin', color: 'bg-gray-600 hover:bg-gray-700', confirm: 'Unpin {n} review(s)?', run: async (ids) => { await runForEach(ids, async (id) => { const r = reviews.find(x => x._id === id); if (r) await AdminAPI.put(`/admin/reviews/${id}`, { ...r, pinned: false }); }); load(); } },
              { key: 'verify', label: 'Verify', color: 'bg-emerald-600 hover:bg-emerald-700', confirm: 'Mark {n} review(s) as verified?', run: async (ids) => { await runForEach(ids, async (id) => { const r = reviews.find(x => x._id === id); if (r) await AdminAPI.put(`/admin/reviews/${id}`, { ...r, verified: true }); }); load(); } },
              { key: 'del', label: 'Delete', color: 'bg-red-600 hover:bg-red-700', confirm: 'Delete {n} review(s)? This cannot be undone.', run: async (ids) => { await runForEach(ids, async (id) => { await AdminAPI.delete(`/admin/reviews/${id}`); }); load(); } },
            ]}
          />
          <label className="flex items-center gap-2 text-xs font-bold text-gray-500 px-2">
            <SelectCheckbox checked={bulk.allSelected} indeterminate={bulk.someSelected} onChange={bulk.toggleAll} />
            Select all ({filtered.length})
          </label>
          {filtered.map(r => (
            <div key={r._id} className="flex items-start gap-3 p-4 bg-white border border-gray-100 rounded-2xl hover:border-orange-200 transition">
              <div className="pt-1"><SelectCheckbox checked={bulk.isSelected(r._id)} onChange={() => bulk.toggleOne(r._id)} /></div>
              <img src={r.avatar || `https://i.pravatar.cc/48?u=${r.name}`} alt="" className="w-11 h-11 rounded-full object-cover shrink-0 border-2 border-gray-100" />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold text-sm">{r.name}</p>
                  {r.verified && <BadgeCheck size={13} className="text-emerald-500 fill-emerald-500 stroke-white" />}
                  {r.pinned && <Pin size={12} className="text-orange-500" />}
                  <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-semibold">Manual</span>
                  {r.productId && getProductName(r.productId) && (
                    <span className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full font-semibold">{getProductName(r.productId)}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                  <span className="text-yellow-500">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                  {r.variant && <span>· {r.variant}</span>}
                  {r.images?.length > 0 && <span className="flex items-center gap-0.5"><Camera size={10} /> {r.images.length}</span>}
                  {r.video && <span className="flex items-center gap-0.5"><PlayCircle size={10} /> Video</span>}
                </div>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{r.comment}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => togglePin(r)} title={r.pinned ? 'Unpin' : 'Pin'}
                  className={`w-7 h-7 flex items-center justify-center rounded-lg hover:bg-orange-50 transition ${r.pinned ? 'text-orange-500' : 'text-gray-300'}`}>
                  <Pin size={14} />
                </button>
                <button onClick={() => setModal({ open: true, review: r })} className="w-7 h-7 flex items-center justify-center rounded-lg border hover:bg-gray-50 text-gray-600"><Edit2 size={13} /></button>
                <button onClick={() => del(r._id)} className="w-7 h-7 flex items-center justify-center rounded-lg border border-red-100 hover:bg-red-50 text-red-400"><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal.open && <ReviewModal review={modal.review} products={products} onClose={() => setModal({ open: false, review: null })} onSave={load} />}
    </div>
  );
}
