// @ts-nocheck
/**
 * Product Groups tab — link multiple standalone products into one "family"
 * (e.g. Whey Protein in Chocolate / Vanilla / Mango as separate products).
 * On the PDP, sibling products show up as clickable chips so customers can
 * jump between them — same pattern as Avvatar / MuscleBlaze.
 */
import { useEffect, useState } from 'react';
import { Plus, Trash2, Edit3, X, Layers, Save, Link as LinkIcon } from 'lucide-react';
import API from '@/lib/api';

type Group = { _id?: string; id?: string; name: string; slug: string; description?: string; sortOrder?: number; active?: boolean };
type Product = { _id: string; name: string; slug: string; groupId?: string | null };

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export default function ProductGroupsTab() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Group | null>(null);
  const [assigning, setAssigning] = useState<Group | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [g, p] = await Promise.all([
        API.get('/admin/product-groups'),
        API.get('/admin/products'),
      ]);
      setGroups(g.data || []);
      setProducts((p.data || []).map((x: any) => ({ _id: x._id || x.id, name: x.name, slug: x.slug, groupId: x.groupId || x.group_id || null })));
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const save = async (g: Group) => {
    const payload = { name: g.name, slug: g.slug || slugify(g.name), description: g.description || '', sortOrder: g.sortOrder ?? 0, active: g.active !== false };
    if (g._id || g.id) await API.put(`/admin/product-groups/${g._id || g.id}`, payload);
    else await API.post('/admin/product-groups', payload);
    setEditing(null);
    await load();
  };
  const remove = async (id: string) => {
    if (!confirm('Delete this group? Products will be unlinked (not deleted).')) return;
    await API.delete(`/admin/product-groups/${id}`);
    await load();
  };

  const productsInGroup = (gid: string) => products.filter(p => p.groupId === gid);

  const toggleProductInGroup = async (product: Product, gid: string | null) => {
    await API.put(`/admin/products/${product._id}`, { groupId: gid });
    setProducts(ps => ps.map(p => p._id === product._id ? { ...p, groupId: gid } : p));
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-black flex items-center gap-2"><Layers size={22} /> Product Groups</h2>
          <p className="text-sm text-gray-500 mt-1">Link related products (different flavors/sizes as separate products) so customers can jump between them on the product page.</p>
        </div>
        <button onClick={() => setEditing({ name: '', slug: '', description: '', sortOrder: 0, active: true })}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm">
          <Plus size={16} /> New Group
        </button>
      </div>

      {loading ? <p className="text-gray-400">Loading…</p> : groups.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed rounded-2xl">
          <Layers className="mx-auto text-gray-300" size={40} />
          <p className="mt-3 font-bold text-gray-500">No product groups yet</p>
          <p className="text-xs text-gray-400 mt-1">Create one to link related products (e.g. all flavors of Whey Protein).</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {groups.map((g: any) => {
            const id = g._id || g.id;
            const items = productsInGroup(id);
            return (
              <div key={id} className="border rounded-2xl p-4 bg-white">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-black truncate">{g.name}</h3>
                      <span className="text-[10px] font-mono text-gray-400">/{g.slug}</span>
                      {g.active === false && <span className="text-[10px] font-black bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">INACTIVE</span>}
                      <span className="text-[10px] font-black bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">{items.length} PRODUCTS</span>
                    </div>
                    {g.description && <p className="text-xs text-gray-500 mt-1">{g.description}</p>}
                    {items.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {items.map(p => (
                          <span key={p._id} className="text-[11px] font-semibold bg-gray-100 text-gray-700 px-2 py-1 rounded-full">{p.name}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => setAssigning(g)} title="Assign products" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"><LinkIcon size={15} /></button>
                    <button onClick={() => setEditing(g)} title="Edit" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"><Edit3 size={15} /></button>
                    <button onClick={() => remove(id)} title="Delete" className="p-2 rounded-lg hover:bg-red-50 text-red-500"><Trash2 size={15} /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <EditModal group={editing} onClose={() => setEditing(null)} onSave={save} />
      )}
      {assigning && (
        <AssignModal
          group={assigning}
          allProducts={products}
          onClose={() => setAssigning(null)}
          onToggle={toggleProductInGroup}
        />
      )}
    </div>
  );
}

function EditModal({ group, onClose, onSave }: { group: Group; onClose: () => void; onSave: (g: Group) => void }) {
  const [g, setG] = useState<Group>(group);
  const [busy, setBusy] = useState(false);
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black">{group._id || group.id ? 'Edit Group' : 'New Product Group'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1">Group Name *</label>
            <input value={g.name} onChange={e => setG({ ...g, name: e.target.value, slug: g.slug || slugify(e.target.value) })}
              placeholder="e.g. Whey Protein Family" className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1">Slug</label>
            <input value={g.slug} onChange={e => setG({ ...g, slug: slugify(e.target.value) })}
              className="w-full border rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-orange-400" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1">Description</label>
            <textarea value={g.description || ''} onChange={e => setG({ ...g, description: e.target.value })}
              rows={2} className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400" />
          </div>
          <div className="flex items-center gap-4">
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">Sort</label>
              <input type="number" value={g.sortOrder ?? 0} onChange={e => setG({ ...g, sortOrder: Number(e.target.value) })}
                className="w-24 border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400" />
            </div>
            <label className="flex items-center gap-2 text-sm font-bold text-gray-700 mt-5 cursor-pointer">
              <input type="checkbox" checked={g.active !== false} onChange={e => setG({ ...g, active: e.target.checked })} />
              Active
            </label>
          </div>
        </div>
        <button disabled={!g.name || busy} onClick={async () => { setBusy(true); try { await onSave(g); } finally { setBusy(false); } }}
          className="mt-5 w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2">
          <Save size={16} /> {busy ? 'Saving…' : 'Save Group'}
        </button>
      </div>
    </div>
  );
}

function AssignModal({ group, allProducts, onClose, onToggle }: { group: Group; allProducts: Product[]; onClose: () => void; onToggle: (p: Product, gid: string | null) => Promise<void> }) {
  const gid = (group as any)._id || (group as any).id;
  const [q, setQ] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const filtered = allProducts.filter(p => p.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-xl my-8 max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h3 className="font-black">Assign products to "{group.name}"</h3>
            <p className="text-xs text-gray-500 mt-0.5">Check products that belong to this group. Each product can be in only one group.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
        </div>
        <div className="p-5 border-b">
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search products…"
            className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400" />
        </div>
        <div className="overflow-y-auto p-3">
          {filtered.length === 0 ? <p className="text-center text-sm text-gray-400 py-8">No products</p> : filtered.map(p => {
            const inThis = p.groupId === gid;
            const inOther = !!p.groupId && p.groupId !== gid;
            return (
              <label key={p._id} className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-gray-50 ${inThis ? 'bg-orange-50' : ''}`}>
                <div className="flex items-center gap-3 min-w-0">
                  <input type="checkbox" checked={inThis} disabled={busyId === p._id}
                    onChange={async e => {
                      setBusyId(p._id);
                      try { await onToggle(p, e.target.checked ? gid : null); } finally { setBusyId(null); }
                    }} />
                  <span className="font-semibold text-sm truncate">{p.name}</span>
                </div>
                {inOther && <span className="text-[10px] font-black bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded shrink-0">IN ANOTHER GROUP</span>}
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}