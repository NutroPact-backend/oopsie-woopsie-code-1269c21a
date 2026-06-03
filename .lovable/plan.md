
# Plan: AI SEO Domination — Option A + Option B

Goal: Maximize real AI-search visibility (ChatGPT, Perplexity, Google AI Overviews, Gemini, Claude) by (A) adding missing on-site schema/entity signals and (B) building a 5-vector AI SEO Command Center inside admin to monitor + roadmap progress.

---

## PART A — On-site signal upgrades (real ranking impact)

### A1. Schema enrichments
- **`src/routes/__root.tsx`** — extend Organization JSON-LD:
  - Add `sameAs: [...]` (Instagram, YouTube, Facebook, Twitter/X, LinkedIn) — pulled from `marketing_settings.social_links` (already in DB).
  - Add separate `Brand` schema node.
  - Add `ContactPoint` (customerService phone + email) from settings.
- **`src/routes/testimonials.tsx`** — add brand-level `AggregateRating` + array of `Review` schema from real testimonials table.
- **`src/routes/products.$slug.tsx`** — add:
  - `HowTo` schema ("How to use {product}") generated from product.usage_instructions (fallback: omit).
  - `Product → brand` reference + `Product → review[]` (top 5 product reviews if exist).
  - `Question`/`Answer` schema from existing product Q&A table (top 3).
- **`src/routes/blog.$slug.tsx`** — already strong; add `BreadcrumbList`.
- **Auto `BreadcrumbList`** helper in `src/lib/seo-schema.ts` — used by all leaf routes (about, faq, contact, products list, category, blog list, answers).

### A2. Entity hooks (Entity SEO)
- New component `src/components/seo/EntityFooter.tsx` rendered on home/about: structured "About {Brand}" block with `<dl>` of key facts (founded, founder, HQ, categories, certifications) — both visible to humans and wrapped in `Speakable` selector. Pull from marketing_settings AI fields.

### A3. Conversational SEO
- Existing `/answers` is good. Add **"People also ask"** accordion block (auto from FAQs by category) on every product, category, and blog page footer with `FAQPage` JSON-LD (deduplicated, top 4 per page).

### A4. Internal linking (entity graph)
- New component `RelatedEntities` on product/blog/category pages: auto-renders 4–6 related links (same category / shared tags) with descriptive anchor text.

### A5. AI-friendly metadata sync
- Update `/llms-full.txt` to dynamically include top 50 products with name+1-line description+price+URL (helps LLM retrieval).
- Update `/api/public/ai-context` to include FAQ list, testimonials snippets, latest 10 blog titles.

---

## PART B — AI SEO Command Center (admin dashboard)

### B1. Database (single migration)
Three new tables (project-scoped to support future multi-site, but defaults to single project for now):

```text
ai_seo_projects(id, project_name, target_url, created_at)
ai_seo_audits(id, project_id, score_aeo, score_geo, score_entity,
              score_reputation, score_conversational, alerts jsonb,
              checks jsonb, last_scanned_at)
ai_seo_roadmap_tasks(id, project_id, phase, category, title,
                     description, is_completed, sort_order,
                     is_auto_injected, created_at)
```
RLS: admin-only (uses `has_role(auth.uid(),'admin')`). GRANTs for `authenticated` + `service_role`. Seed one default project on first load.

### B2. Server functions (`src/lib/aiSeoCenter.functions.ts`)
- `runAiSeoAudit({ projectId })` — admin-only, fetches:
  - `/robots.txt` → parses for `GPTBot, ChatGPT-User, Google-Extended, PerplexityBot, ClaudeBot, anthropic-ai, CCBot` Disallow rules → `score_geo`
  - `/sitemap.xml`, `/llms.txt`, `/ai.txt`, `/rss.xml` reachability
  - DB counts: # of FAQs (AEO), # of testimonials w/ reviews (Reputation), avg blog speakable coverage (Conversational), Organization+Brand+sameAs presence (Entity)
  - Computes 5 scores 0–100 with documented rules
  - Writes row to `ai_seo_audits`; triggers roadmap auto-injection per Rule 2 of spec
- `getAiSeoOverview({ projectId })` — latest audit + alerts + score history (last 30 days)
- `listRoadmapTasks` / `toggleRoadmapTask` / `addRoadmapTask` / `seedDefaultRoadmap`
- `generateSchemaSnippet({ type, payload })` — returns FAQ/Article/Entity JSON-LD strings

### B3. Admin UI — new tab `src/pages/admin/tabs/AiSeoCenterTab.tsx`
Sub-tabs:
1. **Overview** — circular Global Health Score (avg of 5), Critical Alerts banner, 5 metric cards (AEO/GEO/Entity/Reputation/Conversational), "Run Audit Now" button + last-scanned timestamp.
2. **Audit Engine** — Technical panel (robots/sitemap/llms.txt/ai.txt/rss status with green/red), Schema Generator (form → JSON-LD output + copy button for FAQ, Article, Entity, HowTo), URL status table (from sitemap with detected issues).
3. **90-Day Roadmap** — 3-column kanban (Phase 1/2/3), each task = checkbox card with title + collapsible description, auto-injected tasks highlighted with badge, "Add custom task" button per column.

Register in admin tab nav + tab-permissions.ts.

### B4. Cron (optional, weekly)
Add `src/routes/api/public/hooks/ai-seo-audit.ts` — calls audit runner; secured via `CRON_SECRET` header (existing pattern). Doc only — user can wire pg_cron later.

---

## Files

**New:**
- `supabase/migrations/<ts>_ai_seo_center.sql`
- `src/lib/aiSeoCenter.functions.ts`
- `src/lib/seo-schema.ts` (breadcrumb + helpers)
- `src/components/seo/EntityFooter.tsx`
- `src/components/seo/PeopleAlsoAsk.tsx`
- `src/components/seo/RelatedEntities.tsx`
- `src/pages/admin/tabs/AiSeoCenterTab.tsx`
- `src/pages/admin/tabs/ai-seo/OverviewPanel.tsx`
- `src/pages/admin/tabs/ai-seo/AuditEnginePanel.tsx`
- `src/pages/admin/tabs/ai-seo/RoadmapPanel.tsx`
- `src/pages/admin/tabs/ai-seo/SchemaGenerator.tsx`
- `src/routes/api/public/hooks/ai-seo-audit.ts`

**Edited:**
- `src/routes/__root.tsx` (Organization+Brand+sameAs+ContactPoint)
- `src/routes/testimonials.tsx` (Review+AggregateRating schema)
- `src/routes/products.$slug.tsx` (HowTo + brand link + reviews + Q&A schema + PeopleAlsoAsk + RelatedEntities)
- `src/routes/blog.$slug.tsx` (BreadcrumbList + PeopleAlsoAsk)
- `src/routes/category.$slug.tsx` (BreadcrumbList + RelatedEntities)
- `src/routes/answers.tsx` (BreadcrumbList)
- `src/routes/about.tsx` (EntityFooter)
- `src/routes/index.tsx` (EntityFooter)
- `src/routes/llms-full[.]txt.ts` (top-50 product manifest)
- `src/routes/api/public/ai-context.ts` (FAQs+testimonials+blogs)
- `src/pages/admin/AdminPage.tsx` + `tab-permissions.ts` (register new tab)

## Scoring rules (documented in code)
- `score_geo`: -25 per blocked major AI bot; +20 if llms.txt & ai.txt reachable; min 0
- `score_aeo`: floor(faq_count*5) capped at 100; +20 if FAQPage schema present on >3 pages
- `score_entity`: 40 if Org schema; +15 sameAs≥3; +15 Brand schema; +15 Founder Person; +15 GeoCoordinates
- `score_reputation`: floor(reviews*2) + 20 if AggregateRating present; cap 100
- `score_conversational`: 30 if /answers exists; +20 Speakable on blog; +20 AI search enabled; +30 product Q&A active

## Auto-roadmap injection
- aeo<60 → Phase 1 task "Deploy FAQ Block Schema Accordions to key commercial pages"
- reputation<50 → Phase 2 task "Establish Off-Page Trust Footprint"
- geo<40 → Phase 1 critical "Unblock AI crawlers in robots.txt"
- entity<60 → Phase 2 "Complete Organization+Brand+sameAs schema"
- conversational<60 → Phase 3 "Add conversational Q&A blocks to top 10 pages"

## Out of scope
- Real external API integrations (Semrush, GSC) — per project memory, no Lovable connectors.
- Multi-site project switcher UI (table supports it; UI ships single-project).
- Live AI rank tracking (no public API exists for ChatGPT/Perplexity citations).
