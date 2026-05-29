// @ts-nocheck
import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { ensureAdmin, semrushCsv, csvToObjects, gscFetch } from './seo.server';
import { z } from 'zod';

const DB = 'in'; // Semrush database — India

// ════════ KEYWORD RESEARCH ════════
export const seoKeywordResearch = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ keyword: z.string().min(1).max(120) }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.userId);
    try {
      const [overview, related, questions] = await Promise.all([
        semrushCsv({ type: 'phrase_this', phrase: data.keyword, database: DB, export_columns: 'Ph,Nq,Cp,Co,Nr,Td' }),
        semrushCsv({ type: 'phrase_related', phrase: data.keyword, database: DB, display_limit: '20', export_columns: 'Ph,Nq,Cp,Co,Kd' }).catch(() => ({ headers: [], rows: [] })),
        semrushCsv({ type: 'phrase_questions', phrase: data.keyword, database: DB, display_limit: '20', export_columns: 'Ph,Nq,Cp,Co,Kd' }).catch(() => ({ headers: [], rows: [] })),
      ]);
      return {
        overview: csvToObjects(overview)[0] || null,
        related: csvToObjects(related),
        questions: csvToObjects(questions),
        error: null as string | null,
      };
    } catch (e: any) {
      return { error: e.message as string, overview: null, related: [], questions: [] };
    }
  });

export const seoTrackKeyword = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    keyword: z.string().min(1).max(120),
    volume: z.number().int().nullable().optional(),
    difficulty: z.number().nullable().optional(),
    cpc: z.number().nullable().optional(),
    targetUrl: z.string().max(500).nullable().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.userId);
    const row = {
      keyword: data.keyword,
      database: DB,
      current_volume: data.volume ?? null,
      current_kd: data.difficulty ?? null,
      current_cpc: data.cpc ?? null,
      target_url: data.targetUrl ?? null,
    };
    const { error } = await supabaseAdmin
      .from('seo_tracked_keywords')
      .upsert(row as any, { onConflict: 'keyword,database' });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const seoListTrackedKeywords = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.userId);
    const { data } = await supabaseAdmin.from('seo_tracked_keywords').select('*').order('created_at', { ascending: false }).limit(500);
    return { items: data || [] };
  });

export const seoDeleteTrackedKeyword = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.userId);
    await supabaseAdmin.from('seo_tracked_keywords').delete().eq('id', data.id);
    return { ok: true };
  });

// ════════ DOMAIN OVERVIEW ════════
export const seoDomainOverview = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ domain: z.string().min(3).max(255) }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.userId);
    try {
      const [ranks, topKw] = await Promise.all([
        semrushCsv({ type: 'domain_ranks', domain: data.domain, database: DB, export_columns: 'Db,Dn,Rk,Or,Ot,Oc,Ad,At,Ac' }),
        semrushCsv({ type: 'domain_organic', domain: data.domain, database: DB, display_limit: '20', export_columns: 'Ph,Po,Nq,Cp,Tr,Tc,Co,Nr,Td' }).catch(() => ({ headers: [], rows: [] })),
      ]);
      return {
        overview: csvToObjects(ranks)[0] || null,
        topKeywords: csvToObjects(topKw),
        error: null as string | null,
      };
    } catch (e: any) {
      return { error: e.message as string, overview: null, topKeywords: [] };
    }
  });

// ════════ COMPETITORS / BACKLINKS ════════
export const seoListCompetitors = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.userId);
    const { data } = await supabaseAdmin.from('seo_competitors').select('*').order('label');
    return { items: data || [] };
  });

export const seoAddCompetitor = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ label: z.string().min(1).max(120), domain: z.string().min(3).max(255) }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.userId);
    const { error } = await supabaseAdmin.from('seo_competitors').insert({ domain: data.domain, label: data.label } as any);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const seoCompetitorBacklinks = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ domain: z.string().min(3).max(255) }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.userId);
    try {
      const [overview, refdomains] = await Promise.all([
        semrushCsv({ type: 'backlinks_overview', target: data.domain, target_type: 'root_domain', export_columns: 'ascore,total,domains_num,urls_num,ips_num,follows_num,nofollows_num,texts_num,images_num,forms_num,frames_num' }),
        semrushCsv({ type: 'backlinks_refdomains', target: data.domain, target_type: 'root_domain', display_limit: '30', export_columns: 'domain_ascore,domain,backlinks_num,ip,country,first_seen,last_seen' }).catch(() => ({ headers: [], rows: [] })),
      ]);
      return {
        overview: csvToObjects(overview)[0] || null,
        topReferring: csvToObjects(refdomains),
        error: null as string | null,
      };
    } catch (e: any) {
      return { error: e.message as string, overview: null, topReferring: [] };
    }
  });

export const seoSaveBacklinkOpportunity = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    sourceDomain: z.string().min(3).max(255),
    competitorDomain: z.string().min(3).max(255),
    authorityScore: z.number().int().nullable().optional(),
    notes: z.string().max(500).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.userId);
    const { error } = await supabaseAdmin.from('seo_backlink_opportunities').upsert({
      source_domain: data.sourceDomain,
      authority_score: data.authorityScore ?? null,
      notes: data.notes ?? null,
      competitors_with_link: [data.competitorDomain],
      status: 'new',
    } as any, { onConflict: 'source_domain' });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const seoListBacklinkOpportunities = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.userId);
    const { data } = await supabaseAdmin.from('seo_backlink_opportunities').select('*').order('discovered_at', { ascending: false }).limit(500);
    return { items: data || [] };
  });

// ════════ ON-PAGE OPTIMIZER ════════
const ROUTE_LIST = [
  { path: '/', title: 'Home' },
  { path: '/products', title: 'All Products' },
  { path: '/about', title: 'About' },
  { path: '/contact', title: 'Contact' },
  { path: '/blog', title: 'Blog' },
  { path: '/faq', title: 'FAQ' },
  { path: '/shipping', title: 'Shipping' },
  { path: '/refund', title: 'Refunds' },
  { path: '/privacy', title: 'Privacy' },
  { path: '/terms', title: 'Terms' },
  { path: '/testimonials', title: 'Testimonials' },
];

export const seoListPages = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.userId);
    const { data: overrides } = await supabaseAdmin.from('seo_page_meta').select('*');
    const map = new Map((overrides || []).map((r: any) => [r.route_path, r]));
    return {
      pages: ROUTE_LIST.map(r => ({
        route: r.path,
        defaultTitle: r.title,
        override: map.get(r.path) || null,
      })),
    };
  });

export const seoSuggestMeta = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    route: z.string().min(1).max(255),
    currentTitle: z.string().max(255).optional(),
    keyword: z.string().max(120).optional(),
    context: z.string().max(1000).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.userId);
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return { error: 'GEMINI_API_KEY not configured', suggestion: null as any };
    const prompt = `You are an SEO expert for an Indian sports nutrition / protein brand (NutroPact).
Generate optimized meta for route: ${data.route}
Current title: ${data.currentTitle || '(none)'}
Target keyword: ${data.keyword || '(infer from route)'}
Context: ${data.context || ''}

Return ONLY valid JSON: {"title": "...", "description": "...", "h1": "...", "keywords": ["..."]}
Rules: title 50-60 chars with primary keyword + brand, description 140-160 chars with CTA, h1 differs from title and includes keyword.`;
    try {
      const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, responseMimeType: 'application/json' },
        }),
      });
      const j: any = await resp.json();
      const text = j?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      const parsed = JSON.parse(text);
      return { suggestion: parsed, error: null as string | null };
    } catch (e: any) {
      return { error: e.message as string, suggestion: null };
    }
  });

export const seoSavePageMeta = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    route: z.string().min(1).max(255),
    title: z.string().max(255),
    description: z.string().max(500),
    h1: z.string().max(255).optional(),
    aiSuggestions: z.any().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.userId);
    const { error } = await supabaseAdmin.from('seo_page_meta').upsert({
      route_path: data.route,
      title: data.title,
      description: data.description,
      h1: data.h1 ?? null,
      ai_suggestions: data.aiSuggestions ?? null,
      applied_at: new Date().toISOString(),
    } as any, { onConflict: 'route_path' });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ════════ TECHNICAL AUDIT CRAWLER ════════
async function crawl(base: string, maxPages: number) {
  const issues: Array<{ url: string; type: string; severity: 'critical' | 'warning' | 'notice'; message: string; recommendation?: string }> = [];
  const visited = new Set<string>();
  const queue: string[] = [base];
  let pagesCrawled = 0;
  const origin = new URL(base).origin;

  while (queue.length > 0 && pagesCrawled < maxPages) {
    const url = queue.shift()!;
    if (visited.has(url)) continue;
    visited.add(url);
    pagesCrawled++;
    try {
      const resp = await fetch(url, { headers: { 'User-Agent': 'NutroPactSEOBot/1.0' } });
      if (!resp.ok) {
        issues.push({ url, type: 'http_error', severity: 'critical', message: `HTTP ${resp.status}` });
        continue;
      }
      const html = await resp.text();
      const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() || '';
      const desc = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i)?.[1]?.trim() || '';
      const h1Count = (html.match(/<h1[\s>]/gi) || []).length;
      const canonical = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']*)["']/i)?.[1];

      if (!title) issues.push({ url, type: 'missing_title', severity: 'critical', message: 'Missing <title>', recommendation: 'Add a unique 50-60 char title with primary keyword' });
      else if (title.length < 30) issues.push({ url, type: 'short_title', severity: 'warning', message: `Title too short (${title.length} chars)` });
      else if (title.length > 65) issues.push({ url, type: 'long_title', severity: 'warning', message: `Title too long (${title.length} chars)` });
      if (!desc) issues.push({ url, type: 'missing_description', severity: 'critical', message: 'Missing meta description', recommendation: 'Add 140-160 char description with CTA' });
      else if (desc.length < 120) issues.push({ url, type: 'short_description', severity: 'warning', message: `Description too short (${desc.length} chars)` });
      else if (desc.length > 170) issues.push({ url, type: 'long_description', severity: 'warning', message: `Description too long (${desc.length} chars)` });
      if (h1Count === 0) issues.push({ url, type: 'missing_h1', severity: 'critical', message: 'No <h1>' });
      else if (h1Count > 1) issues.push({ url, type: 'multiple_h1', severity: 'warning', message: `${h1Count} <h1> tags — should be exactly one` });
      if (!canonical) issues.push({ url, type: 'missing_canonical', severity: 'notice', message: 'No canonical link' });

      const linkRegex = /<a[^>]+href=["']([^"']+)["']/gi;
      let m: RegExpExecArray | null;
      while ((m = linkRegex.exec(html)) !== null && queue.length < maxPages * 2) {
        try {
          const href = new URL(m[1], url).toString().split('#')[0];
          if (href.startsWith(origin) && !visited.has(href) && !/\.(jpg|png|webp|pdf|zip|svg|ico|css|js)$/i.test(href)) {
            queue.push(href);
          }
        } catch {}
      }
    } catch (e: any) {
      issues.push({ url, type: 'fetch_error', severity: 'critical', message: e.message || 'Fetch failed' });
    }
  }

  try {
    const robots = await fetch(`${origin}/robots.txt`);
    if (!robots.ok) issues.push({ url: `${origin}/robots.txt`, type: 'missing_robots', severity: 'warning', message: 'robots.txt missing' });
    else {
      const t = await robots.text();
      if (/Disallow:\s*\/\s*$/m.test(t)) issues.push({ url: `${origin}/robots.txt`, type: 'blocking_robots', severity: 'critical', message: 'robots.txt blocks all crawlers' });
    }
  } catch {}
  try {
    const sm = await fetch(`${origin}/sitemap.xml`);
    if (!sm.ok) issues.push({ url: `${origin}/sitemap.xml`, type: 'missing_sitemap', severity: 'warning', message: 'sitemap.xml missing' });
  } catch {}

  return { pagesCrawled, issues };
}

export const seoRunAudit = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    baseUrl: z.string().url(),
    maxPages: z.number().int().min(1).max(50).default(20),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.userId);
    const { data: run, error } = await supabaseAdmin.from('seo_audit_runs').insert({
      status: 'running',
      pages_crawled: 0,
      total_issues: 0,
      triggered_by: context.userId,
    } as any).select().single();
    if (error || !run) throw new Error(error?.message || 'Failed to create run');

    try {
      const { pagesCrawled, issues } = await crawl(data.baseUrl, data.maxPages);
      const critical = issues.filter(i => i.severity === 'critical').length;
      const warning = issues.filter(i => i.severity === 'warning').length;
      const notice = issues.filter(i => i.severity === 'notice').length;
      if (issues.length > 0) {
        await supabaseAdmin.from('seo_audit_issues').insert(
          issues.map(i => ({
            run_id: (run as any).id,
            url: i.url,
            issue_type: i.type,
            severity: i.severity,
            message: i.message,
            recommendation: i.recommendation ?? null,
          })) as any
        );
      }
      await supabaseAdmin.from('seo_audit_runs').update({
        status: 'complete',
        pages_crawled: pagesCrawled,
        total_issues: issues.length,
        critical_count: critical,
        warning_count: warning,
        notice_count: notice,
        completed_at: new Date().toISOString(),
      } as any).eq('id', (run as any).id);
      return { runId: (run as any).id, pagesCrawled, issuesCount: issues.length, critical, warning, notice };
    } catch (e: any) {
      await supabaseAdmin.from('seo_audit_runs').update({
        status: 'failed',
        error: e.message,
        completed_at: new Date().toISOString(),
      } as any).eq('id', (run as any).id);
      throw e;
    }
  });

export const seoListAuditRuns = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.userId);
    const { data } = await supabaseAdmin.from('seo_audit_runs').select('*').order('started_at', { ascending: false }).limit(20);
    return { runs: data || [] };
  });

export const seoListAuditIssues = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ runId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.userId);
    const { data: issues } = await supabaseAdmin.from('seo_audit_issues').select('*').eq('run_id', data.runId).order('severity').limit(1000);
    return { issues: issues || [] };
  });

// ════════ GOOGLE SEARCH CONSOLE ════════
export const seoGscOverview = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ days: z.number().int().min(1).max(90).default(28) }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.userId);
    const site = process.env.GSC_SITE_URL;
    if (!site) return { error: 'GSC_SITE_URL not configured', totals: null as any, topQueries: [] as any[], topPages: [] as any[], site: null as string | null, range: null as any };
    const endDate = new Date().toISOString().slice(0, 10);
    const startDate = new Date(Date.now() - data.days * 86400_000).toISOString().slice(0, 10);
    const siteEnc = encodeURIComponent(site);
    try {
      const [totals, queries, pages] = await Promise.all([
        gscFetch(`/webmasters/v3/sites/${siteEnc}/searchAnalytics/query`, {
          method: 'POST',
          body: JSON.stringify({ startDate, endDate, dimensions: [] }),
        }),
        gscFetch(`/webmasters/v3/sites/${siteEnc}/searchAnalytics/query`, {
          method: 'POST',
          body: JSON.stringify({ startDate, endDate, dimensions: ['query'], rowLimit: 25 }),
        }),
        gscFetch(`/webmasters/v3/sites/${siteEnc}/searchAnalytics/query`, {
          method: 'POST',
          body: JSON.stringify({ startDate, endDate, dimensions: ['page'], rowLimit: 25 }),
        }),
      ]);
      return {
        totals: totals.rows?.[0] || null,
        topQueries: queries.rows || [],
        topPages: pages.rows || [],
        site,
        range: { startDate, endDate },
        error: null as string | null,
      };
    } catch (e: any) {
      return { error: e.message as string, totals: null, topQueries: [], topPages: [], site, range: null };
    }
  });

export const seoGscSubmitSitemap = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ sitemapUrl: z.string().url() }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.userId);
    const site = process.env.GSC_SITE_URL;
    if (!site) throw new Error('GSC_SITE_URL not configured');
    const siteEnc = encodeURIComponent(site);
    const smEnc = encodeURIComponent(data.sitemapUrl);
    await gscFetch(`/webmasters/v3/sites/${siteEnc}/sitemaps/${smEnc}`, { method: 'PUT' });
    return { ok: true };
  });

export const seoGscListSitemaps = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.userId);
    const site = process.env.GSC_SITE_URL;
    if (!site) return { error: 'GSC_SITE_URL not configured', sitemaps: [] as any[] };
    try {
      const r = await gscFetch(`/webmasters/v3/sites/${encodeURIComponent(site)}/sitemaps`);
      return { sitemaps: r.sitemap || [], error: null as string | null };
    } catch (e: any) {
      return { error: e.message as string, sitemaps: [] };
    }
  });

export const seoGscInspectUrl = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ inspectionUrl: z.string().url() }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.userId);
    const site = process.env.GSC_SITE_URL;
    if (!site) throw new Error('GSC_SITE_URL not configured');
    try {
      const r = await gscFetch('/v1/urlInspection/index:inspect', {
        method: 'POST',
        body: JSON.stringify({ inspectionUrl: data.inspectionUrl, siteUrl: site }),
      });
      return { result: r.inspectionResult || null, error: null as string | null };
    } catch (e: any) {
      return { error: e.message as string, result: null };
    }
  });

// ════════ PHASE 4: AI INSIGHTS DIGEST ════════
import { geminiJson } from './seo.server';

export const seoRunInsights = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ periodDays: z.number().int().min(1).max(90).default(7) }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.userId);
    const since = new Date(Date.now() - data.periodDays * 86400_000).toISOString();
    const [gsc, kw, audit] = await Promise.all([
      supabaseAdmin.from('seo_gsc_daily').select('date,clicks,impressions,ctr,position,query,page').gte('date', since.slice(0, 10)).limit(500),
      supabaseAdmin.from('seo_tracked_keywords').select('keyword,current_volume,current_kd,current_cpc,target_url,last_checked_at').limit(200),
      supabaseAdmin.from('seo_audit_issues').select('url,issue_type,severity,message').limit(100),
    ]);
    const prompt = `You are an SEO analyst for NutroPact (Indian supplements e-commerce). Analyze the last ${data.periodDays} days. Return JSON with shape: {"summary":"<2-3 sentence overview>","insights":[{"type":"opportunity|alert|win|action","severity":"high|medium|low","title":"<short>","body":"<1-2 sentences>","action_url":"<optional path>"}]}. Be specific, prioritize high-impact actions (ranking drops, CTR opportunities, fixable audit issues). Max 8 insights.

GSC data (clicks, impressions, ctr, position, query, page): ${JSON.stringify((gsc.data || []).slice(0, 150))}
Tracked keywords: ${JSON.stringify((kw.data || []).slice(0, 80))}
Audit issues: ${JSON.stringify((audit.data || []).slice(0, 50))}`;
    let out: any = { summary: '', insights: [] };
    try { out = await geminiJson(prompt); } catch (e: any) {
      return { error: e.message as string, ok: false };
    }
    const { error } = await supabaseAdmin.from('seo_insights').insert({
      period_days: data.periodDays,
      summary: out.summary || '',
      insights: Array.isArray(out.insights) ? out.insights : [],
      model: 'gemini-2.5-flash',
    });
    if (error) throw new Error(error.message);
    return { ok: true, summary: out.summary, count: (out.insights || []).length };
  });

export const seoLatestInsights = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.userId);
    const { data } = await supabaseAdmin.from('seo_insights')
      .select('*').order('generated_at', { ascending: false }).limit(10);
    return { rows: data || [] };
  });

// ════════ PHASE 4: INTERNAL LINK SUGGESTIONS ════════
export const seoGenerateInternalLinks = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.userId);
    const [products, posts, categories] = await Promise.all([
      supabaseAdmin.from('products').select('slug,name,short_description,category').eq('is_active', true).limit(80),
      supabaseAdmin.from('blog_posts').select('slug,title,excerpt').eq('published', true).limit(40),
      supabaseAdmin.from('categories').select('slug,name').limit(30),
    ]);
    const corpus = {
      products: (products.data || []).map((p: any) => ({ path: `/products/${p.slug}`, title: p.name, summary: p.short_description, category: p.category })),
      blogs: (posts.data || []).map((b: any) => ({ path: `/blog/${b.slug}`, title: b.title, summary: b.excerpt })),
      categories: (categories.data || []).map((c: any) => ({ path: `/category/${c.slug}`, title: c.name })),
    };
    const prompt = `You are an SEO internal-linking expert. Given this NutroPact site corpus, suggest up to 25 high-value internal link pairs. Each pair: which SOURCE page should add a link, the TARGET page it should link to, the natural ANCHOR TEXT, and a one-line REASON. Prefer blog→product and category→product links. Output JSON: {"links":[{"source_path":"/...","target_path":"/...","anchor_text":"...","reason":"...","score":0.0-1.0}]}.

Corpus: ${JSON.stringify(corpus)}`;
    let out: any = { links: [] };
    try { out = await geminiJson(prompt); } catch (e: any) {
      return { error: e.message as string, ok: false, count: 0 };
    }
    const rows = (out.links || []).filter((l: any) => l.source_path && l.target_path && l.anchor_text && l.source_path !== l.target_path);
    if (rows.length) {
      await supabaseAdmin.from('seo_internal_link_suggestions').upsert(
        rows.map((l: any) => ({
          source_path: String(l.source_path).slice(0, 500),
          target_path: String(l.target_path).slice(0, 500),
          anchor_text: String(l.anchor_text).slice(0, 200),
          reason: l.reason ? String(l.reason).slice(0, 500) : null,
          score: Number(l.score) || 0,
          status: 'pending',
        })),
        { onConflict: 'source_path,target_path,anchor_text' },
      );
    }
    return { ok: true, count: rows.length };
  });

export const seoListLinkSuggestions = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.userId);
    const { data } = await supabaseAdmin.from('seo_internal_link_suggestions')
      .select('*').order('score', { ascending: false }).limit(100);
    return { rows: data || [] };
  });

export const seoUpdateLinkSuggestion = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    id: z.string().uuid(),
    status: z.enum(['pending', 'applied', 'dismissed']),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.userId);
    const { error } = await supabaseAdmin.from('seo_internal_link_suggestions')
      .update({ status: data.status }).eq('id', data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
