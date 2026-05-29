// @ts-nocheck
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Trash2, Save, Link, FileText, Share2, Image, Award } from 'lucide-react';
import { TabHelp } from "./_TabHelp";
import { useBulkSelection, BulkActionBar, SelectCheckbox } from '../components/BulkSelect';

const AdminAPI = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });
AdminAPI.interceptors.request.use(config => {
  const token = sessionStorage.getItem('np_admin_token');
  if (token) config.headers['x-admin-token'] = token;
  return config;
});

const DEFAULT_BLOCKS = [
  { type: 'links', title: 'Useful Links', enabled: true, order: 0, width: 20, mobileWidth: 100, links: [{ label: 'About Us', href: '/about' }, { label: 'Privacy Policy', href: '/privacy' }, { label: 'Terms of Use', href: '/terms' }, { label: 'Shipping Policy', href: '/shipping' }, { label: 'Return Policy', href: '/refund' }] },
  { type: 'links', title: 'Explore', enabled: true, order: 1, width: 18, mobileWidth: 100, links: [{ label: 'Contact Us', href: '/contact' }, { label: 'FAQs', href: '/faq' }, { label: 'Track Order', href: '/track-order' }] },
  { type: 'text', title: 'Contact Us', enabled: true, order: 2, width: 28, mobileWidth: 100, text: '<strong>Phone:</strong> +91-8955590350<br/><br/><strong>Email:</strong> info@nutropact.com<br/><br/><strong>Timings:</strong> Mon–Sat, 11AM–6PM' },
  { type: 'social', title: 'Follow Us', enabled: true, order: 3, width: 22, mobileWidth: 100, socialIcons: [], badges: [] },
];

const BLOCK_TYPES = [
  { value: 'links', label: 'Links Column', icon: <Link size={14} /> },
  { value: 'text', label: 'Text / Contact', icon: <FileText size={14} /> },
  { value: 'social', label: 'Social Media', icon: <Share2 size={14} /> },
  { value: 'certifications', label: 'Certifications', icon: <Award size={14} /> },
];

const SOCIAL_PRESETS = [
  { label: 'Instagram', urlPrefix: 'https://instagram.com/' },
  { label: 'Facebook', urlPrefix: 'https://facebook.com/' },
  { label: 'YouTube', urlPrefix: 'https://youtube.com/' },
  { label: 'Twitter', urlPrefix: 'https://x.com/' },
  { label: 'WhatsApp', urlPrefix: 'https://wa.me/' },
];

function LinksEditor({ block, onChange }: { block: any; onChange: (b: any) => void }) {
  const links = block.links || [];
  const addLink = () => onChange({ ...block, links: [...links, { label: 'New Link', href: '/' }] });
  const removeLink = (i: number) => onChange({ ...block, links: links.filter((_: any, idx: number) => idx !== i) });
  const updateLink = (i: number, k: string, v: string) => onChange({ ...block, links: links.map((l: any, idx: number) => idx === i ? { ...l, [k]: v } : l) });
  return (
    <div className="space-y-2">
      {links.map((l: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <input value={l.label} onChange={e => updateLink(i, 'label', e.target.value)} placeholder="Label"
            className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" />
          <input value={l.href} onChange={e => updateLink(i, 'href', e.target.value)} placeholder="/page"
            className="flex-1 border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-orange-400" />
          <button onClick={() => removeLink(i)} className="text-red-400 hover:text-red-600 shrink-0"><Trash2 size={13} /></button>
        </div>
      ))}
      <button onClick={addLink} className="flex items-center gap-1 text-xs text-orange-600 font-bold hover:underline">
        <Plus size={12} /> Add link
      </button>
    </div>
  );
}

function SocialEditor({ block, onChange }: { block: any; onChange: (b: any) => void }) {
  const icons = block.socialIcons || [];
  const badges = block.badges || [];
  const addIcon = (preset?: any) => onChange({ ...block, socialIcons: [...icons, { label: preset?.label || 'Social', url: preset?.urlPrefix || 'https://', image: '', size: 32 }] });
  const removeIcon = (i: number) => onChange({ ...block, socialIcons: icons.filter((_: any, idx: number) => idx !== i) });
  const updateIcon = (i: number, k: string, v: any) => onChange({ ...block, socialIcons: icons.map((ic: any, idx: number) => idx === i ? { ...ic, [k]: v } : ic) });
  const addBadge = () => onChange({ ...block, badges: [...badges, { image: '', label: 'Badge', url: '', width: 60 }] });
  const removeBadge = (i: number) => onChange({ ...block, badges: badges.filter((_: any, idx: number) => idx !== i) });
  const updateBadge = (i: number, k: string, v: any) => onChange({ ...block, badges: badges.map((b: any, idx: number) => idx === i ? { ...b, [k]: v } : b) });

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-bold text-gray-500 mb-2">Social Icons</p>
        <div className="flex flex-wrap gap-2 mb-2">
          {SOCIAL_PRESETS.map(p => <button key={p.label} onClick={() => addIcon(p)} className="text-xs px-2 py-1 border rounded-lg hover:bg-orange-50 hover:border-orange-300 text-gray-600">+ {p.label}</button>)}
          <button onClick={() => addIcon()} className="text-xs px-2 py-1 border rounded-lg hover:bg-gray-50 text-gray-500">+ Custom</button>
        </div>
        <div className="space-y-2">
          {icons.map((ic: any, i: number) => (
            <div key={i} className="space-y-1 p-3 bg-gray-50 rounded-xl border">
              <div className="flex items-center gap-2">
                <input value={ic.label} onChange={e => updateIcon(i, 'label', e.target.value)} placeholder="Label"
                  className="flex-1 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-orange-400 bg-white" />
                <button onClick={() => removeIcon(i)} className="text-red-400 hover:text-red-600"><Trash2 size={13} /></button>
              </div>
              <input value={ic.url} onChange={e => updateIcon(i, 'url', e.target.value)} placeholder="https://..."
                className="w-full border rounded-lg px-3 py-1.5 text-sm font-mono focus:outline-none focus:border-orange-400 bg-white" />
              <div className="flex items-center gap-2">
                <input value={ic.image || ''} onChange={e => updateIcon(i, 'image', e.target.value)} placeholder="Icon image URL (optional)"
                  className="flex-1 border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-orange-400 bg-white" />
                {ic.image && <img src={ic.image} alt="" className="w-8 h-8 object-contain rounded" />}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs font-bold text-gray-500 mb-2">Certification / Badge Images</p>
        <div className="space-y-2">
          {badges.map((b: any, i: number) => (
            <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded-xl border">
              <input value={b.image} onChange={e => updateBadge(i, 'image', e.target.value)} placeholder="Image URL"
                className="flex-1 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-orange-400 bg-white" />
              <input value={b.url || ''} onChange={e => updateBadge(i, 'url', e.target.value)} placeholder="Link (optional)"
                className="w-32 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-orange-400 bg-white" />
              <input type="number" value={b.width || 60} onChange={e => updateBadge(i, 'width', Number(e.target.value))} placeholder="Width"
                className="w-20 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-orange-400 bg-white" />
              {b.image && <img src={b.image} alt="" className="w-10 h-10 object-contain rounded border bg-white" />}
              <button onClick={() => removeBadge(i)} className="text-red-400 hover:text-red-600 shrink-0"><Trash2 size={13} /></button>
            </div>
          ))}
          <button onClick={addBadge} className="flex items-center gap-1 text-xs text-orange-600 font-bold hover:underline">
            <Plus size={12} /> Add certification image
          </button>
        </div>
      </div>
    </div>
  );
}

function BlockEditor({ block, onChange, onRemove, onMoveUp, onMoveDown, isFirst, isLast, selected, onToggleSelect }: any) {
  const [open, setOpen] = useState(false);
  const typeInfo = BLOCK_TYPES.find(t => t.value === block.type) || BLOCK_TYPES[0];
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="flex items-center gap-3 p-4">
        <SelectCheckbox checked={!!selected} onChange={onToggleSelect} />
        <div className="flex flex-col gap-0.5 shrink-0">
          <button onClick={onMoveUp} disabled={isFirst} className="text-gray-300 hover:text-gray-600 disabled:opacity-20 text-xs leading-none">▲</button>
          <button onClick={onMoveDown} disabled={isLast} className="text-gray-300 hover:text-gray-600 disabled:opacity-20 text-xs leading-none">▼</button>
        </div>
        <div className={`p-2 rounded-lg ${block.enabled ? 'bg-orange-50 text-orange-600' : 'bg-gray-100 text-gray-400'}`}>{typeInfo.icon}</div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm truncate">{block.title || typeInfo.label}</p>
          <p className="text-xs text-gray-400">{typeInfo.label}</p>
        </div>
        <label className="flex items-center gap-2 cursor-pointer shrink-0">
          <input type="checkbox" checked={block.enabled !== false} onChange={e => onChange({ ...block, enabled: e.target.checked })} className="w-4 h-4 accent-orange-500" />
          <span className="text-xs font-semibold">{block.enabled !== false ? 'On' : 'Off'}</span>
        </label>
        <button onClick={() => setOpen(o => !o)} className="px-3 py-1.5 text-xs border rounded-lg hover:bg-gray-50 font-semibold shrink-0">
          {open ? 'Close' : 'Edit'}
        </button>
        <button onClick={onRemove} className="text-red-400 hover:text-red-600 shrink-0"><Trash2 size={15} /></button>
      </div>

      {open && (
        <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-3">
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">Section Title</label>
              <input value={block.title || ''} onChange={e => onChange({ ...block, title: e.target.value })}
                className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400 bg-white" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">Desktop Width %</label>
              <input type="number" value={block.width || 20} onChange={e => onChange({ ...block, width: Number(e.target.value) })} min={10} max={100}
                className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400 bg-white" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">Mobile Width %</label>
              <input type="number" value={block.mobileWidth || 100} onChange={e => onChange({ ...block, mobileWidth: Number(e.target.value) })} min={10} max={100}
                className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400 bg-white" />
            </div>
          </div>

          {block.type === 'links' && <LinksEditor block={block} onChange={onChange} />}
          {block.type === 'text' && (
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">HTML Content (supports &lt;strong&gt;, &lt;br/&gt; etc.)</label>
              <textarea value={block.text || ''} onChange={e => onChange({ ...block, text: e.target.value })} rows={5}
                className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400 bg-white resize-none font-mono" />
            </div>
          )}
          {(block.type === 'social' || block.type === 'certifications') && <SocialEditor block={block} onChange={onChange} />}
        </div>
      )}
    </div>
  );
}

export default function FooterTab() {
  const [blocks, setBlocks] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [addType, setAddType] = useState('links');

  useEffect(() => {
    AdminAPI.get('/admin/settings').then(r => {
      setBlocks(r.data.footerBlocks?.length ? r.data.footerBlocks : DEFAULT_BLOCKS);
    }).catch(() => setBlocks(DEFAULT_BLOCKS));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const ordered = blocks.map((b, i) => ({ ...b, order: i }));
      await AdminAPI.put('/admin/settings', { footerBlocks: ordered });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch { alert('Save failed'); }
    setSaving(false);
  };

  const addBlock = () => {
    const newBlock: any = { type: addType, title: BLOCK_TYPES.find(t => t.value === addType)?.label || 'New Block', enabled: true, order: blocks.length, width: 20, mobileWidth: 100 };
    if (addType === 'links') newBlock.links = [];
    if (addType === 'text') newBlock.text = '';
    if (addType === 'social' || addType === 'certifications') { newBlock.socialIcons = []; newBlock.badges = []; }
    setBlocks(b => [...b, newBlock]);
  };
  const removeBlock = (i: number) => setBlocks(b => b.filter((_, idx) => idx !== i));
  const updateBlock = (i: number, updated: any) => setBlocks(b => b.map((item, idx) => idx === i ? updated : item));
  const moveUp = (i: number) => { if (i === 0) return; setBlocks(b => { const n = [...b]; [n[i-1], n[i]] = [n[i], n[i-1]]; return n; }); };
  const moveDown = (i: number) => { if (i === blocks.length-1) return; setBlocks(b => { const n = [...b]; [n[i], n[i+1]] = [n[i+1], n[i]]; return n; }); };

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const bulk = {
    count: selected.size,
    selected,
    clear: () => setSelected(new Set()),
    isSelected: (id: string) => selected.has(id),
    toggleOne: (id: string) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; }),
    allSelected: blocks.length > 0 && blocks.every((_, i) => selected.has(String(i))),
    someSelected: selected.size > 0 && !(blocks.length > 0 && blocks.every((_, i) => selected.has(String(i)))),
    toggleAll: () => setSelected(s => {
      if (blocks.length > 0 && blocks.every((_, i) => s.has(String(i)))) return new Set();
      return new Set(blocks.map((_, i) => String(i)));
    }),
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <TabHelp topic="footer" />
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-black">Footer Builder</h2><p className="text-sm text-gray-500">Add sections, links, contact info, social icons, certifications</p></div>
        <button onClick={save} disabled={saving}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition ${saved ? 'bg-green-500 text-white' : 'bg-orange-500 text-white hover:bg-orange-600'} disabled:opacity-50`}>
          <Save size={15} />{saved ? 'Saved!' : saving ? 'Saving...' : 'Save Footer'}
        </button>
      </div>

      <BulkActionBar
        count={bulk.count}
        ids={Array.from(bulk.selected)}
        onClear={bulk.clear}
        actions={[
          { key: 'enable', label: 'Enable', color: 'bg-green-600 hover:bg-green-700',
            run: (ids) => setBlocks(bs => bs.map((b, i) => ids.includes(String(i)) ? { ...b, enabled: true } : b)) },
          { key: 'disable', label: 'Disable', color: 'bg-gray-600 hover:bg-gray-700',
            run: (ids) => setBlocks(bs => bs.map((b, i) => ids.includes(String(i)) ? { ...b, enabled: false } : b)) },
          { key: 'delete', label: 'Delete', color: 'bg-red-600 hover:bg-red-700', confirm: 'Delete {n} sections? Click Save Footer to persist.',
            run: (ids) => setBlocks(bs => bs.filter((_, i) => !ids.includes(String(i)))) },
        ]}
      />
      {blocks.length > 0 && (
        <label className="flex items-center gap-2 text-xs font-bold text-gray-600 px-1">
          <SelectCheckbox checked={bulk.allSelected} indeterminate={bulk.someSelected} onChange={bulk.toggleAll} />
          Select all ({blocks.length})
        </label>
      )}

      <div className="space-y-3">
        {blocks.map((block, i) => (
          <BlockEditor key={i} block={block} onChange={(b: any) => updateBlock(i, b)}
            onRemove={() => removeBlock(i)} onMoveUp={() => moveUp(i)} onMoveDown={() => moveDown(i)}
            isFirst={i === 0} isLast={i === blocks.length - 1}
            selected={bulk.isSelected(String(i))} onToggleSelect={() => bulk.toggleOne(String(i))} />
        ))}
      </div>

      <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border-2 border-dashed border-gray-200">
        <select value={addType} onChange={e => setAddType(e.target.value)}
          className="flex-1 border rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-orange-400">
          {BLOCK_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <button onClick={addBlock}
          className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 text-white rounded-xl font-bold text-sm hover:bg-orange-600 transition shrink-0">
          <Plus size={15} /> Add Section
        </button>
      </div>

      <div className="bg-amber-50 rounded-xl p-4 text-xs text-amber-700">
        <strong>Tips:</strong> Use ▲▼ to reorder sections. Toggle On/Off to show or hide. Desktop width total should add up to ~100%. Mobile width is usually 100%.
      </div>
    </div>
  );
}
