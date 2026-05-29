// @ts-nocheck
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Trash2, Save, ChevronDown, ChevronRight, GripVertical } from 'lucide-react';
import { TabHelp } from "./_TabHelp";
import { BulkActionBar, SelectCheckbox } from '../components/BulkSelect';

const AdminAPI = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });
AdminAPI.interceptors.request.use(config => {
  const token = sessionStorage.getItem('np_admin_token');
  if (token) config.headers['x-admin-token'] = token;
  return config;
});

const DEFAULTS = [
  { label: 'All Products', href: '/products' },
  { label: 'Our Story', href: '/about' },
  { label: 'Track Order', href: '/track-order' },
  { label: 'Contact Us', href: '/contact' },
];

export default function NavigationTab() {
  const [links, setLinks] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    AdminAPI.get('/admin/settings').then(r => {
      setLinks(r.data.navLinks?.length ? r.data.navLinks : DEFAULTS);
    }).catch(() => setLinks(DEFAULTS));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await AdminAPI.put('/admin/settings', { navLinks: links });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch { alert('Save failed'); }
    setSaving(false);
  };

  const addLink = () => setLinks(l => [...l, { label: 'New Link', href: '/' }]);
  const removeLink = (i: number) => setLinks(l => l.filter((_, idx) => idx !== i));
  const updateLink = (i: number, k: string, v: any) => setLinks(l => l.map((item, idx) => idx === i ? { ...item, [k]: v } : item));
  const toggleDropdown = (i: number) => {
    setLinks(l => l.map((item, idx) => {
      if (idx !== i) return item;
      if (item.children) {
        const { children, ...rest } = item;
        return rest;
      }
      return { ...item, children: [{ label: 'Sub-item', href: '/' }] };
    }));
    setExpanded(prev => prev === i ? null : i);
  };
  const addChild = (i: number) => setLinks(l => l.map((item, idx) => idx === i ? { ...item, children: [...(item.children || []), { label: 'New Item', href: '/' }] } : item));
  const removeChild = (i: number, j: number) => setLinks(l => l.map((item, idx) => idx !== i ? item : { ...item, children: item.children.filter((_: any, ci: number) => ci !== j) }));
  const updateChild = (i: number, j: number, k: string, v: string) => setLinks(l => l.map((item, idx) => idx !== i ? item : { ...item, children: item.children.map((c: any, ci: number) => ci === j ? { ...c, [k]: v } : c) }));
  const moveUp = (i: number) => { if (i === 0) return; setLinks(l => { const n = [...l]; [n[i-1], n[i]] = [n[i], n[i-1]]; return n; }); };
  const moveDown = (i: number) => { if (i === links.length-1) return; setLinks(l => { const n = [...l]; [n[i], n[i+1]] = [n[i+1], n[i]]; return n; }); };

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const allSel = links.length > 0 && links.every((_, i) => selected.has(String(i)));
  const someSel = selected.size > 0 && !allSel;
  const toggleOne = (id: string) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelected(s => allSel ? new Set() : new Set(links.map((_, i) => String(i))));

  return (
    <div className="space-y-6 max-w-2xl">
      <TabHelp topic="navigation" />
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-black">Navigation</h2><p className="text-sm text-gray-500">Manage header menu links and dropdowns</p></div>
        <button onClick={save} disabled={saving}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition ${saved ? 'bg-green-500 text-white' : 'bg-orange-500 text-white hover:bg-orange-600'} disabled:opacity-50`}>
          <Save size={15} />{saved ? 'Saved!' : saving ? 'Saving...' : 'Save Nav'}
        </button>
      </div>

      <BulkActionBar
        count={selected.size}
        ids={Array.from(selected)}
        onClear={() => setSelected(new Set())}
        actions={[
          { key: 'delete', label: 'Delete', color: 'bg-red-600 hover:bg-red-700', confirm: 'Delete {n} links? Click Save Nav to persist.',
            run: (ids) => { setLinks(ls => ls.filter((_, i) => !ids.includes(String(i)))); setSelected(new Set()); } },
        ]}
      />
      {links.length > 0 && (
        <label className="flex items-center gap-2 text-xs font-bold text-gray-600 px-1">
          <SelectCheckbox checked={allSel} indeterminate={someSel} onChange={toggleAll} />
          Select all ({links.length})
        </label>
      )}

      <div className="space-y-3">
        {links.map((link, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="flex items-center gap-3 p-4">
              <SelectCheckbox checked={selected.has(String(i))} onChange={() => toggleOne(String(i))} />
              <div className="flex flex-col gap-0.5 shrink-0">
                <button onClick={() => moveUp(i)} disabled={i === 0} className="text-gray-300 hover:text-gray-600 disabled:opacity-20 text-xs leading-none">▲</button>
                <button onClick={() => moveDown(i)} disabled={i === links.length-1} className="text-gray-300 hover:text-gray-600 disabled:opacity-20 text-xs leading-none">▼</button>
              </div>
              <GripVertical size={16} className="text-gray-300 shrink-0" />
              <input value={link.label} onChange={e => updateLink(i, 'label', e.target.value)}
                className="flex-1 border rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:border-orange-400 min-w-0" placeholder="Label" />
              {!link.children && (
                <input value={link.href} onChange={e => updateLink(i, 'href', e.target.value)}
                  className="flex-1 border rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-orange-400 min-w-0" placeholder="/products" />
              )}
              <button onClick={() => toggleDropdown(i)}
                className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold border transition shrink-0 ${link.children ? 'border-orange-400 bg-orange-50 text-orange-600' : 'border-gray-200 text-gray-500 hover:border-orange-300'}`}>
                {link.children ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                {link.children ? 'Dropdown' : 'Make Dropdown'}
              </button>
              <button onClick={() => removeLink(i)} className="text-red-400 hover:text-red-600 shrink-0"><Trash2 size={15} /></button>
            </div>

            {link.children && (
              <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-2">
                <p className="text-xs font-bold text-gray-500 mb-2">Dropdown Items</p>
                {link.children.map((child: any, j: number) => (
                  <div key={j} className="flex items-center gap-2">
                    <input value={child.label} onChange={e => updateChild(i, j, 'label', e.target.value)}
                      className="flex-1 border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400 bg-white" placeholder="Label" />
                    <input value={child.href} onChange={e => updateChild(i, j, 'href', e.target.value)}
                      className="flex-1 border rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-orange-400 bg-white" placeholder="/products?category=Protein" />
                    <button onClick={() => removeChild(i, j)} className="text-red-400 hover:text-red-600"><Trash2 size={13} /></button>
                  </div>
                ))}
                <button onClick={() => addChild(i)}
                  className="flex items-center gap-1 text-xs text-orange-600 font-bold hover:underline mt-1">
                  <Plus size={12} /> Add dropdown item
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <button onClick={addLink}
        className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-2xl text-gray-500 hover:border-orange-400 hover:text-orange-500 w-full justify-center font-semibold text-sm transition">
        <Plus size={16} /> Add Navigation Item
      </button>

      <div className="bg-blue-50 rounded-xl p-4 text-xs text-blue-700">
        <strong>Tips:</strong> Use "Make Dropdown" to add a submenu to any link. Use ▲▼ to reorder items. Changes take effect after saving.
      </div>
    </div>
  );
}
