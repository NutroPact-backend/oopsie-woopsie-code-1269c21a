// @ts-nocheck
import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { isLiteMode, onIdle } from "@/lib/lite";
import { getMarketingPublic } from "@/lib/marketing.functions";
import { queryOptions } from "@tanstack/react-query";

const marketingQuery = queryOptions({
  queryKey: ["marketing-public"],
  queryFn: () => getMarketingPublic(),
  staleTime: 1000 * 60 * 10,
});

const SUPABASE_ORIGIN = (() => {
  try { return new URL(import.meta.env.VITE_SUPABASE_URL).origin; } catch { return ""; }
})();

// Canonical production origin — used for absolute og/twitter images and
// JSON-LD URLs so social crawlers and search engines resolve them on every
// preview/production domain.
const SITE_ORIGIN = "https://www.nutropact.com";
const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/og-image.jpg`;

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

// Sitewide WebSite JSON-LD (with SearchAction). Organization/Store
// is built dynamically below from marketing settings so we don't ship
// stale duplicates.
const WEBSITE_JSONLD = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "NutroPact",
  url: SITE_ORIGIN,
  potentialAction: {
    "@type": "SearchAction",
    target: `${SITE_ORIGIN}/search?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
});


export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(marketingQuery).catch(() => ({ config: {} })),
  head: ({ loaderData }) => {
    const cfg: any = (loaderData as any)?.config || {};
    const metaExtras: any[] = [];
    if (cfg.gsc_verification) metaExtras.push({ name: "google-site-verification", content: cfg.gsc_verification });
    if (cfg.bing_verification) metaExtras.push({ name: "msvalidate.01", content: cfg.bing_verification });
    if (cfg.pinterest_verification) metaExtras.push({ name: "p:domain_verify", content: cfg.pinterest_verification });
    if (cfg.yandex_verification) metaExtras.push({ name: "yandex-verification", content: cfg.yandex_verification });
    if (cfg.og_site_name) metaExtras.push({ property: "og:site_name", content: cfg.og_site_name });
    if (cfg.og_default_image) {
      const absOg = /^https?:\/\//i.test(cfg.og_default_image)
        ? cfg.og_default_image
        : `${SITE_ORIGIN}${cfg.og_default_image.startsWith('/') ? '' : '/'}${cfg.og_default_image}`;
      metaExtras.push({ property: "og:image", content: absOg });
      metaExtras.push({ name: "twitter:image", content: absOg });
    }
    if (cfg.twitter_site_handle) metaExtras.push({ name: "twitter:site", content: cfg.twitter_site_handle });
    if (cfg.twitter_card_type) metaExtras.push({ name: "twitter:card", content: cfg.twitter_card_type });

    const linkExtras: any[] = [];
    if (Array.isArray(cfg.hreflang)) {
      for (const h of cfg.hreflang) {
        if (h?.hreflang && h?.href) linkExtras.push({ rel: "alternate", hreflang: h.hreflang, href: h.href });
      }
    }

    const scriptExtras: any[] = [];
    // Pinterest tag
    if (cfg.pinterest_tag_id) {
      scriptExtras.push({ children: `!function(e){if(!window.pintrk){window.pintrk=function(){window.pintrk.queue.push(Array.prototype.slice.call(arguments))};var n=window.pintrk;n.queue=[],n.version="3.0";var t=document.createElement("script");t.async=!0,t.src=e;var r=document.getElementsByTagName("script")[0];r.parentNode.insertBefore(t,r)}}("https://s.pinimg.com/ct/core.js");pintrk('load','${cfg.pinterest_tag_id}');pintrk('page');` });
    }
    // LinkedIn Insight
    if (cfg.linkedin_partner_id) {
      scriptExtras.push({ children: `_linkedin_partner_id="${cfg.linkedin_partner_id}";window._linkedin_data_partner_ids=window._linkedin_data_partner_ids||[];window._linkedin_data_partner_ids.push(_linkedin_partner_id);(function(l){if(!l){window.lintrk=function(a,b){window.lintrk.q.push([a,b])};window.lintrk.q=[]}var s=document.getElementsByTagName("script")[0];var b=document.createElement("script");b.type="text/javascript";b.async=true;b.src="https://snap.licdn.com/li.lms-analytics/insight.min.js";s.parentNode.insertBefore(b,s)})(window.lintrk);` });
    }
    // X / Twitter pixel
    if (cfg.twitter_pixel_id) {
      scriptExtras.push({ children: `!function(e,t,n,s,u,a){e.twq||(s=e.twq=function(){s.exe?s.exe.apply(s,arguments):s.queue.push(arguments)},s.version='1.1',s.queue=[],u=t.createElement(n),u.async=!0,u.src='https://static.ads-twitter.com/uwt.js',a=t.getElementsByTagName(n)[0],a.parentNode.insertBefore(u,a))}(window,document,'script');twq('config','${cfg.twitter_pixel_id}');` });
    }
    // Reddit
    if (cfg.reddit_pixel_id) {
      scriptExtras.push({ children: `!function(w,d){if(!w.rdt){var p=w.rdt=function(){p.sendEvent?p.sendEvent.apply(p,arguments):p.callQueue.push(arguments)};p.callQueue=[];var t=d.createElement("script");t.src="https://www.redditstatic.com/ads/pixel.js",t.async=!0;var s=d.getElementsByTagName("script")[0];s.parentNode.insertBefore(t,s)}}(window,document);rdt('init','${cfg.reddit_pixel_id}');rdt('track','PageVisit');` });
    }
    // Quora
    if (cfg.quora_pixel_id) {
      scriptExtras.push({ children: `!function(q,e,v,n,t,s){if(q.qp)return;n=q.qp=function(){n.qp?n.qp.apply(n,arguments):n.queue.push(arguments)};n.queue=[];t=document.createElement(e);t.async=!0;t.src=v;s=document.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,'script','https://a.quora.com/qevents.js');qp('init','${cfg.quora_pixel_id}');qp('track','ViewContent');` });
    }

    // Store/LocalBusiness JSON-LD — enables rich local-business results
    // (contact, address, hours). Subtype of Organization, so this single
    // block replaces the previous standalone Organization entry.
    const phone = cfg.org_phone || "+91-8955590350";
    const email = cfg.org_email || "support@nutropact.com";
    const address = cfg.org_address || {
      "@type": "PostalAddress",
      addressCountry: "IN",
      addressRegion: "Rajasthan",
      addressLocality: "Jaipur",
    };
    const openingHours = Array.isArray(cfg.org_opening_hours) && cfg.org_opening_hours.length
      ? cfg.org_opening_hours
      : ["Mo-Sa 09:00-19:00"];
    const orgJsonLd = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Store",
      "@id": `${SITE_ORIGIN}/#store`,
      name: cfg.org_legal_name || "NutroPact",
      alternateName: ["NutroPact India", "Nutropact"],
      url: SITE_ORIGIN,
      logo: cfg.og_default_image || `${SITE_ORIGIN}/favicon.svg`,
      image: cfg.og_default_image || `${SITE_ORIGIN}/favicon.svg`,
      slogan: cfg.org_slogan || "Premium lab-tested nutrition for India",
      foundingDate: cfg.org_founding_date || "2023",
      foundingLocation: { "@type": "Place", name: "Jaipur, Rajasthan, India" },
      description: "Premium lab-tested nutrition and supplements — whey protein, creatine, pre-workout, mass gainers, BCAA and vitamins.",
      telephone: phone,
      email,
      address,
      openingHours,
      areaServed: "IN",
      priceRange: "₹₹",
      knowsAbout: [
        "Whey protein",
        "Creatine monohydrate",
        "Pre-workout supplements",
        "Mass gainers",
        "BCAA",
        "Sports nutrition",
        "Vitamins and minerals",
        "Lab-tested supplements",
      ],
      brand: { "@type": "Brand", name: "NutroPact" },
      makesOffer: { "@type": "Offer", url: `${SITE_ORIGIN}/products`, availability: "https://schema.org/InStock" },
      contactPoint: {
        "@type": "ContactPoint",
        telephone: phone,
        email,
        contactType: "customer service",
        areaServed: "IN",
        availableLanguage: ["English", "Hindi"],
      },
      sameAs: Array.isArray(cfg.org_same_as) ? cfg.org_same_as : [],
    });

    // Optional GEO enrichment for local SEO (lat/long + service areas)
    if (cfg.geo_latitude != null && cfg.geo_longitude != null) {
      try {
        const j = JSON.parse(orgJsonLd);
        j.geo = {
          "@type": "GeoCoordinates",
          latitude: Number(cfg.geo_latitude),
          longitude: Number(cfg.geo_longitude),
        };
        if (Array.isArray(cfg.geo_service_areas) && cfg.geo_service_areas.length) {
          j.areaServed = cfg.geo_service_areas.map((a: any) =>
            typeof a === 'string' ? { "@type": "City", name: a } : a
          );
        }
        if (cfg.geo_price_range) j.priceRange = cfg.geo_price_range;
        // refresh stringified payload
        // eslint-disable-next-line no-var
        var orgJsonLdFinal = JSON.stringify(j);
      } catch { var orgJsonLdFinal = orgJsonLd; }
    } else {
      var orgJsonLdFinal = orgJsonLd;
    }

    // Founder/Person schema — boosts EEAT signals for AI search
    let founderJsonLd: string | null = null;
    const f: any = cfg.ai_founder || {};
    if (f && (f.name || f.bio)) {
      founderJsonLd = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Person",
        name: f.name || "Founder",
        jobTitle: f.title || "Founder",
        description: f.bio || undefined,
        image: f.image || undefined,
        worksFor: { "@type": "Organization", name: cfg.org_legal_name || "NutroPact", url: SITE_ORIGIN },
        sameAs: Array.isArray(f.same_as) ? f.same_as : undefined,
      });
    }


    return {
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { title: "NutroPact — Premium Nutrition" },
        { name: "description", content: "Premium nutrition and supplements crafted for performance and wellness." },
        { property: "og:title", content: "NutroPact — Premium Nutrition" },
        { property: "og:description", content: "Premium nutrition and supplements crafted for performance and wellness." },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1" },
        { name: "theme-color", content: "#0f172a" },
        { name: "apple-mobile-web-app-capable", content: "yes" },
        { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
        { name: "apple-mobile-web-app-title", content: "NutroPact" },
        ...metaExtras,
        { name: "twitter:title", content: "NutroPact — Premium Nutrition" },
        { name: "twitter:description", content: "Premium nutrition and supplements crafted for performance and wellness." },
        // OG/Twitter image — absolute URL so social crawlers resolve it on
        // every host. Overridden above when admin sets cfg.og_default_image.
        { property: "og:image", content: DEFAULT_OG_IMAGE },
        { name: "twitter:image", content: DEFAULT_OG_IMAGE },
      ],
      links: [
        { rel: "stylesheet", href: appCss },
        { rel: "icon", href: "/favicon.svg" },
        { rel: "manifest", href: "/manifest.json" },
        { rel: "apple-touch-icon", href: "/favicon.svg" },
        // AI/LLM discovery — point crawlers at the markdown + JSON
        // "press kit" surfaces so they don't have to render the SPA.
        { rel: "alternate", type: "text/markdown", title: "LLM Summary (llms.txt)", href: "/llms.txt" },
        { rel: "alternate", type: "text/markdown", title: "LLM Full Reference", href: "/llms-full.txt" },
        { rel: "alternate", type: "application/json", title: "AI Context (JSON)", href: "/api/public/ai-context" },
        { rel: "alternate", type: "application/rss+xml", title: "NutroPact Blog RSS", href: "/rss.xml" },
        ...(SUPABASE_ORIGIN ? [
          { rel: "preconnect", href: SUPABASE_ORIGIN, crossOrigin: "anonymous" as const },
          { rel: "dns-prefetch", href: SUPABASE_ORIGIN },
        ] : []),
        ...linkExtras,
      ],
      scripts: [
        { type: "application/ld+json", children: orgJsonLdFinal },
        { type: "application/ld+json", children: WEBSITE_JSONLD },
        ...(founderJsonLd ? [{ type: "application/ld+json", children: founderJsonLd }] : []),
        ...scriptExtras,
      ],
    };
  },
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function AuthSync() {
  const router = useRouter();
  const queryClient = useQueryClient();
  useEffect(() => {
    // capture ?ref=CODE on first visit, persist for after-login claim
    try {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get("ref");
      if (ref && /^[A-Z0-9-]{4,40}$/i.test(ref) && !localStorage.getItem("np_ref_code")) {
        localStorage.setItem("np_ref_code", ref.toUpperCase());
      }
    } catch {}

    import("@/store/authStore").then(({ useAuthStore }) => {
      useAuthStore.getState().refresh();
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((evt) => {
      import("@/store/authStore").then(({ useAuthStore }) => {
        useAuthStore.getState().refresh();
      });
      router.invalidate();
      queryClient.invalidateQueries();
      // After sign-in/up, try to register pending referral once
      if (evt === "SIGNED_IN") {
        const code = typeof localStorage !== "undefined" && localStorage.getItem("np_ref_code");
        if (code) {
          import("@/lib/referrals.functions").then(({ registerReferral }) => {
            registerReferral({ data: { code } } as any)
              .then(() => localStorage.removeItem("np_ref_code"))
              .catch(() => localStorage.removeItem("np_ref_code"));
          });
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [router, queryClient]);
  return null;
}

function DeferredOverlays() {
  const [show, setShow] = useState(false);
  const [mods, setMods] = useState<null | {
    SocialProof?: React.ComponentType<any>;
    ExitIntent?: React.ComponentType<any>;
    AbandonedCart?: React.ComponentType<any>;
  }>(null);
  useEffect(() => {
    if (isLiteMode()) return; // skip overlays for 2G / data-saver users
    return onIdle(() => setShow(true), 3000);
  }, []);
  useEffect(() => {
    if (!show) return;
    let alive = true;
    Promise.allSettled([
      import("@/components/SocialProof"),
      import("@/components/ExitIntent"),
      import("@/components/AbandonedCart"),
    ]).then((results) => {
      if (!alive) return;
      setMods({
        SocialProof: results[0].status === "fulfilled" ? results[0].value.default : undefined,
        ExitIntent: results[1].status === "fulfilled" ? results[1].value.default : undefined,
        AbandonedCart: results[2].status === "fulfilled" ? results[2].value.default : undefined,
      });
    });
    return () => {
      alive = false;
    };
  }, [show]);
  if (!show) return null;
  const SocialProof = mods?.SocialProof;
  const ExitIntent = mods?.ExitIntent;
  const AbandonedCart = mods?.AbandonedCart;
  return (
    <>
      {SocialProof ? <SocialProof /> : null}
      {ExitIntent ? <ExitIntent /> : null}
      {AbandonedCart ? <AbandonedCart /> : null}
    </>
  );
}

function NativeBoot() {
  useEffect(() => {
    import("@/lib/native").then(({ initNative }) => { initNative(); });
  }, []);
  return null;
}

function SafeClientModules({
  loaders,
  render,
}: {
  loaders: Record<string, () => Promise<any>>;
  render: (mods: Record<string, any>) => React.ReactNode;
}) {
  const [mods, setMods] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    let alive = true;
    const entries = Object.entries(loaders);
    Promise.allSettled(entries.map(([, load]) => load())).then((results) => {
      if (!alive) return;
      const next: Record<string, any> = {};
      results.forEach((result, index) => {
        const [key] = entries[index];
        next[key] = result.status === "fulfilled" ? result.value.default ?? result.value : null;
      });
      setMods(next);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!mods) return null;
  return <>{render(mods)}</>;
}

function VisitTracker() {
  const router = useRouter();
  const pathname = router.state.location.pathname;
  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    import("@/lib/track-visit").then(({ trackVisit }) => trackVisit()).catch(() => {});
    import("@/lib/track-event").then(({ trackSiteEvent, startHeartbeat }) => {
      trackSiteEvent("page_view");
      startHeartbeat();
    }).catch(() => {});
  }, [pathname]);
  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  const pathname = router.state.location.pathname;
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  const isHome = pathname === "/";

  return (
    <QueryClientProvider client={queryClient}>
      <AuthSync />
      <NativeBoot />
      <VisitTracker />

      <div className="flex min-h-screen flex-col bg-background text-foreground">
        {!isAdmin && (
          <SafeClientModules
            loaders={{ PageBackground: () => import("@/components/PageBackground") }}
            render={(mods) => {
              const PageBackground = mods.PageBackground;
              return PageBackground ? <PageBackground /> : null;
            }}
          />
        )}
        {!isAdmin && <Header />}
        <main className="flex-1">
          <Outlet />
        </main>
        {!isAdmin && isHome && (
          <SafeClientModules
            loaders={{ RecentlyViewed: () => import("@/components/RecentlyViewed") }}
            render={(mods) => {
              const RecentlyViewed = mods.RecentlyViewed;
              return RecentlyViewed ? <RecentlyViewed /> : null;
            }}
          />
        )}
        {!isAdmin && <Footer />}
      </div>
      {!isAdmin && <DeferredOverlays />}
      {!isAdmin && (
        <SafeClientModules
          loaders={{
            WhatsAppFloat: () => import("@/components/WhatsAppFloat"),
            CookieConsent: () => import("@/components/CookieConsent"),
            ChatWidget: () => import("@/components/ChatWidget"),
          }}
          render={(mods) => {
            const WhatsAppFloat = mods.WhatsAppFloat;
            const CookieConsent = mods.CookieConsent;
            const ChatWidget = mods.ChatWidget;
            return (
              <>
                {WhatsAppFloat ? <WhatsAppFloat /> : null}
                {CookieConsent ? <CookieConsent /> : null}
                {ChatWidget ? <ChatWidget /> : null}
              </>
            );
          }}
        />
      )}
      <Toaster />
    </QueryClientProvider>
  );
}
