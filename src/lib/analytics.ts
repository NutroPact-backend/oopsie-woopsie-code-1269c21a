// Analytics — supports GA4, Facebook Pixel, Google Tag Manager, TikTok Pixel, Snapchat Pixel
// Global pixels configure via environment variables:
//   VITE_GA_ID           — Google Analytics 4 Measurement ID  (e.g. G-XXXXXXXXXX)
//   VITE_FB_PIXEL_ID     — Facebook Pixel ID                  (e.g. 1234567890123)
//   VITE_GTM_ID          — Google Tag Manager Container ID    (e.g. GTM-XXXXXXX)
//   VITE_TIKTOK_PIXEL_ID — TikTok Pixel ID
//   VITE_SNAPCHAT_PIXEL_ID — Snapchat Pixel ID
// Per-product pixels are configured in the admin → product → Pixels tab.

import { trackSiteEvent } from "./track-event";

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    fbq: (...args: any[]) => void;
    dataLayer: any[];
    _fbq: any;
    ttq: any;
    snaptr: (...args: any[]) => void;
  }
}

const GA_ID = import.meta.env.VITE_GA_ID as string | undefined;
const FB_PIXEL_ID = import.meta.env.VITE_FB_PIXEL_ID as string | undefined;
const GTM_ID = import.meta.env.VITE_GTM_ID as string | undefined;
const TIKTOK_PIXEL_ID = import.meta.env.VITE_TIKTOK_PIXEL_ID as string | undefined;
const SNAPCHAT_PIXEL_ID = import.meta.env.VITE_SNAPCHAT_PIXEL_ID as string | undefined;

// Track which pixel IDs have already been initialized so we never double-init
const initializedFbPixels = new Set<string>();
const initializedGa4Ids = new Set<string>();
const initializedTikTokPixels = new Set<string>();
const initializedSnapPixels = new Set<string>();

function appendScript(src: string, onLoad?: () => void) {
  const s = document.createElement('script');
  s.src = src;
  s.async = true;
  if (onLoad) s.onload = onLoad;
  document.head.appendChild(s);
}

function inlineScript(code: string) {
  const s = document.createElement('script');
  s.textContent = code;
  document.head.appendChild(s);
}

// ─── Global pixel bootstrap ──────────────────────────────────────────────────

export function initAnalytics() {
  if (GTM_ID) {
    window.dataLayer = window.dataLayer || [];
    inlineScript(
      `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':` +
      `new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],` +
      `j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;` +
      `j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;` +
      `f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM_ID}');`
    );
    const noscript = document.createElement('noscript');
    noscript.innerHTML = `<iframe src="https://www.googletagmanager.com/ns.html?id=${GTM_ID}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`;
    document.body.prepend(noscript);
  }

  if (GA_ID) {
    initGa4(GA_ID);
  }

  if (FB_PIXEL_ID) {
    initFbPixel(FB_PIXEL_ID);
  }

  if (TIKTOK_PIXEL_ID) {
    initTikTokPixel(TIKTOK_PIXEL_ID);
  }

  if (SNAPCHAT_PIXEL_ID) {
    initSnapchatPixel(SNAPCHAT_PIXEL_ID);
  }
}

// ─── Idempotent per-pixel initializers ───────────────────────────────────────

export function initFbPixel(pixelId: string) {
  if (!pixelId || initializedFbPixels.has(pixelId)) return;
  initializedFbPixels.add(pixelId);

  if (!window.fbq) {
    const fbq: any = function () { (fbq.q = fbq.q || []).push(arguments); };
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = '2.0';
    fbq.queue = [];
    window.fbq = fbq;
    window._fbq = fbq;
    appendScript('https://connect.facebook.net/en_US/fbevents.js');
  }

  window.fbq('init', pixelId);
  window.fbq('track', 'PageView');
}

export function initGa4(measurementId: string) {
  if (!measurementId || initializedGa4Ids.has(measurementId)) return;
  initializedGa4Ids.add(measurementId);

  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    window.gtag = function gtag() { window.dataLayer.push(arguments); };
    appendScript(`https://www.googletagmanager.com/gtag/js?id=${measurementId}`);
  } else {
    appendScript(`https://www.googletagmanager.com/gtag/js?id=${measurementId}`);
  }
  window.gtag('js', new Date());
  window.gtag('config', measurementId, { send_page_view: false });
}

export function initTikTokPixel(pixelId: string) {
  if (!pixelId || initializedTikTokPixels.has(pixelId)) return;
  initializedTikTokPixels.add(pixelId);

  if (!window.ttq) {
    inlineScript(`
      !function (w, d, t) {
        w.TiktokAnalyticsObject=t;
        var ttq=w[t]=w[t]||[];
        ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];
        ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};
        for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);
        ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};
        ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
        w[t]=ttq;
      }(window,document,'ttq');
    `);
  }

  if (window.ttq && window.ttq.load) {
    window.ttq.load(pixelId);
    window.ttq.page();
  }
}

export function initSnapchatPixel(pixelId: string) {
  if (!pixelId || initializedSnapPixels.has(pixelId)) return;
  initializedSnapPixels.add(pixelId);

  if (!window.snaptr) {
    inlineScript(`
      (function(e,t,n){if(e.snaptr)return;var a=e.snaptr=function(){a.handleRequest?a.handleRequest.apply(a,arguments):a.queue.push(arguments)};a.queue=[];var s='script';r=t.createElement(s);r.async=!0;r.src=n;var u=t.getElementsByTagName(s)[0];u.parentNode.insertBefore(r,u);})(window,document,'https://sc-static.net/scevent.min.js');
    `);
  }

  if (window.snaptr) {
    window.snaptr('init', pixelId);
    window.snaptr('track', 'PAGE_VIEW');
  }
}

// ─── Per-product pixel helpers ────────────────────────────────────────────────

export interface ProductPixels {
  fbPixelId?: string;
  ga4Id?: string;
  gtmId?: string;
  snapchatPixelId?: string;
  tiktokPixelId?: string;
}

/** Initialize all per-product pixels (idempotent — safe to call on every page load) */
export function initProductPixels(pixels: ProductPixels) {
  if (pixels.fbPixelId) initFbPixel(pixels.fbPixelId);
  if (pixels.ga4Id) initGa4(pixels.ga4Id);
  if (pixels.tiktokPixelId) initTikTokPixel(pixels.tiktokPixelId);
  if (pixels.snapchatPixelId) initSnapchatPixel(pixels.snapchatPixelId);
}

// ─── Standard global event tracking ──────────────────────────────────────────

export function trackPageView(path: string, title?: string) {
  if (GA_ID && window.gtag) {
    window.gtag('event', 'page_view', { page_path: path, page_title: title });
  }
  if (FB_PIXEL_ID && window.fbq) {
    window.fbq('track', 'PageView');
  }
  if (GTM_ID && window.dataLayer) {
    window.dataLayer.push({ event: 'page_view', page_path: path, page_title: title });
  }
  if (TIKTOK_PIXEL_ID && window.ttq) {
    window.ttq.page();
  }
}

export interface TrackProduct {
  id: string;
  name: string;
  price: number;
  category?: string;
  brand?: string;
  quantity?: number;
  pixels?: ProductPixels;
}

// ─── ViewContent ─────────────────────────────────────────────────────────────

function _fireViewContent(pixelId: string | undefined, ga4Id: string | undefined, tiktokId: string | undefined, snapId: string | undefined, product: TrackProduct) {
  const item = {
    item_id: product.id,
    item_name: product.name,
    price: product.price,
    item_category: product.category,
    item_brand: product.brand || 'NutroPact',
    quantity: product.quantity || 1,
  };

  // GA4
  const ga = ga4Id || GA_ID;
  if (ga && window.gtag) {
    window.gtag('event', 'view_item', { currency: 'INR', value: product.price, items: [item], send_to: ga });
  }

  // Facebook
  const fb = pixelId || FB_PIXEL_ID;
  if (fb && window.fbq) {
    window.fbq('trackSingle', fb, 'ViewContent', {
      content_ids: [product.id],
      content_name: product.name,
      content_type: 'product',
      value: product.price,
      currency: 'INR',
    });
  }

  // GTM dataLayer
  if ((product.pixels?.gtmId || GTM_ID) && window.dataLayer) {
    window.dataLayer.push({ event: 'view_item', ecommerce: { currency: 'INR', value: product.price, items: [item] } });
  }

  // TikTok
  const ttId = tiktokId || TIKTOK_PIXEL_ID;
  if (ttId && window.ttq) {
    window.ttq.instance(ttId).track('ViewContent', {
      content_id: product.id,
      content_name: product.name,
      content_type: 'product',
      value: product.price,
      currency: 'INR',
    });
  }

  // Snapchat
  const snap = snapId || SNAPCHAT_PIXEL_ID;
  if (snap && window.snaptr) {
    window.snaptr('track', 'VIEW_CONTENT', {
      price: product.price,
      currency: 'INR',
      item_ids: [product.id],
    });
  }
}

export function trackViewItem(product: TrackProduct) {
  _fireViewContent(
    product.pixels?.fbPixelId,
    product.pixels?.ga4Id,
    product.pixels?.tiktokPixelId,
    product.pixels?.snapchatPixelId,
    product,
  );
  trackSiteEvent("view_item", {
    product_id: product.id,
    product_name: product.name,
    value: product.price,
    quantity: product.quantity || 1,
    meta: { category: product.category },
  });
}

// ─── AddToCart ───────────────────────────────────────────────────────────────

function _fireAddToCart(pixelId: string | undefined, ga4Id: string | undefined, tiktokId: string | undefined, snapId: string | undefined, product: TrackProduct) {
  const item = {
    item_id: product.id,
    item_name: product.name,
    price: product.price,
    item_category: product.category,
    item_brand: product.brand || 'NutroPact',
    quantity: product.quantity || 1,
  };

  const ga = ga4Id || GA_ID;
  if (ga && window.gtag) {
    window.gtag('event', 'add_to_cart', { currency: 'INR', value: product.price, items: [item], send_to: ga });
  }

  const fb = pixelId || FB_PIXEL_ID;
  if (fb && window.fbq) {
    window.fbq('trackSingle', fb, 'AddToCart', {
      content_ids: [product.id],
      content_name: product.name,
      content_type: 'product',
      value: product.price,
      currency: 'INR',
    });
  }

  if ((product.pixels?.gtmId || GTM_ID) && window.dataLayer) {
    window.dataLayer.push({ event: 'add_to_cart', ecommerce: { currency: 'INR', value: product.price, items: [item] } });
  }

  const ttId = tiktokId || TIKTOK_PIXEL_ID;
  if (ttId && window.ttq) {
    window.ttq.instance(ttId).track('AddToCart', {
      content_id: product.id,
      content_name: product.name,
      content_type: 'product',
      value: product.price,
      currency: 'INR',
    });
  }

  const snap = snapId || SNAPCHAT_PIXEL_ID;
  if (snap && window.snaptr) {
    window.snaptr('track', 'ADD_CART', {
      price: product.price,
      currency: 'INR',
      item_ids: [product.id],
    });
  }
}

export function trackAddToCart(product: TrackProduct) {
  _fireAddToCart(
    product.pixels?.fbPixelId,
    product.pixels?.ga4Id,
    product.pixels?.tiktokPixelId,
    product.pixels?.snapchatPixelId,
    product,
  );
  trackSiteEvent("add_to_cart", {
    product_id: product.id,
    product_name: product.name,
    value: product.price,
    quantity: product.quantity || 1,
    meta: { category: product.category },
  });
}

// ─── Checkout ────────────────────────────────────────────────────────────────

export function trackBeginCheckout(value: number, items: TrackProduct[]) {
  const mapped = items.map(p => ({ item_id: p.id, item_name: p.name, price: p.price, quantity: p.quantity || 1 }));
  if (GA_ID && window.gtag) {
    window.gtag('event', 'begin_checkout', { currency: 'INR', value, items: mapped });
  }
  if (FB_PIXEL_ID && window.fbq) {
    window.fbq('track', 'InitiateCheckout', { value, currency: 'INR', num_items: items.length });
  }
  if (GTM_ID && window.dataLayer) {
    window.dataLayer.push({ event: 'begin_checkout', ecommerce: { currency: 'INR', value, items: mapped } });
  }
  if (TIKTOK_PIXEL_ID && window.ttq) {
    window.ttq.track('InitiateCheckout', { value, currency: 'INR' });
  }
  trackSiteEvent("begin_checkout", { value, quantity: items.length });
}

// ─── Purchase ────────────────────────────────────────────────────────────────

export function trackPurchase(orderId: string, value: number, items: TrackProduct[]) {
  const mapped = items.map(p => ({ item_id: p.id, item_name: p.name, price: p.price, quantity: p.quantity || 1 }));

  // Fire global pixels
  if (GA_ID && window.gtag) {
    window.gtag('event', 'purchase', { transaction_id: orderId, currency: 'INR', value, items: mapped });
  }
  if (FB_PIXEL_ID && window.fbq) {
    window.fbq('track', 'Purchase', { value, currency: 'INR' });
  }
  if (GTM_ID && window.dataLayer) {
    window.dataLayer.push({ event: 'purchase', ecommerce: { transaction_id: orderId, currency: 'INR', value, items: mapped } });
  }
  if (TIKTOK_PIXEL_ID && window.ttq) {
    window.ttq.track('Purchase', { transaction_id: orderId, value, currency: 'INR' });
  }
  if (SNAPCHAT_PIXEL_ID && window.snaptr) {
    window.snaptr('track', 'PURCHASE', { price: value, currency: 'INR', transaction_id: orderId });
  }
  trackSiteEvent("purchase", { value, quantity: items.length, meta: { order_id: orderId } });

  // Fire per-product pixels (deduplicated by pixel ID)
  const firedFb = new Set<string>(FB_PIXEL_ID ? [FB_PIXEL_ID] : []);
  const firedGa = new Set<string>(GA_ID ? [GA_ID] : []);
  const firedTt = new Set<string>(TIKTOK_PIXEL_ID ? [TIKTOK_PIXEL_ID] : []);
  const firedSnap = new Set<string>(SNAPCHAT_PIXEL_ID ? [SNAPCHAT_PIXEL_ID] : []);

  for (const product of items) {
    const px = product.pixels;
    if (!px) continue;

    const productItem = mapped.find(m => m.item_id === product.id);
    if (!productItem) continue;

    if (px.ga4Id && !firedGa.has(px.ga4Id) && window.gtag) {
      firedGa.add(px.ga4Id);
      window.gtag('event', 'purchase', { transaction_id: orderId, currency: 'INR', value: product.price * (product.quantity || 1), items: [productItem], send_to: px.ga4Id });
    }

    if (px.fbPixelId && !firedFb.has(px.fbPixelId) && window.fbq) {
      firedFb.add(px.fbPixelId);
      window.fbq('trackSingle', px.fbPixelId, 'Purchase', { value: product.price * (product.quantity || 1), currency: 'INR' });
    }

    if (px.tiktokPixelId && !firedTt.has(px.tiktokPixelId) && window.ttq) {
      firedTt.add(px.tiktokPixelId);
      window.ttq.instance(px.tiktokPixelId).track('Purchase', { transaction_id: orderId, value: product.price * (product.quantity || 1), currency: 'INR' });
    }

    if (px.snapchatPixelId && !firedSnap.has(px.snapchatPixelId) && window.snaptr) {
      firedSnap.add(px.snapchatPixelId);
      window.snaptr('track', 'PURCHASE', { price: product.price * (product.quantity || 1), currency: 'INR', transaction_id: orderId });
    }
  }
}

// ─── Misc ─────────────────────────────────────────────────────────────────────

export function trackSearch(term: string) {
  if (GA_ID && window.gtag) window.gtag('event', 'search', { search_term: term });
  if (FB_PIXEL_ID && window.fbq) window.fbq('track', 'Search', { search_string: term });
  if (TIKTOK_PIXEL_ID && window.ttq) window.ttq.track('Search', { query: term });
  trackSiteEvent("search", { meta: { term } });
}

export function trackLead(value?: number) {
  if (GA_ID && window.gtag) window.gtag('event', 'generate_lead', { currency: 'INR', value: value || 0 });
  if (FB_PIXEL_ID && window.fbq) window.fbq('track', 'Lead');
  if (TIKTOK_PIXEL_ID && window.ttq) window.ttq.track('SubmitForm');
}
