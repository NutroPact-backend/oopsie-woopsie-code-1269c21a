// @ts-nocheck
import { useEffect, useState } from 'react';
import { getSeoPageMeta } from './seoMeta.functions';



interface SEOMeta {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'product' | 'article';
  price?: number;
  currency?: string;
  availability?: 'InStock' | 'OutOfStock';
  brand?: string;
  sku?: string;
  rating?: number;
  reviewCount?: number;
  jsonLd?: Record<string, any>;
  keywords?: string;
}

const SITE_NAME = 'NutroPact';
const BASE_KEYWORDS = 'protein powder india, whey protein, creatine, pre-workout, mass gainer, supplements india, NutroPact, buy supplements online';

function setMeta(selector: string, content: string, attr = 'name') {
  let el = document.querySelector(`meta[${attr}="${selector}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, selector);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setJsonLd(data: Record<string, any>, id = 'page-jsonld') {
  let el = document.getElementById(id) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement('script');
    el.type = 'application/ld+json';
    el.id = id;
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

function setCanonical(href: string) {
  let el = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement('link');
    el.rel = 'canonical';
    document.head.appendChild(el);
  }
  el.href = href;
}

export function useSEO(meta: SEOMeta) {
  const [override, setOverride] = useState<any>(null);

  useEffect(() => {
    // Fetch DB override (admin-edited) for current path — lite-mode: idle, cached.
    if (typeof window === 'undefined') return;
    const path = window.location.pathname;
    let cancelled = false;
    const run = () => {
      getSeoPageMeta({ data: { path } })
        .then((r) => { if (!cancelled) setOverride(r?.meta || null); })
        .catch(() => {});
    };
    const w: any = window;
    if (w.requestIdleCallback) w.requestIdleCallback(run, { timeout: 2000 });
    else setTimeout(run, 300);
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const o = override || {};
    const title = (o.title || (meta.title ? `${meta.title} | ${SITE_NAME}` : `${SITE_NAME} — Premium Supplements India`));
    const description = o.description || meta.description ||
      'NutroPact — Lab-tested protein, creatine, pre-workout, and mass gainers. Premium supplements for serious athletes. Free delivery above ₹999.';
    const image = o.og_image || meta.image || `${window.location.origin}/og-image.jpg`;
    const url = meta.url || window.location.href;

    const keywords = meta.keywords ? `${meta.keywords}, ${BASE_KEYWORDS}` : BASE_KEYWORDS;

    document.title = title;
    setMeta('description', description);
    setMeta('keywords', keywords);
    setMeta('robots', 'index, follow');
    setMeta('author', SITE_NAME);

    setMeta('og:title', title, 'property');
    setMeta('og:description', description, 'property');
    setMeta('og:image', image, 'property');
    setMeta('og:url', url, 'property');
    setMeta('og:type', meta.type === 'product' ? 'product' : 'website', 'property');
    setMeta('og:site_name', SITE_NAME, 'property');
    if (meta.price) {
      setMeta('product:price:amount', String(meta.price), 'property');
      setMeta('product:price:currency', meta.currency || 'INR', 'property');
    }

    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', title);
    setMeta('twitter:description', description);
    setMeta('twitter:image', image);

    setCanonical(o.canonical || url);
    if (o.robots) setMeta('robots', o.robots);


    if (meta.jsonLd) {
      setJsonLd(meta.jsonLd);
    } else if (meta.type === 'product' && meta.price) {
      setJsonLd({
        '@context': 'https://schema.org/',
        '@type': 'Product',
        name: meta.title,
        description,
        image,
        brand: { '@type': 'Brand', name: meta.brand || SITE_NAME },
        sku: meta.sku,
        offers: {
          '@type': 'Offer',
          url,
          priceCurrency: meta.currency || 'INR',
          price: meta.price,
          availability: `https://schema.org/${meta.availability || 'InStock'}`,
          seller: { '@type': 'Organization', name: SITE_NAME },
        },
        ...(meta.rating && meta.reviewCount ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: meta.rating.toFixed(1),
            reviewCount: meta.reviewCount,
            bestRating: '5',
            worstRating: '1',
          },
        } : {}),
      });
    } else {
      setJsonLd({
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: SITE_NAME,
        url: window.location.origin,
        logo: `${window.location.origin}/favicon.svg`,
        sameAs: [],
        contactPoint: {
          '@type': 'ContactPoint',
          telephone: '+91-8955590350',
          email: 'support@nutropact.com',
          contactType: 'customer service',
          availableLanguage: 'English',
        },
      });
    }
    if (o.json_ld && typeof o.json_ld === 'object') setJsonLd(o.json_ld, 'override-jsonld');
    if (o.h1) {
      try {
        const h1 = document.querySelector('h1');
        if (h1 && h1.textContent !== o.h1) h1.textContent = o.h1;
      } catch {}
    }
  }, [meta.title, meta.description, meta.image, meta.price, meta.type, meta.rating, override]);

}

export function useBreadcrumbSEO(items: { name: string; url: string }[]) {
  useEffect(() => {
    setJsonLd({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items.map((item, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: item.name,
        item: `${window.location.origin}${item.url}`,
      })),
    }, 'breadcrumb-jsonld');
  }, [JSON.stringify(items)]);
}
