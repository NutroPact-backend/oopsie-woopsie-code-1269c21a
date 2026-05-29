// @ts-nocheck
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Plus, Trash2, Save, Eye, EyeOff, ChevronDown, ChevronUp, Image, Video, LayoutGrid, Upload } from 'lucide-react';
import { useSimpleUpload } from '@/lib/useSimpleUpload';
import { TabHelp } from "./_TabHelp";
import { BulkActionBar, SelectCheckbox } from '@/pages/admin/components/BulkSelect';

const AdminAPI = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });
AdminAPI.interceptors.request.use(config => {
  const token = sessionStorage.getItem('np_admin_token');
  if (token) config.headers['x-admin-token'] = token;
  return config;
});

function Inp({ label, value, onChange, placeholder, type = 'text', help }: any) {
  return (
    <div>
      {label && <label className="text-xs font-bold text-gray-500 block mb-1">{label}</label>}
      <input type={type} value={value ?? ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400 bg-white" />
      {help && <p className="text-xs text-gray-400 mt-0.5">{help}</p>}
    </div>
  );
}

function ColorPick({ label, value, onChange }: any) {
  return (
    <div>
      <label className="text-xs font-bold text-gray-500 block mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input type="color" value={value || '#000000'} onChange={e => onChange(e.target.value)} className="w-9 h-9 rounded-lg border cursor-pointer p-0.5" />
        <input type="text" value={value || ''} onChange={e => onChange(e.target.value)} className="flex-1 border rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-orange-400" />
      </div>
    </div>
  );
}

function ImgUploadInp({ label, value, onChange, placeholder }: any) {
  const fileRef = useRef<HTMLInputElement>(null);
  const { uploadFile, isUploading, progress } = useSimpleUpload({ onSuccess: (url: string) => onChange(url) });
  return (
    <div>
      {label && <label className="text-xs font-bold text-gray-500 block mb-1">{label}</label>}
      <div className="flex gap-2">
        <input type="text" value={value ?? ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          className="flex-1 border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400 bg-white min-w-0" />
        {isUploading ? (
          <div className="shrink-0 px-2 flex items-center text-xs text-gray-400 font-bold">{progress}%</div>
        ) : (
          <button type="button" onClick={() => fileRef.current?.click()}
            className="shrink-0 px-2.5 py-2 bg-gray-100 hover:bg-orange-50 text-gray-500 hover:text-orange-500 rounded-xl text-xs font-bold border border-gray-200 flex items-center gap-1 transition">
            <Upload size={12} /> Upload
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={async e => {
          const f = e.target.files?.[0]; if (!f || !f.type.startsWith('image/')) return;
          await uploadFile(f); if (fileRef.current) fileRef.current.value = '';
        }} />
      </div>
    </div>
  );
}

// ─── Hero Slider Editor ──────────────────────────────────────────────────────

function HeroSliderEditor({ sec, onChange }: { sec: any; onChange: (s: any) => void }) {
  const slides = sec.slides || [];
  const hs = sec.heroSettings || {};
  const addSlide = () => onChange({ ...sec, slides: [...slides, { enabled: true, image: '', video: '', link: '', btnText: 'Shop Now', btnLink: '/products', imageFit: 'cover' }] });
  const removeSlide = (i: number) => onChange({ ...sec, slides: slides.filter((_: any, idx: number) => idx !== i) });
  const updateSlide = (i: number, k: string, v: any) => onChange({ ...sec, slides: slides.map((s: any, idx: number) => idx === i ? { ...s, [k]: v } : s) });
  const updateHs = (k: string, v: any) => onChange({ ...sec, heroSettings: { ...hs, [k]: v } });

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-3 gap-3 p-3 bg-gray-50 rounded-xl border">
        <Inp label="Slide Speed (ms)" type="number" value={hs.slideSpeed || 4000} onChange={(v: string) => updateHs('slideSpeed', Number(v))} />
        <div>
          <label className="text-xs font-bold text-gray-500 block mb-1">Animation Style</label>
          <select value={hs.animationStyle || 'slide'} onChange={e => updateHs('animationStyle', e.target.value)}
            className="w-full border rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-orange-400">
            {['slide','fade','zoom','vertical','flip','blur'].map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <Inp label="Aspect Ratio" value={hs.aspectRatio || '1920 / 600'} onChange={(v: string) => updateHs('aspectRatio', v)} placeholder="1920 / 600" />
      </div>

      <div className="space-y-3">
        {slides.map((slide: any, i: number) => (
          <div key={i} className="border rounded-2xl bg-white overflow-hidden">
            <div className="flex items-center gap-3 p-3 bg-gray-50 border-b">
              <span className="text-xs font-bold text-gray-500 w-16 shrink-0">Slide {i + 1}</span>
              <label className="flex items-center gap-1.5 cursor-pointer ml-auto">
                <input type="checkbox" checked={slide.enabled !== false} onChange={e => updateSlide(i, 'enabled', e.target.checked)} className="w-3.5 h-3.5 accent-orange-500" />
                <span className="text-xs font-semibold">Enabled</span>
              </label>
              <button onClick={() => removeSlide(i)} className="text-red-400 hover:text-red-600 shrink-0"><Trash2 size={13} /></button>
            </div>
            <div className="p-3 grid sm:grid-cols-2 gap-3">
              <ImgUploadInp label="Image URL" value={slide.image} onChange={(v: string) => updateSlide(i, 'image', v)} placeholder="https://..." />
              <Inp label="Video URL (optional)" value={slide.video} onChange={(v: string) => updateSlide(i, 'video', v)} placeholder="https://..." />
              <Inp label="Click Link" value={slide.link} onChange={(v: string) => updateSlide(i, 'link', v)} placeholder="/products" />
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">Image Fit</label>
                <select value={slide.imageFit || 'cover'} onChange={e => updateSlide(i, 'imageFit', e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-orange-400">
                  {['cover','contain','fill'].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <Inp label="Button 1 Text" value={slide.btnText} onChange={(v: string) => updateSlide(i, 'btnText', v)} placeholder="Shop Now" />
              <Inp label="Button 1 Link" value={slide.btnLink} onChange={(v: string) => updateSlide(i, 'btnLink', v)} placeholder="/products" />
              <Inp label="Button 2 Text" value={slide.btnText2} onChange={(v: string) => updateSlide(i, 'btnText2', v)} placeholder="Our Story" />
              <Inp label="Button 2 Link" value={slide.btnLink2} onChange={(v: string) => updateSlide(i, 'btnLink2', v)} placeholder="/about" />
            </div>
            {slide.image && (
              <div className="px-3 pb-3">
                <img src={slide.image} alt="" className="w-full h-28 object-cover rounded-xl border" loading="lazy" />
              </div>
            )}
          </div>
        ))}
      </div>
      <button onClick={addSlide} className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-orange-400 hover:text-orange-500 w-full justify-center text-sm font-semibold transition">
        <Plus size={14} /> Add Slide
      </button>
    </div>
  );
}

// ─── Goal Tiles Editor ───────────────────────────────────────────────────────

function TilesEditor({ sec, onChange }: { sec: any; onChange: (s: any) => void }) {
  const tiles = sec.tiles || [];
  const ts2 = sec.tileSettings || {};
  const updateTs = (k: string, v: any) => onChange({ ...sec, tileSettings: { ...ts2, [k]: v } });
  const addTile = () => onChange({ ...sec, tiles: [...tiles, { enabled: true, image: '', video: '', link: '/products', bottomText: { text: 'NEW CATEGORY', desktopSize: 14, weight: '800', color: '#000', align: 'center' }, bgColor: '#111111', bottomColor: '#58b385' }] });
  const removeTile = (i: number) => onChange({ ...sec, tiles: tiles.filter((_: any, idx: number) => idx !== i) });
  const updateTile = (i: number, k: string, v: any) => onChange({ ...sec, tiles: tiles.map((t: any, idx: number) => idx === i ? { ...t, [k]: v } : t) });
  const updateTileBt = (i: number, k: string, v: any) => onChange({ ...sec, tiles: tiles.map((t: any, idx: number) => idx === i ? { ...t, bottomText: { ...t.bottomText, [k]: v } } : t) });

  return (
    <div className="space-y-5">
      {/* Global tile settings */}
      <div className="p-4 bg-gray-50 rounded-xl border space-y-3">
        <p className="text-xs font-black text-gray-600 uppercase tracking-wider">Global Tile Settings</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Inp label="Width (px)" type="number" value={ts2.desktopTileWidth || 250} onChange={(v: string) => updateTs('desktopTileWidth', Number(v))} />
          <Inp label="Height (px)" type="number" value={ts2.desktopTileHeight || 220} onChange={(v: string) => updateTs('desktopTileHeight', Number(v))} />
          <Inp label="Corner Radius (px)" type="number" value={ts2.radius ?? 14} onChange={(v: string) => updateTs('radius', Number(v))} />
          <Inp label="Image Padding (px)" type="number" value={ts2.imagePadding ?? 10} onChange={(v: string) => updateTs('imagePadding', Number(v))} help="0 = no frame/border" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Inp label="Bottom Bar Height (px)" type="number" value={ts2.tileBottomHeight || 34} onChange={(v: string) => updateTs('tileBottomHeight', Number(v))} />
          <Inp label="Grid Gap (px)" type="number" value={ts2.gridGap || 38} onChange={(v: string) => updateTs('gridGap', Number(v))} />
          <ColorPick label="Default Bottom Color" value={ts2.tileBottomColor || '#58b385'} onChange={(v: string) => updateTs('tileBottomColor', v)} />
          <ColorPick label="Default Tile BG" value={ts2.tileBg || '#111111'} onChange={(v: string) => updateTs('tileBg', v)} />
        </div>
        <p className="text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2">
          Set "Image Padding" to 0 and "Default Tile BG" to match section background to remove the polaroid frame border.
        </p>
      </div>

      {/* Individual tiles */}
      <div className="space-y-3">
        {tiles.map((tile: any, i: number) => (
          <div key={i} className="border rounded-2xl bg-white overflow-hidden">
            <div className="flex items-center gap-3 p-3 bg-gray-50 border-b">
              {tile.image && <img src={tile.image} alt="" className="w-12 h-12 object-cover rounded-lg border shrink-0" loading="lazy" />}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate">{tile.bottomText?.text || `Tile ${i + 1}`}</p>
                <p className="text-xs text-gray-400 truncate">{tile.link}</p>
              </div>
              <label className="flex items-center gap-1.5 cursor-pointer shrink-0">
                <input type="checkbox" checked={tile.enabled !== false} onChange={e => updateTile(i, 'enabled', e.target.checked)} className="w-3.5 h-3.5 accent-orange-500" />
                <span className="text-xs font-semibold">On</span>
              </label>
              <button onClick={() => removeTile(i)} className="text-red-400 hover:text-red-600 shrink-0"><Trash2 size={13} /></button>
            </div>
            <div className="p-3 grid sm:grid-cols-2 gap-3">
              <ImgUploadInp label="Image URL" value={tile.image} onChange={(v: string) => updateTile(i, 'image', v)} placeholder="https://..." />
              <Inp label="Video URL (optional)" value={tile.video || ''} onChange={(v: string) => updateTile(i, 'video', v)} placeholder="https://..." />
              <Inp label="Label Text" value={tile.bottomText?.text || ''} onChange={(v: string) => updateTileBt(i, 'text', v)} placeholder="PROTEIN" />
              <Inp label="Link (URL)" value={tile.link} onChange={(v: string) => updateTile(i, 'link', v)} placeholder="/products?category=Protein" />
              <ColorPick label="Bottom Bar Color" value={tile.bottomColor} onChange={(v: string) => updateTile(i, 'bottomColor', v)} />
              <ColorPick label="Tile Background" value={tile.bgColor || '#111111'} onChange={(v: string) => updateTile(i, 'bgColor', v)} />
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">Label Font Size (px)</label>
                <input type="number" value={tile.bottomText?.desktopSize || 14} onChange={e => updateTileBt(i, 'desktopSize', Number(e.target.value))}
                  className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">Label Color</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={tile.bottomText?.color || '#000'} onChange={e => updateTileBt(i, 'color', e.target.value)} className="w-9 h-9 rounded-lg border cursor-pointer p-0.5" />
                  <input type="text" value={tile.bottomText?.color || '#000'} onChange={e => updateTileBt(i, 'color', e.target.value)} className="flex-1 border rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-orange-400" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <button onClick={addTile} className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-orange-400 hover:text-orange-500 w-full justify-center text-sm font-semibold transition">
        <Plus size={14} /> Add Tile
      </button>
    </div>
  );
}

// ─── Banner Section Editor ───────────────────────────────────────────────────

function BannerEditor({ sec, onChange }: { sec: any; onChange: (s: any) => void }) {
  const b = sec.banner || {};
  const upd = (k: string, v: any) => onChange({ ...sec, banner: { ...b, [k]: v } });
  return (
    <div className="space-y-3 p-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <ImgUploadInp label="Desktop Image URL" value={b.image || sec.image || ''} onChange={(v: string) => upd('image', v)} placeholder="https://..." />
        <ImgUploadInp label="Mobile Image URL (optional)" value={b.mobileImage || ''} onChange={(v: string) => upd('mobileImage', v)} placeholder="https://..." />
        <Inp label="Video URL (optional)" value={b.video || ''} onChange={(v: string) => upd('video', v)} placeholder="https://... (mp4)" />
        <Inp label="Click Link" value={b.link || ''} onChange={(v: string) => upd('link', v)} placeholder="/products" />
        <div>
          <label className="text-xs font-bold text-gray-500 block mb-1">Image Fit</label>
          <select value={b.imageFit || 'cover'} onChange={e => upd('imageFit', e.target.value)}
            className="w-full border rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-orange-400">
            {['cover','contain','fill','none'].map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <Inp label="Aspect Ratio" value={b.aspectRatio || 'auto'} onChange={(v: string) => upd('aspectRatio', v)} placeholder="auto or 16/5" />
      </div>
      {(b.image || sec.image) && (
        <img src={b.image || sec.image} alt="" className="w-full h-32 object-cover rounded-xl border" loading="lazy" />
      )}
    </div>
  );
}

// ─── Section Card ─────────────────────────────────────────────────────────────

const TYPE_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  heroSlider:       { label: 'Hero Slider / Banner',   icon: <Image size={15} />,  color: 'bg-purple-100 text-purple-600' },
  goalTiles:        { label: 'Category Tiles',          icon: <LayoutGrid size={15} />,   color: 'bg-orange-100 text-orange-600' },
  banner:           { label: 'Image / Video Banner',    icon: <Image size={15} />,  color: 'bg-blue-100 text-blue-600' },
  featuredProducts: { label: 'Featured Products',       icon: <LayoutGrid size={15} />, color: 'bg-green-100 text-green-600' },
  reviews:          { label: 'Testimonials Marquee',    icon: <Video size={15} />,     color: 'bg-yellow-100 text-yellow-600' },
  testimonials:     { label: 'Testimonials Marquee',    icon: <Video size={15} />,     color: 'bg-yellow-100 text-yellow-600' },
  text:             { label: 'Text Block',              icon: <LayoutGrid size={15} />, color: 'bg-gray-100 text-gray-600' },
  trustbar:         { label: 'Trust Bar',               icon: <LayoutGrid size={15} />, color: 'bg-teal-100 text-teal-600' },
};

function SectionCard({ sec, onChange, onRemove, onMoveUp, onMoveDown, isFirst, isLast, selected, onToggleSelect }: any) {
  const [open, setOpen] = useState(false);
  const meta = TYPE_META[sec.type] || { label: sec.type, icon: <LayoutGrid size={15} />, color: 'bg-gray-100 text-gray-600' };
  return (
    <div className={`bg-white rounded-2xl border overflow-hidden ${selected ? 'border-orange-300 ring-2 ring-orange-200' : 'border-gray-100'}`}>
      <div className="flex items-center gap-3 p-4">
        <SelectCheckbox checked={selected} onChange={onToggleSelect} />
        <div className="flex flex-col gap-0.5 shrink-0">
          <button onClick={onMoveUp} disabled={isFirst} className="text-gray-300 hover:text-gray-600 disabled:opacity-20 text-xs leading-none">▲</button>
          <button onClick={onMoveDown} disabled={isLast} className="text-gray-300 hover:text-gray-600 disabled:opacity-20 text-xs leading-none">▼</button>
        </div>
        <div className={`p-2 rounded-lg shrink-0 ${meta.color}`}>{meta.icon}</div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm truncate">{sec.name || meta.label}</p>
          <p className="text-xs text-gray-400">{meta.label}</p>
        </div>
        <label className="flex items-center gap-2 cursor-pointer shrink-0">
          <input type="checkbox" checked={sec.enabled !== false} onChange={e => onChange({ ...sec, enabled: e.target.checked })} className="w-4 h-4 accent-orange-500" />
          <span className="text-xs font-semibold text-gray-600">{sec.enabled !== false ? <Eye size={13} className="text-green-500" /> : <EyeOff size={13} className="text-gray-400" />}</span>
        </label>
        {(sec.type === 'heroSlider' || sec.type === 'goalTiles' || sec.type === 'banner') && (
          <button onClick={() => setOpen(o => !o)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs border rounded-lg hover:bg-gray-50 font-semibold shrink-0">
            {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}{open ? 'Close' : 'Edit'}
          </button>
        )}
        <button onClick={onRemove} className="text-red-400 hover:text-red-600 shrink-0"><Trash2 size={15} /></button>
      </div>
      {open && (
        <div className="border-t border-gray-100 bg-gray-50">
          {sec.type === 'heroSlider' && <div className="p-4"><HeroSliderEditor sec={sec} onChange={onChange} /></div>}
          {sec.type === 'goalTiles'  && <div className="p-4"><TilesEditor sec={sec} onChange={onChange} /></div>}
          {sec.type === 'banner'     && <BannerEditor sec={sec} onChange={onChange} />}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function HomepageTab() {
  const [hp, setHp] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [addType, setAddType] = useState('banner');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    AdminAPI.get('/admin/homepage').then(r => setHp(r.data)).catch(() => setHp({ sections: [] }));
  }, []);

  const sections: any[] = hp?.sections || [];
  const setSections = (newSecs: any[]) => setHp((h: any) => ({ ...h, sections: newSecs }));

  const save = async () => {
    setSaving(true);
    try {
      const ordered = sections.map((s, i) => ({ ...s, order: i }));
      await AdminAPI.put('/admin/homepage', { sections: ordered });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch { alert('Save failed'); }
    setSaving(false);
  };

  const addSection = () => {
    const base: any = { enabled: true, order: sections.length, name: addType === 'banner' ? 'New Banner' : addType === 'goalTiles' ? 'Category Tiles' : addType };
    if (addType === 'banner') Object.assign(base, { type: 'banner', bgColor: '#ffffff', banner: { image: '', link: '' } });
    if (addType === 'goalTiles') Object.assign(base, { type: 'goalTiles', bgColor: '#ffffff', tileSettings: { desktopTileWidth: 250, desktopTileHeight: 220, radius: 14, tileBottomColor: '#58b385', tileBg: '#111111', imagePadding: 10, gridGap: 38, tileBottomHeight: 34 }, tiles: [], heading: { text: 'Shop by Category', desktopSize: 28, weight: '700', color: '#111', align: 'center' } });
    if (addType === 'heroSlider') Object.assign(base, { type: 'heroSlider', bgColor: '#000', heroSettings: { slideSpeed: 4000, animationStyle: 'slide', aspectRatio: '1920 / 600', showDots: true, showArrows: true }, slides: [] });
    setSections([...sections, base]);
  };

  const removeSection = (i: number) => setSections(sections.filter((_, idx) => idx !== i));
  const updateSection = (i: number, updated: any) => setSections(sections.map((s, idx) => idx === i ? updated : s));
  const moveUp = (i: number) => { if (i === 0) return; const n = [...sections]; [n[i-1], n[i]] = [n[i], n[i-1]]; setSections(n); };
  const moveDown = (i: number) => { if (i === sections.length-1) return; const n = [...sections]; [n[i], n[i+1]] = [n[i+1], n[i]]; setSections(n); };

  if (!hp) return <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse" />)}</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <TabHelp topic="homepage" />
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-black">Homepage Builder</h2><p className="text-sm text-gray-500">Manage sections, banners, tiles, and hero slider</p></div>
        <button onClick={save} disabled={saving}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition ${saved ? 'bg-green-500 text-white' : 'bg-orange-500 text-white hover:bg-orange-600'} disabled:opacity-50`}>
          <Save size={15} />{saved ? 'Saved!' : saving ? 'Saving...' : 'Save Homepage'}
        </button>
      </div>

      <div className="space-y-3">
        {sections.length === 0 && (
          <div className="text-center py-12 text-gray-400 border-2 border-dashed rounded-2xl">
            <LayoutGrid size={32} className="mx-auto mb-3 opacity-30" />
            <p className="font-semibold">No sections yet. Add your first one below.</p>
          </div>
        )}
        {sections.length > 0 && (
          <>
            <BulkActionBar
              count={selected.size}
              ids={Array.from(selected)}
              onClear={() => setSelected(new Set())}
              actions={[
                { key: 'enable', label: 'Enable', color: 'bg-green-600 hover:bg-green-700', run: async (ids) => { setSections(sections.map((s, i) => ids.includes(String(i)) ? { ...s, enabled: true } : s)); setSelected(new Set()); } },
                { key: 'disable', label: 'Disable', color: 'bg-yellow-600 hover:bg-yellow-700', run: async (ids) => { setSections(sections.map((s, i) => ids.includes(String(i)) ? { ...s, enabled: false } : s)); setSelected(new Set()); } },
                { key: 'del', label: 'Delete', color: 'bg-red-600 hover:bg-red-700', confirm: 'Delete {n} section(s)? Remember to Save.', run: async (ids) => { setSections(sections.filter((_, i) => !ids.includes(String(i)))); setSelected(new Set()); } },
              ]}
            />
            <label className="flex items-center gap-2 text-xs font-bold text-gray-500 px-2">
              <input type="checkbox" className="w-3.5 h-3.5 accent-orange-500"
                checked={selected.size === sections.length && sections.length > 0}
                ref={el => { if (el) el.indeterminate = selected.size > 0 && selected.size < sections.length; }}
                onChange={() => setSelected(selected.size === sections.length ? new Set() : new Set(sections.map((_, i) => String(i))))} />
              Select all ({sections.length}) — changes apply after Save
            </label>
          </>
        )}
        {sections.map((sec, i) => (
          <SectionCard key={sec._id || i} sec={sec}
            onChange={(updated: any) => updateSection(i, updated)}
            onRemove={() => removeSection(i)}
            onMoveUp={() => moveUp(i)} onMoveDown={() => moveDown(i)}
            isFirst={i === 0} isLast={i === sections.length - 1}
            selected={selected.has(String(i))}
            onToggleSelect={() => { const n = new Set(selected); n.has(String(i)) ? n.delete(String(i)) : n.add(String(i)); setSelected(n); }} />
        ))}
      </div>

      <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border-2 border-dashed border-gray-200">
        <select value={addType} onChange={e => setAddType(e.target.value)}
          className="flex-1 border rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-orange-400">
          <option value="heroSlider">Hero Slider / Banner Slideshow</option>
          <option value="banner">Single Image / Video Banner</option>
          <option value="goalTiles">Category Tiles Grid</option>
        </select>
        <button onClick={addSection}
          className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 text-white rounded-xl font-bold text-sm hover:bg-orange-600 transition shrink-0">
          <Plus size={15} /> Add Section
        </button>
      </div>

      <div className="bg-blue-50 rounded-xl p-4 text-xs text-blue-700 space-y-1">
        <p><strong>Tiles without black border:</strong> Set "Image Padding" to 0 and "Default Tile BG" to match your section background color.</p>
        <p><strong>Multiple banners:</strong> Add as many "Single Image / Video Banner" sections as you want — place them anywhere in the order.</p>
        <p><strong>Testimonials scroll</strong> automatically right-to-left as a marquee on the homepage.</p>
      </div>
    </div>
  );
}
