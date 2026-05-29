import { useState, useEffect, useRef } from 'react';
import {
  Box, ChevronDown, Edit2, Eye, EyeOff, LayoutDashboard,
  Lock, LogOut, Package, Pin, Plus, Search, ShoppingCart,
  Star, Tag, Trash2, X, MessageSquare, BadgeCheck, Camera,
  PlayCircle, User, Palette, Bell, Settings, Globe, Menu,
  PanelBottom, Layout, List, Zap, Image, ArrowUp, ArrowDown,
  Upload, Link2, Video, BookOpen, Layers, Ruler, Save, HelpCircle, Mail, FileText, Truck, Users, CreditCard, Send, RotateCcw, TrendingUp, Gift, MessageCircle, Award, Share2, Briefcase,
  Copy, MoreVertical, ExternalLink, Check, Sparkles, ShieldCheck, Activity
} from 'lucide-react';
import UsersTab from './tabs/UsersTab';
import Customer360Tab from './tabs/Customer360Tab';
import LiveOrderToaster from '@/components/admin/LiveOrderToaster';
import { useSimpleUpload } from '@/lib/useSimpleUpload';
import axios from 'axios';
import { formatPrice, calculateDiscount } from '@/lib/utils';
import SiteTab from './tabs/SiteTab';
import AboutTab from './tabs/AboutTab';
import NavigationTab from './tabs/NavigationTab';
import HomepageTab from './tabs/HomepageTab';
import FooterTab from './tabs/FooterTab';
import CouponsTab from './tabs/CouponsTab';
import NotificationsTab from './tabs/NotificationsTab';
import CommunicationsTab from './tabs/CommunicationsTab';
import MessagingTab from './tabs/MessagingTab';
import MailSystemTab from './tabs/MailSystemTab';
import PopupsTab from './tabs/PopupsTab';
import DimensionsTab from './tabs/DimensionsTab';
import BlogTab from './tabs/BlogTab';
import FAQTab from './tabs/FAQTab';
import GlobalReviewsTab from './tabs/GlobalReviewsTab';
import ContactTab from './tabs/ContactTab';
import AITab from './tabs/AITab';
import ShippingTab from './tabs/ShippingTab';
import AutomationTab from './tabs/AutomationTab';
import ReconciliationTab from './tabs/ReconciliationTab';
import MarketingSeoTab from './tabs/MarketingSeoTab';
import SeoCommandTab from './tabs/SeoCommandTab';
import ReturnsTab from './tabs/ReturnsTab';
import OrderModifyTab from './tabs/OrderModifyTab';
import SubscriptionsTab from './tabs/SubscriptionsTab';
import CampaignsTab from './tabs/CampaignsTab';
import GiftCardsTab from './tabs/GiftCardsTab';
import ChatbotTab from './tabs/ChatbotTab';
import LoyaltyTab from './tabs/LoyaltyTab';
import ReferralsTab from './tabs/ReferralsTab';
import WholesaleTab from './tabs/WholesaleTab';
import ProductQATab from './tabs/ProductQATab';

import OffersTab from './tabs/OffersTab';
import PagesTab from './tabs/PagesTab';
import SiteMapTab from './tabs/SiteMapTab';
import PaymentGatewaysTab from './tabs/PaymentGatewaysTab';
import WalletTab from './tabs/WalletTab';
import AnalyticsTab from './tabs/CustomAnalyticsTab';
import DashboardTab from './tabs/DashboardTab';
import BulkImportTab from './tabs/BulkImportTab';
import ReviewsModerationTab from './tabs/ReviewsModerationTab';
import AbandonedCartsTab from './tabs/AbandonedCartsTab';
import InventoryTab from './tabs/InventoryTab';
import AccountingTab from './tabs/AccountingTab';
import CategoriesTab from './tabs/CategoriesTab';
import BrandsTab from './tabs/BrandsTab';
import FlavorsTab from './tabs/FlavorsTab';
import SizesTab from './tabs/SizesTab';
import SecurityTab from './tabs/SecurityTab';
import ProductAuthTab from './tabs/ProductAuthTab';
import SeoDebugTab from './tabs/SeoDebugTab';
import AuditLogTab from './tabs/AuditLogTab';
import SupportInboxTab from './tabs/SupportInboxTab';
import BackupExportTab from './tabs/BackupExportTab';
import RoasDashboardTab from './tabs/RoasDashboardTab';
import OrderBulkOpsTab from './tabs/OrderBulkOpsTab';
import AbExperimentsTab from './tabs/AbExperimentsTab';
import AdminHealthTab from './tabs/AdminHealthTab';
import SuperAdminTab from './tabs/SuperAdminTab';
import PageBackgroundsTab from './tabs/PageBackgroundsTab';
import WhatsAppChannelsTab from './tabs/WhatsAppChannelsTab';
import UrgencyWidgetsTab from './tabs/UrgencyWidgetsTab';
import QuickCheckoutTab from './tabs/QuickCheckoutTab';
import VariantsProTab from './tabs/VariantsProTab';
import VerificationTab from './tabs/VerificationTab';
import GrowthBoostersTab from './tabs/GrowthBoostersTab';
import VideoSectionsTab from './tabs/VideoSectionsTab';

import VariantsManager, { syncVariantsToDb, variantsToJson, type VariantRow } from './components/VariantsManager';
import { useCategoryNames } from '@/hooks/useCategories';
import { useAuthStore } from '@/store/authStore';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { TAB_PERMISSIONS, TAB_PERMISSION_META } from './tab-permissions';
import { syncTabPermissions } from '@/lib/permissions.functions';
import { useServerFn } from '@tanstack/react-start';
import { Crown, Flame } from 'lucide-react';

const TOKEN_KEY = 'np_admin_token';

const AdminAPI = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });
AdminAPI.interceptors.request.use(config => {
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (token) config.headers['x-admin-token'] = token;
  return config;
});

type Tab = 'dashboard' | 'analytics' | 'products' | 'productauth' | 'categories' | 'brands' | 'flavors' | 'sizes' | 'bulkimport' | 'inventory' | 'accounting' | 'orders' | 'abandoned' | 'subscriptions' | 'campaigns' | 'giftcards' | 'chatbot' | 'loyalty' | 'referrals' | 'wholesale' | 'productqa' | 'settings' | 'site' | 'about' | 'navigation' | 'homepage' | 'footer' | 'coupons' | 'offers' | 'notifications' | 'communications' | 'messaging' | 'mailsystem' | 'popups' | 'dimensions' | 'blog' | 'faq' | 'reviews' | 'reviewmod' | 'contact' | 'ai' | 'shipping' | 'automation' | 'reconciliation' | 'returns' | 'ordermodify' | 'users' | 'customer360' | 'pages' | 'sitemap' | 'payments' | 'wallet' | 'security' | 'marketing' | 'seocommand' | 'seodebug' | 'auditlog' | 'support' | 'backup' | 'roas' | 'bulkorders' | 'experiments' | 'health' | 'superadmin' | 'backgrounds' | 'whatsapp_channels' | 'urgency' | 'quick_checkout' | 'variants_pro' | 'verification' | 'growth_boosters' | 'videosections';
type ModalTab = 'details' | 'reviews';
type ProductSubTab = 'basic' | 'variants' | 'media' | 'content' | 'benefits' | 'shipping' | 'seo' | 'pixels';

const FALLBACK_CATEGORIES = ['Protein', 'Creatine', 'Pre-Workout', 'Mass Gainer', 'Vitamins', 'BCAA', 'Fat Burner'];

function toSlug(name: string) { return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

// ─── Helper UI ───────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-start gap-4">
      <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center shrink-0`}>{icon}</div>
      <div><p className="text-2xl font-black">{value}</p><p className="text-sm text-gray-500">{label}</p>{sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}</div>
    </div>
  );
}

function VideoPreview({ url }: { url: string }) {
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/);
  const vmMatch = url.match(/vimeo\.com\/(\d+)/);
  if (ytMatch) return <iframe src={`https://www.youtube.com/embed/${ytMatch[1]}`} className="w-full aspect-video rounded-lg" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />;
  if (vmMatch) return <iframe src={`https://player.vimeo.com/video/${vmMatch[1]}`} className="w-full aspect-video rounded-lg" allowFullScreen />;
  return <video src={url} controls playsInline className="w-full rounded-lg max-h-48" />;
}

// ─── Upload Components ────────────────────────────────────────────────────────

function ImageRowUploader({ value, index, isFirst, isLast, onUpdate, onRemove, onMoveUp, onMoveDown }: {
  value: string; index: number; isFirst: boolean; isLast: boolean;
  onUpdate: (url: string) => void; onRemove: () => void;
  onMoveUp: () => void; onMoveDown: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const { uploadFile, isUploading, progress } = useSimpleUpload({ onSuccess: (url: string) => onUpdate(url) });
  return (
    <div className="flex items-center gap-2 group">
      <div className="w-12 h-12 rounded-lg bg-gray-100 border border-gray-200 flex-shrink-0 overflow-hidden flex items-center justify-center">
        {value ? (
          <img src={value} alt="" className="w-full h-full object-cover" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
        ) : (
          <Image size={16} className="text-gray-300" />
        )}
      </div>
      <div className="flex-1 relative">
        <input value={value} onChange={e => onUpdate(e.target.value)} placeholder="https://..."
          className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400 transition" />
        {isFirst && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded-full border border-orange-200 pointer-events-none">PRIMARY</span>
        )}
      </div>
      {isUploading ? (
        <div className="w-16 text-center shrink-0">
          <div className="text-[10px] text-gray-400 font-bold">{progress}%</div>
          <div className="w-full bg-gray-100 rounded-full h-1 mt-0.5"><div className="bg-orange-400 h-1 rounded-full" style={{ width: `${progress}%` }} /></div>
        </div>
      ) : (
        <button type="button" onClick={() => fileRef.current?.click()}
          className="shrink-0 px-2 py-1.5 bg-gray-50 hover:bg-orange-50 text-gray-400 hover:text-orange-500 rounded-lg border border-gray-200 text-[11px] font-bold flex items-center gap-1 transition">
          <Upload size={12} /> Upload
        </button>
      )}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={async e => {
        const f = e.target.files?.[0]; if (!f || !f.type.startsWith('image/')) return;
        await uploadFile(f); if (fileRef.current) fileRef.current.value = '';
      }} />
      <div className="flex flex-col gap-0.5 flex-shrink-0">
        <button type="button" onClick={onMoveUp} disabled={isFirst} className="p-1 text-gray-300 hover:text-gray-600 disabled:opacity-20 transition"><ArrowUp size={12} /></button>
        <button type="button" onClick={onMoveDown} disabled={isLast} className="p-1 text-gray-300 hover:text-gray-600 disabled:opacity-20 transition"><ArrowDown size={12} /></button>
      </div>
      <button type="button" onClick={onRemove} className="p-1.5 text-gray-300 hover:text-red-400 transition flex-shrink-0"><Trash2 size={14} /></button>
    </div>
  );
}

function AddImageRow({ onAdd }: { onAdd: (url: string) => void }) {
  const [newUrl, setNewUrl] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const { uploadFile, isUploading, progress } = useSimpleUpload({ onSuccess: (url: string) => onAdd(url) });
  const addUrl = () => { const url = newUrl.trim(); if (!url) return; onAdd(url); setNewUrl(''); };
  return (
    <div className="flex gap-2 mt-1 flex-wrap">
      <input value={newUrl} onChange={e => setNewUrl(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addUrl())}
        placeholder="Paste image URL and press Enter or click +"
        className="flex-1 min-w-40 border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400 transition" />
      <button type="button" onClick={addUrl}
        className="px-3 py-2 bg-orange-500 text-white rounded-xl text-xs font-bold hover:bg-orange-600 transition flex items-center gap-1">
        <Plus size={14} /> Add
      </button>
      {isUploading ? (
        <div className="px-3 flex items-center text-xs text-gray-400 font-bold">{progress}%</div>
      ) : (
        <button type="button" onClick={() => fileRef.current?.click()}
          className="px-3 py-2 bg-gray-100 hover:bg-orange-50 text-gray-500 hover:text-orange-500 rounded-xl text-xs font-bold border border-gray-200 flex items-center gap-1 transition">
          <Upload size={14} /> Upload Image
        </button>
      )}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={async e => {
        const f = e.target.files?.[0]; if (!f || !f.type.startsWith('image/')) return;
        await uploadFile(f); if (fileRef.current) fileRef.current.value = '';
      }} />
    </div>
  );
}

function AvatarUploader({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const { uploadFile, isUploading, progress } = useSimpleUpload({ onSuccess: (url: string) => onChange(url) });
  return (
    <div className="flex gap-2 items-center">
      {value && <img src={value} alt="" className="w-9 h-9 rounded-full object-cover border shrink-0" />}
      <input value={value} onChange={e => onChange(e.target.value)} placeholder="https://..."
        className="flex-1 border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400" />
      {isUploading ? (
        <div className="px-2 py-2.5 text-xs text-gray-400 font-bold shrink-0">{progress}%</div>
      ) : (
        <button type="button" onClick={() => fileRef.current?.click()}
          className="shrink-0 px-3 py-2.5 bg-gray-100 hover:bg-orange-50 text-gray-500 hover:text-orange-500 rounded-xl text-xs font-bold border border-gray-200 flex items-center gap-1 transition">
          <Upload size={13} /> Upload
        </button>
      )}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={async e => {
        const f = e.target.files?.[0]; if (!f) return; await uploadFile(f); if (fileRef.current) fileRef.current.value = '';
      }} />
    </div>
  );
}

function ReviewPhotosUploader({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const { uploadFile, isUploading, progress } = useSimpleUpload({
    onSuccess: (url: string) => {
      const existing = value ? value.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
      onChange([...existing, url].join(', '));
    },
  });
  const urls = value ? value.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
  const remove = (i: number) => onChange(urls.filter((_: string, idx: number) => idx !== i).join(', '));
  return (
    <div>
      <label className="text-xs font-bold text-gray-500 block mb-1 flex items-center gap-1"><Camera size={11} />Review Photos</label>
      {urls.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-2">
          {urls.map((url: string, i: number) => (
            <div key={i} className="relative group">
              <img src={url} alt="" className="w-14 h-14 object-cover rounded-lg border border-gray-200" />
              <button type="button" onClick={() => remove(i)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input value={value} onChange={e => onChange(e.target.value)} placeholder="https://img1.com, https://img2.com"
          className="flex-1 border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400" />
        {isUploading ? (
          <div className="px-2 text-xs text-gray-400 flex items-center font-bold">{progress}%</div>
        ) : (
          <button type="button" onClick={() => fileRef.current?.click()}
            className="shrink-0 px-3 py-2 bg-gray-100 hover:bg-orange-50 text-gray-500 hover:text-orange-500 rounded-xl text-xs font-bold border border-gray-200 flex items-center gap-1 transition">
            <Upload size={13} /> Upload
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={async e => {
          const files = Array.from(e.target.files || []);
          for (const f of files) { if (f.type.startsWith('image/')) await uploadFile(f); }
          if (fileRef.current) fileRef.current.value = '';
        }} />
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
        {value && <img src={value} alt="" className="w-9 h-9 rounded-lg object-cover border shrink-0" />}
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

// ─── Gallery Manager ─────────────────────────────────────────────────────────

function ImageGalleryManager({ images, onChange }: { images: string[]; onChange: (imgs: string[]) => void }) {
  const list: string[] = Array.isArray(images) ? images : [];
  const add = (url: string) => onChange([...list, url]);
  const remove = (i: number) => onChange(list.filter((_, idx) => idx !== i));
  const moveUp = (i: number) => { if (i === 0) return; const next = [...list]; [next[i - 1], next[i]] = [next[i], next[i - 1]]; onChange(next); };
  const moveDown = (i: number) => { if (i === list.length - 1) return; const next = [...list]; [next[i], next[i + 1]] = [next[i + 1], next[i]]; onChange(next); };
  const updateUrl = (i: number, val: string) => { const next = [...list]; next[i] = val; onChange(next); };
  return (
    <div className="space-y-2">
      <label className="text-xs font-bold text-gray-500 block">Product Images</label>
      {list.map((url, i) => (
        <ImageRowUploader key={i} value={url} index={i} isFirst={i === 0} isLast={i === list.length - 1}
          onUpdate={val => updateUrl(i, val)} onRemove={() => remove(i)}
          onMoveUp={() => moveUp(i)} onMoveDown={() => moveDown(i)} />
      ))}
      {list.filter(Boolean).length > 1 && (
        <div className="flex gap-2 mt-1 flex-wrap">
          {list.filter(Boolean).map((url, i) => (
            <div key={i} className={`w-10 h-10 rounded-lg overflow-hidden border-2 ${i === 0 ? 'border-orange-400' : 'border-gray-200'}`}>
              <img src={url} alt="" className="w-full h-full object-cover" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
            </div>
          ))}
          <p className="text-xs text-gray-400 self-center ml-1">↑ First image = primary</p>
        </div>
      )}
      <AddImageRow onAdd={add} />
      <p className="text-xs text-gray-400">First image is primary (shown in listings). Add up to 6 for gallery.</p>
    </div>
  );
}

// ─── Video Manager ────────────────────────────────────────────────────────────

function VideoManager({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const [mode, setMode] = useState<'link' | 'upload'>('link');
  const fileRef = useRef<HTMLInputElement>(null);
  const { uploadFile, isUploading, progress } = useSimpleUpload({ onSuccess: (url: string) => onChange(url) });
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('video/')) return alert('Please select a video file');
    if (file.size > 200 * 1024 * 1024) return alert('Video must be under 200 MB');
    await uploadFile(file);
    if (fileRef.current) fileRef.current.value = '';
  };
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Video size={14} className="text-orange-500" />
        <label className="text-xs font-bold text-gray-500">Product Video</label>
        {value && <button type="button" onClick={() => onChange('')} className="ml-auto text-xs text-red-400 hover:text-red-600 flex items-center gap-1"><Trash2 size={11} /> Remove</button>}
      </div>
      <div className="flex rounded-xl border border-gray-200 overflow-hidden text-xs font-bold w-fit">
        <button type="button" onClick={() => setMode('link')} className={`flex items-center gap-1.5 px-3 py-2 transition ${mode === 'link' ? 'bg-orange-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}><Link2 size={12} /> Link</button>
        <button type="button" onClick={() => setMode('upload')} className={`flex items-center gap-1.5 px-3 py-2 transition ${mode === 'upload' ? 'bg-orange-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}><Upload size={12} /> Upload</button>
      </div>
      {mode === 'link' ? (
        <input value={value} onChange={e => onChange(e.target.value)} placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
          className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400 transition" />
      ) : (
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center">
          {isUploading ? (
            <div className="space-y-2">
              <div className="w-full bg-gray-100 rounded-full h-2"><div className="bg-orange-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} /></div>
              <p className="text-xs text-gray-500">Uploading… {progress}%</p>
            </div>
          ) : (
            <>
              <Upload size={20} className="mx-auto text-gray-300 mb-2" />
              <p className="text-xs text-gray-500 mb-2">MP4, MOV, WebM — max 200 MB</p>
              <button type="button" onClick={() => fileRef.current?.click()} className="px-4 py-2 bg-orange-500 text-white rounded-xl text-xs font-bold hover:bg-orange-600 transition">Choose Video File</button>
              <input ref={fileRef} type="file" accept="video/*" onChange={handleFile} className="hidden" />
            </>
          )}
        </div>
      )}
      {value && <div className="rounded-xl overflow-hidden border border-gray-100 bg-gray-50 p-1"><VideoPreview url={value} /></div>}
      <p className="text-xs text-gray-400">Paste a YouTube/Vimeo link or upload a file. Video appears in the product gallery.</p>
    </div>
  );
}

// ─── Banner Editor ────────────────────────────────────────────────────────────

function BannerEditor({ banners, onChange }: { banners: any[]; onChange: (b: any[]) => void }) {
  const list = Array.isArray(banners) ? banners : [];
  const add = () => onChange([...list, { image: '', mobileImage: '', link: '', position: 'below_atc', enabled: true }]);
  const remove = (i: number) => onChange(list.filter((_, idx) => idx !== i));
  const update = (i: number, k: string, v: any) => onChange(list.map((b, idx) => idx === i ? { ...b, [k]: v } : b));
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-gray-500">Product Page Banners</label>
        <button type="button" onClick={add} className="text-xs text-orange-500 font-bold flex items-center gap-1 hover:text-orange-600"><Plus size={12} /> Add Banner</button>
      </div>
      {list.length === 0 && <p className="text-xs text-gray-400 bg-gray-50 rounded-xl p-3">No banners added. Banners appear on the product page in the position you choose.</p>}
      {list.map((b, i) => (
        <div key={i} className="border border-gray-200 rounded-xl p-3 space-y-2 bg-gray-50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-600">Banner {i + 1}</span>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                <input type="checkbox" checked={b.enabled !== false} onChange={e => update(i, 'enabled', e.target.checked)} className="w-3.5 h-3.5 accent-orange-500" />
                <span className="font-semibold">Active</span>
              </label>
              <button type="button" onClick={() => remove(i)} className="text-red-400 hover:text-red-600"><Trash2 size={13} /></button>
            </div>
          </div>
          <ImgUploadInp label="Desktop Image" value={b.image} onChange={(v: string) => update(i, 'image', v)} placeholder="https://..." />
          <ImgUploadInp label="Mobile Image (optional)" value={b.mobileImage} onChange={(v: string) => update(i, 'mobileImage', v)} placeholder="https://..." />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">Position</label>
              <select value={b.position || 'below_atc'} onChange={e => update(i, 'position', e.target.value)} className="w-full border rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-orange-400">
                <option value="above_gallery">Above Gallery (top of page)</option>
                <option value="below_atc">Below Buy Button</option>
                <option value="after_certifications">After Certifications</option>
                <option value="before_reviews">Before Reviews</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">Click Link (optional)</label>
              <input value={b.link || ''} onChange={e => update(i, 'link', e.target.value)} placeholder="/products or https://..." className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Benefits / Nutrition / Q&A Editors ──────────────────────────────────────

function KeyBenefitsEditor({ value, onChange }: { value: any[]; onChange: (v: any[]) => void }) {
  const list = Array.isArray(value) ? value : [];
  const add = () => onChange([...list, { icon: '💪', title: '', desc: '' }]);
  const remove = (i: number) => onChange(list.filter((_, idx) => idx !== i));
  const update = (i: number, k: string, v: string) => onChange(list.map((b, idx) => idx === i ? { ...b, [k]: v } : b));
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-gray-500">Key Benefits</label>
        <button type="button" onClick={add} className="text-xs text-orange-500 font-bold flex items-center gap-1"><Plus size={12} /> Add</button>
      </div>
      {list.map((b, i) => (
        <div key={i} className="flex items-start gap-2 p-2 border border-gray-100 rounded-xl">
          <input value={b.icon || ''} onChange={e => update(i, 'icon', e.target.value)} className="w-12 border rounded-xl px-2 py-2 text-center text-lg focus:outline-none" placeholder="💪" />
          <div className="flex-1 space-y-1">
            <input value={b.title || ''} onChange={e => update(i, 'title', e.target.value)} placeholder="Benefit title" className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400" />
            <input value={b.desc || ''} onChange={e => update(i, 'desc', e.target.value)} placeholder="Short description" className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400" />
          </div>
          <button type="button" onClick={() => remove(i)} className="p-1.5 text-gray-300 hover:text-red-400 mt-1"><Trash2 size={13} /></button>
        </div>
      ))}
      {list.length === 0 && <p className="text-xs text-gray-400 bg-gray-50 rounded-xl p-3">No key benefits added. These show as scrollable pills on the product page.</p>}
    </div>
  );
}

function NutritionHighlightsEditor({ value, onChange }: { value: any[]; onChange: (v: any[]) => void }) {
  const list = Array.isArray(value) ? value : [];
  const add = () => onChange([...list, { value: '', label: '' }]);
  const remove = (i: number) => onChange(list.filter((_, idx) => idx !== i));
  const update = (i: number, k: string, v: string) => onChange(list.map((n, idx) => idx === i ? { ...n, [k]: v } : n));
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-gray-500">Nutrition Highlights (shown in black bar)</label>
        <button type="button" onClick={add} className="text-xs text-orange-500 font-bold flex items-center gap-1"><Plus size={12} /> Add</button>
      </div>
      {list.map((n, i) => (
        <div key={i} className="flex items-center gap-2">
          <input value={n.value || ''} onChange={e => update(i, 'value', e.target.value)} placeholder="25 g" className="w-28 border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400 font-bold text-center" />
          <input value={n.label || ''} onChange={e => update(i, 'label', e.target.value)} placeholder="Protein per serving" className="flex-1 border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400" />
          <button type="button" onClick={() => remove(i)} className="p-1.5 text-gray-300 hover:text-red-400"><Trash2 size={13} /></button>
        </div>
      ))}
      {list.length === 0 && <p className="text-xs text-gray-400 bg-gray-50 rounded-xl p-3">e.g. 25g Protein, 5.51g BCAA, 139 Kcal. Shows on the dark bar.</p>}
    </div>
  );
}

function NutritionFactsEditor({ value, onChange }: { value: any[]; onChange: (v: any[]) => void }) {
  const list = Array.isArray(value) ? value : [];
  const add = () => onChange([...list, { label: '', value: '' }]);
  const remove = (i: number) => onChange(list.filter((_, idx) => idx !== i));
  const update = (i: number, k: string, v: string) => onChange(list.map((n, idx) => idx === i ? { ...n, [k]: v } : n));
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-gray-500">Nutrition Facts Table</label>
        <button type="button" onClick={add} className="text-xs text-orange-500 font-bold flex items-center gap-1"><Plus size={12} /> Add Row</button>
      </div>
      {list.map((n, i) => (
        <div key={i} className="flex items-center gap-2">
          <input value={n.label || ''} onChange={e => update(i, 'label', e.target.value)} placeholder="Nutrient (e.g. Protein)" className="flex-1 border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400" />
          <input value={n.value || ''} onChange={e => update(i, 'value', e.target.value)} placeholder="Amount (e.g. 25g)" className="w-28 border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400 text-center" />
          <button type="button" onClick={() => remove(i)} className="p-1.5 text-gray-300 hover:text-red-400"><Trash2 size={13} /></button>
        </div>
      ))}
      {list.length === 0 && <p className="text-xs text-gray-400 bg-gray-50 rounded-xl p-3">Appears in the "Nutrition Facts" tab on the product page.</p>}
    </div>
  );
}

function QAEditor({ value, onChange }: { value: any[]; onChange: (v: any[]) => void }) {
  const list = Array.isArray(value) ? value : [];
  const add = () => onChange([...list, { question: '', answer: '' }]);
  const remove = (i: number) => onChange(list.filter((_, idx) => idx !== i));
  const update = (i: number, k: string, v: string) => onChange(list.map((qa, idx) => idx === i ? { ...qa, [k]: v } : qa));
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-gray-500">FAQ / Q&A</label>
        <button type="button" onClick={add} className="text-xs text-orange-500 font-bold flex items-center gap-1"><Plus size={12} /> Add Q&A</button>
      </div>
      {list.map((qa, i) => (
        <div key={i} className="p-3 border border-gray-100 rounded-xl space-y-2">
          <div className="flex items-start gap-2">
            <span className="text-xs font-black text-orange-500 mt-2.5 shrink-0">Q</span>
            <input value={qa.question || ''} onChange={e => update(i, 'question', e.target.value)} placeholder="Question" className="flex-1 border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400" />
            <button type="button" onClick={() => remove(i)} className="p-1.5 text-gray-300 hover:text-red-400 mt-0.5"><Trash2 size={13} /></button>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-xs font-black text-gray-400 mt-2.5 shrink-0">A</span>
            <textarea value={qa.answer || ''} onChange={e => update(i, 'answer', e.target.value)} placeholder="Answer" rows={2} className="flex-1 border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400 resize-none" />
          </div>
        </div>
      ))}
      {list.length === 0 && <p className="text-xs text-gray-400 bg-gray-50 rounded-xl p-3">FAQ items appear at the bottom of the product page.</p>}
    </div>
  );
}

// ─── Shipping Sub-tab ─────────────────────────────────────────────────────────

function ShippingSubTab({ form, set }: { form: any; set: (k: string, v: any) => void }) {
  const [dims, setDims] = useState<any[]>([]);
  const [boxes, setBoxes] = useState<any[]>([]);
  const [showAddDim, setShowAddDim] = useState(false);
  const [showAddBox, setShowAddBox] = useState(false);
  const [newDim, setNewDim] = useState({ name: '', length: 0, width: 0, height: 0, weight: 0 });
  const [newBox, setNewBox] = useState({ name: '', length: 0, width: 0, height: 0, deadWeight: 0, qtyOptions: '1,2,3' });

  useEffect(() => {
    AdminAPI.get('/admin/dimensions').then(r => setDims(r.data)).catch(() => {});
    AdminAPI.get('/admin/packaging-boxes').then(r => setBoxes(r.data)).catch(() => {});
  }, []);

  const addDim = async () => {
    if (!newDim.name) return;
    const { data } = await AdminAPI.post('/admin/dimensions', newDim);
    setDims(prev => [...prev, data]);
    set('dimensionId', data._id);
    set('weight', data.weight);
    setNewDim({ name: '', length: 0, width: 0, height: 0, weight: 0 });
    setShowAddDim(false);
  };

  const addBox = async () => {
    if (!newBox.name) return;
    const { data } = await AdminAPI.post('/admin/packaging-boxes', {
      ...newBox,
      qtyOptions: newBox.qtyOptions.split(',').map((s: string) => Number(s.trim())).filter(Boolean),
    });
    setBoxes(prev => [...prev, data]);
    set('packagingBoxId', data._id);
    setNewBox({ name: '', length: 0, width: 0, height: 0, deadWeight: 0, qtyOptions: '1,2,3' });
    setShowAddBox(false);
  };

  const selectedDim = dims.find(d => d._id === form.dimensionId);
  const selectedBox = boxes.find(b => b._id === form.packagingBoxId);

  const nf = (v: any, k: string, setter: any) => (e: React.ChangeEvent<HTMLInputElement>) => setter((p: any) => ({ ...p, [k]: Number(e.target.value) }));
  const sf = (v: any, k: string, setter: any) => (e: React.ChangeEvent<HTMLInputElement>) => setter((p: any) => ({ ...p, [k]: e.target.value }));

  return (
    <div className="space-y-6">
      {/* Dimension preset */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-bold text-gray-500">Product Dimension Preset</label>
          <button type="button" onClick={() => setShowAddDim(!showAddDim)} className="text-xs text-orange-500 font-bold flex items-center gap-1 hover:text-orange-600 transition">
            <Plus size={12} /> {showAddDim ? 'Cancel' : 'Add New Preset'}
          </button>
        </div>
        <select value={form.dimensionId || ''} onChange={e => {
          const dim = dims.find(d => d._id === e.target.value);
          set('dimensionId', e.target.value);
          if (dim) set('weight', dim.weight);
        }} className="w-full border rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-orange-400">
          <option value="">— Select dimension preset —</option>
          {dims.map(d => <option key={d._id} value={d._id}>{d.name} — {d.length}×{d.width}×{d.height} cm, {d.weight}g</option>)}
        </select>
        {selectedDim && <p className="text-xs text-gray-400 mt-1">L: {selectedDim.length}cm × W: {selectedDim.width}cm × H: {selectedDim.height}cm · Weight: {selectedDim.weight}g</p>}
        {showAddDim && (
          <div className="mt-2 p-3 bg-orange-50 rounded-xl border border-orange-100 space-y-2">
            <p className="text-xs font-bold text-orange-700">Add New Preset — saves to Dimensions page & selects it</p>
            <input value={newDim.name} onChange={sf(newDim, 'name', setNewDim)} placeholder="Name (e.g. 2kg Protein Bag)" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none" />
            <div className="grid grid-cols-4 gap-2">
              <input type="number" value={newDim.length || ''} onChange={nf(newDim, 'length', setNewDim)} placeholder="L cm" className="border rounded-lg px-2 py-2 text-sm focus:outline-none text-center" />
              <input type="number" value={newDim.width || ''} onChange={nf(newDim, 'width', setNewDim)} placeholder="W cm" className="border rounded-lg px-2 py-2 text-sm focus:outline-none text-center" />
              <input type="number" value={newDim.height || ''} onChange={nf(newDim, 'height', setNewDim)} placeholder="H cm" className="border rounded-lg px-2 py-2 text-sm focus:outline-none text-center" />
              <input type="number" value={newDim.weight || ''} onChange={nf(newDim, 'weight', setNewDim)} placeholder="Wt g" className="border rounded-lg px-2 py-2 text-sm focus:outline-none text-center" />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={addDim} className="px-4 py-1.5 bg-orange-500 text-white rounded-lg text-xs font-bold hover:bg-orange-600 transition">Save & Select</button>
              <button type="button" onClick={() => setShowAddDim(false)} className="px-4 py-1.5 bg-white border rounded-lg text-xs font-bold text-gray-500 hover:bg-gray-50">Cancel</button>
            </div>
          </div>
        )}
      </div>

      {/* Weight override */}
      <div>
        <label className="text-xs font-bold text-gray-500 block mb-1.5">Weight (grams) — auto-filled from preset, or override</label>
        <input type="number" value={form.weight || ''} onChange={e => set('weight', Number(e.target.value))} placeholder="e.g. 1200"
          className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400" />
      </div>

      {/* Packaging Box */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-bold text-gray-500">Packaging Box</label>
          <button type="button" onClick={() => setShowAddBox(!showAddBox)} className="text-xs text-orange-500 font-bold flex items-center gap-1 hover:text-orange-600 transition">
            <Plus size={12} /> {showAddBox ? 'Cancel' : 'Add New Box'}
          </button>
        </div>
        <select value={form.packagingBoxId || ''} onChange={e => set('packagingBoxId', e.target.value)}
          className="w-full border rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-orange-400">
          <option value="">— Select packaging box —</option>
          {boxes.map(b => <option key={b._id} value={b._id}>{b.name} — {b.length}×{b.width}×{b.height} cm · dead wt: {b.deadWeight}g · qty: {b.qtyOptions?.join(', ')}</option>)}
        </select>
        {selectedBox && <p className="text-xs text-gray-400 mt-1">Qty options: {selectedBox.qtyOptions?.join(', ')} unit(s) · Dead weight: {selectedBox.deadWeight}g</p>}
        {showAddBox && (
          <div className="mt-2 p-3 bg-orange-50 rounded-xl border border-orange-100 space-y-2">
            <p className="text-xs font-bold text-orange-700">Add New Box — saves to Packaging Boxes page & selects it</p>
            <input value={newBox.name} onChange={sf(newBox, 'name', setNewBox)} placeholder="Box name (e.g. Standard Box)" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none" />
            <div className="grid grid-cols-4 gap-2">
              <input type="number" value={newBox.length || ''} onChange={nf(newBox, 'length', setNewBox)} placeholder="L cm" className="border rounded-lg px-2 py-2 text-sm focus:outline-none text-center" />
              <input type="number" value={newBox.width || ''} onChange={nf(newBox, 'width', setNewBox)} placeholder="W cm" className="border rounded-lg px-2 py-2 text-sm focus:outline-none text-center" />
              <input type="number" value={newBox.height || ''} onChange={nf(newBox, 'height', setNewBox)} placeholder="H cm" className="border rounded-lg px-2 py-2 text-sm focus:outline-none text-center" />
              <input type="number" value={newBox.deadWeight || ''} onChange={nf(newBox, 'deadWeight', setNewBox)} placeholder="Wt g" className="border rounded-lg px-2 py-2 text-sm focus:outline-none text-center" />
            </div>
            <div>
              <input value={newBox.qtyOptions} onChange={sf(newBox, 'qtyOptions', setNewBox)} placeholder="Qty options: 1,2,3,4" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none" />
              <p className="text-xs text-gray-400 mt-0.5">How many product units fit in this box</p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={addBox} className="px-4 py-1.5 bg-orange-500 text-white rounded-lg text-xs font-bold hover:bg-orange-600 transition">Save & Select</button>
              <button type="button" onClick={() => setShowAddBox(false)} className="px-4 py-1.5 bg-white border rounded-lg text-xs font-bold text-gray-500 hover:bg-gray-50">Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Review Modal (Admin — fully manual) ────────────────────────────────────

const EMPTY_REVIEW = { name: '', avatar: '', rating: 5, title: '', comment: '', images: '', video: '', variant: '', verified: true, pinned: false, createdAt: '' };

function ReviewModal({ review, productId, onClose, onSave }: { review: any; productId: string; onClose: () => void; onSave: () => void }) {
  const [form, setForm] = useState(review ? {
    ...review,
    images: Array.isArray(review.images) ? review.images.join(', ') : review.images || '',
    createdAt: review.createdAt ? new Date(review.createdAt).toISOString().slice(0, 10) : '',
  } : { ...EMPTY_REVIEW });
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
      if (review?._id) {
        await AdminAPI.put(`/admin/products/${productId}/reviews/${review._id}`, payload);
      } else {
        await AdminAPI.post(`/admin/products/${productId}/reviews`, payload);
      }
      onSave();
      onClose();
    } catch { alert('Failed to save review'); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl my-8" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h3 className="font-black">{review?._id ? 'Edit Review' : 'Add Manual Review'}</h3>
            <p className="text-xs text-gray-400 mt-0.5">Admin-entered review — full manual control over all fields</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
        </div>
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">Customer Name *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">Display Picture (DP)</label>
              <AvatarUploader value={form.avatar} onChange={v => set('avatar', v)} />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">Rating</label>
              <select value={form.rating} onChange={e => set('rating', Number(e.target.value))} className="w-full border rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-orange-400">
                {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} Stars</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">Review Date</label>
              <input type="date" value={form.createdAt} onChange={e => set('createdAt', e.target.value)} className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-gray-500 block mb-1">Review Title</label>
              <input value={form.title} onChange={e => set('title', e.target.value)} className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-gray-500 block mb-1">Review Comment *</label>
              <textarea value={form.comment} onChange={e => set('comment', e.target.value)} rows={4} className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400 resize-none" />
            </div>
            <div className="sm:col-span-2">
              <ReviewPhotosUploader value={form.images} onChange={v => set('images', v)} />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-gray-500 block mb-1"><PlayCircle size={11} className="inline mr-1" />Video URL</label>
              <input value={form.video} onChange={e => set('video', e.target.value)} placeholder="https://youtube.com/..." className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">Variant</label>
              <input value={form.variant} onChange={e => set('variant', e.target.value)} placeholder="e.g. Chocolate, 1 kg" className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400" />
            </div>
            <div className="flex flex-col gap-3 justify-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.verified} onChange={e => set('verified', e.target.checked)} className="w-4 h-4 accent-orange-500" />
                <span className="text-sm font-semibold flex items-center gap-1"><BadgeCheck size={14} className="text-emerald-500" /> Verified Buyer</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.pinned} onChange={e => set('pinned', e.target.checked)} className="w-4 h-4 accent-orange-500" />
                <span className="text-sm font-semibold flex items-center gap-1"><Pin size={14} className="text-orange-500" /> Pin to top</span>
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

// ─── Reviews Tab ─────────────────────────────────────────────────────────────

function ReviewsTab({ product, onReviewsChanged }: { product: any; onReviewsChanged: () => void }) {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewModal, setReviewModal] = useState<{ open: boolean; review: any }>({ open: false, review: null });

  const loadReviews = async () => {
    if (!product?._id) return;
    try {
      const { data } = await AdminAPI.get(`/admin/products/${product._id}/reviews`);
      setReviews(data);
    } catch { setReviews(product.reviews || []); }
    setLoading(false);
  };

  useEffect(() => { loadReviews(); }, [product?._id]);

  const deleteReview = async (rid: string) => {
    if (!confirm('Delete this review?')) return;
    await AdminAPI.delete(`/admin/products/${product._id}/reviews/${rid}`);
    loadReviews(); onReviewsChanged();
  };

  const togglePin = async (r: any) => {
    await AdminAPI.put(`/admin/products/${product._id}/reviews/${r._id}`, { ...r, pinned: !r.pinned });
    loadReviews();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="font-bold text-gray-700">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</p>
          <p className="text-xs text-gray-400 mt-0.5">Admin reviews are fully manual — you control name, DP, text, photos, video</p>
        </div>
        <button onClick={() => setReviewModal({ open: true, review: null })}
          className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-orange-600 transition">
          <Plus size={14} /> Add Review
        </button>
      </div>
      {loading ? <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}</div>
        : reviews.length === 0 ? (
          <div className="text-center py-10 text-gray-400"><MessageSquare size={32} className="mx-auto mb-3 opacity-40" /><p>No reviews yet. Add the first one!</p></div>
        ) : (
          <div className="space-y-3">
            {reviews.map(r => (
              <div key={r._id} className="flex items-start gap-3 p-3 border border-gray-100 rounded-xl bg-white hover:bg-gray-50 transition">
                <img src={r.avatar || `https://i.pravatar.cc/48?u=${r.name}`} alt="" className="w-10 h-10 rounded-full object-cover shrink-0 border" />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-sm">{r.name}</p>
                    {r.verified && <BadgeCheck size={13} className="text-emerald-500 fill-emerald-500 stroke-white" />}
                    {r.pinned && <Pin size={12} className="text-orange-500" />}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${r.source === 'admin' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>{r.source === 'admin' ? 'Admin' : 'Customer'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                    <span className="text-yellow-500">{'★'.repeat(r.rating)}</span>
                    {r.variant && <span>· {r.variant}</span>}
                    {r.images?.length > 0 && <span className="flex items-center gap-0.5"><Camera size={10} /> {r.images.length}</span>}
                    {r.video && <span className="flex items-center gap-0.5"><PlayCircle size={10} /> Video</span>}
                  </div>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-1">{r.comment}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => togglePin(r)} title={r.pinned ? 'Unpin' : 'Pin'} className={`w-7 h-7 flex items-center justify-center rounded-lg hover:bg-orange-50 transition ${r.pinned ? 'text-orange-500' : 'text-gray-300'}`}><Pin size={14} /></button>
                  <button onClick={() => setReviewModal({ open: true, review: r })} className="w-7 h-7 flex items-center justify-center rounded-lg border hover:bg-gray-50 text-gray-600"><Edit2 size={13} /></button>
                  <button onClick={() => deleteReview(r._id)} className="w-7 h-7 flex items-center justify-center rounded-lg border border-red-100 hover:bg-red-50 text-red-400"><Trash2 size={13} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      {reviewModal.open && (
        <ReviewModal review={reviewModal.review} productId={product._id} onClose={() => setReviewModal({ open: false, review: null })} onSave={() => { loadReviews(); onReviewsChanged(); }} />
      )}
    </div>
  );
}

// ─── Product Modal ────────────────────────────────────────────────────────────

const EMPTY_PRODUCT: any = {
  name: '', slug: '', price: 0, comparePrice: 0, category: 'Protein', stock: 50,
  ratings: 0, numReviews: 0, isActive: true,
  images: [''], video: '', banners: [],
  flavors: ['Chocolate', 'Vanilla'], sizes: ['1 kg'],
  shortDescription: '', description: '', howToUse: '', ingredients: '',
  certifications: '',
  keyBenefits: [], nutritionHighlights: [], nutritionFacts: [], qAndA: [],
  dimensionId: '', packagingBoxId: '', weight: 0,
  seo: { metaTitle: '', metaDescription: '', keywords: '', ogImage: '', canonicalUrl: '' },
  pixels: { fbPixelId: '', ga4Id: '', gtmId: '', snapchatPixelId: '', tiktokPixelId: '' },
  conversion: { urgencyText: '', badgeText: '' },
};

const PRODUCT_SUB_TABS: { id: ProductSubTab; label: string; icon: React.ReactNode }[] = [
  { id: 'basic', label: 'Basic', icon: <Box size={13} /> },
  { id: 'variants', label: 'Variants', icon: <Layers size={13} /> },
  { id: 'media', label: 'Media', icon: <Image size={13} /> },
  { id: 'content', label: 'Content', icon: <BookOpen size={13} /> },
  { id: 'benefits', label: 'Benefits', icon: <Star size={13} /> },
  { id: 'shipping', label: 'Shipping', icon: <Package size={13} /> },
  { id: 'seo', label: 'SEO', icon: <Globe size={13} /> },
  { id: 'pixels', label: 'Pixels', icon: <Layers size={13} /> },
];

function ProductModal({ product, onClose, onSave, onReviewsChanged }: { product: any; onClose: () => void; onSave: (p: any) => void; onReviewsChanged: () => void }) {
  const [modalTab, setModalTab] = useState<ModalTab>('details');
  const [subTab, setSubTab] = useState<ProductSubTab>('basic');
  const [form, setForm] = useState<any>(product || { ...EMPTY_PRODUCT });
  const [saving, setSaving] = useState(false);
  const [variantRows, setVariantRows] = useState<VariantRow[]>([]);
  const [variantsValid, setVariantsValid] = useState(true);
  const [selFlavorIds, setSelFlavorIds] = useState<string[]>([]);
  const [selSizeIds, setSelSizeIds] = useState<string[]>([]);
  const catNames = useCategoryNames();
  const CATEGORIES = catNames.length ? catNames : FALLBACK_CATEGORIES;
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const setNested = (parent: string, k: string, v: any) => setForm((f: any) => ({ ...f, [parent]: { ...(f[parent] || {}), [k]: v } }));

  const handleName = (name: string) => { set('name', name); if (!product?._id) set('slug', toSlug(name)); };

  const save = async () => {
    if (!form.name || !form.price) return alert('Name and price required');
    if (!variantsValid) return alert('Fix duplicate SKUs in the Variants tab before saving.');
    setSaving(true);
    try {
      // Mirror variants into legacy jsonb shape for backward-compat with PDP
      const flavorNames = Array.from(new Set(variantRows.map(v => v.flavor_name).filter(Boolean)));
      const sizeNames = Array.from(new Set(variantRows.map(v => v.size_name).filter(Boolean)));
      const payload = {
        ...form,
        certifications: typeof form.certifications === 'string'
          ? form.certifications.split(',').map((s: string) => s.trim()).filter(Boolean)
          : form.certifications,
        ...(variantRows.length > 0 ? {
          flavors: flavorNames.length ? flavorNames : form.flavors,
          sizes: sizeNames.length ? sizeNames : form.sizes,
          variants: variantsToJson(variantRows),
        } : {}),
      };
      const saved: any = await onSave(payload);
      const savedId = saved?._id || form._id || product?._id;
      if (savedId && variantRows.length > 0) {
        try { await syncVariantsToDb(savedId, variantRows); } catch (e) { console.error('variant sync failed', e); }
      }
      onClose();
    } catch { alert('Save failed'); }
    setSaving(false);
  };

  const inp = (label: string, key: string, opts: any = {}) => (
    <div className={opts.span === 2 ? 'sm:col-span-2' : ''}>
      <label className="text-xs font-bold text-gray-500 block mb-1">{label}</label>
      <input type={opts.type || 'text'} value={form[key] ?? ''} onChange={e => set(key, opts.type === 'number' ? Number(e.target.value) : e.target.value)}
        placeholder={opts.placeholder || ''} className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400" />
      {opts.help && <p className="text-xs text-gray-400 mt-0.5">{opts.help}</p>}
    </div>
  );

  const seoInp = (label: string, key: string, opts: any = {}) => (
    <div className={opts.span === 2 ? 'sm:col-span-2' : ''}>
      <label className="text-xs font-bold text-gray-500 block mb-1">{label}</label>
      <input type="text" value={form.seo?.[key] ?? ''} onChange={e => setNested('seo', key, e.target.value)}
        placeholder={opts.placeholder || ''} className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400" />
      {opts.help && <p className="text-xs text-gray-400 mt-0.5">{opts.help}</p>}
    </div>
  );

  const pixInp = (label: string, key: string, placeholder: string) => (
    <div>
      <label className="text-xs font-bold text-gray-500 block mb-1">{label}</label>
      <input type="text" value={form.pixels?.[key] ?? ''} onChange={e => setNested('pixels', key, e.target.value)}
        placeholder={placeholder} className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400 font-mono" />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h3 className="font-black">{product?._id ? 'Edit Product' : 'Add New Product'}</h3>
            {product?._id && <p className="text-xs text-gray-400 mt-0.5">{product.name}</p>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
        </div>

        {/* Modal top-level tabs */}
        <div className="flex border-b">
          <button onClick={() => setModalTab('details')} className={`px-5 py-3 text-sm font-bold border-b-2 transition ${modalTab === 'details' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            Product Details
          </button>
          {product?._id && (
            <button onClick={() => setModalTab('reviews')} className={`px-5 py-3 text-sm font-bold border-b-2 transition flex items-center gap-2 ${modalTab === 'reviews' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              <MessageSquare size={14} /> Reviews {product.numReviews > 0 && `(${product.numReviews})`}
            </button>
          )}
        </div>

        {modalTab === 'details' ? (
          <>
            {/* Sub-tabs */}
            <div className="flex border-b overflow-x-auto scrollbar-none bg-gray-50/60">
              {PRODUCT_SUB_TABS.map(t => (
                <button key={t.id} onClick={() => setSubTab(t.id)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold whitespace-nowrap border-b-2 transition shrink-0 ${subTab === t.id ? 'border-orange-500 text-orange-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-5">
              {/* BASIC */}
              {subTab === 'basic' && (
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-gray-500 block mb-1">Product Name *</label>
                    <input value={form.name || ''} onChange={e => handleName(e.target.value)} className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">Slug (URL)</label>
                    <input value={form.slug || ''} onChange={e => set('slug', e.target.value)} className="w-full border rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-orange-400" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">Category</label>
                    <select value={form.category || 'Protein'} onChange={e => set('category', e.target.value)} className="w-full border rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-orange-400">
                      {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">Price (₹) *</label>
                    <input type="number" value={form.price || ''} onChange={e => set('price', Number(e.target.value))} className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">Compare Price (₹) — shows strikethrough</label>
                    <input type="number" value={form.comparePrice || ''} onChange={e => set('comparePrice', Number(e.target.value))} className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">Stock</label>
                    <input type="number" value={form.stock ?? 50} onChange={e => set('stock', Number(e.target.value))} className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">HSN Code <span className="text-gray-400 font-normal">(GST)</span></label>
                    <input value={form.hsnCode || ''} onChange={e => set('hsnCode', e.target.value)} placeholder="2106" className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">GST Rate %</label>
                    <input type="number" value={form.gstRate ?? 5} onChange={e => set('gstRate', Number(e.target.value))} placeholder="5" className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">Flavors (comma-separated)</label>
                    <input value={(form.flavors || []).join(', ')} onChange={e => set('flavors', e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean))} className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400" placeholder="Chocolate, Vanilla, Strawberry" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">Sizes (comma-separated)</label>
                    <input value={(form.sizes || []).join(', ')} onChange={e => set('sizes', e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean))} className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400" placeholder="1 kg, 2 kg, 4 kg" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-gray-500 block mb-1">Short Description (shown in listings)</label>
                    <input value={form.shortDescription || ''} onChange={e => set('shortDescription', e.target.value)} className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">Urgency Text</label>
                    <input value={form.conversion?.urgencyText || ''} onChange={e => setNested('conversion', 'urgencyText', e.target.value)} placeholder="Only 5 left! Selling fast." className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400" />
                    <p className="text-xs text-gray-400 mt-0.5">Shows near add-to-cart to create urgency</p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">Badge Text</label>
                    <input value={form.conversion?.badgeText || ''} onChange={e => setNested('conversion', 'badgeText', e.target.value)} placeholder="#1 Best Seller" className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400" />
                    <p className="text-xs text-gray-400 mt-0.5">Shown as a badge on the product image</p>
                  </div>
                  <div className="sm:col-span-2 flex flex-wrap items-center gap-x-6 gap-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.isActive !== false} onChange={e => set('isActive', e.target.checked)} className="w-4 h-4 accent-orange-500" />
                      <span className="text-sm font-bold">Active (visible in store)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.comboWidgetEnabled !== false} onChange={e => set('comboWidgetEnabled', e.target.checked)} className="w-4 h-4 accent-orange-500" />
                      <span className="text-sm font-bold">Show "Build a combo" widget on this PDP</span>
                    </label>
                  </div>
                </div>
              )}

              {/* VARIANTS */}
              {subTab === 'variants' && (
                <VariantsManager
                  productId={product?._id}
                  productName={form.name || 'Product'}
                  basePrice={Number(form.price) || 0}
                  baseComparePrice={Number(form.comparePrice) || 0}
                  variants={variantRows}
                  onChange={setVariantRows}
                  selectedFlavorIds={selFlavorIds}
                  selectedSizeIds={selSizeIds}
                  onFlavorsChange={setSelFlavorIds}
                  onSizesChange={setSelSizeIds}
                  onValidityChange={setVariantsValid}
                />
              )}

              {/* MEDIA */}
              {subTab === 'media' && (
                <div className="space-y-6">
                  <ImageGalleryManager images={form.images || []} onChange={imgs => set('images', imgs)} />
                  <hr className="border-gray-100" />
                  <VideoManager value={form.video || ''} onChange={url => set('video', url)} />
                  <hr className="border-gray-100" />
                  <BannerEditor banners={form.banners || []} onChange={b => set('banners', b)} />
                </div>
              )}

              {/* CONTENT */}
              {subTab === 'content' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">Full Description</label>
                    <textarea value={form.description || ''} onChange={e => set('description', e.target.value)} rows={5} className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400 resize-none" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">How to Use</label>
                    <textarea value={form.howToUse || ''} onChange={e => set('howToUse', e.target.value)} rows={3} className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400 resize-none" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">Ingredients</label>
                    <textarea value={form.ingredients || ''} onChange={e => set('ingredients', e.target.value)} rows={3} className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400 resize-none" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">Certifications (comma-separated)</label>
                    <input value={Array.isArray(form.certifications) ? form.certifications.join(', ') : form.certifications || ''} onChange={e => set('certifications', e.target.value)} placeholder="FSSAI Approved, Lab Tested, GMP Certified" className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400" />
                  </div>
                </div>
              )}

              {/* BENEFITS */}
              {subTab === 'benefits' && (
                <div className="space-y-6">
                  <KeyBenefitsEditor value={form.keyBenefits || []} onChange={v => set('keyBenefits', v)} />
                  <hr className="border-gray-100" />
                  <NutritionHighlightsEditor value={form.nutritionHighlights || []} onChange={v => set('nutritionHighlights', v)} />
                  <hr className="border-gray-100" />
                  <NutritionFactsEditor value={form.nutritionFacts || []} onChange={v => set('nutritionFacts', v)} />
                  <hr className="border-gray-100" />
                  <QAEditor value={form.qAndA || []} onChange={v => set('qAndA', v)} />
                </div>
              )}

              {/* SHIPPING */}
              {subTab === 'shipping' && (
                <ShippingSubTab form={form} set={set} />
              )}

              {/* SEO */}
              {subTab === 'seo' && (
                <div className="space-y-4">
                  <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700 font-semibold">
                    SEO fields override the default auto-generated meta tags for this product page.
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {seoInp('Meta Title', 'metaTitle', { span: 2, placeholder: `${form.name || 'Product'} | NutroPact`, help: 'Recommended: 50–60 characters' })}
                    <div className="sm:col-span-2">
                      <label className="text-xs font-bold text-gray-500 block mb-1">Meta Description</label>
                      <textarea value={form.seo?.metaDescription || ''} onChange={e => setNested('seo', 'metaDescription', e.target.value)} rows={3}
                        placeholder="Compelling description for search engines…" className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400 resize-none" />
                      <p className="text-xs text-gray-400 mt-0.5">Recommended: 150–160 characters · Current: {(form.seo?.metaDescription || '').length}</p>
                    </div>
                    {seoInp('Keywords', 'keywords', { span: 2, placeholder: 'whey protein isolate, buy protein india, best protein powder', help: 'Comma-separated. Helps with long-tail search.' })}
                    <div className="sm:col-span-2">
                      <ImgUploadInp label="OG / Social Share Image" value={form.seo?.ogImage || ''} onChange={(v: string) => setNested('seo', 'ogImage', v)} placeholder="https://... (recommended 1200×630px)" />
                    </div>
                    {seoInp('Canonical URL', 'canonicalUrl', { span: 2, placeholder: `https://nutropact.com/products/${form.slug || 'product-slug'}` })}
                  </div>
                </div>
              )}

              {/* PIXELS */}
              {subTab === 'pixels' && (
                <div className="space-y-4">
                  <div className="bg-purple-50 rounded-xl p-3 text-xs text-purple-700 font-semibold">
                    Pixel IDs below are loaded only on this product's page — ideal for product-specific retargeting and conversion tracking.
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {pixInp('Facebook Pixel ID', 'fbPixelId', '1234567890')}
                    {pixInp('Google Analytics 4 (G-...)', 'ga4Id', 'G-XXXXXXXXXX')}
                    {pixInp('Google Tag Manager (GTM-...)', 'gtmId', 'GTM-XXXXXXX')}
                    {pixInp('Snapchat Pixel ID', 'snapchatPixelId', 'xxxxxxxx-xxxx-xxxx-xxxx')}
                    {pixInp('TikTok Pixel ID', 'tiktokPixelId', 'XXXXXXXXXXXXXXXXXX')}
                  </div>
                  <p className="text-xs text-gray-400">Leave blank if not tracking this product separately. Global pixels can be set in Site Settings.</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 p-5 border-t">
              <button onClick={onClose} className="px-5 py-2.5 border rounded-xl font-semibold text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={save} disabled={saving} className="px-5 py-2.5 bg-orange-500 text-white rounded-xl font-black text-sm hover:bg-orange-600 disabled:opacity-50 flex items-center gap-2">
                <Save size={14} /> {saving ? 'Saving...' : 'Save Product'}
              </button>
            </div>
          </>
        ) : (
          <div className="p-5 max-h-[65vh] overflow-y-auto">
            <ReviewsTab product={product} onReviewsChanged={onReviewsChanged} />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function Dashboard({ products }: { products: any[] }) {
  const active = products.filter(p => p.isActive).length;
  const totalStock = products.reduce((a, p) => a + (p.stock || 0), 0);
  const avgRating = products.length ? (products.reduce((a, p) => a + (p.ratings || 0), 0) / products.length).toFixed(1) : '0';
  const totalReviews = products.reduce((a, p) => a + (p.numReviews || 0), 0);
  return (
    <div>
      <h2 className="text-2xl font-black mb-6">Dashboard</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={<Box size={22} className="text-orange-500" />} label="Total Products" value={products.length} sub={`${active} active`} color="bg-orange-50" />
        <StatCard icon={<Package size={22} className="text-blue-500" />} label="Total Stock" value={totalStock} sub="units" color="bg-blue-50" />
        <StatCard icon={<Star size={22} className="text-yellow-500" />} label="Avg Rating" value={avgRating} sub={`${totalReviews} reviews`} color="bg-yellow-50" />
        <StatCard icon={<MessageSquare size={22} className="text-green-500" />} label="Testimonials" value={products.reduce((a, p) => a + (p.reviews || []).filter((r: any) => r.rating >= 4).length, 0)} sub="4★+ reviews" color="bg-green-50" />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="font-black mb-4">Top Rated</h3>
          <div className="space-y-3">
            {[...products].sort((a, b) => b.ratings - a.ratings).slice(0, 5).map(p => (
              <div key={p._id} className="flex items-center gap-3">
                <img src={p.images?.[0]} alt="" className="w-10 h-10 object-cover rounded-lg bg-gray-100 shrink-0" />
                <div className="flex-1 min-w-0"><p className="text-sm font-semibold truncate">{p.name}</p><p className="text-xs text-gray-400">{p.numReviews} reviews</p></div>
                <span className="text-sm font-bold text-yellow-600">★ {(p.ratings || 0).toFixed(1)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="font-black mb-4">Low Stock Alert</h3>
          {products.filter(p => p.stock < 30).length === 0 ? (
            <p className="text-sm text-gray-400">All products have sufficient stock.</p>
          ) : products.filter(p => p.stock < 30).map(p => (
            <div key={p._id} className="flex items-center gap-3 mb-3">
              <span className={`w-2 h-2 rounded-full shrink-0 ${p.stock < 10 ? 'bg-red-500' : 'bg-yellow-500'}`} />
              <p className="text-sm flex-1 truncate">{p.name}</p>
              <span className={`text-sm font-bold ${p.stock < 10 ? 'text-red-600' : 'text-yellow-600'}`}>{p.stock}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Products Tab ─────────────────────────────────────────────────────────────

function ProductsTab({ products, onAdd, onEdit, onDelete, onToggle, onDuplicate, onStock }: { products: any[]; onAdd: () => void; onEdit: (p: any) => void; onDelete: (id: string) => void; onToggle: (id: string, a: boolean) => void; onDuplicate: (p: any) => void; onStock: (id: string, stock: number) => void }) {
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'hidden' | 'low' | 'out'>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const catNames = useCategoryNames();
  const CATEGORIES = catNames.length ? catNames : FALLBACK_CATEGORIES;
  const filtered = products.filter(p => {
    const ms = !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku || '').toLowerCase().includes(search.toLowerCase());
    const mc = !catFilter || p.category === catFilter;
    const mst = statusFilter === 'all' || (statusFilter === 'active' && p.isActive) || (statusFilter === 'hidden' && !p.isActive) || (statusFilter === 'low' && p.stock > 0 && p.stock < 10) || (statusFilter === 'out' && p.stock <= 0);
    return ms && mc && mst;
  });

  const allSelected = filtered.length > 0 && filtered.every(p => selected.has(p._id));
  const toggleOne = (id: string) => {
    setSelected(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };
  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(filtered.map(p => p._id)));
  };
  const clearSel = () => setSelected(new Set());

  const runBulk = async (fn: (id: string) => Promise<void> | void, confirmMsg?: string) => {
    if (selected.size === 0) return;
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    setBulkBusy(true);
    try {
      for (const id of Array.from(selected)) {
        try { await fn(id); } catch (e) { console.error('Bulk op failed for', id, e); }
      }
      clearSel();
    } finally {
      setBulkBusy(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <h2 className="text-2xl font-black">Products <span className="text-gray-400 text-base font-normal">({products.length})</span></h2>
        <button onClick={onAdd} className="flex items-center gap-2 bg-orange-500 text-white px-5 py-2.5 rounded-xl font-black text-sm hover:bg-orange-600 transition"><Plus size={15} /> Add Product</button>
      </div>
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or SKU..." className="w-full border rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-orange-400" />
        </div>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="border rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:border-orange-400">
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="border rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:border-orange-400">
          <option value="all">All Status</option>
          <option value="active">Active only</option>
          <option value="hidden">Hidden only</option>
          <option value="low">Low stock (&lt;10)</option>
          <option value="out">Out of stock</option>
        </select>
      </div>

      {selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
          <span className="text-sm font-bold text-orange-900">{selected.size} selected</span>
          <span className="text-xs text-orange-700 mr-auto">Bulk actions:</span>
          <button disabled={bulkBusy} onClick={() => runBulk(id => onToggle(id, true))} className="inline-flex items-center gap-1.5 bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-green-700 disabled:opacity-50"><Eye size={12} /> Activate</button>
          <button disabled={bulkBusy} onClick={() => runBulk(id => onToggle(id, false))} className="inline-flex items-center gap-1.5 bg-gray-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-800 disabled:opacity-50"><EyeOff size={12} /> Deactivate</button>
          <button disabled={bulkBusy} onClick={() => runBulk(id => { const p = products.find(x => x._id === id); if (p) onDuplicate(p); })} className="inline-flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-700 disabled:opacity-50">Duplicate</button>
          <button disabled={bulkBusy} onClick={() => runBulk(id => onDelete(id), `Delete ${selected.size} product(s)? This cannot be undone.`)} className="inline-flex items-center gap-1.5 bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-700 disabled:opacity-50">Delete</button>
          <button disabled={bulkBusy} onClick={clearSel} className="text-xs font-bold text-gray-600 hover:text-gray-900 px-2">Clear</button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto overflow-y-visible">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-3 py-3 w-10"><input type="checkbox" checked={allSelected} onChange={toggleAll} className="w-4 h-4 accent-orange-500 cursor-pointer" /></th>
                <th className="text-left px-4 py-3 font-bold text-gray-600">Product</th>
                <th className="text-left px-4 py-3 font-bold text-gray-600">Category</th>
                <th className="text-right px-4 py-3 font-bold text-gray-600">Price</th>
                <th className="text-right px-4 py-3 font-bold text-gray-600">Stock</th>
                <th className="text-center px-4 py-3 font-bold text-gray-600">Reviews</th>
                <th className="text-center px-4 py-3 font-bold text-gray-600">Status</th>
                <th className="text-right px-4 py-3 font-bold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={8} className="text-center py-12 text-gray-400">No products found</td></tr>}
              {filtered.map(p => {
                const d = p.comparePrice > p.price ? calculateDiscount(p.price, p.comparePrice) : 0;
                const isSel = selected.has(p._id);
                return (
                  <tr key={p._id} className={`border-b last:border-0 hover:bg-gray-50 transition ${isSel ? 'bg-orange-50/40' : ''}`}>
                    <td className="px-3 py-3"><input type="checkbox" checked={isSel} onChange={() => toggleOne(p._id)} className="w-4 h-4 accent-orange-500 cursor-pointer" /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 shrink-0 overflow-hidden">
                          {p.images?.[0] ? <img src={p.images[0]} alt="" className="w-full h-full object-cover" /> : <span className="w-full h-full flex items-center justify-center text-gray-300"><Image size={14} /></span>}
                        </div>
                        <div><p className="font-semibold truncate max-w-44">{p.name}</p><p className="text-xs text-gray-400">{p.slug}</p></div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className="bg-gray-100 rounded-full px-3 py-1 text-xs font-semibold">{p.category}</span></td>
                    <td className="px-4 py-3 text-right"><p className="font-bold">{formatPrice(p.price)}</p>{d > 0 && <p className="text-xs text-green-600">{d}% off</p>}</td>
                    <td className="px-4 py-3 text-right">
                      <InlineStock value={p.stock || 0} onSave={n => onStock(p._id, n)} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="flex items-center justify-center gap-1 text-xs text-gray-500">
                        <MessageSquare size={12} /> {p.numReviews || 0}
                        {p.ratings > 0 && <span className="text-yellow-500">★{(p.ratings || 0).toFixed(1)}</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => onToggle(p._id, !p.isActive)} title="Click to activate/deactivate" className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition ${p.isActive ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                        {p.isActive ? <><Eye size={10} /> Active</> : <><EyeOff size={10} /> Hidden</>}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <CopyLinkBtn slug={p.slug} />
                        <button onClick={() => onToggle(p._id, !p.isActive)} title={p.isActive ? 'Deactivate' : 'Activate'} className={`w-8 h-8 flex items-center justify-center border rounded-lg hover:bg-gray-50 ${p.isActive ? 'text-green-600' : 'text-gray-400'}`}>
                          {p.isActive ? <Eye size={13} /> : <EyeOff size={13} />}
                        </button>
                        <button onClick={() => onEdit(p)} title="Edit" className="w-8 h-8 flex items-center justify-center border rounded-lg hover:bg-gray-50 text-gray-600"><Edit2 size={13} /></button>
                        <RowMenu p={p} onDuplicate={onDuplicate} onDelete={onDelete} onToggle={onToggle} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function InlineStock({ value, onSave }: { value: number; onSave: (n: number) => void }) {
  const [edit, setEdit] = useState(false);
  const [v, setV] = useState(value);
  useEffect(() => { setV(value); }, [value]);
  if (edit) {
    return (
      <span className="inline-flex items-center gap-1">
        <input type="number" value={v} onChange={e => setV(parseInt(e.target.value) || 0)} onBlur={() => { setEdit(false); if (v !== value) onSave(v); }} onKeyDown={e => { if (e.key === 'Enter') { setEdit(false); if (v !== value) onSave(v); } if (e.key === 'Escape') { setV(value); setEdit(false); } }} autoFocus className="w-16 border rounded px-1.5 py-0.5 text-right text-sm focus:outline-none focus:border-orange-400" />
      </span>
    );
  }
  return <button onClick={() => setEdit(true)} title="Click to edit stock" className={`font-bold hover:underline ${value <= 0 ? 'text-red-600' : value < 10 ? 'text-red-600' : value < 30 ? 'text-yellow-600' : ''}`}>{value}</button>;
}

function CopyLinkBtn({ slug }: { slug: string }) {
  const [done, setDone] = useState(false);
  const copy = () => {
    const url = `${window.location.origin}/products/${slug}`;
    navigator.clipboard.writeText(url).then(() => { setDone(true); setTimeout(() => setDone(false), 1500); });
  };
  return (
    <button onClick={copy} title={done ? 'Copied!' : 'Copy public link'} className={`w-8 h-8 flex items-center justify-center border rounded-lg transition ${done ? 'bg-green-50 border-green-200 text-green-600' : 'hover:bg-gray-50 text-gray-600'}`}>
      {done ? <Check size={13} /> : <Copy size={13} />}
    </button>
  );
}

function RowMenu({ p, onDuplicate, onDelete, onToggle }: { p: any; onDuplicate: (p: any) => void; onDelete: (id: string) => void; onToggle: (id: string, a: boolean) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  const url = typeof window !== 'undefined' ? `${window.location.origin}/products/${p.slug}` : '';
  const shareWa = () => window.open(`https://wa.me/?text=${encodeURIComponent(`${p.name} - ${url}`)}`, '_blank');
  const copyId = () => navigator.clipboard.writeText(p._id);
  const copySku = () => navigator.clipboard.writeText(p.sku || p.slug);
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(o => !o)} title="More actions" className="w-8 h-8 flex items-center justify-center border rounded-lg hover:bg-gray-50 text-gray-600"><MoreVertical size={13} /></button>
      {open && (
        <div className="absolute right-0 top-9 z-30 w-56 bg-white border border-gray-100 rounded-xl shadow-xl py-1.5 text-sm">
          <a href={`/products/${p.slug}`} target="_blank" rel="noreferrer" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 text-gray-700"><ExternalLink size={13} /> View on site</a>
          <button onClick={() => { shareWa(); setOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 text-gray-700"><Share2 size={13} /> Share on WhatsApp</button>
          <button onClick={() => { copySku(); setOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 text-gray-700"><Copy size={13} /> Copy SKU</button>
          <button onClick={() => { copyId(); setOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 text-gray-700"><Copy size={13} /> Copy product ID</button>
          <div className="border-t my-1" />
          <button onClick={() => { onToggle(p._id, !p.isActive); setOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 text-gray-700">
            {p.isActive ? <><EyeOff size={13} /> Make Hidden</> : <><Eye size={13} /> Make Active</>}
          </button>
          <button onClick={() => { onDuplicate(p); setOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 text-gray-700"><Plus size={13} /> Duplicate</button>
          <div className="border-t my-1" />
          <button onClick={() => { if (confirm(`Delete "${p.name}"?`)) onDelete(p._id); setOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-red-50 text-red-600"><Trash2 size={13} /> Delete</button>
        </div>
      )}
    </div>
  );
}

// ─── Orders Tab ───────────────────────────────────────────────────────────────

function OrdersTab() {
  const [orders, setOrders] = useState<any[]>([]);
  const [trackingMap, setTrackingMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [tracking, setTracking] = useState({ courier: '', awbNumber: '', trackingUrl: '', status: '', note: '' });

  const load = async () => {
    try {
      const r = await AdminAPI.get('/admin/orders');
      const list: any[] = r.data || [];
      setOrders(list);
      try {
        const tr = await AdminAPI.get('/admin/tracking');
        const map: Record<string, any> = {};
        (tr.data || []).forEach((t: any) => { if (t?.orderNumber) map[t.orderNumber] = t; });
        setTrackingMap(map);
      } catch { setTrackingMap({}); }
    } catch { setOrders([]); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const retryShipment = async (orderNumber: string) => {
    setRetrying(orderNumber);
    try {
      await AdminAPI.post(`/admin/orders/${orderNumber}/retry-shipment`, {});
      await load();
    } catch (e: any) { alert(e.response?.data?.message || 'Retry failed'); }
    setRetrying(null);
  };

  const autoShipChip = (o: any) => {
    const tr = trackingMap[o.orderNumber];
    if (tr?.awbNumber) return { label: `📦 ${tr.courier || 'Booked'}`, cls: 'bg-green-50 text-green-700' };
    const attempts = Number(o.autoShipAttempts || 0);
    if (o.autoShipLastError) return { label: `⚠️ Failed ×${attempts}`, cls: 'bg-red-50 text-red-700', error: o.autoShipLastError };
    if (o.priorityShipping) return { label: '⚡ Priority queued', cls: 'bg-orange-50 text-orange-700' };
    if (['confirmed', 'processing'].includes(o.orderStatus)) return { label: '⏳ Auto-ship pending', cls: 'bg-amber-50 text-amber-700' };
    return null;
  };


  const openOrder = async (o: any) => {
    setActive(o);
    setTracking({ courier: '', awbNumber: '', trackingUrl: '', status: '', note: '' });
    try {
      const { data: tr } = await AdminAPI.get(`/orders/${o.orderNumber}/tracking`);
      if (tr) setTracking({ courier: tr.courier || '', awbNumber: tr.awbNumber || '', trackingUrl: tr.trackingUrl || '', status: tr.currentStatus || '', note: '' });
    } catch {}
  };

  const updateStatus = async (field: 'orderStatus' | 'paymentStatus', value: string) => {
    setBusy(true);
    try {
      await AdminAPI.post(`/admin/orders/${active.orderNumber}/status`, { [field]: value });
      await load();
      setActive((a: any) => ({ ...a, [field]: value }));
    } catch (e: any) { alert(e.response?.data?.message || 'Failed'); }
    setBusy(false);
  };

  const saveTracking = async () => {
    setBusy(true);
    try {
      await AdminAPI.post(`/admin/orders/${active.orderNumber}/tracking`, tracking);
      alert('Tracking saved. Customer notified.');
      await load();
    } catch (e: any) { alert(e.response?.data?.message || 'Failed'); }
    setBusy(false);
  };

  const generateInvoice = async () => {
    setBusy(true);
    try {
      const { data } = await AdminAPI.post(`/admin/orders/${active.orderNumber}/invoice`, {});
      window.open(`/invoice/${active.orderNumber}`, '_blank');
      alert(`Invoice ${data.invoiceNumber} ready.`);
    } catch (e: any) { alert(e.response?.data?.message || 'Failed'); }
    setBusy(false);
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      pending: 'bg-yellow-50 text-yellow-700', confirmed: 'bg-blue-50 text-blue-700',
      shipped: 'bg-indigo-50 text-indigo-700', out_for_delivery: 'bg-purple-50 text-purple-700',
      delivered: 'bg-green-50 text-green-700', cancelled: 'bg-red-50 text-red-700',
    };
    return map[s] || 'bg-gray-50 text-gray-600';
  };

  return (
    <div>
      <h2 className="text-2xl font-black mb-6">Orders</h2>
      {loading ? <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}</div>
        : orders.length === 0 ? (
          <div className="bg-white rounded-2xl border p-12 text-center"><ShoppingCart size={36} className="text-gray-200 mx-auto mb-3" /><p className="text-gray-400">No orders yet</p></div>
        ) : (
          <div className="bg-white rounded-2xl border overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-bold text-gray-600">Order #</th>
                  <th className="text-left px-4 py-3 font-bold text-gray-600">Customer</th>
                  <th className="text-right px-4 py-3 font-bold text-gray-600">Total</th>
                  <th className="text-center px-4 py-3 font-bold text-gray-600">Payment</th>
                  <th className="text-center px-4 py-3 font-bold text-gray-600">Status</th>
                  <th className="text-center px-4 py-3 font-bold text-gray-600">Auto-Ship</th>
                  <th className="text-right px-4 py-3 font-bold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o: any, i: number) => {
                  const chip = autoShipChip(o);
                  const canRetry = !trackingMap[o.orderNumber]?.awbNumber && ['confirmed', 'processing'].includes(o.orderStatus);
                  return (
                  <tr key={i} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono font-bold text-orange-600">{o.orderNumber}</td>
                    <td className="px-4 py-3">{o.customerName || o.shippingAddress?.name || '—'}<br /><span className="text-xs text-gray-400">{o.customerPhone}</span></td>
                    <td className="px-4 py-3 text-right font-bold">{formatPrice(o.total)}</td>
                    <td className="px-4 py-3 text-center"><span className={`text-xs px-2 py-1 rounded-full font-bold capitalize ${o.paymentStatus === 'paid' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>{o.paymentStatus}</span></td>
                    <td className="px-4 py-3 text-center"><span className={`text-xs px-2 py-1 rounded-full font-bold capitalize ${statusBadge(o.orderStatus)}`}>{(o.orderStatus || 'pending').replace(/_/g, ' ')}</span></td>
                    <td className="px-4 py-3 text-center">
                      {chip ? (
                        <div className="inline-flex flex-col items-center gap-1">
                          <span className={`text-[11px] px-2 py-1 rounded-full font-bold ${chip.cls}`} title={chip.error || ''}>{chip.label}</span>
                          {canRetry && (
                            <button disabled={retrying === o.orderNumber} onClick={() => retryShipment(o.orderNumber)}
                              className="text-[10px] font-bold text-orange-500 hover:underline disabled:opacity-50">
                              {retrying === o.orderNumber ? 'Retrying…' : '↻ Retry now'}
                            </button>
                          )}
                        </div>
                      ) : <span className="text-xs text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right"><button onClick={() => openOrder(o)} className="text-orange-500 font-bold text-xs hover:underline">Manage →</button></td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      {/* Manage drawer */}
      {active && (
        <div className="fixed inset-0 bg-black/40 z-50 flex justify-end" onClick={() => setActive(null)}>
          <div onClick={e => e.stopPropagation()} className="w-full max-w-lg bg-white h-full overflow-y-auto p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs text-gray-400">Order</p>
                <p className="font-mono font-black text-lg">{active.orderNumber}</p>
              </div>
              <button onClick={() => setActive(null)} className="text-gray-400 hover:text-gray-900">✕</button>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 rounded-xl p-4 text-sm">
                <p className="font-bold">{active.customerName}</p>
                <p className="text-gray-600 text-xs">{active.customerEmail} · {active.customerPhone}</p>
                <p className="text-gray-600 text-xs mt-1">{[active.shippingAddress?.street, active.shippingAddress?.city, active.shippingAddress?.state, active.shippingAddress?.pincode].filter(Boolean).join(', ')}</p>
                <p className="font-bold mt-2">{formatPrice(active.total)} · {active.paymentMethod?.toUpperCase()}</p>
              </div>

              <div>
                <p className="text-xs font-bold uppercase text-gray-400 mb-1">Order Status</p>
                <select disabled={busy} value={active.orderStatus || 'pending'} onChange={e => updateStatus('orderStatus', e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 text-sm">
                  {['pending', 'confirmed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'].map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-gray-400 mb-1">Payment Status</p>
                <select disabled={busy} value={active.paymentStatus || 'pending'} onChange={e => updateStatus('paymentStatus', e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 text-sm">
                  {['pending', 'paid', 'failed', 'refunded'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm font-black mb-2">📦 Tracking</p>
                <div className="space-y-2">
                  <input placeholder="Courier (e.g. Delhivery, Shiprocket)" value={tracking.courier} onChange={e => setTracking({ ...tracking, courier: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm" />
                  <input placeholder="AWB / Tracking number" value={tracking.awbNumber} onChange={e => setTracking({ ...tracking, awbNumber: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm" />
                  <input placeholder="Tracking URL" value={tracking.trackingUrl} onChange={e => setTracking({ ...tracking, trackingUrl: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm" />
                  <select value={tracking.status} onChange={e => setTracking({ ...tracking, status: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm">
                    <option value="">Add status checkpoint…</option>
                    {['picked_up', 'in_transit', 'shipped', 'out_for_delivery', 'delivered'].map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                  </select>
                  <input placeholder="Note (optional)" value={tracking.note} onChange={e => setTracking({ ...tracking, note: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm" />
                  <button disabled={busy} onClick={saveTracking} className="w-full bg-gray-900 text-white py-2 rounded-xl font-bold text-sm disabled:opacity-50">Save Tracking & Notify Customer</button>
                </div>
              </div>

              <div className="border-t pt-4 flex gap-2">
                <button disabled={busy} onClick={generateInvoice} className="flex-1 bg-orange-500 text-white py-2.5 rounded-xl font-bold text-sm disabled:opacity-50">📄 Generate / View Invoice</button>
                <a href={`/invoice/${active.orderNumber}`} target="_blank" rel="noreferrer" className="px-4 py-2.5 border rounded-xl font-bold text-sm hover:bg-gray-50">Open</a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────

const THEME_SWATCHES = ['#f97316', '#ef4444', '#8b5cf6', '#06b6d4', '#10b981', '#0ea5e9', '#e11d48', '#f59e0b', '#84cc16', '#ec4899'];

function SettingsTab() {
  const [primaryColor, setPrimaryColor] = useState(() => localStorage.getItem('np_primary_color') || '#f97316');
  const [saved, setSaved] = useState(false);
  const [waitlist, setWaitlist] = useState<any[]>([]);
  const [loadingWl, setLoadingWl] = useState(true);

  useEffect(() => { AdminAPI.get('/admin/waitlist').then(r => setWaitlist(r.data || [])).catch(() => {}).finally(() => setLoadingWl(false)); }, []);

  const applyTheme = () => {
    localStorage.setItem('np_primary_color', primaryColor);
    document.documentElement.style.setProperty('--np-primary', primaryColor);
    window.dispatchEvent(new Event('storage'));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div><h2 className="text-2xl font-black mb-1">Store Settings</h2><p className="text-gray-500 text-sm">Customize your store's look and manage customer notifications</p></div>
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <h3 className="font-black mb-1 flex items-center gap-2"><Palette size={18} /> Brand Color</h3>
        <p className="text-sm text-gray-500 mb-5">Applied to buttons, highlights, and accents across the store.</p>
        <div className="flex flex-wrap items-start gap-6">
          <div className="flex flex-col items-center gap-2">
            <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="w-16 h-16 rounded-2xl cursor-pointer border-2 border-gray-200 p-1" />
            <span className="text-xs text-gray-400 font-mono">{primaryColor}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Quick Presets</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {THEME_SWATCHES.map(c => (
                <button key={c} onClick={() => setPrimaryColor(c)} style={{ backgroundColor: c }}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${primaryColor === c ? 'border-gray-900 scale-110 shadow-md' : 'border-transparent hover:scale-105'}`} />
              ))}
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <input value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="border rounded-xl px-3 py-2 text-sm font-mono w-32 focus:outline-none" />
              <button onClick={applyTheme} className="bg-gray-900 text-white px-6 py-2.5 rounded-xl font-black text-sm hover:bg-gray-800 transition">{saved ? '✓ Applied!' : 'Apply & Save'}</button>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <h3 className="font-black mb-1 flex items-center gap-2"><Bell size={18} /> Notify-Me Waitlist</h3>
        <p className="text-sm text-gray-500 mb-4">Customers who signed up for out-of-stock notifications.</p>
        {loadingWl ? (
          <div className="space-y-2 animate-pulse">{[1, 2, 3].map(i => <div key={i} className="h-10 bg-gray-100 rounded-xl" />)}</div>
        ) : waitlist.length === 0 ? (
          <div className="text-center py-10 bg-gray-50 rounded-2xl"><p className="text-3xl mb-2">📬</p><p className="font-bold text-gray-500">No waitlist entries yet</p></div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50">{['Name', 'Email', 'Product', 'Signed Up'].map(h => <th key={h} className="text-left px-4 py-3 font-bold text-gray-500 text-xs uppercase">{h}</th>)}</tr></thead>
              <tbody>{waitlist.map((w, i) => (
                <tr key={i} className="border-t border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-semibold">{w.name || '—'}</td>
                  <td className="px-4 py-3 text-blue-600">{w.email}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-[160px] truncate">{w.productName || w.productId}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{new Date(w.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Admin App ───────────────────────────────────────────────────────────

export default function AdminPage() {
  const { logout: logoutAccount } = useAuthStore();
  const perms = useAdminPermissions();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<{ open: boolean; product: any }>({ open: false, product: null });

  const loadProducts = async () => {
    setLoading(true);
    AdminAPI.get('/admin/products').then(r => setProducts(r.data)).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { loadProducts(); }, []);

  // Auto-register any new sidebar permission codes into the catalog so
  // super-admins always see the latest options on the user permissions screen.
  const fnSyncPerms = useServerFn(syncTabPermissions);
  const syncedRef = useRef(false);
  useEffect(() => {
    if (!perms.isSuperAdmin || syncedRef.current) return;
    syncedRef.current = true;
    fnSyncPerms({ data: { entries: TAB_PERMISSION_META } }).catch(() => {});
  }, [perms.isSuperAdmin, fnSyncPerms]);

  const logout = async () => {
    sessionStorage.removeItem(TOKEN_KEY);
    await logoutAccount();
    window.location.href = '/login?redirect=/admin';
  };

  const saveProduct = async (form: any) => {
    if (form._id) {
      await AdminAPI.put(`/admin/products/${form._id}`, form);
      setProducts(ps => ps.map(p => p._id === form._id ? { ...p, ...form } : p));
    } else {
      const { data } = await AdminAPI.post('/admin/products', form);
      setProducts(ps => [...ps, data]);
    }
  };

  const deleteProduct = async (id: string) => { await AdminAPI.delete(`/admin/products/${id}`); setProducts(ps => ps.filter(p => p._id !== id)); };
  const toggleProduct = async (id: string, active: boolean) => { await AdminAPI.put(`/admin/products/${id}`, { isActive: active }); setProducts(ps => ps.map(p => p._id === id ? { ...p, isActive: active } : p)); };
  const duplicateProduct = async (p: any) => {
    const { _id, createdAt, updatedAt, numReviews, ratings, reviews, ...rest } = p;
    const copy = { ...rest, name: `${p.name} (Copy)`, slug: `${p.slug}-copy-${Date.now().toString(36)}`, isActive: false };
    const { data } = await AdminAPI.post('/admin/products', copy);
    setProducts(ps => [...ps, data]);
  };
  const updateStock = async (id: string, stock: number) => { await AdminAPI.put(`/admin/products/${id}`, { stock }); setProducts(ps => ps.map(p => p._id === id ? { ...p, stock } : p)); };

  const navGroups: { id: string; label: string; items: { id: Tab; icon: React.ReactNode; label: string; desc?: string }[] }[] = [
    {
      id: 'overview', label: 'Overview',
      items: [
        { id: 'dashboard', icon: <LayoutDashboard size={16} />, label: 'Dashboard', desc: 'Sales & stats' },
        { id: 'analytics', icon: <TrendingUp size={16} />, label: 'Analytics', desc: 'Revenue, AOV, top products, trends' },
        { id: 'roas', icon: <TrendingUp size={16} />, label: 'ROAS Dashboard', desc: 'Channel revenue, spend, ROI from UTM + server conversions' },
      ],
    },
    {
      id: 'catalog', label: 'Catalog',
      items: [
        { id: 'products', icon: <Box size={16} />, label: 'Products', desc: 'Add / edit products' },
        { id: 'productauth', icon: <ShieldCheck size={16} />, label: 'Product Authentication', desc: 'ProofPack anti-piracy codes — QR + scratch + geo detection' },
        { id: 'categories', icon: <Layers size={16} />, label: 'Categories', desc: 'Master list, sub-categories, SEO, icons' },
        { id: 'brands', icon: <Award size={16} />, label: 'Brands', desc: 'Brand master — logo, description, sort' },
        { id: 'flavors', icon: <Sparkles size={16} />, label: 'Flavors', desc: 'Global flavor master with color swatches' },
        { id: 'sizes', icon: <Ruler size={16} />, label: 'Sizes', desc: 'Global size master — grams used in shipping' },
        { id: 'dimensions', icon: <Ruler size={16} />, label: 'Dimensions', desc: 'Shipping sizes' },
        { id: 'bulkimport', icon: <Upload size={16} />, label: 'Bulk Import', desc: 'CSV / Excel — 100s of products at once' },
        { id: 'inventory', icon: <Package size={16} />, label: 'Inventory', desc: 'Stock levels, low-stock alerts, manual adjustments' },
        { id: 'accounting', icon: <FileText size={16} />, label: 'Accounting & GST', desc: 'Purchases, GST sales/purchase register, monthly GSTR summary' },
      ],
    },
    {
      id: 'sales', label: 'Sales & Orders',
      items: [
        { id: 'orders', icon: <ShoppingCart size={16} />, label: 'Orders', desc: 'Customer orders' },
        { id: 'bulkorders', icon: <Package size={16} />, label: 'Bulk Order Ops', desc: 'Bulk status update, CSV export, full order timeline' },
        { id: 'abandoned', icon: <ShoppingCart size={16} />, label: 'Abandoned Carts', desc: 'Recover dropped checkouts (auto + manual)' },
        { id: 'ordermodify', icon: <RotateCcw size={16} />, label: 'Order Modify Links', desc: 'Token link for address/items change before dispatch' },
        { id: 'returns', icon: <RotateCcw size={16} />, label: 'Returns & Refunds', desc: 'Generate gated return links, review requests' },
        { id: 'reconciliation', icon: <FileText size={16} />, label: 'Reconciliation', desc: 'Expected vs actual carrier charge per shipment' },
        { id: 'payments', icon: <CreditCard size={16} />, label: 'Payment Gateways', desc: 'COD, Partial COD, Razorpay, PhonePe, PayU, UPI' },
        { id: 'wallet', icon: <CreditCard size={16} />, label: 'Wallet & Rewards', desc: 'Customer wallets, transactions, auto coupons' },
      ],
    },
    {
      id: 'logistics', label: 'Logistics',
      items: [
        { id: 'shipping', icon: <Truck size={16} />, label: 'Shipping & Couriers', desc: 'Shiprocket, Delhivery, Bluedart & more' },
        { id: 'automation', icon: <Zap size={16} />, label: 'Shipment Automation', desc: 'Live queue, cron health, auto-book monitoring' },
      ],
    },
    {
      id: 'marketing', label: 'Marketing & Growth',
      items: [
        { id: 'coupons', icon: <Tag size={16} />, label: 'Coupons', desc: 'Discount codes' },
        { id: 'offers', icon: <Tag size={16} />, label: 'Offers & Combos', desc: 'Product offers, payment offers, combo rules' },
        { id: 'campaigns', icon: <Send size={16} />, label: 'Segments & Campaigns', desc: 'Audiences + bulk email/WA/SMS/push blasts' },
        { id: 'popups', icon: <Zap size={16} />, label: 'Popups', desc: 'Exit / promo popups' },
        { id: 'giftcards', icon: <Gift size={16} />, label: 'Gift Cards', desc: 'Issue & manage gift card codes' },
        { id: 'loyalty', icon: <Award size={16} />, label: 'Loyalty Tiers', desc: 'Bronze/Silver/Gold perks + member view' },
        { id: 'referrals', icon: <Share2 size={16} />, label: 'Refer & Earn', desc: 'Track invites, credit wallet rewards' },
        { id: 'subscriptions', icon: <RotateCcw size={16} />, label: 'Subscriptions', desc: 'Recurring orders, subscribe & save' },
        { id: 'wholesale', icon: <Briefcase size={16} />, label: 'Wholesale / B2B', desc: 'Per-customer discount % + min order' },
      ],
    },
    {
      id: 'boosters', label: 'Conversion Boosters',
      items: [
        { id: 'growth_boosters', icon: <Sparkles size={16} />, label: 'Growth Boosters', desc: 'Marketplace strip · Empty cart upsell · Rating filter · Hindi PDP' },
        { id: 'whatsapp_channels', icon: <MessageCircle size={16} />, label: 'WhatsApp Channels', desc: 'Multi-number header icon — config, hours, templates' },
        { id: 'urgency', icon: <Flame size={16} />, label: 'PDP Urgency Stack', desc: 'Low-stock, recent purchase widgets — honest, real-data' },
        { id: 'quick_checkout', icon: <Zap size={16} />, label: 'Quick Checkout (UPI)', desc: 'Express GPay/PhonePe/Paytm BUY NOW in cart' },
        { id: 'variants_pro', icon: <Package size={16} />, label: 'Pro Variant UI', desc: 'Per-product radio-cards, badges, recommended pack' },
        { id: 'experiments', icon: <Sparkles size={16} />, label: 'A/B Experiments', desc: 'Define & track variant performance live' },
        { id: 'verification', icon: <ShieldCheck size={16} />, label: 'Feature Verification', desc: 'End-to-end check: flags, data, role gates — run after toggling' },
      ],
    },
    {
      id: 'customers', label: 'Customers & Support',
      items: [
        { id: 'users', icon: <Users size={16} />, label: 'Users & Auth', desc: 'Accounts, roles, sign-in settings' },
        { id: 'customer360', icon: <Activity size={16} />, label: 'Customer 360°', desc: 'Section-wise live activity timeline per customer — every page, cart, checkout, order, refund, review & chat' },
        { id: 'reviewmod', icon: <MessageSquare size={16} />, label: 'Reviews Moderation', desc: 'Approve / pin / delete customer reviews + photos' },
        { id: 'reviews', icon: <Star size={16} />, label: 'Global Testimonials', desc: 'Curated reviews on homepage' },
        { id: 'productqa', icon: <MessageCircle size={16} />, label: 'Product Q&A', desc: 'Customer questions on PDP — moderate & answer' },
        { id: 'contact', icon: <Mail size={16} />, label: 'Contact Messages', desc: 'Customer inquiries' },
        { id: 'faq', icon: <HelpCircle size={16} />, label: 'FAQs', desc: 'Common questions' },
        { id: 'support', icon: <MessageCircle size={16} />, label: 'Support Inbox', desc: 'Customer chat tickets — reply, handoff, close' },
        { id: 'chatbot', icon: <MessageCircle size={16} />, label: 'AI Chatbot Inbox', desc: 'Customer chats + human handoff' },
      ],
    },
    {
      id: 'content', label: 'Content & Storefront',
      items: [
        { id: 'homepage', icon: <Layout size={16} />, label: 'Homepage', desc: 'Hero & sections' },
        { id: 'navigation', icon: <List size={16} />, label: 'Header & Announcement', desc: 'Top nav & bar' },
        { id: 'footer', icon: <PanelBottom size={16} />, label: 'Footer', desc: 'Bottom links' },
        { id: 'pages', icon: <Layers size={16} />, label: 'Pages', desc: 'Custom pages for nav dropdowns' },
        { id: 'blog', icon: <BookOpen size={16} />, label: 'Blog Posts', desc: 'Articles' },
        { id: 'about', icon: <FileText size={16} />, label: 'About Page', desc: 'Hero, story, founder, CTA' },
        { id: 'videosections', icon: <Video size={16} />, label: 'Video Sections', desc: 'Shoppable Reels carousels — place on any page' },
        { id: 'sitemap', icon: <Link2 size={16} />, label: 'Site Map & Flow', desc: 'Tree of every link, page & product' },
        { id: 'backgrounds', icon: <Image size={16} />, label: 'Page Backgrounds', desc: 'Per-page background image + opacity' },
      ],
    },
    {
      id: 'seo', label: 'SEO & Pixels',
      items: [
        { id: 'marketing', icon: <Zap size={16} />, label: 'Marketing & SEO Hub', desc: 'Pixels, CAPI, GSC, UTM builder, robots, OG defaults' },
        { id: 'seocommand', icon: <Sparkles size={16} />, label: 'SEO Command Center', desc: 'Semrush + GSC + AI on-page optimizer + technical crawler' },
        { id: 'seodebug', icon: <Globe size={16} />, label: 'SEO Debug', desc: 'Live view of meta tags, JSON-LD and pixels actually injected' },
      ],
    },
    {
      id: 'system', label: 'System & Security',
      items: [
        { id: 'site', icon: <Globe size={16} />, label: 'Site Settings', desc: 'Brand, SEO, social' },
        { id: 'settings', icon: <Settings size={16} />, label: 'Store Settings', desc: 'Theme & waitlist' },
        { id: 'ai', icon: <Zap size={16} />, label: 'AI Search', desc: 'Ask AI bar & model settings' },
        { id: 'communications', icon: <Mail size={16} />, label: 'Communications', desc: 'Email / SMS / WhatsApp / in-app queue' },
        { id: 'messaging', icon: <Send size={16} />, label: 'Messaging Gateway', desc: 'Provider config for Email / SMS / WhatsApp' },
        { id: 'mailsystem', icon: <Mail size={16} />, label: 'Mail System', desc: 'Email status, mailboxes, self-hosted relay guide' },
        { id: 'notifications', icon: <Bell size={16} />, label: 'Notifications', desc: 'Order logs' },
        { id: 'security', icon: <ShieldCheck size={16} />, label: 'Security & 2FA', desc: 'Admin 2FA, backup codes, IP allowlist, login attempts' },
        { id: 'health', icon: <Activity size={16} />, label: 'System Health', desc: 'Cron jobs, queue failures, security events, lockouts' },
        { id: 'auditlog', icon: <ShieldCheck size={16} />, label: 'Audit Log', desc: 'Every privileged admin action with actor + target' },
        { id: 'backup', icon: <Save size={16} />, label: 'Backup & Export', desc: 'CSV/JSON per table + full DB snapshot download' },
      ],
    },
    ...(perms.isSuperAdmin ? [{
      id: 'authority', label: 'Authority',
      items: [
        { id: 'superadmin' as Tab, icon: <Crown size={16} />, label: 'Super Admin Console', desc: 'Role defaults, super-admins & permission audit log' },
      ],
    }] : []),
  ];

  // Filter nav by per-user permissions (super_admin sees everything)
  const visibleNavGroups = navGroups
    .map(g => ({ ...g, items: g.items.filter(i => {
      const need = TAB_PERMISSIONS[i.id];
      if (!need) return true;
      return perms.has(need);
    }) }))
    .filter(g => g.items.length > 0);

  const activeGroupId = visibleNavGroups.find(g => g.items.some(i => i.id === tab))?.id ?? visibleNavGroups[0]?.id ?? 'overview';
  const activeItem = visibleNavGroups.flatMap(g => g.items).find(i => i.id === tab);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <LiveOrderToaster />
      <aside className="w-64 bg-gray-900 text-white shrink-0 flex flex-col">
        <div className="p-5 border-b border-gray-800">
          <p className="text-sm font-black text-orange-400 tracking-wider">NUTROPACT</p>
          <p className="text-[11px] text-gray-500 mt-0.5">Admin Control Panel{perms.isSuperAdmin && <span className="ml-1 text-amber-400">· SUPER</span>}</p>
        </div>
        <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
          {visibleNavGroups.map(group => {
            const hasActive = group.id === activeGroupId;
            return (
              <div key={group.id}>
                <p className={`px-3 mb-1 text-[10px] font-black tracking-widest uppercase ${hasActive ? 'text-orange-400' : 'text-gray-500'}`}>{group.label}</p>
                <div className="space-y-0.5">
                  {group.items.map(item => (
                    <button key={item.id} onClick={() => setTab(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition text-left ${tab === item.id ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
                      <span className="shrink-0">{item.icon}</span>
                      <span className="truncate">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>
        <div className="p-3 border-t border-gray-800">
          <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition font-semibold"><LogOut size={15} /> Sign Out</button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{visibleNavGroups.find(g => g.id === activeGroupId)?.label}</p>
          <h1 className="text-xl font-black text-gray-900 flex items-center gap-2 mt-0.5">
            <span className="text-orange-500">{activeItem?.icon}</span>
            {activeItem?.label ?? 'Dashboard'}
          </h1>
          {activeItem?.desc && <p className="text-xs text-gray-500 mt-0.5">{activeItem.desc}</p>}
        </header>
        <div className="p-6">
        {loading && (tab === 'dashboard' || tab === 'products') ? (
          <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
        ) : (
          <>
            {tab === 'dashboard'    && <DashboardTab />}
            {tab === 'analytics'    && <AnalyticsTab />}
            {tab === 'products'     && <ProductsTab products={products} onAdd={() => setModal({ open: true, product: null })} onEdit={p => setModal({ open: true, product: p })} onDelete={deleteProduct} onToggle={toggleProduct} onDuplicate={duplicateProduct} onStock={updateStock} />}
            {tab === 'categories'   && <CategoriesTab />}
            {tab === 'brands'       && <BrandsTab />}
            {tab === 'flavors'      && <FlavorsTab />}
            {tab === 'sizes'        && <SizesTab />}
            {tab === 'bulkimport'   && <BulkImportTab />}
            {tab === 'inventory'    && <InventoryTab />}
            {tab === 'accounting'   && <AccountingTab />}
            {tab === 'orders'       && <OrdersTab />}
            {tab === 'abandoned'    && <AbandonedCartsTab />}
            {tab === 'reviews'      && <GlobalReviewsTab />}
            {tab === 'reviewmod'    && <ReviewsModerationTab />}
            {tab === 'contact'      && <ContactTab />}
            {tab === 'blog'         && <BlogTab />}
            {tab === 'faq'          && <FAQTab />}
            {tab === 'homepage'     && <HomepageTab />}
            {tab === 'videosections' && <VideoSectionsTab />}
            {tab === 'navigation'   && <NavigationTab />}
            {tab === 'footer'       && <FooterTab />}
            {tab === 'dimensions'   && <DimensionsTab />}
            {tab === 'site'         && <SiteTab />}
            {tab === 'about'        && <AboutTab />}
           {tab === 'coupons'      && <CouponsTab />}
           {tab === 'offers'       && <OffersTab />}
            {tab === 'popups'       && <PopupsTab />}
            {tab === 'notifications' && <NotificationsTab />}
           {tab === 'communications' && <CommunicationsTab />}
           {tab === 'messaging'    && <MessagingTab />}
           {tab === 'whatsapp_channels' && <WhatsAppChannelsTab />}
           {tab === 'urgency' && <UrgencyWidgetsTab />}
           {tab === 'quick_checkout' && <QuickCheckoutTab />}
           {tab === 'variants_pro' && <VariantsProTab />}
           {tab === 'verification' && <VerificationTab />}
           {tab === 'growth_boosters' && <GrowthBoostersTab />}
           
           {tab === 'mailsystem'   && <MailSystemTab />}
            {tab === 'settings'     && <SettingsTab />}
            {tab === 'ai'           && <AITab />}
            {tab === 'shipping'     && <ShippingTab />}
            {tab === 'automation'   && <AutomationTab />}
            {tab === 'reconciliation' && <ReconciliationTab />}
            {tab === 'returns'      && <ReturnsTab />}
            {tab === 'ordermodify'  && <OrderModifyTab />}
            {tab === 'subscriptions' && <SubscriptionsTab />}
            {tab === 'campaigns'    && <CampaignsTab />}
            {tab === 'giftcards'    && <GiftCardsTab />}
            {tab === 'chatbot'      && <ChatbotTab />}
            {tab === 'loyalty'      && <LoyaltyTab />}
            {tab === 'referrals'    && <ReferralsTab />}
            {tab === 'wholesale'    && <WholesaleTab />}
            {tab === 'productqa'    && <ProductQATab />}



            {tab === 'users'        && <UsersTab />}
            {tab === 'customer360'  && <Customer360Tab />}
            {tab === 'pages'        && <PagesTab />}
           {tab === 'sitemap'      && <SiteMapTab />}
           {tab === 'payments'     && <PaymentGatewaysTab />}
           {tab === 'wallet'       && <WalletTab />}
            {tab === 'security'     && <SecurityTab />}
            {tab === 'productauth'  && <ProductAuthTab />}
            {tab === 'auditlog'     && <AuditLogTab />}
            {tab === 'support'      && <SupportInboxTab />}
            {tab === 'seodebug'     && <SeoDebugTab />}
            {tab === 'marketing'    && <MarketingSeoTab />}
            {tab === 'seocommand'   && <SeoCommandTab />}
            {tab === 'roas'         && <RoasDashboardTab />}
            {tab === 'bulkorders'   && <OrderBulkOpsTab />}
            {tab === 'experiments'  && <AbExperimentsTab />}
            {tab === 'backup'       && <BackupExportTab />}
            {tab === 'health'       && <AdminHealthTab />}
            {tab === 'superadmin'   && <SuperAdminTab />}
            {tab === 'backgrounds'  && <PageBackgroundsTab />}
          </>
        )}
        </div>
      </main>
      {modal.open && (
        <ProductModal product={modal.product} onClose={() => setModal({ open: false, product: null })} onSave={saveProduct} onReviewsChanged={loadProducts} />
      )}
    </div>
  );
}
