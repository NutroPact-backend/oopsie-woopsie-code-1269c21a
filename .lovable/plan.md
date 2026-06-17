
## What's in the ZIP

`Testings.zip` contains:
- **`audit_report.js`** — the master report generator. Inside it are ~110 findings grouped into 11 sections: Executive Summary, Security, Backend↔Frontend Wiring, SEO, GEO, LLMO, AEO, Marketing/Analytics, Page-by-Page Functional, Code Quality, Priority Actions.
- **15 Playwright/Vitest test files** (`auth`, `authz`, `crud`, `security`, `seo-audit`, `wiring-audit`, `analytics`, `performance`, `ui-interactions`, `route-discovery`, `network-audit`, `form-testing`, `business-logic`) + `setup-admin.ts`, `setup-customer.ts`, `run-full-audit.js`, `generate-coverage.js`.

Many items are **already partially done** in the codebase (CSP/security headers in `src/server.ts`, Turnstile, RLS, llms.txt route, Razorpay/PhonePe, push, i18n). The plan focuses on what is actually broken or missing.

---

## Repair phases

### Phase 1 — CRITICAL blockers (revenue + legal)
1. **Products page "Loading…" forever** — debug `/products` query (RLS, anon SELECT grant, empty-state UI, error boundary, timeout fallback).
2. **Privacy Policy & Terms** — replace placeholder content on `/privacy` and `/terms` with full DPDP-2023 + GDPR-aligned text (data collected, purpose, retention, user rights, wallet/PCI note, contact).
3. **Cookie consent banner** — wire existing `CookieConsent.tsx` to actually gate analytics/marketing pixel firing (consent-mode v2 pattern).
4. **Placeholder contact data** — replace `+91 9999999999` and `support@nutropact.com` with the verified footer values (`+91-8955590350`, `info@nutropact.com`); fix WhatsApp `#` href to `https://wa.me/...`.
5. **Rotate admin credentials notice** — add admin-side warning + force password reset flow; ensure MFA gate (`Admin2FAGate`) is enforced.

### Phase 2 — Security hardening
- Add account-lockout / progressive delay on login (extend `login_lockouts` table use).
- Sanitize/whitelist the `?redirect=` param on `/login`.
- Add rate-limit (using existing `rate-limit.ts`) to login, contact, track-order, OTP endpoints.
- Confirm CSP/X-Frame/Referrer/Permissions headers (already in `server.ts`) — add automated test from `security.test.ts`.
- Server-side admin route guard verification (JWT role check inside server functions, not just client gate).
- CSRF token / origin check on state-changing public endpoints.
- Generic error responses in production (strip stack traces).

### Phase 3 — Backend↔Frontend wiring fixes
- Category filter buttons on `/products` → wire to Supabase `.eq('category', …)`.
- Sort dropdown → wire to `.order()`.
- Contact form → success/error toast + Supabase insert validation.
- Track-order form → real Supabase lookup + "not found" state.
- Language switcher → ensure `i18n` dict loads + persists selection.
- `/account#wallet` → verify NutroPay balance, top-up, txn history render.
- Missing `/coa` route referenced from QR — either create or remove reference.
- Add error boundary + skeleton loaders to products / list pages.

### Phase 4 — SEO (technical + on-page)
- Absolute `og:url` per route (currently relative).
- Per-page unique Twitter card title/description; set `og:type=product` on PDP.
- Add `og:locale=en_IN`, `hreflang=en-IN`.
- Verify `sitemap.xml` (route exists) lists all public pages incl. blog/products; submit to GSC.
- Distinct H1 vs title; rewrite `ALL SUPPLEMENTS` H1 to keyword-rich.
- Add FAQPage / Product / Organization / BreadcrumbList JSON-LD on relevant routes.
- Preload hero image; request WebP from Unsplash; lazy-load below-fold images.

### Phase 5 — GEO / LLMO / AEO
- Add/verify `/llms.txt` and `/llms-full.txt` (routes exist — populate with key pages, citation format).
- Add `ai.txt` (route exists — confirm content).
- Add TL;DR summary blocks on About, FAQ, policy pages.
- Add JSON-LD for certifications (Organization → hasCredential), FAQPage on `/faq`, HowTo on usage guides.
- Bold 1–2 sentence direct answer at top of each long FAQ answer.
- Add "People Also Ask" Q&A sections on PDPs.

### Phase 6 — Marketing & Analytics
- GA4 + GTM container (consent-mode v2, gated by Phase 1 banner).
- Meta Pixel, Google Ads conversion tag, LinkedIn Insight (via GTM).
- Capture UTM params into `utm_campaigns` + persist to orders.
- Newsletter signup (footer + exit-intent using existing `ExitIntent.tsx`).
- Real social links in footer (Instagram, YouTube, WhatsApp Business).
- Microsoft Clarity (free) for session recordings.

### Phase 7 — Content authenticity & polish
- Replace stock Unsplash founder photo + verify "Rohan Mehta" identity / real bio.
- Replace dynamically dated lab certificate with real NABL/Eurofins PDF + verifiable link.
- Substantiate "50K+ Athletes", "5+ Years" stats (or soften copy).
- Unique category icons (not all 🥛).
- Best Sellers section on homepage.
- Standardize support hours and phone formatting (E.164) across all pages.
- Replace "Loading…" text with skeleton components project-wide.

---

## Verification

After each phase, run the matching test files from the ZIP against the preview:
- Phase 1 → `wiring-audit`, `crud`, page-specific
- Phase 2 → `security`, `auth`, `authz`
- Phase 3 → `ui-interactions`, `form-testing`, `business-logic`
- Phase 4–5 → `seo-audit`, `route-discovery`
- Phase 6 → `analytics`, `network-audit`
- Final → `run-full-audit.js`

I'll copy the test files into `tests/audit/` once we move to build mode so they can be executed locally.

---

## Confirm before I start

Reply with which phase to begin (or "all in order"). Phase 1 is the highest-impact and I recommend starting there — it unblocks revenue (products page) and legal exposure (privacy/terms/consent).
