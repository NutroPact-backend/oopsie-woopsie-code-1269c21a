import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => ((m as { default?: ServerEntry }).default ?? (m as unknown as ServerEntry)),
    );
  }
  return serverEntryPromise;
}

function brandedErrorResponse(): Response {
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isCatastrophicSsrErrorBody(body: string, responseStatus: number): boolean {
  let payload: unknown;
  try { payload = JSON.parse(body); } catch { return false; }
  if (!payload || Array.isArray(payload) || typeof payload !== "object") return false;
  const fields = payload as Record<string, unknown>;
  const expectedKeys = new Set(["message", "status", "unhandled"]);
  if (!Object.keys(fields).every((key) => expectedKeys.has(key))) return false;
  return (
    fields.unhandled === true &&
    fields.message === "HTTPError" &&
    (fields.status === undefined || fields.status === responseStatus)
  );
}

async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;
  const body = await response.clone().text();
  if (!isCatastrophicSsrErrorBody(body, response.status)) return response;
  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return brandedErrorResponse();
}

/**
 * Security headers — applied to every HTML response.
 *
 * - HSTS: force HTTPS for 1 year on all subdomains.
 * - X-Frame-Options DENY: blocks clickjacking via iframes.
 * - X-Content-Type-Options nosniff: blocks MIME sniffing.
 * - Referrer-Policy strict-origin-when-cross-origin: don't leak full URLs.
 * - Permissions-Policy: deny camera/mic/geo by default.
 * - CSP: lets Supabase, Razorpay, PhonePe, Google Analytics, payment iframes load.
 *   `'unsafe-inline'` on script-src is required for SSR-streamed bootstrap and
 *   inline JSON-LD; `'strict-dynamic'` is not yet safe with TanStack's prerender.
 */
function withSecurityHeaders(response: Response, request: Request): Response {
  const url = new URL(request.url);

  // Skip for API routes — they set their own content-type/cors
  if (url.pathname.startsWith("/api/")) return response;

  const contentType = response.headers.get("content-type") ?? "";
  const isHtml = contentType.includes("text/html");

  const headers = new Headers(response.headers);

  headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(self), usb=(), magnetometer=(), gyroscope=(), accelerometer=()",
  );
  headers.set("X-XSS-Protection", "0"); // modern browsers ignore; explicit off prevents legacy bug

  if (isHtml) {
    // Prevent caching of HTML by browsers/proxies — HTML may contain
    // user-scoped data or session tokens. Static assets (js/css/img) are
    // unaffected and keep their default long-cache headers.
    headers.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
    headers.set("Pragma", "no-cache");

    const supabaseUrl =
      (import.meta as any).env?.VITE_SUPABASE_URL ||
      (globalThis as any).process?.env?.SUPABASE_URL ||
      "";
    let supaOrigin = "";
    try { supaOrigin = supabaseUrl ? new URL(supabaseUrl).origin : ""; } catch {}

    const csp = [
      "default-src 'self'",
      // 'unsafe-inline' required for SSR-streamed bootstrap + inline JSON-LD.
      // 'unsafe-eval' removed — no current dep needs it.
      `script-src 'self' 'unsafe-inline' https://checkout.razorpay.com https://*.razorpay.com https://mercury.phonepe.com https://www.googletagmanager.com https://www.google-analytics.com https://challenges.cloudflare.com https://s.pinimg.com https://snap.licdn.com https://static.ads-twitter.com https://www.redditstatic.com https://a.quora.com`,
      // 'unsafe-inline' required by Tailwind runtime inline styles.
      `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
      `font-src 'self' https://fonts.gstatic.com data:`,
      // Scoped image sources (replaces wildcard `https:`). Covers Supabase
      // storage, common product/CDN hosts, marketing pixels, payment logos.
      `img-src 'self' data: blob: ${supaOrigin} https://*.supabase.co https://images.unsplash.com https://i.pravatar.cc https://*.googleusercontent.com https://www.google-analytics.com https://www.googletagmanager.com https://*.razorpay.com https://checkout.razorpay.com https://res.cloudinary.com`,
      `media-src 'self' data: blob: ${supaOrigin} https://*.supabase.co`,
      `connect-src 'self' ${supaOrigin} https://*.supabase.co wss://*.supabase.co https://www.google-analytics.com https://*.razorpay.com https://api.phonepe.com https://challenges.cloudflare.com`,
      `frame-src 'self' https://api.razorpay.com https://checkout.razorpay.com https://*.razorpay.com https://mercury.phonepe.com https://challenges.cloudflare.com https://www.google.com`,
      `frame-ancestors 'none'`,
      `form-action 'self' https://*.razorpay.com https://mercury.phonepe.com`,
      `base-uri 'self'`,
      `object-src 'none'`,
      `upgrade-insecure-requests`,
    ].join("; ");
    headers.set("Content-Security-Policy", csp);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      const normalized = await normalizeCatastrophicSsrResponse(response);
      return withSecurityHeaders(normalized, request);
    } catch (error) {
      console.error(error);
      return withSecurityHeaders(brandedErrorResponse(), request);
    }
  },
};
