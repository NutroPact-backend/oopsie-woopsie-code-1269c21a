// @ts-nocheck
import { useEffect, useState, useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'wouter';
import API from '@/lib/api';
import { formatPrice, calculateDiscount } from '@/lib/utils';
import { useSEO } from '@/lib/useSEO';
import { isLiteMode } from '@/lib/lite';
import QuickBuyButtons from '@/components/QuickBuyButtons';
import VideoSections from '@/components/video-sections/VideoSections';
import { T } from '@/lib/useContentT';

const RHYTHMS = [
  { duration: 6,   delay: 0   },
  { duration: 5.2, delay: 1   },
  { duration: 7,   delay: 0.5 },
  { duration: 5.8, delay: 1.5 },
  { duration: 6.5, delay: 0.3 },
  { duration: 4.8, delay: 0.8 },
];

function ts(t: any, mobile = false) {
  if (!t) return {};
  return {
    fontSize:      `${mobile ? (t.mobileSize || t.desktopSize || 16) : (t.desktopSize || 16)}px`,
    fontWeight:    t.weight  || '400',
    color:         t.color   || 'inherit',
    textAlign:     (t.align  || 'left') as any,
    textTransform: (t.transform || 'none') as any,
    marginBottom:  `${t.marginBottom ?? 8}px`,
  };
}

function SectionWrap({ sec, children }: { sec: any; children: ReactNode }) {
  return (
    <section
      style={{
        backgroundColor: sec.bgColor || '#fff',
        backgroundImage: sec.bgImage ? `url(${sec.bgImage})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        paddingTop:    `${sec.desktopPaddingTop    ?? 40}px`,
        paddingBottom: `${sec.desktopPaddingBottom ?? 40}px`,
        '--mobile-pt': `${sec.mobilePaddingTop ?? sec.desktopPaddingTop ?? 24}px`,
        '--mobile-pb': `${sec.mobilePaddingBottom ?? sec.desktopPaddingBottom ?? 24}px`,
      } as CSSProperties}
      className={`hp-section ${sec.bgVideo ? 'hp-section--video' : ''} ${sec.customClass || ''}`}
    >
      {sec.bgVideo && !(typeof window !== 'undefined' && isLiteMode()) && (
        <video className="hp-section-bg-video" src={sec.bgVideo} autoPlay muted loop playsInline preload="none" />
      )}
      <div className="hp-section-content">
        {children}
      </div>
    </section>
  );
}

function HeroSlider({ sec }: { sec: any }) {
  const [cur, setCur] = useState(0);
  const ref = useRef<any>(null);
  const slides = (sec.slides || []).filter((s: any) => s.enabled !== false);
  const hs = sec.heroSettings || {};
  const speed = hs.slideSpeed || 3000;
  const anim  = hs.animationStyle || 'slide';
  const ratio = hs.aspectRatio || '1920 / 700';
  const mobileFit = hs.mobileFit || 'contain';
  const lite = typeof window !== 'undefined' && isLiteMode();

  useEffect(() => {
    if (slides.length <= 1) return;
    ref.current = setInterval(() => setCur(p => (p + 1) % slides.length), speed);
    return () => clearInterval(ref.current);
  }, [slides.length, speed]);

  if (!slides.length) return null;

  const isLayered = ['fade','zoom','flip','blur'].includes(anim);

  return (
    <div className={`hp-hero hp-hero--${anim}`} style={{ aspectRatio: ratio.replace(' / ', '/'), backgroundColor: '#000' }}>
      <div
        className="hp-hero-wrapper"
        style={anim === 'slide' ? { transform: `translateX(-${cur * 100}%)` }
             : anim === 'vertical' ? { transform: `translateY(-${cur * 100}%)` }
             : {}}
      >
        {slides.map((slide: any, i: number) => (
          <div
            key={i}
            className={`hp-hero-slide ${isLayered ? (i === cur ? 'hp-active' : '') : ''}`}
          >
            {slide.link && <a href={slide.link} className="hp-hero-link" aria-label="Banner" />}
            {slide.video && !lite ? (
              <video src={slide.video} autoPlay loop muted playsInline preload="none" className="hp-hero-media"
                style={{ objectFit: (slide.imageFit || 'cover') as any }} />
            ) : slide.image ? (
              <picture>
                {slide.mobileImage && <source media="(max-width: 768px)" srcSet={slide.mobileImage} />}
                <img
                  src={slide.image}
                  alt={slide.headline || slide.title || `NutroPact hero slide ${i + 1}`}
                  className="hp-hero-media"
                  loading={i === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                  fetchPriority={i === 0 ? 'high' : 'auto'}
                  style={{
                    objectFit: (slide.imageFit || 'cover') as any,
                    '--mobile-fit': mobileFit,
                  } as any}
                />
              </picture>
            ) : null}
            {slide.text?.text && (
              <div className="hp-hero-text" style={{ left: `${slide.textX || 20}px`, bottom: `${slide.textY || 20}px` }}>
                <p style={ts(slide.text)}><T>{slide.text.text}</T></p>
              </div>
            )}
            {(slide.btnText || slide.btnText2) && (
              <div className="hp-hero-btns">
                {slide.btnText && <Link href={slide.btnLink || '/products'} className="hp-btn-primary"><T>{slide.btnText}</T></Link>}
                {slide.btnText2 && <Link href={slide.btnLink2 || '/products'} className="hp-btn-secondary"><T>{slide.btnText2}</T></Link>}
              </div>
            )}
          </div>
        ))}
      </div>
      {hs.showDots !== false && slides.length > 1 && (
        <div className="hp-hero-dots">
          {slides.map((_: any, i: number) => (
            <button key={i} onClick={() => { setCur(i); clearInterval(ref.current); }}
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === cur ? 'true' : undefined}
              className={`hp-hero-dot ${i === cur ? 'hp-hero-dot--active' : ''}`} />
          ))}
        </div>
      )}
      {hs.showArrows !== false && slides.length > 1 && (
        <>
          <button className="hp-hero-arrow hp-hero-arrow--prev"
            aria-label="Previous slide"
            onClick={() => setCur(p => (p - 1 + slides.length) % slides.length)}>&#8249;</button>
          <button className="hp-hero-arrow hp-hero-arrow--next"
            aria-label="Next slide"
            onClick={() => setCur(p => (p + 1) % slides.length)}>&#8250;</button>
        </>
      )}
    </div>
  );
}

function GoalTiles({ sec }: { sec: any }) {
  const ts2 = sec.tileSettings || {};
  const tiles = (sec.tiles || []).filter((t: any) => t.enabled !== false);
  const tileW = ts2.desktopTileWidth || 250;
  const tileH = ts2.desktopTileHeight || ts2.desktopImageHeight || 220;
  const imgH  = ts2.desktopImageHeight || 210;
  const gap   = ts2.gridGap || 30;
  const fd    = ts2.floatDistance || 12;
  const barH  = ts2.tileBottomHeight || 28;

  return (
    <SectionWrap sec={sec}>
      <div className="max-w-7xl mx-auto px-4 text-center">
        {sec.heading?.text && <h2 style={ts(sec.heading)}><T>{sec.heading.text}</T></h2>}
        {sec.subheading?.text && <p style={ts(sec.subheading)}><T>{sec.subheading.text}</T></p>}
        <div className="goal-grid" style={{ '--goal-gap': `${gap}px` } as any}>
          {tiles.map((tile: any, i: number) => {
            const r = RHYTHMS[i % RHYTHMS.length];
            const dur = tile.animationDuration || r.duration;
            const del = tile.animationDelay    ?? r.delay;
            const href = tile.link || (tile.slug ? `/products?category=${tile.slug}` : '/products');
            const tileBg = tile.bgColor || ts2.tileBg || '#000';
            const botBg  = tile.bottomColor || ts2.tileBottomColor || '#58b385';
            const botTxt = tile.bottomText?.color || ts2.tileBottomTextColor || '#000';
            const hovBg  = ts2.tileHoverColor || '#000';
            const hovTxt = ts2.tileHoverTextColor || '#fff';
            return (
              <a
                key={i}
                href={href}
                className="goal-tile"
                style={{
                  '--tile-width':        `${tileW}px`,
                  '--tile-height':       `${tileH}px`,
                  '--tile-image-height': `${imgH}px`,
                  '--tile-image-padding': `${ts2.imagePadding ?? 10}px`,
                  '--tile-bg':           tileBg,
                  '--tile-bottom-bg':    botBg,
                  '--tile-bottom-color': botTxt,
                  '--tile-bottom-height': `${barH}px`,
                  '--tile-bottom-width': `${ts2.tileBottomWidthPercent || 100}%`,
                  '--tile-hover-bg':     hovBg,
                  '--tile-hover-text':   hovTxt,
                  '--tile-shadow':       ts2.shadow || '0 12px 30px rgba(19,10,10,0.15)',
                  '--tile-hover-shadow': ts2.hoverShadow || '0 35px 70px rgba(0,0,0,0.3)',
                  '--tile-radius':       `${ts2.radius || 14}px`,
                  '--tile-notch':        `${ts2.notchSize ?? 24}px`,
                  '--float-distance':    `${fd}px`,
                  '--float-duration':    `${dur}s`,
                  '--float-delay':       `${del}s`,
                  '--mobile-tile-width': `${ts2.mobileTileWidthPercent || 46}%`,
                  '--mobile-tile-height': `${ts2.mobileTileHeight || 155}px`,
                  '--mobile-tile-image-height': `${ts2.mobileImageHeight || 125}px`,
                } as any}
              >
                <div className="tile-image">
                  {tile.image
                    ? <img src={tile.image} alt={tile.bottomText?.text || ''}  loading="lazy" decoding="async"/>
                    : <span style={{ fontSize: 48 }}>🥛</span>
                  }
                </div>
                {tile.topText?.text && (
                  <div className="tile-title"
                    style={{
                      fontSize:      `${tile.topText.desktopSize || 16}px`,
                      fontWeight:    tile.topText.weight || '700',
                      color:         tile.topText.color || '#fff',
                      textTransform: (tile.topText.transform || 'uppercase') as any,
                    }}>
                    <T>{tile.topText.text}</T>
                  </div>
                )}
                <div className="tile-overlay" />
                <div className="tile-bottom"
                  style={{
                    fontSize:   `${tile.bottomText?.desktopSize || 14}px`,
                    fontWeight: tile.bottomText?.weight || '700',
                  }}>
                  <T>{tile.bottomText?.text || ''}</T>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </SectionWrap>
  );
}

function ImageBanner({ sec }: { sec: any }) {
  const b = sec.banner || {};
  const image = b.image || sec.image || '';
  const mobileImage = b.mobileImage || sec.mobileImage || '';
  const link = b.link || sec.link || sec.btnLink || '';
  const fit = b.imageFit || sec.imageFit || 'cover';
  const ratio = b.aspectRatio || sec.aspectRatio || 'auto';
  return (
    <SectionWrap sec={sec}>
      {image ? (
        <div className="relative">
          {link && <a href={link} className="absolute inset-0 z-10" aria-label="Banner" />}
          <picture>
            {mobileImage && <source media="(max-width: 768px)" srcSet={mobileImage} />}
            <img src={image} alt={sec.heading?.text || sec.title || ''} className="w-full block"
              style={{ objectFit: fit as any, aspectRatio: ratio }}  loading="lazy" decoding="async"/>
          </picture>
        </div>
      ) : (
        <div className="max-w-3xl mx-auto px-4 text-center">
          {(sec.heading?.text || sec.title) && <h2 style={ts(sec.heading || { text: sec.title, desktopSize: sec.titleSize, weight: sec.titleWeight, color: sec.titleColor })}><T>{sec.heading?.text || sec.title}</T></h2>}
          {(sec.subheading?.text || sec.subtitle) && <p style={ts(sec.subheading || { text: sec.subtitle, desktopSize: sec.subtitleSize, color: sec.subtitleColor })}><T>{sec.subheading?.text || sec.subtitle}</T></p>}
          {sec.btnText && <Link href={sec.btnLink || '/products'} className="hp-btn-primary inline-block mt-4"><T>{sec.btnText}</T></Link>}
        </div>
      )}
    </SectionWrap>
  );
}

function TextSection({ sec }: { sec: any }) {
  return (
    <SectionWrap sec={sec}>
      <div className="max-w-3xl mx-auto px-4 text-center">
        {(sec.heading?.text || sec.title) && <h2 style={ts(sec.heading || { text: sec.title, desktopSize: sec.titleSize, weight: sec.titleWeight, color: sec.titleColor || sec.textColor })}><T>{sec.heading?.text || sec.title}</T></h2>}
        {(sec.subheading?.text || sec.subtitle) && <p style={ts(sec.subheading || { text: sec.subtitle, desktopSize: sec.subtitleSize, color: sec.subtitleColor || sec.textColor })}><T>{sec.subheading?.text || sec.subtitle}</T></p>}
        {(sec.textContent || sec.content) && <div className="mt-4 text-base leading-relaxed" dangerouslySetInnerHTML={{ __html: sec.textContent || sec.content }} />}
        {sec.btnText && <Link href={sec.btnLink || '/products'} className="hp-btn-primary inline-block mt-6"><T>{sec.btnText}</T></Link>}
      </div>
    </SectionWrap>
  );
}

function Trustbar({ sec }: { sec: any }) {
  const tb = sec.trustbarSettings || {};
  const items = (tb.items || []).filter((it: any) => it.enabled !== false);
  return (
    <SectionWrap sec={sec}>
      <div className="max-w-7xl mx-auto px-4 flex flex-wrap justify-center"
        style={{ gap: `${tb.gap || 16}px` }}>
        {items.map((item: any, i: number) => (
          <span key={i} className="flex items-center gap-2"
            style={{ fontSize: `${tb.textSize || 14}px`, fontWeight: tb.textWeight || '600' }}>
            {item.icon && <span style={{ fontSize: `${tb.iconSize || 24}px` }}>{item.icon}</span>}
            <T>{item.text}</T>
          </span>
        ))}
      </div>
    </SectionWrap>
  );
}

function FeaturedProducts({ sec, products }: { sec: any; products: any[] }) {
  const fs = sec.featuredSettings || {};
  const count = fs.count || 4;
  const pool = fs.category ? products.filter((p: any) => p.category === fs.category) : products;
  const shown = pool.slice(0, count);
  if (!shown.length) return null;
  return (
    <SectionWrap sec={sec}>
      <div className="max-w-7xl mx-auto px-4">
        {sec.heading?.text && <h2 style={ts(sec.heading)}><T>{sec.heading.text}</T></h2>}
        {sec.subheading?.text && <p style={ts(sec.subheading)}><T>{sec.subheading.text}</T></p>}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4 md:gap-5 mt-6 md:mt-8">
          {shown.map((p: any) => (
            <Link key={p._id} href={`/products/${p.slug}`}
              className="bg-white rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all overflow-hidden group border border-gray-100">
              <div className="bg-gray-100 h-48 flex items-center justify-center relative overflow-hidden">
                {p.images?.[0]
                  ? <img src={p.images[0]} alt={p.name} loading="lazy" decoding="async"
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                  : <span className="text-6xl">🥛</span>
                }
                {p.comparePrice > p.price && (
                  <span className="absolute top-2 left-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                    {calculateDiscount(p.price, p.comparePrice)}% OFF
                  </span>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-bold text-gray-800 text-sm line-clamp-2 group-hover:text-orange-500 transition"><T>{p.name}</T></h3>
                <div className="flex items-center gap-2 mt-2">
                  <span className="font-black text-gray-900">{formatPrice(p.price)}</span>
                  {p.comparePrice > p.price && <span className="text-gray-500 line-through text-sm">{formatPrice(p.comparePrice)}</span>}
                </div>
                <QuickBuyButtons product={p} size="sm" className="mt-3" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </SectionWrap>
  );
}

function TestimonialsMarquee({ sec, testimonials }: { sec: any; testimonials: any[] }) {
  const rs = sec.reviewsSettings || {};
  const minRating = rs.minRating || 4;
  const items = testimonials.filter((t: any) => (t.rating || 0) >= minRating).slice(0, rs.count || 20);
  if (!items.length) return null;
  const doubled = [...items, ...items];
  return (
    <SectionWrap sec={sec}>
      <div className="max-w-full">
        {sec.heading?.text && (
          <div className="max-w-7xl mx-auto px-4">
            <h2 style={{ ...ts(sec.heading), textAlign: 'center' }}><T>{sec.heading.text}</T></h2>
            {sec.subheading?.text && <p style={{ ...ts(sec.subheading), textAlign: 'center' }}><T>{sec.subheading.text}</T></p>}
          </div>
        )}
        <div className="marquee-outer mt-8">
          <div className="marquee-track">
            {doubled.map((t: any, i: number) => (
              <div key={i} className="marquee-card">
                <div className="flex items-center gap-2 mb-3">
                  <img
                    src={t.avatar || `https://i.pravatar.cc/80?u=${encodeURIComponent(t.name || 'customer')}`}
                    alt={t.name || 'Customer'}
                    className="w-9 h-9 rounded-full object-cover border border-gray-100 shrink-0"
                    loading="lazy" decoding="async" />

                  <div className="min-w-0">
                    <p className="font-bold text-sm text-gray-900 truncate">{t.name || 'Customer'}</p>
                    <p className="text-yellow-500 text-xs">{'★'.repeat(t.rating || 5)}</p>
                  </div>
                </div>
                <p className="text-gray-600 text-xs leading-relaxed line-clamp-3"><T>{t.comment}</T></p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SectionWrap>
  );
}

function legacySectionsFromHp(hp: any) {
  const sections: any[] = [];
  const hasCustomSections = Array.isArray(hp.customSections) && hp.customSections.length > 0;
  if (hp.heroSlides?.length || hp.heroSettings) {
    sections.push({
      type: 'heroSlider', name: 'Hero Slider', order: 0, enabled: hp.heroEnabled !== false,
      slides: hp.heroSlides || [],
      heroSettings: hp.heroSettings || {},
    });
  }
  if (hp.goalTiles?.length || hp.categories?.length) {
    sections.push({
      type: 'goalTiles', name: 'Goal Tiles', order: 5, enabled: hp.goalTilesEnabled !== false,
      bgColor: hp.goalTilesBgColor || '#fff',
      heading: { text: hp.goalTilesTitle || '', desktopSize: hp.goalTilesTitleSize || 28, mobileSize: 22, weight: '900', color: hp.goalTilesTitleColor || '#000', align: 'center', marginBottom: 16 },
      subheading: { text: hp.goalTilesSubtitle || '', desktopSize: 16, mobileSize: 14, weight: '400', color: '#666', align: 'center', marginBottom: 0 },
      tileSettings: hp.tileSettings || {},
      tiles: hp.goalTiles?.length ? hp.goalTiles : (hp.categories || []).map((c: any, i: number) => {
        const rhythm = RHYTHMS[i % RHYTHMS.length];
        return {
          enabled: true, image: c.image || '', link: c.link || `/products?category=${c.slug || c.name}`,
          slug: c.slug,
          topText: { text: '' },
          bottomText: { text: c.name || '', desktopSize: hp.categoryLabelSize || 18, mobileSize: 13, weight: hp.categoryLabelWeight || '700', color: c.labelColor || '#000000', align: 'center', transform: 'uppercase' },
          bgColor: c.bgColor || '#000000', bottomColor: c.labelBg || '#58b385',
          animationDuration: c.animationDuration || rhythm.duration, animationDelay: c.animationDelay ?? rhythm.delay,
        };
      }),
    });
  }
  const customSections = hp.customSections || [];
  customSections.forEach((s: any, i: number) => {
    sections.push({
      ...s, type: s.type || 'banner', name: s.title || `Custom Section ${i + 1}`, order: 10 + (s.order || i),
      heading: { text: s.title || '', desktopSize: s.titleSize || 28, mobileSize: 22, weight: s.titleWeight || '700', color: s.titleColor || s.textColor || '#000000', align: 'center', marginBottom: 8 },
      subheading: { text: s.subtitle || '', desktopSize: s.subtitleSize || 16, mobileSize: 14, weight: '400', color: s.subtitleColor || s.textColor || '#666666', align: 'center', marginBottom: 0 },
      banner: { image: s.image || '', mobileImage: s.mobileImage || '', link: s.btnLink || '', imageFit: 'cover', aspectRatio: 'auto' },
    });
  });
  if (hp.featuredEnabled) {
    sections.push({
      type: 'featuredProducts', name: 'Featured Products', order: 50, enabled: true,
      bgColor: hp.featuredBgColor || '#ffffff',
      heading: { text: hp.featuredTitle || 'BESTSELLERS', desktopSize: hp.featuredTitleSize || 28, mobileSize: 22, weight: hp.featuredTitleWeight || '900', color: hp.featuredTitleColor || '#000000', align: 'center', marginBottom: 8 },
      subheading: { text: hp.featuredSubtitle || '', desktopSize: 16, mobileSize: 14, weight: '400', color: '#666666', align: 'center', marginBottom: 0 },
      featuredSettings: { count: hp.featuredCount || 4, category: '' },
    });
  }
  if (hp.testimonialsEnabled && !hasCustomSections) {
    sections.push({
      type: 'testimonials', name: 'Testimonials', order: 99, enabled: true, bgColor: '#f9fafb',
      heading: { text: hp.testimonialsTitle || 'What Our Customers Say', desktopSize: 28, mobileSize: 22, weight: '900', color: '#111111', align: 'center', marginBottom: 8 },
      subheading: { text: hp.testimonialsSubtitle || 'Real results from real people', desktopSize: 16, mobileSize: 14, weight: '400', color: '#666666', align: 'center', marginBottom: 0 },
      reviewsSettings: { count: hp.testimonialsCount || 8, minRating: 4 },
    });
  }
  return sections;
}

function mergeSectionsWithLegacy(existingSections: any[], hp: any) {
  const existing = Array.isArray(existingSections) ? existingSections : [];
  const legacy = legacySectionsFromHp(hp);
  const hasType = (type: string) => existing.some((section: any) => section.type === type);
  const additions = legacy.filter((section: any) => {
    if (section.type === 'heroSlider') return !hasType('heroSlider');
    if (section.type === 'goalTiles') return !hasType('goalTiles');
    if (section.type === 'featuredProducts') return !hasType('featuredProducts');
    if (section.type === 'testimonials') return !hasType('testimonials') && !hasType('reviews');
    return false;
  });
  return [...existing, ...additions];
}

function sectionHasRenderableContent(sec: any, products: any[], testimonials: any[]) {
  if (sec.type === 'heroSlider') return Array.isArray(sec.slides) && sec.slides.length > 0;
  if (sec.type === 'goalTiles') return Array.isArray(sec.tiles) && sec.tiles.length > 0;
  if (sec.type === 'banner') return Boolean(sec.banner?.image || sec.image || sec.heading?.text || sec.title || sec.subheading?.text || sec.subtitle || sec.btnText);
  if (sec.type === 'text') return Boolean(sec.textContent || sec.content || sec.heading?.text || sec.title || sec.subheading?.text || sec.subtitle);
  if (sec.type === 'trustbar') return Array.isArray(sec.trustbarSettings?.items) && sec.trustbarSettings.items.length > 0;
  if (sec.type === 'featuredProducts') return products.length > 0;
  if (sec.type === 'reviews' || sec.type === 'testimonials') return testimonials.length > 0;
  return false;
}

function buildDefaultHomepageSections(products: any[], testimonials: any[]) {
  const sections: any[] = [
    {
      type: 'banner',
      name: 'NutroPact Hero',
      order: 0,
      enabled: true,
      bgColor: '#fff7ed',
      desktopPaddingTop: 72,
      desktopPaddingBottom: 72,
      mobilePaddingTop: 48,
      mobilePaddingBottom: 48,
      heading: {
        text: 'Premium nutrition that does not cut corners',
        desktopSize: 48,
        mobileSize: 32,
        weight: '900',
        color: '#111827',
        align: 'center',
        marginBottom: 16,
      },
      subheading: {
        text: 'Lab-tested whey, creatine, pre-workout, and daily performance essentials built for athletes across India.',
        desktopSize: 18,
        mobileSize: 16,
        weight: '400',
        color: '#4b5563',
        align: 'center',
        marginBottom: 0,
      },
      btnText: 'Shop All Products',
      btnLink: '/products',
    },
    {
      type: 'trustbar',
      name: 'Trust Bar',
      order: 10,
      enabled: true,
      bgColor: '#ffffff',
      desktopPaddingTop: 18,
      desktopPaddingBottom: 18,
      mobilePaddingTop: 16,
      mobilePaddingBottom: 16,
      trustbarSettings: {
        gap: 24,
        textSize: 14,
        textWeight: '700',
        iconSize: 18,
        items: [
          { enabled: true, icon: '🧪', text: 'Lab-tested batches' },
          { enabled: true, icon: '🚚', text: 'Tracked delivery across India' },
          { enabled: true, icon: '✅', text: 'Authenticity-first approach' },
          { enabled: true, icon: '↩️', text: '7-day return support' },
        ],
      },
    },
    {
      type: 'goalTiles',
      name: 'Core Categories',
      order: 20,
      enabled: true,
      bgColor: '#f8fafc',
      heading: {
        text: 'Shop the essentials',
        desktopSize: 30,
        mobileSize: 24,
        weight: '900',
        color: '#111827',
        align: 'center',
        marginBottom: 12,
      },
      subheading: {
        text: 'Everyday staples for strength, recovery, and performance.',
        desktopSize: 16,
        mobileSize: 14,
        weight: '400',
        color: '#6b7280',
        align: 'center',
        marginBottom: 0,
      },
      tileSettings: {
        desktopTileWidth: 250,
        desktopTileHeight: 220,
        desktopImageHeight: 152,
        radius: 14,
        imagePadding: 0,
        gridGap: 22,
        tileBottomHeight: 40,
        tileBottomColor: '#f97316',
        tileBg: '#111827',
        tileBottomTextColor: '#ffffff',
      },
      tiles: [
        { enabled: true, image: '', link: '/products?search=whey', bottomText: { text: 'Whey Protein', desktopSize: 15, weight: '800', color: '#ffffff', align: 'center' }, bgColor: '#111827', bottomColor: '#f97316' },
        { enabled: true, image: '', link: '/products?search=creatine', bottomText: { text: 'Creatine', desktopSize: 15, weight: '800', color: '#ffffff', align: 'center' }, bgColor: '#1f2937', bottomColor: '#fb923c' },
        { enabled: true, image: '', link: '/products?search=pre-workout', bottomText: { text: 'Pre-Workout', desktopSize: 15, weight: '800', color: '#ffffff', align: 'center' }, bgColor: '#0f172a', bottomColor: '#ea580c' },
        { enabled: true, image: '', link: '/products?search=gainer', bottomText: { text: 'Mass Gainers', desktopSize: 15, weight: '800', color: '#ffffff', align: 'center' }, bgColor: '#1e293b', bottomColor: '#f59e0b' },
      ],
    },
    {
      type: 'text',
      name: 'Brand Promise',
      order: 30,
      enabled: true,
      bgColor: '#ffffff',
      heading: {
        text: 'Built for serious athletes, not empty claims',
        desktopSize: 32,
        mobileSize: 24,
        weight: '900',
        color: '#111827',
        align: 'center',
        marginBottom: 12,
      },
      subheading: {
        text: 'NutroPact keeps quality, transparency, and practical performance at the center of every batch.',
        desktopSize: 16,
        mobileSize: 14,
        weight: '400',
        color: '#6b7280',
        align: 'center',
        marginBottom: 0,
      },
      content: '<p>Shop confidently with lab-tested formulations, clear ingredient information, tracked delivery, COD support, and a customer-first return process.</p>',
      btnText: 'Read Our Story',
      btnLink: '/about',
    },
  ];

  if (products.length > 0) {
    sections.push({
      type: 'featuredProducts',
      name: 'Featured Products',
      order: 40,
      enabled: true,
      bgColor: '#ffffff',
      heading: { text: 'Popular right now', desktopSize: 30, mobileSize: 24, weight: '900', color: '#111827', align: 'center', marginBottom: 8 },
      subheading: { text: 'Top picks from the live catalog.', desktopSize: 16, mobileSize: 14, weight: '400', color: '#6b7280', align: 'center', marginBottom: 0 },
      featuredSettings: { count: 4, category: '' },
    });
  }

  if (testimonials.length > 0) {
    sections.push({
      type: 'testimonials',
      name: 'Testimonials',
      order: 50,
      enabled: true,
      bgColor: '#f8fafc',
      heading: { text: 'What customers are saying', desktopSize: 28, mobileSize: 22, weight: '900', color: '#111827', align: 'center', marginBottom: 8 },
      subheading: { text: 'Verified feedback from real shoppers.', desktopSize: 16, mobileSize: 14, weight: '400', color: '#6b7280', align: 'center', marginBottom: 0 },
      reviewsSettings: { count: 8, minRating: 4 },
    });
  }

  return sections;
}

export default function Home() {
  const [hp, setHp] = useState<any>(null);
  const [hpResolved, setHpResolved] = useState(false);
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  useSEO({
    title: 'Premium Supplements India — Protein, Creatine, Pre-Workout',
    description: 'NutroPact — Lab-tested protein, creatine, pre-workout, and mass gainers. Premium supplements for serious athletes. Free delivery above ₹999. Trusted by 50,000+ athletes.',
    keywords: 'buy whey protein india, creatine online india, pre-workout supplement, mass gainer india, best supplements india',
  });

  useEffect(() => {
    API.get('/homepage')
      .then(r => setHp(r.data))
      .catch(() => setHp({}))
      .finally(() => setHpResolved(true));
    API.get('/homepage/testimonials').then(r => setTestimonials(r.data)).catch(() => {});
    API.get('/products').then(r => setProducts(r.data || [])).catch(() => {});
  }, []);

  const homeData = hp ?? {};
  const rawSections = homeData.sections?.length ? mergeSectionsWithLegacy(homeData.sections, homeData) : legacySectionsFromHp(homeData);
  const configuredSections = rawSections
    .filter((s: any) => s.enabled !== false)
    .sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
  const hasConfiguredHomepage = configuredSections.some((sec: any) => sectionHasRenderableContent(sec, products, testimonials));
  const sections = (hasConfiguredHomepage ? configuredSections : buildDefaultHomepageSections(products, testimonials))
    .filter((s: any) => s.enabled !== false)
    .sort((a: any, b: any) => (a.order || 0) - (b.order || 0));

  return (
    <div className="overflow-x-hidden">
      {/* Visually hidden brand H1 — gives the homepage a single, descriptive
          top-level heading for crawlers and screen readers without altering
          the existing CMS-driven hero design. */}
      <h1 className="sr-only">NutroPact — Premium Nutrition &amp; Supplements</h1>
      <VideoSections placement="home" />
      {sections.map((sec: any, idx: number) => {
        const key = sec._id || idx;
        if (sec.type === 'heroSlider')      return <HeroSlider       key={key} sec={sec} />;
        if (sec.type === 'goalTiles')       return <GoalTiles        key={key} sec={sec} />;
        if (sec.type === 'banner')          return <ImageBanner      key={key} sec={sec} />;
        if (sec.type === 'text')            return <TextSection      key={key} sec={sec} />;
        if (sec.type === 'trustbar')        return <Trustbar         key={key} sec={sec} />;
        if (sec.type === 'featuredProducts')return <FeaturedProducts key={key} sec={sec} products={products} />;
        if (sec.type === 'reviews')         return <TestimonialsMarquee key={key} sec={sec} testimonials={testimonials} />;
        if (sec.type === 'testimonials')    return <TestimonialsMarquee key={key} sec={sec} testimonials={testimonials} />;
        return null;
      })}

      <style>{`
        .hp-hero { position: relative; overflow: hidden; background: #000; width: 100%; }
        .hp-hero-wrapper { display: flex; width: 100%; height: 100%; transition: transform 0.75s ease; }
        .hp-hero--slide .hp-hero-wrapper,
        .hp-hero--vertical .hp-hero-wrapper { display: flex; }
        .hp-hero--vertical .hp-hero-wrapper { flex-direction: column; }
        .hp-hero--fade .hp-hero-wrapper,
        .hp-hero--zoom .hp-hero-wrapper,
        .hp-hero--flip .hp-hero-wrapper,
        .hp-hero--blur .hp-hero-wrapper { display: block; perspective: 1200px; }
        .hp-hero-slide { flex: 0 0 100%; min-width: 100%; width: 100%; height: 100%; position: relative; overflow: hidden; background: #000; }
        .hp-hero--fade .hp-hero-slide,
        .hp-hero--zoom .hp-hero-slide,
        .hp-hero--flip .hp-hero-slide,
        .hp-hero--blur .hp-hero-slide { position: absolute; inset: 0; opacity: 0; pointer-events: none; transition: opacity 0.8s ease, transform 0.8s ease, filter 0.8s ease; }
        .hp-hero--fade .hp-hero-slide.hp-active,
        .hp-hero--zoom .hp-hero-slide.hp-active,
        .hp-hero--flip .hp-hero-slide.hp-active,
        .hp-hero--blur .hp-hero-slide.hp-active { opacity: 1; pointer-events: auto; z-index: 2; }
        .hp-hero--zoom .hp-hero-slide { transform: scale(1.08); }
        .hp-hero--zoom .hp-hero-slide.hp-active { transform: scale(1); }
        .hp-hero--flip .hp-hero-slide { transform: rotateY(75deg) scale(0.96); transform-origin: center; }
        .hp-hero--flip .hp-hero-slide.hp-active { transform: rotateY(0deg) scale(1); }
        .hp-hero--blur .hp-hero-slide { transform: scale(1.04); filter: blur(10px); }
        .hp-hero--blur .hp-hero-slide.hp-active { transform: scale(1); filter: blur(0); }
        .hp-hero-media { width: 100%; height: 100%; display: block; object-fit: cover; }
        .hp-hero picture { display: block; width: 100%; height: 100%; }
        .hp-hero-link { position: absolute; inset: 0; z-index: 4; }
        .hp-hero-text { position: absolute; z-index: 5; pointer-events: none; max-width: calc(100% - 40px); }
        .hp-hero-btns { position: absolute; bottom: 24px; left: 50%; transform: translateX(-50%); z-index: 6; display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; }
        .hp-hero-dots { position: absolute; bottom: 12px; left: 50%; transform: translateX(-50%); display: flex; gap: 6px; z-index: 10; }
        .hp-hero-dot { width: 8px; height: 8px; border-radius: 999px; background: rgba(255,255,255,0.5); border: 0; cursor: pointer; transition: all 0.3s; padding: 0; }
        .hp-hero-dot--active { background: #fff; width: 24px; }
        .hp-hero-arrow { position: absolute; top: 50%; transform: translateY(-50%); z-index: 10; background: rgba(0,0,0,0.4); color: #fff; border: 0; width: 40px; height: 40px; border-radius: 50%; font-size: 22px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.2s; }
        .hp-hero-arrow:hover { background: rgba(0,0,0,0.65); }
        .hp-hero-arrow--prev { left: 12px; }
        .hp-hero-arrow--next { right: 12px; }
        @media (max-width: 768px) {
          .hp-hero-media { object-fit: var(--mobile-fit, contain) !important; background: #000; }
        }
        .hp-section { position: relative; overflow: hidden; }
        .hp-section-content { position: relative; z-index: 1; }
        .hp-section-bg-video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: 0; pointer-events: none; }
        .goal-grid { display: flex; flex-wrap: wrap; justify-content: center; gap: clamp(10px, 2vw, var(--goal-gap, 30px)); padding: clamp(20px, 4vw, 40px) 10px; overflow: visible; }
        .goal-tile {
          flex: 1 1 calc((100% - 3 * clamp(10px, 2vw, var(--goal-gap, 30px))) / 4);
          max-width: var(--tile-width, 250px); min-width: 140px;
          aspect-ratio: var(--tile-width, 250px) / var(--tile-height, 220px); height: auto;
          position: relative; text-decoration: none; background: transparent;
          clip-path: polygon(var(--tile-notch, 24px) 0, 100% 0, 100% calc(100% - var(--tile-notch, 24px)), calc(100% - var(--tile-notch, 24px)) 100%, 0 100%, 0 var(--tile-notch, 24px));
          box-shadow: var(--tile-shadow); border-radius: var(--tile-radius, 14px); overflow: hidden;
          animation: floatingCloud var(--float-duration, 6s) ease-in-out infinite;
          animation-delay: var(--float-delay, 0s); transition: transform 0.4s ease, box-shadow 0.4s ease;
        }
        .goal-tile:hover { transform: scale(1.03); box-shadow: var(--tile-hover-shadow); animation-play-state: paused; }
        .tile-image { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: transparent; padding: 0; }
        .tile-image img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .tile-overlay { position: absolute; inset: 0; pointer-events: none; background: linear-gradient(to bottom, transparent 60%, rgba(0,0,0,0.6) 100%); }
        .tile-title { position: absolute; top: 45%; left: 50%; transform: translate(-50%, -50%); width: 85%; text-align: center; text-transform: uppercase; color: #fff; }
        .tile-bottom { position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: var(--tile-bottom-width, 100%); height: clamp(22px, 3.4vw, var(--tile-bottom-height, 28px)); display: flex; align-items: center; justify-content: center; padding: 0 4px; text-align: center; line-height: 0.95; background: var(--tile-bottom-bg, #58b385); color: var(--tile-bottom-color, #000); text-transform: uppercase; transition: background 0.3s, color 0.3s; font-size: clamp(11px, 1.3vw, 14px); }
        .goal-tile:hover .tile-bottom { background: var(--tile-hover-bg, #000); color: var(--tile-hover-text, #fff); }
        @keyframes floatingCloud {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(calc(var(--float-distance, 12px) * -1)); }
        }
        @media (max-width: 640px) {
          .goal-grid { gap: 12px; padding: 20px 6px; }
          .goal-tile {
            flex: 1 1 calc((100% - 12px) / 2);
            max-width: none; min-width: 0;
          }
          .tile-bottom { font-size: 11px; padding: 4px 0; }
        }
        .hp-btn-primary { background: #f97316; color: #fff; padding: 12px 32px; border-radius: 50px; font-weight: 700; font-size: 15px; text-decoration: none; transition: background 0.2s; display: inline-block; }
        .hp-btn-primary:hover { background: #ea6c0a; }
        .hp-btn-secondary { background: transparent; color: #fff; padding: 12px 32px; border-radius: 50px; font-weight: 700; font-size: 15px; text-decoration: none; border: 2px solid #fff; transition: all 0.2s; display: inline-block; }
        .hp-btn-secondary:hover { background: #fff; color: #111; }
        @media (max-width: 768px) {
          .hp-section { padding-top: var(--mobile-pt, 24px) !important; padding-bottom: var(--mobile-pb, 24px) !important; }
        }

        /* Testimonials Marquee */
        .marquee-outer { overflow: hidden; width: 100%; padding: 8px 0; }
        .marquee-track { display: flex; gap: 16px; width: max-content; animation: marquee-left 45s linear infinite; }
        .marquee-track:hover { animation-play-state: paused; }
        .marquee-card { width: 260px; flex-shrink: 0; background: #fff; border-radius: 14px; padding: 16px; box-shadow: 0 2px 10px rgba(0,0,0,0.07); border: 1px solid #f0f0f0; }
        @keyframes marquee-left {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @media (max-width: 768px) {
          .marquee-card { width: 220px; padding: 12px; }
          .marquee-track { gap: 12px; animation-duration: 35s; }
        }
        @media (prefers-reduced-motion: reduce) {
          .marquee-track { animation: none; overflow-x: auto; }
        }
      `}</style>
    </div>
  );
}
