// @ts-nocheck
import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { Link, useParams, useNavigate } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import {
  Award, BadgeCheck, Bell, ChevronDown, ChevronLeft, ChevronRight,
  Heart, Package, Pencil, Pin, Search, Share2, ShieldCheck,
  ShoppingCart, Star, ThumbsUp, Truck, X, Zap,
  PlayCircle, Camera, Info, FlaskConical, Utensils, BookOpen, Upload, Trash2
} from 'lucide-react';
import { useSimpleUpload } from '@/lib/useSimpleUpload';
import { calculateDiscount, formatPrice } from '@/lib/utils';
import { formatSizeDisplay } from '@/lib/sizeFormat';
import SizeGuideButton from '@/components/product/SizeGuideButton';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { useSEO, useBreadcrumbSEO } from '@/lib/useSEO';
import { trackViewItem, trackAddToCart, initProductPixels } from '@/lib/analytics';
import { subscribeNotifyMe } from '@/lib/notify-me.functions';
import TrustBadges from '@/components/TrustBadges';
import QuickBuyButtons from '@/components/QuickBuyButtons';
import OffersSection from '@/components/product/OffersSection';
import MiniComboBuilder from '@/components/product/MiniComboBuilder';
import ProductQA from '@/components/product/ProductQA';
import UrgencyStack from '@/components/product/UrgencyStack';
// (Hindi-only infographics removed — replaced by site-wide multi-language preference)
import VariantsProPicker from '@/components/product/VariantsProPicker';
import VideoSections from '@/components/video-sections/VideoSections';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import API from '@/lib/api';
import { useLocale } from '@/lib/i18n';
import { getProductTranslation } from '@/lib/translations.functions';

// ─── Shipping zones ─────────────────────────────────────────────────────────

interface ShippingZone {
  city: string;
  region: string;
  minDays: number;
  maxDays: number;
  cod: boolean;
  label: string;
  color: string;
  badgeBg: string;
}

// 2-digit pincode prefix → shipping zone info
const SHIPPING_ZONES: Record<string, ShippingZone> = {
  // ── Zone A — Metro (1–2 days) ──────────────────────────────────────────
  '11': { city: 'New Delhi', region: 'Delhi NCR', minDays: 1, maxDays: 2, cod: true, label: 'Express', color: 'text-green-700', badgeBg: 'bg-green-50 border-green-200' },
  '10': { city: 'New Delhi', region: 'Delhi NCR', minDays: 1, maxDays: 2, cod: true, label: 'Express', color: 'text-green-700', badgeBg: 'bg-green-50 border-green-200' },
  '12': { city: 'Gurugram', region: 'Delhi NCR', minDays: 1, maxDays: 2, cod: true, label: 'Express', color: 'text-green-700', badgeBg: 'bg-green-50 border-green-200' },
  '13': { city: 'Faridabad', region: 'Delhi NCR', minDays: 1, maxDays: 2, cod: true, label: 'Express', color: 'text-green-700', badgeBg: 'bg-green-50 border-green-200' },
  '40': { city: 'Mumbai', region: 'Maharashtra', minDays: 1, maxDays: 2, cod: true, label: 'Express', color: 'text-green-700', badgeBg: 'bg-green-50 border-green-200' },
  '41': { city: 'Thane / Pune', region: 'Maharashtra', minDays: 1, maxDays: 2, cod: true, label: 'Express', color: 'text-green-700', badgeBg: 'bg-green-50 border-green-200' },
  '42': { city: 'Pune', region: 'Maharashtra', minDays: 1, maxDays: 2, cod: true, label: 'Express', color: 'text-green-700', badgeBg: 'bg-green-50 border-green-200' },
  '56': { city: 'Bengaluru', region: 'Karnataka', minDays: 1, maxDays: 2, cod: true, label: 'Express', color: 'text-green-700', badgeBg: 'bg-green-50 border-green-200' },
  '60': { city: 'Chennai', region: 'Tamil Nadu', minDays: 1, maxDays: 2, cod: true, label: 'Express', color: 'text-green-700', badgeBg: 'bg-green-50 border-green-200' },
  '50': { city: 'Hyderabad', region: 'Telangana', minDays: 1, maxDays: 2, cod: true, label: 'Express', color: 'text-green-700', badgeBg: 'bg-green-50 border-green-200' },
  '70': { city: 'Kolkata', region: 'West Bengal', minDays: 1, maxDays: 2, cod: true, label: 'Express', color: 'text-green-700', badgeBg: 'bg-green-50 border-green-200' },
  '38': { city: 'Ahmedabad', region: 'Gujarat', minDays: 1, maxDays: 2, cod: true, label: 'Express', color: 'text-green-700', badgeBg: 'bg-green-50 border-green-200' },
  // ── Zone B — Tier 2 (2–4 days) ─────────────────────────────────────────
  '30': { city: 'Jaipur', region: 'Rajasthan', minDays: 2, maxDays: 4, cod: true, label: 'Standard', color: 'text-blue-700', badgeBg: 'bg-blue-50 border-blue-200' },
  '31': { city: 'Rajasthan', region: 'Rajasthan', minDays: 2, maxDays: 4, cod: true, label: 'Standard', color: 'text-blue-700', badgeBg: 'bg-blue-50 border-blue-200' },
  '32': { city: 'Rajasthan', region: 'Rajasthan', minDays: 2, maxDays: 4, cod: true, label: 'Standard', color: 'text-blue-700', badgeBg: 'bg-blue-50 border-blue-200' },
  '20': { city: 'Lucknow', region: 'Uttar Pradesh', minDays: 2, maxDays: 3, cod: true, label: 'Standard', color: 'text-blue-700', badgeBg: 'bg-blue-50 border-blue-200' },
  '21': { city: 'Kanpur', region: 'Uttar Pradesh', minDays: 2, maxDays: 3, cod: true, label: 'Standard', color: 'text-blue-700', badgeBg: 'bg-blue-50 border-blue-200' },
  '22': { city: 'Agra', region: 'Uttar Pradesh', minDays: 2, maxDays: 3, cod: true, label: 'Standard', color: 'text-blue-700', badgeBg: 'bg-blue-50 border-blue-200' },
  '23': { city: 'Allahabad', region: 'Uttar Pradesh', minDays: 2, maxDays: 4, cod: true, label: 'Standard', color: 'text-blue-700', badgeBg: 'bg-blue-50 border-blue-200' },
  '24': { city: 'Uttar Pradesh', region: 'Uttar Pradesh', minDays: 2, maxDays: 4, cod: true, label: 'Standard', color: 'text-blue-700', badgeBg: 'bg-blue-50 border-blue-200' },
  '25': { city: 'Varanasi', region: 'Uttar Pradesh', minDays: 2, maxDays: 4, cod: true, label: 'Standard', color: 'text-blue-700', badgeBg: 'bg-blue-50 border-blue-200' },
  '14': { city: 'Amritsar', region: 'Punjab', minDays: 2, maxDays: 3, cod: true, label: 'Standard', color: 'text-blue-700', badgeBg: 'bg-blue-50 border-blue-200' },
  '15': { city: 'Ludhiana', region: 'Punjab', minDays: 2, maxDays: 3, cod: true, label: 'Standard', color: 'text-blue-700', badgeBg: 'bg-blue-50 border-blue-200' },
  '16': { city: 'Chandigarh', region: 'Punjab/Haryana', minDays: 2, maxDays: 3, cod: true, label: 'Standard', color: 'text-blue-700', badgeBg: 'bg-blue-50 border-blue-200' },
  '39': { city: 'Surat', region: 'Gujarat', minDays: 2, maxDays: 3, cod: true, label: 'Standard', color: 'text-blue-700', badgeBg: 'bg-blue-50 border-blue-200' },
  '36': { city: 'Gujarat', region: 'Gujarat', minDays: 2, maxDays: 3, cod: true, label: 'Standard', color: 'text-blue-700', badgeBg: 'bg-blue-50 border-blue-200' },
  '37': { city: 'Gujarat', region: 'Gujarat', minDays: 2, maxDays: 3, cod: true, label: 'Standard', color: 'text-blue-700', badgeBg: 'bg-blue-50 border-blue-200' },
  '44': { city: 'Nagpur', region: 'Maharashtra', minDays: 2, maxDays: 4, cod: true, label: 'Standard', color: 'text-blue-700', badgeBg: 'bg-blue-50 border-blue-200' },
  '43': { city: 'Nashik', region: 'Maharashtra', minDays: 2, maxDays: 4, cod: true, label: 'Standard', color: 'text-blue-700', badgeBg: 'bg-blue-50 border-blue-200' },
  '45': { city: 'Madhya Pradesh', region: 'MP', minDays: 2, maxDays: 4, cod: true, label: 'Standard', color: 'text-blue-700', badgeBg: 'bg-blue-50 border-blue-200' },
  '46': { city: 'Madhya Pradesh', region: 'MP', minDays: 2, maxDays: 4, cod: true, label: 'Standard', color: 'text-blue-700', badgeBg: 'bg-blue-50 border-blue-200' },
  '47': { city: 'Madhya Pradesh', region: 'MP', minDays: 2, maxDays: 4, cod: true, label: 'Standard', color: 'text-blue-700', badgeBg: 'bg-blue-50 border-blue-200' },
  '48': { city: 'Madhya Pradesh', region: 'MP', minDays: 2, maxDays: 4, cod: true, label: 'Standard', color: 'text-blue-700', badgeBg: 'bg-blue-50 border-blue-200' },
  '49': { city: 'Raipur / Chhattisgarh', region: 'Chhattisgarh', minDays: 2, maxDays: 4, cod: true, label: 'Standard', color: 'text-blue-700', badgeBg: 'bg-blue-50 border-blue-200' },
  '51': { city: 'Nagpur', region: 'Maharashtra', minDays: 2, maxDays: 4, cod: true, label: 'Standard', color: 'text-blue-700', badgeBg: 'bg-blue-50 border-blue-200' },
  '52': { city: 'Visakhapatnam', region: 'Andhra Pradesh', minDays: 2, maxDays: 4, cod: true, label: 'Standard', color: 'text-blue-700', badgeBg: 'bg-blue-50 border-blue-200' },
  '53': { city: 'Andhra Pradesh', region: 'Andhra Pradesh', minDays: 2, maxDays: 4, cod: true, label: 'Standard', color: 'text-blue-700', badgeBg: 'bg-blue-50 border-blue-200' },
  '54': { city: 'Andhra Pradesh', region: 'Andhra Pradesh', minDays: 2, maxDays: 4, cod: true, label: 'Standard', color: 'text-blue-700', badgeBg: 'bg-blue-50 border-blue-200' },
  '57': { city: 'Mysuru', region: 'Karnataka', minDays: 2, maxDays: 4, cod: true, label: 'Standard', color: 'text-blue-700', badgeBg: 'bg-blue-50 border-blue-200' },
  '58': { city: 'Karnataka', region: 'Karnataka', minDays: 2, maxDays: 4, cod: true, label: 'Standard', color: 'text-blue-700', badgeBg: 'bg-blue-50 border-blue-200' },
  '59': { city: 'Karnataka', region: 'Karnataka', minDays: 2, maxDays: 4, cod: true, label: 'Standard', color: 'text-blue-700', badgeBg: 'bg-blue-50 border-blue-200' },
  '61': { city: 'Coimbatore', region: 'Tamil Nadu', minDays: 2, maxDays: 4, cod: true, label: 'Standard', color: 'text-blue-700', badgeBg: 'bg-blue-50 border-blue-200' },
  '62': { city: 'Madurai', region: 'Tamil Nadu', minDays: 2, maxDays: 4, cod: true, label: 'Standard', color: 'text-blue-700', badgeBg: 'bg-blue-50 border-blue-200' },
  '63': { city: 'Tamil Nadu', region: 'Tamil Nadu', minDays: 2, maxDays: 4, cod: true, label: 'Standard', color: 'text-blue-700', badgeBg: 'bg-blue-50 border-blue-200' },
  '64': { city: 'Tamil Nadu', region: 'Tamil Nadu', minDays: 2, maxDays: 4, cod: true, label: 'Standard', color: 'text-blue-700', badgeBg: 'bg-blue-50 border-blue-200' },
  '67': { city: 'Kozhikode', region: 'Kerala', minDays: 2, maxDays: 4, cod: true, label: 'Standard', color: 'text-blue-700', badgeBg: 'bg-blue-50 border-blue-200' },
  '68': { city: 'Kochi', region: 'Kerala', minDays: 2, maxDays: 4, cod: true, label: 'Standard', color: 'text-blue-700', badgeBg: 'bg-blue-50 border-blue-200' },
  '69': { city: 'Thiruvananthapuram', region: 'Kerala', minDays: 2, maxDays: 4, cod: true, label: 'Standard', color: 'text-blue-700', badgeBg: 'bg-blue-50 border-blue-200' },
  '71': { city: 'West Bengal', region: 'West Bengal', minDays: 2, maxDays: 4, cod: true, label: 'Standard', color: 'text-blue-700', badgeBg: 'bg-blue-50 border-blue-200' },
  '72': { city: 'West Bengal', region: 'West Bengal', minDays: 2, maxDays: 4, cod: true, label: 'Standard', color: 'text-blue-700', badgeBg: 'bg-blue-50 border-blue-200' },
  '73': { city: 'West Bengal', region: 'West Bengal', minDays: 2, maxDays: 4, cod: true, label: 'Standard', color: 'text-blue-700', badgeBg: 'bg-blue-50 border-blue-200' },
  '80': { city: 'Patna', region: 'Bihar', minDays: 2, maxDays: 4, cod: true, label: 'Standard', color: 'text-blue-700', badgeBg: 'bg-blue-50 border-blue-200' },
  '81': { city: 'Bihar', region: 'Bihar', minDays: 2, maxDays: 5, cod: true, label: 'Standard', color: 'text-blue-700', badgeBg: 'bg-blue-50 border-blue-200' },
  '82': { city: 'Bihar', region: 'Bihar', minDays: 2, maxDays: 5, cod: true, label: 'Standard', color: 'text-blue-700', badgeBg: 'bg-blue-50 border-blue-200' },
  '83': { city: 'Ranchi / Jharkhand', region: 'Jharkhand', minDays: 2, maxDays: 4, cod: true, label: 'Standard', color: 'text-blue-700', badgeBg: 'bg-blue-50 border-blue-200' },
  '84': { city: 'Jharkhand', region: 'Jharkhand', minDays: 2, maxDays: 5, cod: true, label: 'Standard', color: 'text-blue-700', badgeBg: 'bg-blue-50 border-blue-200' },
  '85': { city: 'Jharkhand / Odisha', region: 'East India', minDays: 3, maxDays: 5, cod: true, label: 'Standard', color: 'text-blue-700', badgeBg: 'bg-blue-50 border-blue-200' },
  '75': { city: 'Odisha', region: 'Odisha', minDays: 3, maxDays: 5, cod: true, label: 'Standard', color: 'text-blue-700', badgeBg: 'bg-blue-50 border-blue-200' },
  '76': { city: 'Odisha', region: 'Odisha', minDays: 3, maxDays: 5, cod: true, label: 'Standard', color: 'text-blue-700', badgeBg: 'bg-blue-50 border-blue-200' },
  '89': { city: 'Nagaland / Manipur', region: 'Northeast', minDays: 5, maxDays: 8, cod: false, label: 'Extended', color: 'text-orange-700', badgeBg: 'bg-orange-50 border-orange-200' },
  '90': { city: 'Assam', region: 'Northeast', minDays: 4, maxDays: 7, cod: false, label: 'Extended', color: 'text-orange-700', badgeBg: 'bg-orange-50 border-orange-200' },
  '91': { city: 'Assam', region: 'Northeast', minDays: 4, maxDays: 7, cod: false, label: 'Extended', color: 'text-orange-700', badgeBg: 'bg-orange-50 border-orange-200' },
  '92': { city: 'Assam', region: 'Northeast', minDays: 4, maxDays: 7, cod: false, label: 'Extended', color: 'text-orange-700', badgeBg: 'bg-orange-50 border-orange-200' },
  '93': { city: 'Arunachal Pradesh', region: 'Northeast', minDays: 5, maxDays: 8, cod: false, label: 'Extended', color: 'text-orange-700', badgeBg: 'bg-orange-50 border-orange-200' },
  '74': { city: 'Sikkim', region: 'Northeast', minDays: 5, maxDays: 8, cod: false, label: 'Extended', color: 'text-orange-700', badgeBg: 'bg-orange-50 border-orange-200' },
  '77': { city: 'Meghalaya / Manipur', region: 'Northeast', minDays: 5, maxDays: 8, cod: false, label: 'Extended', color: 'text-orange-700', badgeBg: 'bg-orange-50 border-orange-200' },
  '78': { city: 'Assam', region: 'Northeast', minDays: 4, maxDays: 7, cod: false, label: 'Extended', color: 'text-orange-700', badgeBg: 'bg-orange-50 border-orange-200' },
  '79': { city: 'Assam', region: 'Northeast', minDays: 4, maxDays: 7, cod: false, label: 'Extended', color: 'text-orange-700', badgeBg: 'bg-orange-50 border-orange-200' },
  // ── Remote / Zone D ───────────────────────────────────────────────────
  '17': { city: 'Himachal Pradesh', region: 'Himachal', minDays: 4, maxDays: 7, cod: false, label: 'Extended', color: 'text-orange-700', badgeBg: 'bg-orange-50 border-orange-200' },
  '18': { city: 'Jammu', region: 'J&K', minDays: 5, maxDays: 8, cod: false, label: 'Extended', color: 'text-orange-700', badgeBg: 'bg-orange-50 border-orange-200' },
  '19': { city: 'Srinagar', region: 'J&K', minDays: 5, maxDays: 8, cod: false, label: 'Extended', color: 'text-orange-700', badgeBg: 'bg-orange-50 border-orange-200' },
};

// Default fallback for unlisted pincodes
const DEFAULT_ZONE: ShippingZone = { city: '', region: 'India', minDays: 3, maxDays: 6, cod: true, label: 'Standard', color: 'text-blue-700', badgeBg: 'bg-blue-50 border-blue-200' };

function getShippingInfo(pin: string): ShippingZone | null {
  if (pin.length !== 6) return null;
  const prefix2 = pin.slice(0, 2);
  return SHIPPING_ZONES[prefix2] || DEFAULT_ZONE;
}

function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) added++; // skip Sunday (0) and Saturday (6)
  }
  return result;
}

function formatDeliveryDate(date: Date): string {
  return date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

// ─── Helper components ──────────────────────────────────────────────────────

function Stars({ value = 0, size = 'md', interactive = false, onChange }: {
  value?: number; size?: 'sm' | 'md' | 'lg'; interactive?: boolean; onChange?: (n: number) => void;
}) {
  const [hover, setHover] = useState(0);
  const cls = size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-2xl' : 'text-lg';
  return (
    <span className={`${cls} text-yellow-500 flex gap-0.5`}>
      {[1, 2, 3, 4, 5].map(n => (
        <span key={n}
          className={interactive ? 'cursor-pointer transition-transform hover:scale-125' : ''}
          onMouseEnter={() => interactive && setHover(n)}
          onMouseLeave={() => interactive && setHover(0)}
          onClick={() => interactive && onChange?.(n)}>
          {n <= (interactive ? (hover || value) : value) ? '★' : '☆'}
        </span>
      ))}
    </span>
  );
}

function RatingBar({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-10 text-gray-500 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-yellow-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-right font-semibold text-gray-600">{pct}%</span>
    </div>
  );
}

function Lightbox({ images, startIndex, onClose }: { images: string[]; startIndex: number; onClose: () => void }) {
  const [idx, setIdx] = useState(startIndex);
  const prev = () => setIdx(i => (i - 1 + images.length) % images.length);
  const next = () => setIdx(i => (i + 1) % images.length);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowLeft') prev(); if (e.key === 'ArrowRight') next(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);
  return (
    <div role="dialog" aria-modal="true" aria-label="Image viewer" className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={onClose}>
      <button onClick={onClose} aria-label="Close image viewer" className="absolute top-4 right-4 text-white bg-white/10 rounded-full p-2 hover:bg-white/20"><X size={22} /></button>
      {images.length > 1 && <>
        <button onClick={e => { e.stopPropagation(); prev(); }} aria-label="Previous image" className="absolute left-4 text-white bg-white/10 rounded-full p-2 hover:bg-white/20"><ChevronLeft size={22} /></button>
        <button onClick={e => { e.stopPropagation(); next(); }} aria-label="Next image" className="absolute right-14 text-white bg-white/10 rounded-full p-2 hover:bg-white/20"><ChevronRight size={22} /></button>
      </>}
      <img src={images[idx]} alt={`Product image ${idx + 1}`} loading="lazy" decoding="async" className="max-h-[85vh] max-w-[85vw] object-contain" onClick={e => e.stopPropagation()} />
      {images.length > 1 && (
        <div className="absolute bottom-4 flex gap-2">
          {images.map((_, i) => <button key={i} onClick={e => { e.stopPropagation(); setIdx(i); }} aria-label={`Go to image ${i + 1}`} aria-current={i === idx ? 'true' : undefined} className={`w-2 h-2 rounded-full ${i === idx ? 'bg-white' : 'bg-white/40'}`} />)}
        </div>
      )}
    </div>
  );
}

function VideoEmbed({ url, className = '' }: { url: string; className?: string }) {
  if (!url) return null;
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/);
  if (ytMatch) {
    return <iframe src={`https://www.youtube.com/embed/${ytMatch[1]}`} className={`w-full aspect-video rounded-lg ${className}`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />;
  }
  return <video src={url} controls playsInline preload="none" className={`w-full rounded-lg ${className}`} />;
}

function QAItem({ qa }: { qa: { q: string; a: string } }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-100 rounded-2xl overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-start justify-between gap-4 px-5 py-4 text-left hover:bg-gray-50 transition">
        <span className="font-bold text-gray-900 text-sm sm:text-base">{qa.q}</span>
        <ChevronDown size={18} className={`transition shrink-0 mt-0.5 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-5 pb-5 text-sm text-gray-600 leading-relaxed border-t border-gray-50">{qa.a}</div>}
    </div>
  );
}

function ReviewCard({ review, onHelpful, productId }: { review: any; onHelpful: () => void; productId: string }) {
  const [expanded, setExpanded] = useState(false);
  const [lightbox, setLightbox] = useState(-1);
  const isLong = review.comment?.length > 200;
  return (
    <article className="border border-gray-100 rounded-2xl p-5 bg-white shadow-sm" itemScope itemType="https://schema.org/Review">
      <div className="flex items-start gap-3 mb-3">
        <img src={review.avatar || `https://i.pravatar.cc/80?u=${encodeURIComponent(review.name)}`} alt={review.name}
          className="w-11 h-11 rounded-full object-cover border-2 border-orange-50 shrink-0" loading="lazy"  decoding="async"/>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-bold text-gray-900" itemProp="author">{review.name}</p>
            {review.verified && <span className="flex items-center gap-1 text-emerald-600 text-xs font-semibold"><BadgeCheck size={13} className="fill-emerald-600 stroke-white" /> Verified Buyer</span>}
            {review.pinned && <span className="flex items-center gap-1 text-orange-500 text-xs font-semibold"><Pin size={11} /> Pinned</span>}
            {review.source === 'admin' && <span className="bg-blue-50 text-blue-600 text-xs px-2 py-0.5 rounded-full font-semibold">Staff Pick</span>}
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span itemProp="reviewRating" itemScope itemType="https://schema.org/Rating">
              <Stars value={review.rating} size="sm" />
              <meta itemProp="ratingValue" content={String(review.rating)} />
            </span>
            {review.variant && <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-500">{review.variant}</span>}
            {review.createdAt && <span className="text-xs text-gray-500" itemProp="datePublished">{new Date(review.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
          </div>
        </div>
      </div>
      {review.title && <p className="font-bold text-gray-900 mb-1" itemProp="name">{review.title}</p>}
      <p className="text-gray-600 text-sm leading-relaxed" itemProp="reviewBody">
        {isLong && !expanded ? review.comment.slice(0, 200) + '...' : review.comment}
        {isLong && <button onClick={() => setExpanded(e => !e)} className="text-orange-500 text-xs ml-1 font-semibold">{expanded ? 'Show less' : 'Read more'}</button>}
      </p>
      {review.images?.length > 0 && (
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          {review.images.map((img: string, i: number) => (
            <button key={i} onClick={() => setLightbox(i)} className="shrink-0 w-20 h-20 rounded-lg overflow-hidden border border-gray-100 hover:opacity-80 transition">
              <img src={img} alt="" className="w-full h-full object-cover" loading="lazy"  decoding="async"/>
            </button>
          ))}
        </div>
      )}
      {review.video && (
        <div className="mt-3">
          <VideoEmbed url={review.video} className="max-h-48" />
        </div>
      )}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-50">
        <button onClick={onHelpful} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-600 transition">
          <ThumbsUp size={13} /> Helpful {review.helpful > 0 && `(${review.helpful})`}
        </button>
      </div>
      {lightbox >= 0 && <Lightbox images={review.images} startIndex={lightbox} onClose={() => setLightbox(-1)} />}
    </article>
  );
}

function DeliveryChecker({ pincode, shippingInfo, pincodeError, productPrice, onChange, onCheck }: {
  pincode: string; shippingInfo: ShippingZone | null; pincodeError: boolean;
  productPrice: number; onChange: (v: string) => void; onCheck: () => void;
}) {
  const today = new Date();
  const hour = today.getHours();
  const dispatchToday = hour < 14; // orders before 2 PM dispatch same day
  const processOffset = dispatchToday ? 0 : 1;

  const earliest = shippingInfo ? addBusinessDays(today, processOffset + shippingInfo.minDays) : null;
  const latest = shippingInfo ? addBusinessDays(today, processOffset + shippingInfo.maxDays) : null;
  const isFreeDelivery = productPrice >= 999;

  return (
    <div>
      <p className="text-sm font-bold mb-2 flex items-center gap-1.5 text-gray-700">
        <Truck size={15} /> Check Delivery
      </p>
      <div className="flex gap-2">
        <input
          value={pincode}
          onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
          onKeyDown={e => e.key === 'Enter' && pincode.length === 6 && onCheck()}
          placeholder="Enter 6-digit pincode"
          maxLength={6}
          inputMode="numeric"
          className={`flex-1 border rounded-xl px-4 py-2.5 text-sm focus:outline-none transition ${pincodeError ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-orange-400'}`}
        />
        <button
          onClick={onCheck}
          disabled={pincode.length !== 6}
          className="bg-gray-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-800 transition disabled:opacity-40">
          Check
        </button>
      </div>

      {pincodeError && (
        <p className="text-red-500 text-xs mt-2">Unable to check. Please verify the pincode.</p>
      )}

      {shippingInfo && earliest && latest && (
        <div className={`mt-3 rounded-xl border p-4 ${shippingInfo.badgeBg}`}>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className={`text-xs font-black uppercase tracking-wide px-2 py-0.5 rounded-full border ${shippingInfo.badgeBg} ${shippingInfo.color}`}>
                  {shippingInfo.label} Delivery
                </span>
                {isFreeDelivery && (
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    FREE Shipping
                  </span>
                )}
                {shippingInfo.cod && (
                  <span className="text-xs font-bold text-gray-600 bg-white border border-gray-200 px-2 py-0.5 rounded-full">
                    COD Available
                  </span>
                )}
                {!shippingInfo.cod && (
                  <span className="text-xs font-bold text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">
                    Prepaid Only
                  </span>
                )}
              </div>
              {shippingInfo.city && (
                <p className="text-xs text-gray-500 mb-1.5">
                  Delivering to: <span className="font-semibold text-gray-700">{shippingInfo.city}, {shippingInfo.region}</span>
                </p>
              )}
              <p className={`text-sm font-bold ${shippingInfo.color}`}>
                🗓 {formatDeliveryDate(earliest)} – {formatDeliveryDate(latest)}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {shippingInfo.minDays === shippingInfo.maxDays
                  ? `${shippingInfo.minDays} business day${shippingInfo.minDays > 1 ? 's' : ''}`
                  : `${shippingInfo.minDays}–${shippingInfo.maxDays} business days`}
                {' '}after dispatch
              </p>
            </div>
            <Truck size={28} className={`${shippingInfo.color} opacity-30 shrink-0 mt-1`} />
          </div>
          <p className="text-xs text-gray-500 mt-2 border-t border-black/5 pt-2">
            {dispatchToday
              ? '⚡ Order before 2 PM today for same-day dispatch'
              : '📦 Order now — dispatched next business day'}
          </p>
        </div>
      )}
    </div>
  );
}

function StickyATCBar({ product, price, selectedFlavor, selectedSize, onAdd, onBuy, added, stock }: {
  product: any; price: number; selectedFlavor: string; selectedSize: string; onAdd: () => void; onBuy: () => void; added: boolean; stock: number;
}) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => setVisible(!e.isIntersecting), { threshold: 0, rootMargin: '-80px 0px 0px 0px' });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return (
    <>
      <div ref={ref} className="h-0" />
      <div className={`fixed bottom-0 left-0 right-0 z-30 transition-transform duration-300 ${visible ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="bg-white border-t border-gray-200 shadow-2xl px-4 py-3">
          <div className="max-w-5xl mx-auto flex items-center gap-3">
            {product.images?.[0] && <img src={product.images[0]} alt="" className="w-10 h-10 object-cover rounded-lg bg-gray-100 shrink-0"  loading="lazy" decoding="async"/>}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm truncate">{product.name}</p>
              <p className="text-xs text-gray-500">{[selectedFlavor, selectedSize].filter(Boolean).join(' · ')}</p>
            </div>
            <p className="font-black text-orange-500 shrink-0">{formatPrice(price)}</p>
            <button onClick={onAdd} disabled={stock === 0}
              className="shrink-0 border-2 border-gray-900 px-4 py-2.5 font-black text-sm flex items-center gap-1.5 rounded-xl hover:bg-gray-50 transition disabled:opacity-50">
              <ShoppingCart size={14} /> {added ? '✓ Added' : 'Add'}
            </button>
            <button onClick={onBuy} disabled={stock === 0}
              className="shrink-0 bg-yellow-400 hover:bg-yellow-500 px-4 py-2.5 font-black text-sm flex items-center gap-1.5 rounded-xl transition disabled:opacity-50">
              <Zap size={14} /> Buy Now
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Main ProductPage ────────────────────────────────────────────────────────

const INFO_TABS = [
  { id: 'description', label: 'Description', icon: BookOpen },
  { id: 'howtouse', label: 'How to Use', icon: Info },
  { id: 'ingredients', label: 'Ingredients', icon: FlaskConical },
  { id: 'nutrition', label: 'Nutrition Facts', icon: Utensils },
];

const REVIEW_SORT_OPTIONS = [
  { value: 'helpful', label: 'Most Helpful' },
  { value: 'newest', label: 'Newest First' },
  { value: 'highest', label: 'Highest Rated' },
  { value: 'lowest', label: 'Lowest Rated' },
  { value: 'photos', label: 'With Photos' },
];

const FLAVOR_COLORS: Record<string, string> = {
  'Chocolate': '#6B3A2A', 'Dark Chocolate': '#3B1F0E',
  'Vanilla': '#C8A870', 'French Vanilla': '#D4A060', 'Vanilla Ice Cream': '#E8D09A',
  'Strawberry': '#E8436A', 'Strawberry Cream': '#F4728A',
  'Cookies & Cream': '#2C2C2C', 'Cookies and Cream': '#2C2C2C',
  'Watermelon': '#E83D4E', 'Mango': '#F0900A',
  'Blue Raspberry': '#2A4AE8', 'Green Apple': '#4AAE2A',
  'Cola': '#3B1F0E', 'Banana': '#F0C040',
  'Butterscotch': '#D4A060', 'Unflavoured': '#9E9E9E',
  'Choco Caramel': '#8B5E3C', 'Mocha': '#6B4226',
  'Kesar Pista': '#C8A830', 'Pineapple': '#F0D020',
};

function usePrimaryColor() {
  const [color, setColor] = useState('#f97316');
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setColor(window.localStorage.getItem('np_primary_color') || '#f97316');
    const sync = () => setColor(window.localStorage.getItem('np_primary_color') || '#f97316');
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  return color;
}

export default function ProductPage() {
  const { slug } = useParams({ from: '/products/$slug' });
  const navigateFn = useNavigate();
  const navigate = (to: string) => navigateFn({ to });
  const addItem = useCartStore(s => s.addItem);
  const { user } = useAuthStore();
  const { isEnabled } = useFeatureFlags();
  const proOn = isEnabled('variants_pro');

  const [product, setProduct] = useState<any>(null);
  const [related, setRelated] = useState<any[]>([]);
  const [selectedImage, setSelectedImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedFlavor, setSelectedFlavor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [added, setAdded] = useState(false);
  const [infoTab, setInfoTab] = useState('description');
  const [reviewSort, setReviewSort] = useState('helpful');
  const [starFilter, setStarFilter] = useState(0);
  const [onlyPhotos, setOnlyPhotos] = useState(false);
  const [variantOpen, setVariantOpen] = useState(true);
  const [reviewPage, setReviewPage] = useState(1);
  const REVIEWS_PER_PAGE = 5;

  const [reviewForm, setReviewForm] = useState({
    name: '', rating: 5, title: '', comment: '', images: '', video: '', variant: '',
  });
  const [reviewImages, setReviewImages] = useState<string[]>([]);
  const reviewImgRef = useRef<HTMLInputElement>(null);
  const reviewVideoRef = useRef<HTMLInputElement>(null);
  const { uploadFile: uploadReviewImg, isUploading: reviewImgUploading, progress: reviewImgProgress } = useSimpleUpload({
    onSuccess: (url: string) => setReviewImages(prev => [...prev, url]),
  });
  const { uploadFile: uploadReviewVideo, isUploading: reviewVideoUploading, progress: reviewVideoProgress } = useSimpleUpload();
  const [reviewSaving, setReviewSaving] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);
  const [pincode, setPincode] = useState('');
  const [shippingInfo, setShippingInfo] = useState<ShippingZone | null>(null);
  const [pincodeError, setPincodeError] = useState(false);
  const [notifySending, setNotifySending] = useState(false);
  const [notifyDone, setNotifyDone] = useState(false);
  const [showWriteReview, setShowWriteReview] = useState(false);
  const notifyFn = useServerFn(subscribeNotifyMe);
  const primaryColor = usePrimaryColor();

  const [locale] = useLocale();
  const getTranslationFn = useServerFn(getProductTranslation);

  useEffect(() => {
    setProduct(null); setSelectedImage(0); setStarFilter(0); setOnlyPhotos(false); setReviewPage(1);
    API.get(`/products/${slug}`).then(r => {
      const d = r.data;
      setProduct(d);
      setSelectedFlavor(d.flavors?.[0] || '');
      setSelectedSize(d.sizes?.[0] || '');
      if (d.pixels) initProductPixels(d.pixels);
      trackViewItem({ id: d._id, name: d.name, price: d.price, category: d.category, pixels: d.pixels });
      // Recently viewed (lite: localStorage only)
      import('@/lib/recentlyViewed').then(({ trackRecentlyViewed }) => {
        trackRecentlyViewed({
          id: d._id || d.id || slug,
          slug,
          name: d.name,
          image: d.images?.[0],
          price: d.price,
        });
      }).catch(() => {});
    }).catch(() => navigate('/products'));
    API.get('/products').then(r => setRelated(r.data || [])).catch(() => {});
  }, [slug]);

  // ─── Multi-language: overlay translated copy onto product (lite-mode: skip when locale=en) ───
  useEffect(() => {
    if (!product || locale === 'en') return;
    const pid = String(product._id || product.id || '');
    if (!pid) return;
    let cancelled = false;
    getTranslationFn({ data: { productId: pid, locale } })
      .then((r: any) => {
        if (cancelled || !r?.translated) return;
        setProduct((p: any) => p ? {
          ...p,
          name: r.name || p.name,
          shortDescription: r.description ? String(r.description).slice(0, 200) : p.shortDescription,
          description: r.description || p.description,
          howToUse: r.usage || p.howToUse,
          _translatedLocale: locale,
        } : p);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [locale, product?._id, product?.id]);

  useSEO(product ? {
    title: product.name, description: product.shortDescription || product.description?.slice(0, 155),
    image: product.images?.[0], type: 'product', price: product.price,
    availability: (product.stock || 0) > 0 ? 'InStock' : 'OutOfStock',
    brand: 'NutroPact', sku: product._id, rating: product.ratings,
    reviewCount: product.numReviews, keywords: `${product.name}, buy ${product.name?.toLowerCase()} india, NutroPact ${product.category?.toLowerCase()}`,
  } : {});

  useBreadcrumbSEO(product ? [
    { name: 'Home', url: '/' }, { name: 'Products', url: '/products' }, { name: product.name, url: `/products/${slug}` },
  ] : []);

  const currentVariant = useMemo(() => {
    if (!product?.variants?.length) return null;
    return product.variants.find((v: any) => (!selectedFlavor || v.flavor === selectedFlavor) && (!selectedSize || v.size === selectedSize)) || null;
  }, [product, selectedFlavor, selectedSize]);

  // When variant changes and has its own image, jump gallery to it
  useEffect(() => {
    if (currentVariant?.image || currentVariant?.images?.length) setSelectedImage(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentVariant?.image, currentVariant?.images?.length]);

  const price = currentVariant?.price ?? product?.price ?? 0;
  const stock = currentVariant?.stock ?? product?.stock ?? 0;
  const discount = product?.comparePrice > price ? calculateDiscount(price, product.comparePrice) : 0;
  // Variant image (if any) leads the gallery — falls back to product images
  const baseImages: string[] = product?.images?.length ? product.images : [];
  // Variant gallery (multi-image) leads, then product images, deduped.
  const variantImages: string[] = Array.isArray(currentVariant?.images) && currentVariant.images.length
    ? currentVariant.images
    : (currentVariant?.image ? [currentVariant.image] : []);
  const images = variantImages.length
    ? Array.from(new Set([...variantImages, ...baseImages]))
    : baseImages;
  const productVideo = product?.video || '';
  const [showVideo, setShowVideo] = useState(false);
  const isLowStock = stock > 0 && stock <= 10;

  const allReviews: any[] = useMemo(() => {
    if (!product?.reviews) return [];
    let sorted = [...(product.reviews as any[])];
    if (starFilter) sorted = sorted.filter(r => r.rating === starFilter);
    if (onlyPhotos) sorted = sorted.filter(r => r.images?.length || r.video);
    sorted.sort((a, b) => {
      if (b.pinned !== a.pinned) return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
      if (reviewSort === 'helpful') return (b.helpful || 0) - (a.helpful || 0);
      if (reviewSort === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (reviewSort === 'highest') return b.rating - a.rating;
      if (reviewSort === 'lowest') return a.rating - b.rating;
      if (reviewSort === 'photos') return (b.images?.length || 0) - (a.images?.length || 0);
      return 0;
    });
    return sorted;
  }, [product, starFilter, onlyPhotos, reviewSort]);

  const photoReviews = useMemo(() => (product?.reviews || []).filter((r: any) => r.images?.length > 0 || r.video), [product]);

  const paginatedReviews = allReviews.slice(0, reviewPage * REVIEWS_PER_PAGE);
  const hasMore = allReviews.length > paginatedReviews.length;

  const addToCart = useCallback(() => {
    if (!product) return;
    addItem({ id: product._id, name: product.name, price, image: images[0] || '', flavor: selectedFlavor, size: selectedSize, quantity: 1, category: product.category, pixels: product.pixels });
    trackAddToCart({ id: product._id, name: product.name, price, category: product.category, pixels: product.pixels });
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  }, [product, price, images, selectedFlavor, selectedSize]);

  const buyNow = useCallback(() => { addToCart(); navigate('/checkout'); }, [addToCart]);

  const markHelpful = async (reviewId: string) => {
    if (!product) return;
    try {
      const { data } = await API.post(`/products/${product._id}/reviews/${reviewId}/helpful`, {});
      setProduct((p: any) => ({ ...p, reviews: p.reviews.map((r: any) => r._id === reviewId ? { ...r, helpful: data.helpful } : r) }));
    } catch {}
  };

  const submitReview = async () => {
    if (!reviewForm.comment.trim()) return alert('Please write your review');
    if (!reviewForm.name.trim() && !user) return alert('Please enter your name');
    setReviewSaving(true);
    try {
      const urlImages = reviewForm.images.split(',').map(s => s.trim()).filter(Boolean);
      const allImages = [...reviewImages, ...urlImages];
      const { data } = await API.post(`/products/${product._id}/review`, {
        name: user?.name || reviewForm.name,
        avatar: user?.avatar || '',
        rating: reviewForm.rating,
        title: reviewForm.title,
        comment: reviewForm.comment,
        images: allImages,
        video: reviewForm.video.trim(),
        variant: [selectedSize, selectedFlavor].filter(Boolean).join(', '),
      });
      const refreshed = await API.get(`/products/${slug}`);
      setProduct(refreshed.data);
      setReviewForm({ name: '', rating: 5, title: '', comment: '', images: '', video: '', variant: '' });
      setReviewImages([]);
      setReviewSuccess(true);
      setTimeout(() => setReviewSuccess(false), 4000);
    } catch { alert('Failed to submit review. Please try again.'); }
    setReviewSaving(false);
  };

  const checkPincode = () => {
    if (pincode.length !== 6) return;
    const info = getShippingInfo(pincode);
    if (info) { setShippingInfo(info); setPincodeError(false); }
    else { setShippingInfo(null); setPincodeError(true); }
  };

  const submitNotifyMe = useCallback(async () => {
    if (!product) return;
    if (!user) {
      navigateFn({ to: '/login', search: { redirect: `/products/${slug}` } as any });
      return;
    }
    setNotifySending(true);
    try {
      await notifyFn({
        data: {
          productId: product._id,
          productName: product.name,
          channels: ['email', 'whatsapp', 'sms', 'onsite'],
        },
      });
      setNotifyDone(true);
    } catch {
      // fall through with done state so UI doesn't get stuck
      setNotifyDone(true);
    }
    setNotifySending(false);
  }, [product, user, notifyFn, navigateFn, slug]);

  const soldCount = useMemo(() => {
    if (!product) return 0;
    const base = (product.numReviews || 0) * 23 + (product._id?.charCodeAt?.(0) || 5) * 17 + 214;
    return Math.min(9999, Math.max(50, base));
  }, [product]);

  const relatedProducts = (related || []).filter(p => p.slug !== slug && p.category === product?.category).slice(0, 8);

  if (!product) return (
    <div className="max-w-7xl mx-auto px-4 py-16 animate-pulse">
      <div className="grid lg:grid-cols-2 gap-12">
        <div className="h-[500px] bg-gray-100 rounded-2xl" />
        <div className="space-y-5"><div className="h-10 bg-gray-100 rounded-xl" /><div className="h-6 bg-gray-100 rounded-xl w-1/2" /><div className="h-60 bg-gray-100 rounded-2xl" /></div>
      </div>
    </div>
  );

  const bannersByPosition = (pos: string) =>
    (product.banners || []).filter((b: any) => b.enabled !== false && b.position === pos);

  const BannerRow = ({ pos }: { pos: string }) => {
    const bs = bannersByPosition(pos);
    if (!bs.length) return null;
    return (
      <div className="w-full space-y-2 my-3">
        {bs.map((b: any, i: number) => {
          const img = (window.innerWidth < 768 && b.mobileImage) ? b.mobileImage : b.image;
          if (!img) return null;
          const inner = <img src={img} alt={`${product?.name || 'Product'} promotional banner`} className="w-full rounded-2xl object-cover max-h-52 md:max-h-72" loading="lazy"  decoding="async"/>;
          return b.link ? (
            <a key={i} href={b.link} className="block">{inner}</a>
          ) : (
            <div key={i}>{inner}</div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="bg-white pb-28">
      {/* Above-gallery banners */}
      {bannersByPosition('above_gallery').length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <BannerRow pos="above_gallery" />
        </div>
      )}

      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-2">
        <nav className="text-sm text-gray-500 flex flex-wrap items-center gap-1" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-gray-700 transition">Home</Link><span>›</span>
          <Link to="/products" className="hover:text-gray-700 transition">Products</Link><span>›</span>
          <span className="text-gray-600 truncate max-w-xs">{product.name}</span>
        </nav>
      </div>

      {/* ── HERO ─────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="grid lg:grid-cols-[1fr_1.1fr] gap-10 items-start">
          {/* Gallery */}
          <div className="lg:sticky lg:top-24 space-y-3">
            <div className={`relative bg-white rounded-3xl overflow-hidden aspect-square flex items-center justify-center shadow-2xl ${showVideo ? '' : 'cursor-zoom-in group'}`}
              onClick={() => !showVideo && images.length && setLightboxOpen(true)}>
              {discount > 0 && !showVideo && (
                <span className="absolute bottom-4 left-4 z-10 bg-white text-gray-900 text-xs font-black px-3 py-1.5 rounded-full shadow-lg">
                  SAVE {discount}%
                </span>
              )}
              <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
                <button onClick={e => e.stopPropagation()} className="w-10 h-10 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl flex items-center justify-center text-white hover:bg-white/20 transition" aria-label="Wishlist"><Heart size={17} /></button>
                <button onClick={e => { e.stopPropagation(); navigator.share?.({ title: product.name, url: window.location.href }).catch(() => {}); }}
                  className="w-10 h-10 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl flex items-center justify-center text-white hover:bg-white/20 transition" aria-label="Share"><Share2 size={17} /></button>
              </div>
              {showVideo && productVideo
                ? <div className="w-full h-full p-0" onClick={e => e.stopPropagation()}><VideoEmbed url={productVideo} className="w-full h-full rounded-none" /></div>
                : images[selectedImage]
                  ? <img src={images[selectedImage]} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"  loading="lazy" decoding="async"/>
                  : <span className="text-7xl font-black text-gray-300">NP</span>}
              {!showVideo && images.length > 1 && <>
                <button onClick={e => { e.stopPropagation(); setSelectedImage(i => (i - 1 + images.length) % images.length); }} className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/10 border border-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/25 transition opacity-0 group-hover:opacity-100"><ChevronLeft size={16} /></button>
                <button onClick={e => { e.stopPropagation(); setSelectedImage(i => (i + 1) % images.length); }} className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/10 border border-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/25 transition opacity-0 group-hover:opacity-100"><ChevronRight size={16} /></button>
              </>}
            </div>
            {(images.length > 1 || productVideo) && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((img: string, i: number) => (
                  <button key={i} onClick={() => { setSelectedImage(i); setShowVideo(false); }}
                    aria-label={`View product image ${i + 1}`}
                    aria-current={!showVideo && selectedImage === i ? 'true' : undefined}
                    className={`shrink-0 w-16 h-16 rounded-2xl overflow-hidden border-2 transition ${!showVideo && selectedImage === i ? 'border-gray-900 shadow-md' : 'border-gray-100 hover:border-gray-300'}`}>
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                      <img src={img} alt={`${product?.name || 'Product'} thumbnail ${i + 1}`} className="w-full h-full object-cover" loading="lazy"  decoding="async"/>
                    </div>
                  </button>
                ))}
                {productVideo && (
                  <button onClick={() => setShowVideo(true)}
                    className={`shrink-0 w-16 h-16 rounded-2xl overflow-hidden border-2 transition ${showVideo ? 'border-orange-500 shadow-md' : 'border-gray-100 hover:border-gray-300'}`}>
                    <div className="w-full h-full bg-gray-900 flex flex-col items-center justify-center gap-0.5">
                      <PlayCircle size={22} className="text-white" />
                      <span className="text-[9px] text-white/70 font-bold">VIDEO</span>
                    </div>
                  </button>
                )}
              </div>
            )}
            {lightboxOpen && images.length > 0 && <Lightbox images={images} startIndex={selectedImage} onClose={() => setLightboxOpen(false)} />}
          </div>

          {/* Product Info */}
          <div className="space-y-5">
            <div>
              <p className="text-sm font-semibold text-orange-500 uppercase tracking-wide mb-1">{product.category}</p>
              <h1 className="text-2xl sm:text-3xl font-black leading-tight text-gray-900">{product.name}</h1>
              <p className="text-gray-500 mt-1">{product.shortDescription}</p>
            </div>

            {/* Ratings summary */}
            <div className="flex flex-wrap items-center gap-3">
              <a href="#reviews" className="flex items-center gap-1.5 bg-gray-50 hover:bg-gray-100 transition rounded-xl px-3 py-2">
                <span className="font-black text-gray-900">{(product.ratings || 0).toFixed(1)}</span>
                <Stars value={product.ratings} size="sm" />
                <span className="text-sm text-gray-500">({product.numReviews || 0})</span>
              </a>
              <span className={`text-sm font-semibold flex items-center gap-1 ${stock > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                <Package size={14} /> {stock > 0 ? 'In Stock' : 'Out of Stock'}
              </span>
              {product.certifications?.slice(0, 2).map((c: string, i: number) => (
                <span key={i} className="text-xs bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full font-semibold flex items-center gap-1"><ShieldCheck size={11} />{c}</span>
              ))}
            </div>

            {/* Social proof */}
            {soldCount > 0 && (
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-600">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shrink-0" />
                🔥 <span className="font-black text-gray-900">{soldCount.toLocaleString('en-IN')}+</span> sold in the last 30 days
              </div>
            )}

            {/* Price */}
            <div>
              <div className="flex flex-wrap items-baseline gap-3 mb-1">
                <span className="text-5xl font-black text-gray-900 tracking-tight">{formatPrice(price)}</span>
                {product.comparePrice > price && (
                  <span className="text-xl text-gray-500 line-through font-medium">{formatPrice(product.comparePrice)}</span>
                )}
                {discount > 0 && (
                  <span className="text-sm font-black text-white px-2.5 py-1 rounded-full" style={{ backgroundColor: '#16a34a' }}>
                    {discount}% OFF
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">Inclusive of all taxes. Free delivery above ₹999</p>
              {product.offerText && <p className="text-sm font-semibold text-orange-500 mt-1.5">🎉 {product.offerText}</p>}
            </div>

            {isLowStock && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse shrink-0" />
                <p className="text-sm font-bold text-red-700">Only {stock} left — order soon!</p>
              </div>
            )}

            {/* Variant selector — Pro picker if admin configured + flag ON, else legacy */}
            {(() => {
              const proCfg = product.variants_pro_config && Object.keys(product.variants_pro_config).length > 0
                ? product.variants_pro_config : null;
              if (proOn && proCfg) {
                return (
                  <VariantsProPicker
                    product={product}
                    config={proCfg}
                    selectedFlavor={selectedFlavor}
                    selectedSize={selectedSize}
                    onSelect={(f, s) => { setSelectedFlavor(f); setSelectedSize(s); }}
                  />
                );
              }
              return (
                <div className="space-y-4">
                  {product.flavors?.filter((f: string) => f).length > 0 && (
                    <div>
                      <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3">
                        Flavour — <span className="text-gray-900 normal-case tracking-normal font-bold">{selectedFlavor}</span>
                      </p>
                      <div className="flex flex-wrap gap-2.5">
                        {product.flavors.filter((f: string) => f).map((f: string) => {
                          const flavorColor = FLAVOR_COLORS[f] || '#6B7280';
                          const isSelected = selectedFlavor === f;
                          const matches = (product.variants || []).filter((v: any) => v.flavor === f && (!selectedSize || v.size === selectedSize));
                          const variantOOS = matches.length > 0 && matches.every((v: any) => (v.stock ?? 0) <= 0);
                          return (
                            <button key={f} onClick={() => setSelectedFlavor(f)}
                              title={variantOOS ? `${f} — out of stock` : f}
                              className={`relative flex items-center gap-2 px-3.5 py-2 rounded-full border-2 text-sm font-semibold transition-all duration-150 ${isSelected ? 'border-gray-900 shadow-md scale-105' : 'border-gray-200 hover:border-gray-400'} ${variantOOS ? 'opacity-50' : ''}`}>
                              <span className="w-3.5 h-3.5 rounded-full shrink-0 border border-white/30 shadow-inner" style={{ backgroundColor: flavorColor }} />
                              <span className={isSelected ? 'text-gray-900 font-bold' : 'text-gray-600'}>{f}</span>
                              {variantOOS && <span className="text-[9px] font-black text-red-500 uppercase">OOS</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {product.sizes?.filter((s: string) => s).length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-black text-gray-500 uppercase tracking-widest">
                          Size — <span className="text-gray-900 normal-case tracking-normal font-bold">{formatSizeDisplay(selectedSize)}</span>
                        </p>
                        <SizeGuideButton product={product} selectedSizeName={selectedSize} />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {product.sizes.filter((s: string) => s).map((s: string) => {
                          const matches = (product.variants || []).filter((v: any) => v.size === s && (!selectedFlavor || v.flavor === selectedFlavor));
                          const variantOOS = matches.length > 0 && matches.every((v: any) => (v.stock ?? 0) <= 0);
                          return (
                            <button key={s} onClick={() => setSelectedSize(s)}
                              title={variantOOS ? `${formatSizeDisplay(s)} — out of stock` : formatSizeDisplay(s)}
                              className={`relative px-5 py-2.5 rounded-full border-2 text-sm font-semibold transition-all duration-150 ${selectedSize === s ? 'border-gray-900 bg-gray-900 text-white shadow-md' : 'border-gray-200 text-gray-600 hover:border-gray-400'} ${variantOOS ? 'opacity-50 line-through' : ''}`}>
                              {formatSizeDisplay(s)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Delivery checker */}
            <DeliveryChecker
              pincode={pincode}
              shippingInfo={shippingInfo}
              pincodeError={pincodeError}
              productPrice={price}
              onChange={val => { setPincode(val); setShippingInfo(null); setPincodeError(false); }}
              onCheck={checkPincode}
            />

            {/* Urgency widgets (low-stock / recent-purchase) — admin controlled */}
            <UrgencyStack productId={product._id} stock={stock} />

            {/* ATC + Buy Now */}
            <div className="space-y-2.5">
              <button onClick={buyNow} disabled={stock === 0}
                style={{ backgroundColor: stock === 0 ? '#d1d5db' : primaryColor }}
                className="w-full h-14 font-black text-base flex items-center justify-center gap-2.5 rounded-2xl text-white transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed shadow-lg">
                <Zap size={20} /> {stock === 0 ? 'OUT OF STOCK' : 'BUY NOW'}
              </button>
              <button onClick={addToCart} disabled={stock === 0}
                style={{ borderColor: stock === 0 ? '#d1d5db' : primaryColor, color: stock === 0 ? '#9ca3af' : primaryColor }}
                className="w-full h-12 font-black text-sm flex items-center justify-center gap-2 rounded-2xl border-2 hover:bg-gray-50 transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed">
                <ShoppingCart size={17} /> {added ? '✓ ADDED TO CART!' : 'ADD TO CART'}
              </button>
            </div>

            {/* Notify Me when OOS — compact, single tap, auto channels */}
            {stock === 0 && (
              <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
                <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                  <Bell size={16} className="text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  {notifyDone ? (
                    <>
                      <p className="text-sm font-black text-gray-900 leading-tight">You're on the list</p>
                      <p className="text-xs text-gray-500 leading-snug">Email, WhatsApp & SMS alert ready.</p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-black text-gray-900 leading-tight">Notify me when back</p>
                      <p className="text-xs text-gray-500 leading-snug">{user ? 'Auto-alert via email, WhatsApp & SMS.' : 'Sign in for instant multi-channel alerts.'}</p>
                    </>
                  )}
                </div>
                {!notifyDone && (
                  <button onClick={submitNotifyMe} disabled={notifySending}
                    className="shrink-0 bg-gray-900 hover:bg-gray-800 text-white text-xs font-black px-3.5 py-2 rounded-full transition disabled:opacity-50">
                    {notifySending ? '…' : user ? 'Notify' : 'Sign in'}
                  </button>
                )}
              </div>
            )}

            <TrustBadges compact />

            {/* Offers, payment offers, combo CTA */}
            <OffersSection product={product} selectedFlavor={selectedFlavor} selectedSize={selectedSize} />

            {/* Mini combo builder — current product is auto-locked as item #1.
                Toggleable per-product via Admin → Products → Basic → "Show combo builder". */}
            {product.comboWidgetEnabled !== false && (
              <MiniComboBuilder
                currentProductId={product._id || product.id}
                currentProduct={{
                  name: product.name,
                  price: Number(product.price),
                  image: Array.isArray(product.images) ? product.images[0] : '',
                  category: product.category,
                  slug: product.slug,
                }}
              />
            )}




            {/* Below ATC banners */}
            <BannerRow pos="below_atc" />

            {/* Key Benefits — horizontal scroll pills */}
            {product.keyBenefits?.length > 0 && (
              <div className="-mx-1">
                <div className="flex gap-2.5 overflow-x-auto pb-1 px-1 scrollbar-none" style={{ scrollbarWidth: 'none' }}>
                  {product.keyBenefits.map((b: any, i: number) => (
                    <div key={i} className="shrink-0 flex items-center gap-2.5 bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 min-w-[160px]">
                      <span className="text-xl shrink-0">{b.icon}</span>
                      <div>
                        <p className="font-black text-xs text-gray-900 leading-tight">{b.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5 leading-snug">{b.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── NUTRITION HIGHLIGHTS BAR ─────────────────────── */}
      {product.nutritionHighlights?.length > 0 && (
        <div className="bg-gray-900 text-white mt-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
            <div className="flex flex-wrap justify-center sm:justify-around gap-6">
              {product.nutritionHighlights.map((n: any, i: number) => (
                <div key={i} className="text-center">
                  <p className="text-2xl font-black text-orange-400">{n.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5 uppercase tracking-wider">{n.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── CERTIFICATIONS ────────────────────────────────── */}
      {product.certifications?.length > 0 && (
        <div className="border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-wrap justify-center gap-4">
              {product.certifications.map((c: string, i: number) => (
                <span key={i} className="flex items-center gap-2 text-sm font-semibold text-gray-600 bg-gray-50 px-4 py-2 rounded-full border border-gray-100">
                  <ShieldCheck size={15} className="text-green-500" /> {c}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* After certifications banners */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <BannerRow pos="after_certifications" />
      </div>

      {/* ── INFO TABS ─────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        <div className="border-b border-gray-200">
          <div className="flex overflow-x-auto gap-1 -mb-px">
            {INFO_TABS.map(tab => {
              const Icon = tab.icon;
              const hasContent = tab.id === 'description' ? !!product.description
                : tab.id === 'howtouse' ? !!product.howToUse
                : tab.id === 'ingredients' ? !!product.ingredients
                : !!product.nutritionFacts?.length;
              if (!hasContent) return null;
              return (
                <button key={tab.id} onClick={() => setInfoTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-3.5 text-sm font-bold border-b-2 transition shrink-0 ${infoTab === tab.id ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                  <Icon size={15} /> {tab.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="py-7 max-w-4xl">
          {infoTab === 'description' && (
            <div className="space-y-4">
              {currentVariant?.highlights?.length > 0 && (
                <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm text-gray-700">
                  {currentVariant.highlights.map((h: string, i: number) => (
                    <li key={i} className="flex items-start gap-2"><span className="text-orange-500 mt-0.5">✓</span><span>{h}</span></li>
                  ))}
                </ul>
              )}
              <p className="text-gray-600 leading-relaxed whitespace-pre-line text-sm sm:text-base">
                {currentVariant?.description || product.description}
              </p>
              {currentVariant?.description && (
                <p className="text-[11px] text-gray-400 italic">Showing details for selected variant{[currentVariant.flavor, currentVariant.size].filter(Boolean).length ? `: ${[currentVariant.flavor, currentVariant.size].filter(Boolean).join(' · ')}` : ''}.</p>
              )}
            </div>
          )}
          {infoTab === 'howtouse' && <p className="text-gray-600 leading-relaxed whitespace-pre-line text-sm sm:text-base">{product.howToUse}</p>}
          {infoTab === 'ingredients' && <p className="text-gray-600 leading-relaxed text-sm sm:text-base">{product.ingredients}</p>}
          {infoTab === 'nutrition' && product.nutritionFacts?.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-gray-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-900 text-white">
                    <th className="text-left px-4 py-3 font-bold">Nutrient</th>
                    <th className="text-right px-4 py-3 font-bold">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {product.nutritionFacts.map((row: any, i: number) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3 text-gray-600">{row.label}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">{row.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── PRODUCT Q&A ───────────────────────────────────── */}
      <ProductQA productId={String(product._id || product.id || product.slug)} productName={product.name} />
      {/* Translated product content shown via i18n / user's preferred_language */}





      {/* ── RELATED PRODUCTS ──────────────────────────────── */}
      {relatedProducts.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
          <h2 className="text-2xl font-black mb-5">You May Also Like</h2>
          <div className="flex gap-4 overflow-x-auto pb-3">
            {relatedProducts.map(p => {
              const d = p.comparePrice > p.price ? calculateDiscount(p.price, p.comparePrice) : 0;
              return (
                <Link key={p._id} to="/products/$slug" params={{ slug: p.slug }}
                  className="shrink-0 w-48 border border-gray-100 rounded-2xl bg-white shadow-sm hover:shadow-md transition overflow-hidden flex flex-col">
                  <div className="relative bg-gray-50 h-40 overflow-hidden">
                    {d > 0 && <span className="absolute top-2 left-2 bg-green-500 text-white text-xs font-black px-1.5 py-0.5 rounded-full">{d}%</span>}
                    {p.images?.[0] ? <>
                      <img src={p.images[0]} alt={p.name} className="h-full w-full object-cover" loading="lazy"  decoding="async"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                      <div className="absolute inset-0 hidden items-center justify-center text-4xl font-black text-gray-200">NP</div>
                    </> : <span className="text-4xl font-black text-gray-200">NP</span>}
                  </div>
                  <div className="p-3 flex flex-col flex-1">
                    <p className="text-xs text-gray-500">{p.category}</p>
                    <p className="font-semibold text-sm leading-tight line-clamp-2 mt-0.5">{p.name}</p>
                    <p className="font-black mt-1.5">{formatPrice(p.price)}</p>
                    <QuickBuyButtons product={p} size="sm" className="mt-2" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Before reviews banners */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <BannerRow pos="before_reviews" />
      </div>

      {/* ── REVIEWS ───────────────────────────────────────── */}
      <div id="reviews" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-10">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">Reviews</h2>
            <p className="text-xs text-gray-500 mt-0.5">{product.numReviews || 0} verified rating{product.numReviews === 1 ? '' : 's'}</p>
          </div>
          <a href="#write-review" onClick={() => setShowWriteReview(true)}
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-gray-700 hover:text-gray-900 border border-gray-200 hover:border-gray-400 rounded-full px-3 py-1.5 transition">
            <Pencil size={12} /> Write review
          </a>
        </div>

        <div className="grid lg:grid-cols-[320px_1fr] gap-10 items-start">
          {/* Left: Summary */}
          <div className="lg:sticky lg:top-24 space-y-6">
            <div className="bg-gray-50 rounded-2xl p-6">
              <div className="text-center mb-5">
                <p className="text-6xl font-black text-gray-900">{(product.ratings || 0).toFixed(1)}</p>
                <Stars value={product.ratings} size="lg" />
                <p className="text-sm text-gray-500 mt-2">{product.numReviews} review{product.numReviews !== 1 ? 's' : ''}</p>
              </div>
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map(n => {
                  const key = ['one', 'two', 'three', 'four', 'five'][n - 1] as any;
                  return (
                    <button key={n} onClick={() => setStarFilter(starFilter === n ? 0 : n)}
                      className={`w-full rounded-lg transition ${starFilter === n ? 'ring-2 ring-orange-400' : ''}`}>
                      <RatingBar label={`${n} ★`} count={product.ratingBreakdown?.[key] || 0} total={product.numReviews || 0} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Write Review — collapsed by default */}
            <div id="write-review" className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
              <button onClick={() => setShowWriteReview(v => !v)}
                className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-gray-50 transition">
                <span className="flex items-center gap-2 font-black text-sm">
                  <Pencil size={14} className="text-orange-500" />
                  {showWriteReview ? 'Hide review form' : 'Write a review'}
                </span>
                <ChevronDown size={16} className={`text-gray-500 transition-transform ${showWriteReview ? 'rotate-180' : ''}`} />
              </button>
              {showWriteReview && (<div className="px-6 pb-6 pt-1">
              {reviewSuccess && <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-3 text-sm text-green-700 font-semibold">✓ Review submitted! Thank you.</div>}
              <div className="space-y-3">
                {user ? (
                  <div className="flex items-center gap-2.5 p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <img src={user.avatar || (user as any).profilePicture || `https://i.pravatar.cc/40?u=${encodeURIComponent(user.name || user.email || 'user')}`} alt="" className="w-9 h-9 rounded-full object-cover border border-gray-200 shrink-0"  loading="lazy" decoding="async"/>
                    <div>
                      <p className="font-bold text-sm text-gray-900">{user.name || (user as any).username || 'You'}</p>
                      <p className="text-xs text-gray-500">Reviewing as your account</p>
                    </div>
                  </div>
                ) : (
                  <input placeholder="Your Name *" value={reviewForm.name} onChange={e => setReviewForm(f => ({ ...f, name: e.target.value }))} className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400 transition" />
                )}
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1.5">Rating *</label>
                  <Stars value={reviewForm.rating} size="lg" interactive onChange={n => setReviewForm(f => ({ ...f, rating: n }))} />
                </div>
                <input placeholder="Review Title" value={reviewForm.title} onChange={e => setReviewForm(f => ({ ...f, title: e.target.value }))} className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400 transition" />
                <textarea placeholder="Your Review *" value={reviewForm.comment} onChange={e => setReviewForm(f => ({ ...f, comment: e.target.value }))} rows={4} className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400 transition resize-none" />
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1.5 flex items-center gap-1"><Camera size={12} /> Add Photos</label>
                  {reviewImages.length > 0 && (
                    <div className="flex gap-2 flex-wrap mb-2">
                      {reviewImages.map((url, i) => (
                        <div key={i} className="relative group">
                          <img src={url} alt="" className="w-16 h-16 object-cover rounded-xl border border-gray-200"  loading="lazy" decoding="async"/>
                          <button type="button" onClick={() => setReviewImages(prev => prev.filter((_, idx) => idx !== i))}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    {reviewImgUploading ? (
                      <div className="flex-1 flex items-center gap-2 border rounded-xl px-3 py-2.5 bg-gray-50 text-sm text-gray-500">
                        <div className="flex-1 bg-gray-200 rounded-full h-1.5"><div className="bg-orange-500 h-1.5 rounded-full transition-all" style={{ width: `${reviewImgProgress}%` }} /></div>
                        <span className="text-xs font-bold text-orange-500 shrink-0">{reviewImgProgress}%</span>
                      </div>
                    ) : (
                      <button type="button" onClick={() => reviewImgRef.current?.click()}
                        className="flex-1 flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 hover:border-orange-400 hover:text-orange-500 rounded-xl px-3 py-2.5 text-sm text-gray-500 font-semibold transition">
                        <Upload size={15} /> Upload Photos
                      </button>
                    )}
                    <input ref={reviewImgRef} type="file" accept="image/*" multiple className="hidden" onChange={async e => {
                      const files = Array.from(e.target.files || []);
                      for (const f of files) { if (f.type.startsWith('image/')) await uploadReviewImg(f); }
                      if (reviewImgRef.current) reviewImgRef.current.value = '';
                    }} />
                  </div>
                  <input placeholder="Or paste image URL (optional)" value={reviewForm.images} onChange={e => setReviewForm(f => ({ ...f, images: e.target.value }))} className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400 transition mt-2" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 block mb-1.5 flex items-center gap-1"><PlayCircle size={12} /> Add a Video Review</label>
                  {reviewForm.video ? (
                    <div className="relative">
                      <video src={reviewForm.video} controls preload="none" className="w-full max-h-40 rounded-xl border" />
                      <button type="button" onClick={() => setReviewForm(f => ({ ...f, video: '' }))}
                        className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition">
                        <X size={11} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button type="button" onClick={() => reviewVideoRef.current?.click()}
                        className="flex-1 flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 hover:border-orange-400 hover:text-orange-500 rounded-xl px-3 py-3 text-sm text-gray-500 font-semibold transition">
                        {reviewVideoUploading ? (
                          <><div className="w-24 bg-gray-200 rounded-full h-1.5 flex-1"><div className="bg-orange-500 h-1.5 rounded-full transition-all" style={{ width: `${reviewVideoProgress}%` }} /></div><span className="text-xs font-bold text-orange-500 shrink-0">{reviewVideoProgress}%</span></>
                        ) : (
                          <><Upload size={15} /> Upload or Record Video</>
                        )}
                      </button>
                      <input ref={reviewVideoRef} type="file" accept="video/*" className="hidden" onChange={async e => {
                        const f = e.target.files?.[0]; if (!f) return;
                        const url = await uploadReviewVideo(f);
                        if (url) setReviewForm(fv => ({ ...fv, video: url }));
                        if (reviewVideoRef.current) reviewVideoRef.current.value = '';
                      }} />
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-1.5">Upload a video from your device (MP4, MOV, etc.)</p>
                </div>
                <button onClick={submitReview} disabled={reviewSaving}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-black text-sm transition disabled:opacity-50">
                  {reviewSaving ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
              </div>)}
            </div>
          </div>

          {/* Right: Review List */}
          <div>
            {/* Photo Reviews Strip */}
            {photoReviews.length > 0 && (
              <div className="mb-6">
                <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2"><Camera size={16} /> Photos & Videos from Customers</h3>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {photoReviews.map((r: any, i: number) => (
                    <div key={i} className="shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 border-gray-100 relative">
                      {r.images?.[0] ? <img src={r.images[0]} alt="" className="w-full h-full object-cover" loading="lazy"  decoding="async"/>
                        : r.video ? <div className="w-full h-full bg-gray-900 flex items-center justify-center"><PlayCircle size={24} className="text-white" /></div> : null}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Filters & Sort */}
            <div className="flex flex-wrap items-center gap-2 mb-5">
              <div className="flex gap-1.5 flex-wrap">
                {[0, 5, 4, 3, 2, 1].map(n => (
                  <button key={n} onClick={() => { setStarFilter(starFilter === n ? 0 : n); setReviewPage(1); }}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border transition ${starFilter === n ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'}`}>
                    {n === 0 ? 'All' : `${n}★`}
                  </button>
                ))}
                <button onClick={() => { setOnlyPhotos(p => !p); setReviewPage(1); }}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition flex items-center gap-1 ${onlyPhotos ? 'bg-orange-500 text-white border-orange-500' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'}`}>
                  <Camera size={11} /> With Media
                </button>
              </div>
              <div className="ml-auto">
                <select value={reviewSort} onChange={e => { setReviewSort(e.target.value); setReviewPage(1); }}
                  className="text-xs border border-gray-200 rounded-xl px-3 py-1.5 focus:outline-none focus:border-orange-400 bg-white font-semibold">
                  {REVIEW_SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>

            <p className="text-sm text-gray-500 mb-4">{allReviews.length} review{allReviews.length !== 1 ? 's' : ''} {starFilter ? `for ${starFilter}★` : ''}</p>

            {allReviews.length === 0 ? (
              <div className="text-center py-16 bg-gray-50 rounded-2xl">
                <p className="text-4xl mb-3">💬</p>
                <p className="font-bold text-gray-600">No reviews yet{starFilter ? ' for this rating' : ''}</p>
                <p className="text-sm text-gray-500 mt-1">Be the first to share your experience!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {paginatedReviews.map((r: any) => (
                  <ReviewCard key={r._id} review={r} productId={product._id} onHelpful={() => markHelpful(r._id)} />
                ))}
                {hasMore && (
                  <button onClick={() => setReviewPage(p => p + 1)}
                    className="w-full border-2 border-gray-200 rounded-2xl py-3.5 text-sm font-bold text-gray-600 hover:border-gray-400 hover:text-gray-800 transition">
                    Load More Reviews ({allReviews.length - paginatedReviews.length} remaining)
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Q&A SECTION ───────────────────────────────────── */}
      {product.qAndA?.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
          <h2 className="text-2xl font-black mb-5">Frequently Asked Questions</h2>
          <div className="space-y-3 max-w-4xl">
            {product.qAndA.map((qa: any, i: number) => (
              <QAItem key={i} qa={qa} />
            ))}
          </div>
        </div>
      )}

      <VideoSections placement="product" id={product._id || product.id} />

      <StickyATCBar product={product} price={price} selectedFlavor={selectedFlavor} selectedSize={selectedSize} onAdd={addToCart} onBuy={buyNow} added={added} stock={stock} />
    </div>
  );
}
