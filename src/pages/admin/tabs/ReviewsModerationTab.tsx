// @ts-nocheck
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BadgeCheck, Pin, Trash2, Star, Search, Image as ImageIcon, X, ExternalLink } from 'lucide-react';
import { useBulkSelection, BulkActionBar, SelectCheckbox, runForEach } from '@/pages/admin/components/BulkSelect';
import { TabHelp } from './_TabHelp';


type Review = {
  id: string;
  product_id: string;
  name: string;
  avatar?: string;
  rating: number;
  title?: string;
  comment: string;
  images?: string[];
  video?: string;
  verified: boolean;
  pinned: boolean;
  helpful: number;
  source?: string;
  variant?: string;
  created_at: string;
};

type Filter = 'pending' | 'verified' | 'pinned' | 'all';

export default function ReviewsModerationTab() {
  const [rows, setRows] = useState<Review[]>([]);
  const [products, setProducts] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<Filter>('pending');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('product_reviews')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    const list = (data as any[]) ?? [];
    setRows(list as Review[]);
    const ids = [...new Set(list.map(r => r.product_id).filter(Boolean))];
    if (ids.length) {
      const { data: prods } = await supabase.from('products').select('id,name').in('id', ids);
      const map: Record<string, string> = {};
      (prods ?? []).forEach((p: any) => { map[p.id] = p.name; });
      setProducts(map);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleVerified = async (r: Review) => {
    await supabase.from('product_reviews').update({ verified: !r.verified }).eq('id', r.id);
    setRows(rs => rs.map(x => x.id === r.id ? { ...x, verified: !x.verified } : x));
  };
  const togglePinned = async (r: Review) => {
    await supabase.from('product_reviews').update({ pinned: !r.pinned }).eq('id', r.id);
    setRows(rs => rs.map(x => x.id === r.id ? { ...x, pinned: !x.pinned } : x));
  };
  const remove = async (r: Review) => {
    if (!confirm('Delete this review permanently?')) return;
    await supabase.from('product_reviews').delete().eq('id', r.id);
    setRows(rs => rs.filter(x => x.id !== r.id));
  };

  const filtered = rows.filter(r => {
    if (filter === 'pending' && r.verified) return false;
    if (filter === 'verified' && !r.verified) return false;
    if (filter === 'pinned' && !r.pinned) return false;
    if (search) {
      const q = search.toLowerCase();
      const pname = products[r.product_id] ?? '';
      if (!`${r.name} ${r.comment} ${r.title ?? ''} ${pname}`.toLowerCase().includes(q)) return false;
    }
    return true;
  });
  const sel = useBulkSelection(filtered, (r) => r.id);

  const counts = {
    pending: rows.filter(r => !r.verified).length,
    verified: rows.filter(r => r.verified).length,
    pinned: rows.filter(r => r.pinned).length,
    photos: rows.filter(r => (r.images?.length ?? 0) > 0).length,
  };


  return (
    <div className="space-y-4">
      <TabHelp topic="reviews" />
      <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 text-sm text-orange-900">
        <p className="font-bold mb-1">📝 Customer Reviews Moderation</p>
        <p>Yaha customer-submitted product reviews moderate kar.</p>
        <ul className="list-disc ml-5 mt-1 space-y-0.5 text-xs">
          <li><b>Pending</b> tab me naye reviews — read karke <b>Verify</b> kar (verified badge lagega).</li>
          <li><b>Pin</b> karne se review product page ke top par dikhega.</li>
          <li>Spam ya inappropriate hai to <b>Delete</b> kar.</li>
          <li>Photo thumbnail par click karke full size dekh.</li>
        </ul>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Pending" value={counts.pending} color="bg-orange-50 text-orange-700" />
        <Stat label="Verified" value={counts.verified} color="bg-green-50 text-green-700" />
        <Stat label="Pinned" value={counts.pinned} color="bg-blue-50 text-blue-700" />
        <Stat label="With Photos" value={counts.photos} color="bg-purple-50 text-purple-700" />
      </div>

      <div className="bg-white rounded-2xl p-4 border border-gray-100 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {(['pending','verified','pinned','all'] as Filter[]).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg capitalize ${filter===f?'bg-white shadow text-gray-900':'text-gray-500'}`}>
              {f}
            </button>
          ))}
        </div>
        <div className="flex-1 min-w-[200px] relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name, comment, product…"
            className="w-full pl-9 pr-3 py-2 border rounded-xl text-sm focus:outline-none focus:border-orange-400" />
        </div>
      </div>

      <BulkActionBar
        count={sel.count}
        ids={Array.from(sel.selected)}
        onClear={() => { sel.clear(); load(); }}
        actions={[
          { key: 'verify', label: 'Verify', color: 'bg-green-600 hover:bg-green-700', run: async (ids) => { await runForEach(ids, (id) => supabase.from('product_reviews').update({ verified: true }).eq('id', id)); } },
          { key: 'unverify', label: 'Unverify', color: 'bg-yellow-600 hover:bg-yellow-700', run: async (ids) => { await runForEach(ids, (id) => supabase.from('product_reviews').update({ verified: false }).eq('id', id)); } },
          { key: 'pin', label: 'Pin', color: 'bg-blue-600 hover:bg-blue-700', run: async (ids) => { await runForEach(ids, (id) => supabase.from('product_reviews').update({ pinned: true }).eq('id', id)); } },
          { key: 'unpin', label: 'Unpin', color: 'bg-gray-600 hover:bg-gray-700', run: async (ids) => { await runForEach(ids, (id) => supabase.from('product_reviews').update({ pinned: false }).eq('id', id)); } },
          { key: 'delete', label: 'Delete', color: 'bg-red-600 hover:bg-red-700', confirm: 'Delete {n} reviews?', run: async (ids) => { await runForEach(ids, (id) => supabase.from('product_reviews').delete().eq('id', id)); } },
        ]}
      />

      {filtered.length > 0 && (
        <label className="flex items-center gap-2 text-xs font-bold text-gray-600 cursor-pointer px-2">
          <SelectCheckbox checked={sel.allSelected} indeterminate={sel.someSelected} onChange={sel.toggleAll} /> Select all visible
        </label>
      )}

      {loading ? (
        <div className="space-y-2">{[...Array(4)].map((_,i)=><div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">No reviews in this view.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => (
            <div key={r.id} className={`bg-white rounded-2xl border p-4 flex flex-col md:flex-row gap-4 ${sel.isSelected(r.id) ? 'border-orange-400 ring-1 ring-orange-200' : 'border-gray-100'}`}>
              <div className="pt-1"><SelectCheckbox checked={sel.isSelected(r.id)} onChange={() => sel.toggleOne(r.id)} /></div>

              <div className="flex items-start gap-3 md:w-64 shrink-0">
                <img src={r.avatar || `https://i.pravatar.cc/56?u=${encodeURIComponent(r.name)}`} alt="" className="w-12 h-12 rounded-full object-cover border" />
                <div className="min-w-0">
                  <p className="font-bold text-sm truncate">{r.name}</p>
                  <p className="text-[11px] text-gray-500">{new Date(r.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</p>
                  <div className="flex mt-1">
                    {[1,2,3,4,5].map(n=> <Star key={n} size={12} className={n<=r.rating?'fill-orange-400 text-orange-400':'text-gray-300'} />)}
                  </div>
                  {r.variant && <p className="text-[10px] text-gray-400 mt-1">Variant: {r.variant}</p>}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 mb-1">
                  <a href={`/product/${r.product_id}`} target="_blank" rel="noreferrer" className="text-[11px] font-semibold text-orange-600 hover:underline flex items-center gap-1">
                    {products[r.product_id] ?? r.product_id} <ExternalLink size={10} />
                  </a>
                  {r.verified && <span className="text-[10px] font-bold px-1.5 py-0.5 bg-green-100 text-green-700 rounded">VERIFIED</span>}
                  {r.pinned && <span className="text-[10px] font-bold px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">PINNED</span>}
                  <span className="text-[10px] text-gray-400">{r.source ?? 'customer'}</span>
                </div>
                {r.title && <p className="font-bold text-sm mb-0.5">{r.title}</p>}
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{r.comment}</p>
                {(r.images?.length ?? 0) > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {r.images!.map((img, i) => (
                      <button key={i} onClick={() => setLightbox(img)} className="relative w-16 h-16 rounded-lg overflow-hidden border hover:ring-2 ring-orange-400">
                        <img src={img} alt="" className="w-full h-full object-cover" />
                        <ImageIcon size={10} className="absolute bottom-0.5 right-0.5 text-white drop-shadow" />
                      </button>
                    ))}
                  </div>
                )}
                {r.video && <a href={r.video} target="_blank" rel="noreferrer" className="text-xs text-orange-600 hover:underline mt-2 inline-block">▶ View video</a>}
              </div>
              <div className="flex md:flex-col gap-2 md:w-32 shrink-0">
                <button onClick={()=>toggleVerified(r)} className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-bold transition ${r.verified?'bg-green-100 text-green-700 hover:bg-green-200':'bg-orange-500 text-white hover:bg-orange-600'}`}>
                  <BadgeCheck size={14} /> {r.verified?'Unverify':'Verify'}
                </button>
                <button onClick={()=>togglePinned(r)} className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-bold transition ${r.pinned?'bg-blue-100 text-blue-700 hover:bg-blue-200':'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                  <Pin size={14} /> {r.pinned?'Unpin':'Pin'}
                </button>
                <button onClick={()=>remove(r)} className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100 transition">
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {lightbox && (
        <div onClick={()=>setLightbox(null)} className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6 cursor-zoom-out">
          <button className="absolute top-4 right-4 text-white"><X size={28} /></button>
          <img src={lightbox} alt="" className="max-w-full max-h-full rounded-lg" />
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`rounded-2xl p-4 ${color}`}>
      <p className="text-2xl font-black">{value}</p>
      <p className="text-xs font-semibold uppercase tracking-wider opacity-80">{label}</p>
    </div>
  );
}
