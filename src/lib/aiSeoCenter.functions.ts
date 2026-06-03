// @ts-nocheck
// AI SEO Command Center — admin-only server functions.
// Audits the live site for AEO, GEO, Entity, Reputation, Conversational
// signals and writes scores + roadmap rows to the DB.
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

const SITE_ORIGIN = 'https://www.nutropact.com';

const AI_BOTS = [
  'GPTBot', 'ChatGPT-User', 'Google-Extended', 'PerplexityBot',
  'ClaudeBot', 'anthropic-ai', 'CCBot',
];

async function getAdmin() {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  return supabaseAdmin;
}

async function ensureAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from('user_roles').select('role').eq('user_id', userId).maybeSingle();
  if (!data || !['admin', 'manager'].includes(data.role)) {
    throw new Error('Forbidden');
  }
}

async function ensureDefaultProject(): Promise<string> {
  const admin = await getAdmin();
  const { data: existing } = await admin
    .from('ai_seo_projects').select('id').eq('is_default', true).maybeSingle();
  if (existing?.id) return existing.id;
  const { data: created, error } = await admin.from('ai_seo_projects')
    .insert({ project_name: 'NutroPact', target_url: SITE_ORIGIN, is_default: true })
    .select('id').single();
  if (error) throw new Error(error.message);
  await seedDefaultRoadmap(created.id);
  return created.id;
}

async function seedDefaultRoadmap(projectId: string) {
  const admin = await getAdmin();
  const tasks = [
    { phase: 'phase1', category: 'Technical Foundation', title: 'Allow all major AI crawlers in robots.txt', description: 'Confirm GPTBot, ChatGPT-User, Google-Extended, PerplexityBot, ClaudeBot, anthropic-ai, CCBot are NOT disallowed.', sort_order: 10 },
    { phase: 'phase1', category: 'Technical Foundation', title: 'Publish /llms.txt and /ai.txt', description: 'Both files must be reachable and describe brand + allow training/inference per policy.', sort_order: 20 },
    { phase: 'phase1', category: 'Technical Foundation', title: 'Submit dynamic sitemap.xml to Search Console', description: 'Auto-generated sitemap must include all products, categories, blogs, and key static pages.', sort_order: 30 },
    { phase: 'phase1', category: 'Technical Foundation', title: 'Add Organization + Brand + GeoCoordinates JSON-LD', description: 'Sitewide schema in __root.tsx including sameAs social profiles and ContactPoint.', sort_order: 40 },
    { phase: 'phase2', category: 'Content & Authority', title: 'Build /answers AEO hub from FAQs', description: 'Group FAQs by category, render FAQPage + SpeakableSpecification schema for voice + AI Overview eligibility.', sort_order: 10 },
    { phase: 'phase2', category: 'Content & Authority', title: 'Add Review + AggregateRating schema to /testimonials', description: 'Pull approved testimonials, surface brand-level aggregate rating for AI Overviews.', sort_order: 20 },
    { phase: 'phase2', category: 'Content & Authority', title: 'Add Product Q&A schema on every PDP', description: 'Render top approved product_questions as Question/Answer JSON-LD beneath the product.', sort_order: 30 },
    { phase: 'phase2', category: 'Content & Authority', title: 'Publish founder Person schema (EEAT)', description: 'Bio, photo, sameAs links — boosts brand authority for AI citations.', sort_order: 40 },
    { phase: 'phase3', category: 'Scale & Optimize', title: 'Enable AI Search on-site (Ask AI)', description: 'Conversational search powered by Gemini grounded on catalog + blog + FAQs.', sort_order: 10 },
    { phase: 'phase3', category: 'Scale & Optimize', title: 'Add Speakable selectors on top 10 articles', description: 'Mark hero + summary nodes so Google Assistant and Alexa can read aloud.', sort_order: 20 },
    { phase: 'phase3', category: 'Scale & Optimize', title: 'Build off-page citation footprint', description: 'Get cited on industry blogs, Google Reviews, YouTube, Quora, Reddit.', sort_order: 30 },
    { phase: 'phase3', category: 'Scale & Optimize', title: 'Run weekly AI SEO audit', description: 'Trigger audit, review alerts, ship fixes for any score dip below 70.', sort_order: 40 },
  ];
  for (const t of tasks) {
    await admin.from('ai_seo_roadmap_tasks').insert({ project_id: projectId, ...t });
  }
}

async function safeFetch(url: string, timeoutMs = 8000) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const resp = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'NutroPact-AI-SEO-Audit/1.0' } });
    clearTimeout(t);
    const text = await resp.text();
    return { ok: resp.ok, status: resp.status, text };
  } catch {
    return { ok: false, status: 0, text: '' };
  }
}

function parseRobots(text: string) {
  const blocked: string[] = [];
  if (!text) return { blocked };
  const lines = text.split(/\r?\n/);
  let currentAgents: string[] = [];
  for (const raw of lines) {
    const line = raw.split('#')[0].trim();
    if (!line) { currentAgents = []; continue; }
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const k = line.slice(0, idx).toLowerCase().trim();
    const v = line.slice(idx + 1).trim();
    if (k === 'user-agent') currentAgents.push(v);
    else if (k === 'disallow' && v === '/' && currentAgents.length) {
      for (const agent of currentAgents) {
        if (AI_BOTS.some(b => agent.toLowerCase() === b.toLowerCase())) blocked.push(agent);
        else if (agent === '*') blocked.push('* (all)');
      }
    }
  }
  return { blocked };
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export const runAiSeoAudit = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ projectId: z.string().uuid().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const admin = await getAdmin();
    await ensureAdmin(admin, context.userId);
    const projectId = data.projectId || await ensureDefaultProject();
    const { data: proj } = await admin.from('ai_seo_projects').select('target_url').eq('id', projectId).single();
    const base = (proj?.target_url || SITE_ORIGIN).replace(/\/$/, '');

    const [robots, sitemap, llms, llmsFull, ai, rss, aiCtx] = await Promise.all([
      safeFetch(`${base}/robots.txt`),
      safeFetch(`${base}/sitemap.xml`),
      safeFetch(`${base}/llms.txt`),
      safeFetch(`${base}/llms-full.txt`),
      safeFetch(`${base}/ai.txt`),
      safeFetch(`${base}/rss.xml`),
      safeFetch(`${base}/api/public/ai-context`),
    ]);

    const robotsParsed = parseRobots(robots.text);
    const sitemapUrlCount = (sitemap.text.match(/<loc>/g) || []).length;

    const [faqCount, testimonials, blogCount, productCount, productReviews, marketing, productQA] = await Promise.all([
      admin.from('faqs').select('id', { count: 'exact', head: true }).eq('is_active', true),
      admin.from('testimonials').select('rating', { count: 'exact' }).eq('is_approved', true).limit(500),
      admin.from('blog_posts').select('id', { count: 'exact', head: true }).eq('published', true),
      admin.from('products').select('id', { count: 'exact', head: true }).eq('is_active', true),
      admin.from('product_reviews').select('rating', { count: 'exact' }).eq('is_approved', true).limit(2000),
      admin.from('marketing_settings').select('org_same_as,ai_founder,geo_latitude,geo_longitude,ai_brand_description,ai_usps').eq('key', 'default').maybeSingle(),
      admin.from('product_questions').select('id', { count: 'exact', head: true }).eq('is_approved', true),
    ]);

    const faqCountN = faqCount.count || 0;
    const tCount = testimonials.count || 0;
    const blogN = blogCount.count || 0;
    const productN = productCount.count || 0;
    const reviewN = productReviews.count || 0;
    const qaN = productQA.count || 0;
    const cfg: any = marketing.data || {};
    const sameAsCount = Array.isArray(cfg.org_same_as) ? cfg.org_same_as.length : 0;
    const hasFounder = !!(cfg.ai_founder?.name || cfg.ai_founder?.bio);
    const hasGeo = cfg.geo_latitude != null && cfg.geo_longitude != null;
    const hasBrandDesc = !!cfg.ai_brand_description;
    const uspCount = Array.isArray(cfg.ai_usps) ? cfg.ai_usps.length : 0;

    const alerts: any[] = [];

    let scoreGeo = 0;
    const blockedAi = robotsParsed.blocked.filter(b => b !== '* (all)');
    if (robotsParsed.blocked.includes('* (all)')) {
      scoreGeo = 5;
      alerts.push({ level: 'critical', message: 'robots.txt blocks ALL crawlers (Disallow: /). Remove this immediately.' });
    } else {
      scoreGeo = 60 - (blockedAi.length * 15);
      if (blockedAi.length) {
        alerts.push({ level: 'critical', message: `AI Discovery Blocked: robots.txt disallows ${blockedAi.join(', ')}. Update your robots.txt to allow AI agents.` });
      }
      if (sitemap.ok && sitemapUrlCount > 0) scoreGeo += 15;
      if (llms.ok) scoreGeo += 10;
      if (ai.ok) scoreGeo += 5;
      if (llmsFull.ok) scoreGeo += 5;
      if (aiCtx.ok) scoreGeo += 5;
    }
    scoreGeo = clamp(scoreGeo);
    if (!robots.ok) alerts.push({ level: 'warning', message: 'robots.txt not reachable.' });
    if (!sitemap.ok) alerts.push({ level: 'warning', message: 'sitemap.xml not reachable.' });
    if (!llms.ok) alerts.push({ level: 'warning', message: '/llms.txt missing — AI crawlers will skip your brand summary.' });

    let scoreAeo = Math.min(60, faqCountN * 5);
    if (faqCountN >= 20) scoreAeo += 15;
    if (qaN >= 10) scoreAeo += 15;
    if (faqCountN >= 5) scoreAeo += 10;
    scoreAeo = clamp(scoreAeo);

    let scoreEntity = 40;
    if (sameAsCount >= 3) scoreEntity += 15; else if (sameAsCount >= 1) scoreEntity += 5;
    if (hasFounder) scoreEntity += 15;
    if (hasGeo) scoreEntity += 15;
    if (hasBrandDesc) scoreEntity += 10;
    if (uspCount >= 3) scoreEntity += 5;
    scoreEntity = clamp(scoreEntity);

    let scoreReputation = Math.min(50, tCount * 5) + Math.min(40, reviewN);
    if (tCount >= 5 || reviewN >= 20) scoreReputation += 10;
    scoreReputation = clamp(scoreReputation);

    let scoreConversational = 0;
    if (faqCountN > 0) scoreConversational += 25;
    if (blogN >= 5) scoreConversational += 20;
    if (qaN > 0) scoreConversational += 20;
    if (llms.ok) scoreConversational += 15;
    if (aiCtx.ok) scoreConversational += 10;
    if (rss.ok) scoreConversational += 10;
    scoreConversational = clamp(scoreConversational);

    const checks = {
      technical: {
        robots: { ok: robots.ok, status: robots.status, blocked_ai_bots: blockedAi, blocks_all: robotsParsed.blocked.includes('* (all)') },
        sitemap: { ok: sitemap.ok, status: sitemap.status, url_count: sitemapUrlCount },
        llms_txt: { ok: llms.ok, status: llms.status },
        llms_full_txt: { ok: llmsFull.ok, status: llmsFull.status },
        ai_txt: { ok: ai.ok, status: ai.status },
        rss_xml: { ok: rss.ok, status: rss.status },
        ai_context_json: { ok: aiCtx.ok, status: aiCtx.status },
      },
      content: {
        faqs: faqCountN, testimonials: tCount, product_reviews: reviewN,
        blog_posts: blogN, products: productN, product_questions: qaN,
      },
      entity: {
        same_as_count: sameAsCount, has_founder: hasFounder, has_geo: hasGeo,
        has_brand_desc: hasBrandDesc, usp_count: uspCount,
      },
      scanned_at: new Date().toISOString(),
    };

    const { data: audit, error: insErr } = await admin.from('ai_seo_audits').insert({
      project_id: projectId,
      score_aeo: scoreAeo, score_geo: scoreGeo, score_entity: scoreEntity,
      score_reputation: scoreReputation, score_conversational: scoreConversational,
      alerts, checks,
    }).select('*').single();
    if (insErr) throw new Error(insErr.message);

    const injections: any[] = [];
    if (scoreGeo < 40) injections.push({ phase: 'phase1', key: 'auto_geo_unblock', title: 'CRITICAL: Unblock AI crawlers in robots.txt', description: 'Major AI bots are disallowed. Remove the Disallow rules so ChatGPT, Perplexity, Claude, and Google AI can index the site.', severity: 'critical', category: 'Technical Foundation' });
    if (scoreAeo < 60) injections.push({ phase: 'phase1', key: 'auto_aeo_faq', title: 'Deploy FAQ Block Schema Accordions to key commercial pages', description: 'FAQPage JSON-LD on PDPs, category pages, and the homepage will increase AI Overview eligibility.', severity: 'warning', category: 'Content & Authority' });
    if (scoreEntity < 60) injections.push({ phase: 'phase2', key: 'auto_entity_schema', title: 'Complete Organization + Brand + sameAs + Founder schema', description: 'Fill in social profiles, founder bio, and GeoCoordinates from the Marketing & SEO settings.', severity: 'warning', category: 'Content & Authority' });
    if (scoreReputation < 50) injections.push({ phase: 'phase2', key: 'auto_reputation', title: 'Establish Off-Page Trust Footprint', description: 'Optimize brand citations, gather Google Reviews, build presence on Quora, Reddit, YouTube.', severity: 'warning', category: 'Content & Authority' });
    if (scoreConversational < 60) injections.push({ phase: 'phase3', key: 'auto_conv_blocks', title: 'Add conversational Q&A blocks to top 10 pages', description: 'Natural-language Q&A snippets help LLMs answer brand queries with our content as the source.', severity: 'normal', category: 'Scale & Optimize' });

    for (const inj of injections) {
      await admin.from('ai_seo_roadmap_tasks').upsert({
        project_id: projectId,
        phase: inj.phase, category: inj.category, title: inj.title, description: inj.description,
        severity: inj.severity, is_auto_injected: true, injected_key: inj.key, sort_order: 0,
      }, { onConflict: 'project_id,injected_key' });
    }

    return { audit, projectId };
  });

export const getAiSeoOverview = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ projectId: z.string().uuid().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const admin = await getAdmin();
    await ensureAdmin(admin, context.userId);
    const projectId = data.projectId || await ensureDefaultProject();
    const [{ data: project }, { data: latest }, { data: history }] = await Promise.all([
      admin.from('ai_seo_projects').select('*').eq('id', projectId).single(),
      admin.from('ai_seo_audits').select('*').eq('project_id', projectId).order('last_scanned_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('ai_seo_audits').select('score_aeo,score_geo,score_entity,score_reputation,score_conversational,last_scanned_at').eq('project_id', projectId).order('last_scanned_at', { ascending: false }).limit(30),
    ]);
    return { project, latest, history: history || [] };
  });

export const listRoadmapTasks = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ projectId: z.string().uuid().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const admin = await getAdmin();
    await ensureAdmin(admin, context.userId);
    const projectId = data.projectId || await ensureDefaultProject();
    const { data: tasks } = await admin.from('ai_seo_roadmap_tasks').select('*').eq('project_id', projectId).order('phase').order('sort_order');
    return { tasks: tasks || [], projectId };
  });

export const toggleRoadmapTask = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ taskId: z.string().uuid(), isCompleted: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const admin = await getAdmin();
    await ensureAdmin(admin, context.userId);
    const { error } = await admin.from('ai_seo_roadmap_tasks').update({ is_completed: data.isCompleted }).eq('id', data.taskId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addRoadmapTask = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    projectId: z.string().uuid().optional(),
    phase: z.enum(['phase1', 'phase2', 'phase3']),
    title: z.string().min(1).max(200),
    description: z.string().max(2000).optional(),
    category: z.string().min(1).max(60).default('Custom'),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const admin = await getAdmin();
    await ensureAdmin(admin, context.userId);
    const projectId = data.projectId || await ensureDefaultProject();
    const { data: task, error } = await admin.from('ai_seo_roadmap_tasks')
      .insert({ project_id: projectId, phase: data.phase, title: data.title, description: data.description, category: data.category, sort_order: 100 })
      .select('*').single();
    if (error) throw new Error(error.message);
    return { task };
  });

export const deleteRoadmapTask = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ taskId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const admin = await getAdmin();
    await ensureAdmin(admin, context.userId);
    const { error } = await admin.from('ai_seo_roadmap_tasks').delete().eq('id', data.taskId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const generateSchemaSnippet = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    type: z.enum(['faq', 'article', 'organization', 'howto', 'product', 'breadcrumb']),
    payload: z.any(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const admin = await getAdmin();
    await ensureAdmin(admin, context.userId);
    const p = data.payload || {};
    let out: any = { '@context': 'https://schema.org' };
    switch (data.type) {
      case 'faq':
        out['@type'] = 'FAQPage';
        out.mainEntity = (p.items || []).map((it: any) => ({ '@type': 'Question', name: it.question || it.q, acceptedAnswer: { '@type': 'Answer', text: it.answer || it.a } }));
        break;
      case 'article':
        out['@type'] = 'Article';
        out.headline = p.headline; out.description = p.description;
        out.author = { '@type': 'Person', name: p.author || 'NutroPact Team' };
        out.datePublished = p.datePublished || new Date().toISOString();
        out.image = p.image;
        break;
      case 'organization':
        out['@type'] = 'Organization';
        out.name = p.name || 'NutroPact'; out.url = p.url || SITE_ORIGIN;
        out.logo = p.logo; out.sameAs = p.sameAs || [];
        break;
      case 'howto':
        out['@type'] = 'HowTo'; out.name = p.name;
        out.step = (p.steps || []).map((s: any, i: number) => ({ '@type': 'HowToStep', position: i + 1, name: s.name, text: s.text }));
        break;
      case 'product':
        out['@type'] = 'Product';
        out.name = p.name; out.description = p.description; out.image = p.image;
        out.brand = { '@type': 'Brand', name: p.brand || 'NutroPact' };
        if (p.price) out.offers = { '@type': 'Offer', price: p.price, priceCurrency: 'INR', availability: 'https://schema.org/InStock' };
        break;
      case 'breadcrumb':
        out['@type'] = 'BreadcrumbList';
        out.itemListElement = (p.items || []).map((it: any, i: number) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: it.url }));
        break;
    }
    return { jsonld: JSON.stringify(out, null, 2), html: `<script type="application/ld+json">\n${JSON.stringify(out, null, 2)}\n</script>` };
  });

export const listSitemapUrls = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ projectId: z.string().uuid().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const admin = await getAdmin();
    await ensureAdmin(admin, context.userId);
    const projectId = data.projectId || await ensureDefaultProject();
    const { data: proj } = await admin.from('ai_seo_projects').select('target_url').eq('id', projectId).single();
    const base = (proj?.target_url || SITE_ORIGIN).replace(/\/$/, '');
    const r = await safeFetch(`${base}/sitemap.xml`);
    if (!r.ok) return { urls: [], error: `sitemap ${r.status}` };
    const urls = Array.from(r.text.matchAll(/<loc>([^<]+)<\/loc>/g)).map((m) => m[1]).slice(0, 200);
    return { urls, total: urls.length };
  });
