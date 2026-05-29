import { useEffect, useMemo, useRef, useState } from "react";
import { Play, X, Volume2, VolumeX, ShoppingCart, ChevronLeft, ChevronRight } from "lucide-react";
import { listVideoSectionsForPlacement } from "@/lib/video-sections.functions";
import { formatPrice } from "@/lib/utils";
import API from "@/lib/api";
import { useCartStore } from "@/store/cartStore";

type VideoItem = {
  id: string;
  src: string;
  type: "mp4" | "youtube" | "instagram";
  thumbnail?: string;
  title?: string;
  views?: number | string;
  productId?: string;
  cta?: { text?: string; href?: string };
};

type Section = {
  id: string;
  heading: string;
  subheading?: string;
  layout: "reel-carousel" | "grid" | "single-feature";
  videos: VideoItem[];
  visibility?: { desktop?: boolean; mobile?: boolean };
};

type Placement = "home" | "product" | "category" | "page" | "blog" | "blog-index";

const productCache: Record<string, any> = {};

function useProducts(ids: string[]) {
  const [map, setMap] = useState<Record<string, any>>({});
  useEffect(() => {
    const need = ids.filter((id) => id && !productCache[id] && !(id in map));
    if (!need.length) {
      const have: Record<string, any> = {};
      ids.forEach((id) => { if (id && productCache[id]) have[id] = productCache[id]; });
      if (Object.keys(have).length) setMap((m) => ({ ...m, ...have }));
      return;
    }
    (async () => {
      const fetched: Record<string, any> = {};
      await Promise.all(need.map(async (id) => {
        try {
          const r = await API.get(`/products/${id}`);
          if (r?.data) { productCache[id] = r.data; fetched[id] = r.data; }
        } catch { /* ignore */ }
      }));
      if (Object.keys(fetched).length) setMap((m) => ({ ...m, ...fetched }));
    })();
  }, [ids.join("|")]);
  return map;
}

function formatViews(n: number | string | undefined): string {
  if (n === undefined || n === null || n === "") return "";
  if (typeof n === "string") return n;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function youtubeId(src: string): string | null {
  const m = src.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/);
  return m ? m[1] : null;
}

function VideoFrame({ v, muted, autoPlay = false, controls = false, fillVertical = false }: {
  v: VideoItem; muted: boolean; autoPlay?: boolean; controls?: boolean; fillVertical?: boolean;
}) {
  if (v.type === "youtube") {
    const id = youtubeId(v.src);
    if (!id) return null;
    const params = `autoplay=${autoPlay ? 1 : 0}&mute=${muted ? 1 : 0}&controls=${controls ? 1 : 0}&playsinline=1&loop=1&playlist=${id}&modestbranding=1&rel=0`;
    return <iframe src={`https://www.youtube.com/embed/${id}?${params}`}
      className={`w-full h-full ${fillVertical ? "object-cover" : ""}`} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />;
  }
  if (v.type === "instagram") {
    return <iframe src={v.src.replace(/\/?$/, "/embed")} className="w-full h-full" allowFullScreen scrolling="no" />;
  }
  return <video src={v.src} className={`w-full h-full ${fillVertical ? "object-cover" : ""}`}
    autoPlay={autoPlay} muted={muted} loop playsInline controls={controls} preload="none" poster={v.thumbnail} />;
}

function ProductMini({ product }: { product: any }) {
  const addToCart = useCartStore((s) => s.addItem);
  if (!product) return null;
  const price = product.price ?? product.salePrice ?? 0;
  const compare = product.comparePrice ?? product.mrp;
  return (
    <div className="px-3 pb-3 pt-2 bg-white">
      <div className="flex items-center gap-2 mb-2">
        {product.images?.[0] && <img src={product.images[0]} alt="" className="w-9 h-9 rounded-lg object-cover" />}
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-semibold text-gray-800 line-clamp-1">{product.name}</div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xs font-black text-gray-900">{formatPrice(price)}</span>
            {compare > price && <span className="text-[10px] text-gray-400 line-through">{formatPrice(compare)}</span>}
          </div>
        </div>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); addToCart({ id: product._id || product.id, name: product.name, price, image: product.images?.[0], quantity: 1 } as any); }}
        className="w-full text-[11px] font-black bg-gray-900 text-white py-1.5 rounded-lg hover:bg-gray-800 transition flex items-center justify-center gap-1">
        <ShoppingCart size={12} /> ADD TO CART
      </button>
    </div>
  );
}

function ReelPlayer({ section, startIdx, onClose, products }: {
  section: Section; startIdx: number; onClose: () => void; products: Record<string, any>;
}) {
  const [idx, setIdx] = useState(startIdx);
  const [muted, setMuted] = useState(true);
  const videos = section.videos;
  const v = videos[idx];
  if (!v) return null;
  const product = v.productId ? products[v.productId] : null;
  return (
    <div className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center" onClick={onClose}>
      <button onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="absolute top-4 right-4 z-10 bg-white/10 hover:bg-white/20 text-white p-2 rounded-full">
        <X size={20} />
      </button>
      <button onClick={(e) => { e.stopPropagation(); setMuted((m) => !m); }}
        className="absolute top-4 right-16 z-10 bg-white/10 hover:bg-white/20 text-white p-2 rounded-full">
        {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </button>
      {idx > 0 && (
        <button onClick={(e) => { e.stopPropagation(); setIdx(idx - 1); }}
          className="absolute left-4 z-10 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full">
          <ChevronLeft size={22} />
        </button>
      )}
      {idx < videos.length - 1 && (
        <button onClick={(e) => { e.stopPropagation(); setIdx(idx + 1); }}
          className="absolute right-4 z-10 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full">
          <ChevronRight size={22} />
        </button>
      )}
      <div className="relative w-full max-w-[420px] aspect-[9/16] bg-black rounded-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <VideoFrame v={v} muted={muted} autoPlay controls={false} fillVertical />
        {product && (
          <div className="absolute bottom-0 left-0 right-0">
            <ProductMini product={product} />
          </div>
        )}
      </div>
    </div>
  );
}

function ReelCard({ v, product, onOpen }: { v: VideoItem; product: any; onOpen: () => void }) {
  return (
    <div className="shrink-0 w-[180px] md:w-[220px] rounded-2xl overflow-hidden bg-gray-100 shadow-sm hover:shadow-lg transition cursor-pointer" onClick={onOpen}>
      <div className="relative aspect-[9/16] bg-black">
        {v.thumbnail ? (
          <img src={v.thumbnail} alt={v.title || ""} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <VideoFrame v={v} muted autoPlay={false} fillVertical />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-white/90 rounded-full p-3 shadow-lg">
            <Play size={20} className="text-gray-900 fill-gray-900 ml-0.5" />
          </div>
        </div>
        {v.views !== undefined && v.views !== "" && (
          <div className="absolute top-2 right-2 bg-black/60 backdrop-blur text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            {formatViews(v.views)} views
          </div>
        )}
      </div>
      {product && <ProductMini product={product} />}
    </div>
  );
}

function ReelCarousel({ section, products }: { section: Section; products: Record<string, any> }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const scroll = (dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * (el.clientWidth * 0.7), behavior: "smooth" });
  };
  return (
    <section className="py-8 md:py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-6">
          <h2 className="text-2xl md:text-3xl font-black text-gray-900">{section.heading}</h2>
          {section.subheading && <p className="text-sm text-gray-500 mt-1">{section.subheading}</p>}
        </div>
        <div className="relative">
          <button onClick={() => scroll(-1)} aria-label="Previous"
            className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white shadow-lg rounded-full w-10 h-10 items-center justify-center hover:scale-110 transition">
            <ChevronLeft size={20} />
          </button>
          <button onClick={() => scroll(1)} aria-label="Next"
            className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white shadow-lg rounded-full w-10 h-10 items-center justify-center hover:scale-110 transition">
            <ChevronRight size={20} />
          </button>
          <div ref={scrollerRef} className="flex gap-3 md:gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory px-1 md:px-12 pb-2 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: "none" }}>
            {section.videos.map((v, i) => (
              <div key={v.id || i} className="snap-start">
                <ReelCard v={v} product={v.productId ? products[v.productId] : null} onOpen={() => setOpenIdx(i)} />
              </div>
            ))}
          </div>
        </div>
      </div>
      {openIdx !== null && <ReelPlayer section={section} startIdx={openIdx} onClose={() => setOpenIdx(null)} products={products} />}
    </section>
  );
}

function GridLayout({ section, products }: { section: Section; products: Record<string, any> }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  return (
    <section className="py-8 md:py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-6">
          <h2 className="text-2xl md:text-3xl font-black text-gray-900">{section.heading}</h2>
          {section.subheading && <p className="text-sm text-gray-500 mt-1">{section.subheading}</p>}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {section.videos.map((v, i) => (
            <ReelCard key={v.id || i} v={v} product={v.productId ? products[v.productId] : null} onOpen={() => setOpenIdx(i)} />
          ))}
        </div>
      </div>
      {openIdx !== null && <ReelPlayer section={section} startIdx={openIdx} onClose={() => setOpenIdx(null)} products={products} />}
    </section>
  );
}

function FeatureLayout({ section, products }: { section: Section; products: Record<string, any> }) {
  const v = section.videos[0];
  if (!v) return null;
  const product = v.productId ? products[v.productId] : null;
  return (
    <section className="py-8 md:py-12">
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-6">
          <h2 className="text-2xl md:text-4xl font-black text-gray-900">{section.heading}</h2>
          {section.subheading && <p className="text-base text-gray-500 mt-2">{section.subheading}</p>}
        </div>
        <div className="rounded-3xl overflow-hidden shadow-2xl bg-black aspect-video">
          <VideoFrame v={v} muted={false} autoPlay={false} controls />
        </div>
        {product && <div className="max-w-md mx-auto mt-4"><ProductMini product={product} /></div>}
      </div>
    </section>
  );
}

export default function VideoSections({ placement, id }: { placement: Placement; id?: string }) {
  const [sections, setSections] = useState<Section[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    listVideoSectionsForPlacement({ data: { placement, id } })
      .then((rows) => { if (!cancelled) setSections(rows as any); })
      .catch(() => { if (!cancelled) setSections([]); });
    return () => { cancelled = true; };
  }, [placement, id]);

  const productIds = useMemo(() => {
    const out: string[] = [];
    (sections || []).forEach((s) => s.videos.forEach((v) => { if (v.productId) out.push(v.productId); }));
    return Array.from(new Set(out));
  }, [sections]);
  const products = useProducts(productIds);

  if (!sections || !sections.length) return null;
  return (
    <>
      {sections.map((s) => {
        if (!s.videos || !s.videos.length) return null;
        if (s.layout === "grid") return <GridLayout key={s.id} section={s} products={products} />;
        if (s.layout === "single-feature") return <FeatureLayout key={s.id} section={s} products={products} />;
        return <ReelCarousel key={s.id} section={s} products={products} />;
      })}
    </>
  );
}