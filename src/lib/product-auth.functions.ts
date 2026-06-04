// @ts-nocheck
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { getRequest, getRequestHeader } from '@tanstack/react-start/server';
import { getAIConfig } from './ai-config.server';

// Secret cache (in-memory, short TTL). Holds current + optional previous secret.
let _secretCache: { current: string; previous?: string; fetchedAt: number } | null = null;
const SECRET_TTL_MS = 60_000;

async function loadSecrets(): Promise<{ current: string; previous?: string }> {
  if (_secretCache && Date.now() - _secretCache.fetchedAt < SECRET_TTL_MS) {
    return { current: _secretCache.current, previous: _secretCache.previous };
  }
  const envSecret = process.env.PRODUCT_AUTH_HMAC_SECRET;
  let current = envSecret;
  let previous: string | undefined;
  try {
    const { data } = await supabaseAdmin
      .from('admin_secrets')
      .select('value')
      .eq('key', 'product_auth_hmac')
      .maybeSingle();
    if (data?.value) {
      const v = data.value as { current?: string; previous?: string };
      if (v.current && v.current.length >= 16) current = v.current;
      if (v.previous && v.previous.length >= 16) previous = v.previous;
    }
  } catch {
    // DB unavailable — fall back to env
  }
  if (!current || current.length < 16) {
    throw new Error('PRODUCT_AUTH_HMAC_SECRET is not configured. Set it in env or admin Security tab.');
  }
  _secretCache = { current, previous, fetchedAt: Date.now() };
  return { current, previous };
}

export function invalidateSecretCache() { _secretCache = null; }

async function getCrypto() {
  const crypto = await import('crypto');
  return crypto.default || crypto;
}

async function signWith(payload: string, secret: string) {
  const { createHmac } = await getCrypto();
  return createHmac('sha256', secret).update(payload).digest('hex').slice(0, 12).toUpperCase();
}

async function sign(payload: string) {
  const { current } = await loadSecrets();
  return signWith(payload, current);
}

async function verifySignature(payload: string, sig: string): Promise<boolean> {
  const { current, previous } = await loadSecrets();
  const a = await signWith(payload, current);
  if (a === sig) return true;
  if (previous) {
    const b = await signWith(payload, previous);
    if (b === sig) return true;
  }
  return false;
}

async function hashHidden(code: string) {
  const { current } = await loadSecrets();
  const { createHash } = await getCrypto();
  return createHash('sha256').update(code + ':' + current).digest('hex');
}

async function hashHiddenAny(code: string): Promise<string[]> {
  const { current, previous } = await loadSecrets();
  const { createHash } = await getCrypto();
  const out = [createHash('sha256').update(code + ':' + current).digest('hex')];
  if (previous) out.push(createHash('sha256').update(code + ':' + previous).digest('hex'));
  return out;
}

async function rand(n: number, alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789') {
  const { randomBytes } = await getCrypto();
  const buf = randomBytes(n);
  let out = '';
  for (let i = 0; i < n; i++) out += alphabet[buf[i] % alphabet.length];
  return out;
}

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin.from('user_roles').select('role').eq('user_id', userId).eq('role', 'admin').maybeSingle();
  if (!data) throw new Error('Not authorized');
}

// ---------- ADMIN: generate codes ----------
export const generateAuthCodes = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    batchCode: z.string().min(1).max(32).regex(/^[A-Z0-9-]+$/i),
    productId: z.string().min(1).max(64).optional(),
    quantity: z.number().int().min(1).max(5000),
    expiryDays: z.number().int().min(0).max(3650).optional(),
  }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const rows: any[] = [];
    const expiresAt = data.expiryDays && data.expiryDays > 0
      ? new Date(Date.now() + data.expiryDays * 86400000).toISOString()
      : null;
    for (let i = 0; i < data.quantity; i++) {
      const nonce = await rand(6);
      const hidden = await rand(6);
      const code = `${data.batchCode.toUpperCase()}-${nonce}`;
      const hmac = await sign(`${code}|${hidden}`);
      const hiddenHash = await hashHidden(hidden);
      rows.push({
        code,
        batch_code: data.batchCode.toUpperCase(),
        product_id: data.productId || null,
        hidden_code_hash: hiddenHash,
        hmac_signature: hmac,
        expires_at: expiresAt,
        // store full code with signature; outer label shows code, hidden shows scratch
      });
      // attach plaintext for CSV export — never persisted
      (rows[rows.length - 1] as any)._plain_hidden = hidden;
      (rows[rows.length - 1] as any)._plain_full = `${code}-${hmac}`;
    }
    const dbRows = rows.map(({ _plain_hidden, _plain_full, ...r }) => r);
    const { error } = await supabaseAdmin.from('product_auth_codes').insert(dbRows);
    if (error) throw new Error(error.message);
    // return plaintext to admin for printing — ONLY in response
    return {
      ok: true,
      count: rows.length,
      codes: rows.map(r => ({
        code: r.code,
        full: r._plain_full,
        hidden: r._plain_hidden,
        batch: r.batch_code,
      })),
    };
  });

// ---------- ADMIN: list codes ----------
const STATUS_VALUES = ['unused','verified','flagged_duplicate','flagged_geo','flagged_tamper','blocked'] as const;
type AuthStatus = typeof STATUS_VALUES[number];

export const listAuthCodes = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    batch: z.string().optional(),
    status: z.enum(STATUS_VALUES).optional(),
    limit: z.number().int().min(1).max(500).default(100),
  }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    let q = supabaseAdmin.from('product_auth_codes').select('*').order('created_at', { ascending: false }).limit(data.limit);
    if (data.batch) q = q.eq('batch_code', data.batch.toUpperCase());
    if (data.status) q = q.eq('status', data.status as AuthStatus);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { codes: rows || [] };
  });

// ---------- ADMIN: stats ----------
export const authStats = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data: codes } = await supabaseAdmin.from('product_auth_codes').select('status, scan_count');
    const { count: totalScans } = await supabaseAdmin.from('product_auth_scans').select('*', { count: 'exact', head: true });
    const { count: rejected } = await supabaseAdmin.from('product_auth_scans').select('*', { count: 'exact', head: true }).eq('accepted', false);
    const byStatus: Record<string, number> = {};
    (codes || []).forEach(c => { byStatus[c.status] = (byStatus[c.status] || 0) + 1; });
    return {
      totalCodes: codes?.length || 0,
      totalScans: totalScans || 0,
      rejectedScans: rejected || 0,
      byStatus,
    };
  });

// ---------- ADMIN: list flagged ----------
export const listFlaggedScans = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data } = await supabaseAdmin
      .from('product_auth_scans')
      .select('*')
      .or('accepted.eq.false')
      .order('scanned_at', { ascending: false })
      .limit(200);
    return { scans: data || [] };
  });

// ---------- ADMIN: block / unblock ----------
export const updateAuthCodeStatus = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    id: z.string().uuid(),
    status: z.enum(['unused','verified','flagged_duplicate','flagged_geo','flagged_tamper','blocked']),
    notes: z.string().max(500).optional(),
  }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from('product_auth_codes').update({
      status: data.status,
      notes: data.notes ?? undefined,
    }).eq('id', data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- PUBLIC: verify code (called by /verify page) ----------
export const verifyAuthCode = createServerFn({ method: 'POST' })
  .inputValidator((input) => z.object({
    fullCode: z.string().min(4).max(80),
    hiddenCode: z.string().min(0).max(32).optional(),
    fingerprint: z.string().max(128).optional(),
  }).parse(input))
  .handler(async ({ data }) => {
    const req = getRequest();
    const ipHeader = getRequestHeader('cf-connecting-ip') || getRequestHeader('x-forwarded-for') || '';
    const ip = (ipHeader.split(',')[0] || '').trim() || null;
    const ua = getRequestHeader('user-agent') || null;
    const country = getRequestHeader('cf-ipcountry') || null;
    const city = getRequestHeader('cf-ipcity') || null;
    const region = getRequestHeader('cf-region') || null;

    // Parse fullCode: BATCH-NONCE-HMAC
    const parts = data.fullCode.trim().toUpperCase().split('-');
    if (parts.length < 3) {
      await logScan({ code: data.fullCode, accepted: false, reason: 'malformed', ip, ua, city, region, country, fingerprint: data.fingerprint });
      return { ok: false, reason: 'INVALID_FORMAT', message: 'Code format invalid — this is likely fake.' };
    }
    const providedHmac = parts.pop()!;
    const code = parts.join('-');

    const { data: row } = await supabaseAdmin.from('product_auth_codes').select('*').eq('code', code).maybeSingle();
    if (!row) {
      await logScan({ code, accepted: false, reason: 'not_found', ip, ua, city, region, country, fingerprint: data.fingerprint });
      return { ok: false, reason: 'NOT_FOUND', message: '⚠️ This code does not exist in our system. Product is likely COUNTERFEIT.' };
    }

    // Verify HMAC by comparing against stored signature (sig was generated with whichever secret was active at code-gen time)
    const storedSigMatches = await (async () => {
      try {
        const { timingSafeEqual } = await getCrypto();
        const a = Buffer.from(row.hmac_signature, 'utf8');
        const b = Buffer.from(providedHmac, 'utf8');
        return a.length === b.length && timingSafeEqual(a, b);
      } catch { return false; }
    })();
    if (!storedSigMatches) {
      await logScan({ code, authCodeId: row.id, accepted: false, reason: 'bad_signature', ip, ua, city, region, country, fingerprint: data.fingerprint });
      return { ok: false, reason: 'BAD_SIGNATURE', message: '⚠️ Signature mismatch. Product is COUNTERFEIT.' };
    }

    if (row.status === 'blocked' || row.status === 'flagged_tamper') {
      await logScan({ code, authCodeId: row.id, accepted: false, reason: 'blocked', ip, ua, city, region, country, fingerprint: data.fingerprint });
      return { ok: false, reason: 'BLOCKED', message: '⛔ This code has been blocked by NutroPact. Contact support.' };
    }

    if (row.expires_at && new Date(row.expires_at) < new Date()) {
      await logScan({ code, authCodeId: row.id, accepted: false, reason: 'expired', ip, ua, city, region, country, fingerprint: data.fingerprint });
      return { ok: false, reason: 'EXPIRED', message: 'This product code has expired.' };
    }

    // Hidden code check (if provided & required by being unused) — check against current + previous secret
    let hiddenOk = true;
    if (data.hiddenCode && data.hiddenCode.length > 0) {
      const candidateHashes = await hashHiddenAny(data.hiddenCode.trim().toUpperCase());
      hiddenOk = candidateHashes.includes(row.hidden_code_hash);
      if (!hiddenOk) {
        await logScan({ code, authCodeId: row.id, accepted: false, reason: 'bad_hidden', ip, ua, city, region, country, fingerprint: data.fingerprint, hiddenProvided: true });
        return { ok: false, reason: 'BAD_HIDDEN', message: '⚠️ Hidden scratch code is wrong. This is likely a CLONED product.' };
      }
    }

    // Geo anomaly: first scan was in different country
    let geoFlag = false;
    if (row.first_scan_country && country && row.first_scan_country !== country) {
      geoFlag = true;
    }

    // Bulk-clone detection: too many scans
    const scanCount = (row.scan_count || 0) + 1;
    const bulkFlag = scanCount > 50;

    const newStatus = bulkFlag ? 'flagged_duplicate' : (geoFlag ? 'flagged_geo' : (scanCount === 1 ? 'verified' : row.status));

    const newGeo = Array.isArray(row.geo_history) ? [...row.geo_history] : [];
    newGeo.push({ at: new Date().toISOString(), ip, city, region, country });

    const update: any = {
      scan_count: scanCount,
      last_scan_at: new Date().toISOString(),
      status: newStatus,
      geo_history: newGeo.slice(-20),
    };
    if (!row.first_scan_at) {
      update.first_scan_at = new Date().toISOString();
      update.first_scan_ip = ip;
      update.first_scan_city = city;
      update.first_scan_region = region;
      update.first_scan_country = country;
      update.first_scan_fingerprint = data.fingerprint || null;
      update.first_scan_user_agent = ua;
    }
    await supabaseAdmin.from('product_auth_codes').update(update).eq('id', row.id);
    await logScan({ code, authCodeId: row.id, accepted: true, reason: null, ip, ua, city, region, country, fingerprint: data.fingerprint, hiddenProvided: !!data.hiddenCode });

    // Fetch product details
    let productName: string | null = null;
    if (row.product_id) {
      const { data: p } = await supabaseAdmin.from('products').select('name').eq('id', row.product_id).maybeSingle();
      productName = p?.name || null;
    }

    return {
      ok: true,
      firstScan: !row.first_scan_at,
      scanCount,
      warning: geoFlag ? 'This code was first scanned in a different country. Possible counterfeit.' : (bulkFlag ? 'This code has been scanned suspiciously many times.' : null),
      product: { name: productName, batch: row.batch_code, manufacturedAt: row.manufactured_at },
      message: !row.first_scan_at ? '✅ Genuine NutroPact product — verified!' : `✅ Genuine product — scanned ${scanCount} times.`,
    };
  });

async function logScan(opts: { code: string; authCodeId?: string | null; accepted: boolean; reason: string | null; ip: string | null; ua: string | null; city: string | null; region: string | null; country: string | null; fingerprint?: string; hiddenProvided?: boolean; }) {
  try {
    await supabaseAdmin.from('product_auth_scans').insert({
      code: opts.code,
      auth_code_id: opts.authCodeId ?? null,
      accepted: opts.accepted,
      rejection_reason: opts.reason,
      ip: opts.ip,
      user_agent: opts.ua,
      city: opts.city,
      region: opts.region,
      country: opts.country,
      fingerprint: opts.fingerprint ?? null,
      hidden_code_provided: !!opts.hiddenProvided,
    });
  } catch (e) { console.warn('logScan failed', e); }
}

// ============= PHASE 2 =============

// ---------- PUBLIC: anonymized scan ledger for a code ----------
export const publicLedger = createServerFn({ method: 'POST' })
  .inputValidator((i) => z.object({ fullCode: z.string().min(4).max(80) }).parse(i))
  .handler(async ({ data }) => {
    const parts = data.fullCode.trim().toUpperCase().split('-');
    if (parts.length < 3) return { ok: false, scans: [] as any[], code: null as any };
    parts.pop();
    const code = parts.join('-');
    const { data: row } = await supabaseAdmin
      .from('product_auth_codes')
      .select('code, batch_code, status, scan_count, first_scan_at, first_scan_country, first_scan_city, manufactured_at')
      .eq('code', code).maybeSingle();
    if (!row) return { ok: false, scans: [], code: null };
    const { data: scans } = await supabaseAdmin
      .from('product_auth_scans')
      .select('scanned_at, city, region, country, accepted')
      .eq('code', code)
      .order('scanned_at', { ascending: false })
      .limit(50);
    return {
      ok: true,
      code: row,
      scans: (scans || []).map(s => ({
        at: s.scanned_at,
        location: [s.city, s.region, s.country].filter(Boolean).join(', ') || 'Unknown',
        ok: s.accepted,
      })),
    };
  });

// ---------- PUBLIC: AI seal photo verification (Lovable AI Gateway) ----------
export const analyzeSealPhoto = createServerFn({ method: 'POST' })
  .inputValidator((i) => z.object({
    fullCode: z.string().min(4).max(80),
    photoUrl: z.string().url().max(1000),
  }).parse(i))
  .handler(async ({ data }) => {
    const ai = getAIConfig();
    if (!ai) return { ok: false, verdict: 'unknown', notes: 'AI verification temporarily unavailable.' };

    const prompt = `You are a counterfeit-detection vision assistant for NutroPact supplement products.
Analyze the uploaded photo for: (1) tamper-evident seal intact? (2) holographic sticker present and unique pattern visible? (3) printing quality (sharp vs blurry/pixelated — counterfeits are usually blurry)? (4) any signs of seal damage, re-sealing, or print misalignment?
Respond ONLY as compact JSON:
{"verdict":"authentic"|"suspicious"|"counterfeit"|"unclear","confidence":0-1,"notes":"<1-2 sentences>"}`;

    try {
      const res = await fetch(ai.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ai.key}` },
        body: JSON.stringify({
          model: ai.model('google/gemini-2.5-flash'),
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: data.photoUrl } },
            ],
          }],
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        console.error('AI seal check error', res.status, t);
        return { ok: false, verdict: 'unknown', notes: 'AI check failed.' };
      }
      const j: any = await res.json();
      const txt: string = j?.choices?.[0]?.message?.content || '';
      const m = txt.match(/\{[\s\S]*\}/);
      let parsed: any = { verdict: 'unclear', confidence: 0, notes: txt.slice(0, 200) };
      if (m) { try { parsed = JSON.parse(m[0]); } catch {} }
      const verdict = ['authentic', 'suspicious', 'counterfeit', 'unclear'].includes(parsed.verdict) ? parsed.verdict : 'unclear';
      const confidence = Math.max(0, Math.min(1, Number(parsed.confidence) || 0));

      // attach to most recent scan of this code
      const parts = data.fullCode.trim().toUpperCase().split('-');
      parts.pop();
      const code = parts.join('-');
      const { data: latest } = await supabaseAdmin
        .from('product_auth_scans').select('id').eq('code', code)
        .order('scanned_at', { ascending: false }).limit(1).maybeSingle();
      if (latest?.id) {
        await supabaseAdmin.from('product_auth_scans').update({
          seal_photo_url: data.photoUrl,
          seal_ai_verdict: verdict,
          seal_ai_confidence: confidence,
          seal_ai_notes: parsed.notes || null,
        }).eq('id', latest.id);
      }
      return { ok: true, verdict, confidence, notes: parsed.notes || '' };
    } catch (e: any) {
      console.error('analyzeSealPhoto', e);
      return { ok: false, verdict: 'unknown', notes: 'Network error.' };
    }
  });

// ---------- PUBLIC: submit counterfeit report (bounty entry) ----------
export const submitCounterfeitReport = createServerFn({ method: 'POST' })
  .inputValidator((i) => z.object({
    code: z.string().max(80).optional(),
    reporterName: z.string().min(1).max(120),
    reporterEmail: z.string().email().max(200),
    reporterPhone: z.string().max(30).optional(),
    reason: z.string().min(3).max(200),
    details: z.string().max(2000).optional(),
    purchaseLocation: z.string().max(300).optional(),
    photoUrls: z.array(z.string().url().max(1000)).max(6).default([]),
  }).parse(i))
  .handler(async ({ data }) => {
    const ip = (getRequestHeader('cf-connecting-ip') || getRequestHeader('x-forwarded-for') || '').split(',')[0].trim() || null;

    // rate limit: 3 reports per IP per hour
    if (ip) {
      const { data: rl } = await supabaseAdmin.rpc('check_rate_limit', {
        _bucket: 'counterfeit_report', _key: ip, _limit: 3, _window_seconds: 3600, _block_seconds: 3600,
      });
      if (rl && Array.isArray(rl) && rl[0] && !rl[0].allowed) {
        throw new Error('Too many reports from this IP. Try again later.');
      }
    }

    let authCodeId: string | null = null;
    if (data.code) {
      const parts = data.code.trim().toUpperCase().split('-');
      if (parts.length >= 3) parts.pop();
      const codePart = parts.join('-');
      const { data: row } = await supabaseAdmin.from('product_auth_codes').select('id').eq('code', codePart).maybeSingle();
      authCodeId = row?.id || null;
    }

    const { data: inserted, error } = await supabaseAdmin.from('product_auth_reports').insert({
      code: data.code || null,
      auth_code_id: authCodeId,
      reporter_name: data.reporterName,
      reporter_email: data.reporterEmail,
      reporter_phone: data.reporterPhone || null,
      reason: data.reason,
      details: data.details || null,
      purchase_location: data.purchaseLocation || null,
      photo_urls: data.photoUrls,
      ip,
    }).select('id').single();
    if (error) throw new Error(error.message);

    // notify admins
    try {
      await supabaseAdmin.from('user_notifications').insert(
        await (async () => {
          const { data: admins } = await supabaseAdmin.from('user_roles').select('user_id').eq('role', 'admin');
          return (admins || []).map(a => ({
            user_id: a.user_id,
            type: 'warning',
            title: '🚨 New counterfeit report',
            body: `${data.reporterName} reported: ${data.reason}`,
            link: '/admin?tab=product-auth',
          }));
        })()
      );
    } catch (e) { console.warn('notify admins', e); }

    return { ok: true, id: inserted.id, message: 'Report received. We will investigate within 48h and contact you about the bounty.' };
  });

// ---------- ADMIN: list/update reports ----------
export const listAuthReports = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({
    status: z.enum(['pending', 'investigating', 'verified_counterfeit', 'rejected', 'paid']).optional(),
    limit: z.number().int().min(1).max(500).default(100),
  }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    let q = supabaseAdmin.from('product_auth_reports').select('*').order('created_at', { ascending: false }).limit(data.limit);
    if (data.status) q = q.eq('status', data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { reports: rows || [] };
  });

export const updateAuthReport = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({
    id: z.string().uuid(),
    status: z.enum(['pending', 'investigating', 'verified_counterfeit', 'rejected', 'paid']),
    bountyAmount: z.number().min(0).max(100000).optional(),
    adminNotes: z.string().max(2000).optional(),
    markBountyPaid: z.boolean().optional(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const patch: any = { status: data.status };
    if (data.bountyAmount !== undefined) patch.bounty_amount = data.bountyAmount;
    if (data.adminNotes !== undefined) patch.admin_notes = data.adminNotes;
    if (data.markBountyPaid) patch.bounty_paid_at = new Date().toISOString();
    const { error } = await supabaseAdmin.from('product_auth_reports').update(patch).eq('id', data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============= PHASE 3 =============

// ---------- AUTHED: claim/register code, pay one-time scan reward ----------
export const claimAuthCode = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ fullCode: z.string().min(4).max(80) }).parse(i))
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    const parts = data.fullCode.trim().toUpperCase().split('-');
    if (parts.length < 3) throw new Error('Invalid code');
    const providedHmac = parts.pop()!;
    const code = parts.join('-');

    const { data: row } = await supabaseAdmin.from('product_auth_codes').select('*').eq('code', code).maybeSingle();
    if (!row) throw new Error('Code not found');
    // verify HMAC
    try {
      const { timingSafeEqual } = await getCrypto();
      const a = Buffer.from(row.hmac_signature, 'utf8');
      const b = Buffer.from(providedHmac, 'utf8');
      if (a.length !== b.length || !timingSafeEqual(a, b)) throw new Error('Bad signature');
    } catch { throw new Error('Bad signature'); }
    if (row.status === 'blocked' || row.status === 'flagged_tamper') throw new Error('This code is blocked');
    if (row.registered_user_id && row.registered_user_id !== userId) {
      throw new Error('This product has already been registered to another customer');
    }

    // Load settings
    const { data: s } = await supabaseAdmin.from('site_settings').select('settings').eq('key', 'product_auth').maybeSingle();
    const settings = (s?.settings as any) || {};
    const reward = Math.max(0, Number(settings.scanReward) || 0);
    const warrantyDays = Math.max(0, Number(settings.warrantyDays) || 365);

    const warrantyUntil = warrantyDays > 0
      ? new Date(Date.now() + warrantyDays * 86400000).toISOString()
      : null;

    const patch: any = {};
    if (!row.registered_user_id) {
      patch.registered_user_id = userId;
      patch.registered_at = new Date().toISOString();
      patch.warranty_until = warrantyUntil;
    }

    let creditedAmount = 0;
    if (!row.scan_reward_paid && reward > 0) {
      const { data: credited } = await supabaseAdmin.rpc('wallet_credit', {
        _user_id: userId,
        _amount: reward,
        _source: 'product_auth_scan',
        _note: `Scan reward for ${code}`,
        _order_id: undefined,
        _expiry_days: 90,
        _rule_code: 'auth_scan_' + code,
      });
      creditedAmount = Number(credited) || 0;
      if (creditedAmount > 0) patch.scan_reward_paid = true;
    }

    if (Object.keys(patch).length) {
      await supabaseAdmin.from('product_auth_codes').update(patch).eq('id', row.id);
    }

    return {
      ok: true,
      registered: !row.registered_user_id,
      alreadyRegistered: row.registered_user_id === userId,
      creditedAmount,
      warrantyUntil: patch.warranty_until || row.warranty_until,
    };
  });

// ---------- PUBLIC: list checkpoints for a batch ----------
export const listCheckpoints = createServerFn({ method: 'POST' })
  .inputValidator((i) => z.object({ batchCode: z.string().min(1).max(32) }).parse(i))
  .handler(async ({ data }) => {
    const { data: rows } = await supabaseAdmin
      .from('product_auth_checkpoints')
      .select('id, stage, location, notes, occurred_at')
      .eq('batch_code', data.batchCode.toUpperCase())
      .order('occurred_at', { ascending: true });
    return { checkpoints: rows || [] };
  });

// ---------- ADMIN: add checkpoint ----------
export const addCheckpoint = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({
    batchCode: z.string().min(1).max(32),
    stage: z.enum(['manufactured','quality_check','warehoused','shipped','delivered_retailer','sold']),
    location: z.string().max(200).optional(),
    notes: z.string().max(500).optional(),
    occurredAt: z.string().datetime().optional(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from('product_auth_checkpoints').insert({
      batch_code: data.batchCode.toUpperCase(),
      stage: data.stage,
      location: data.location || null,
      notes: data.notes || null,
      actor_user_id: context.userId,
      occurred_at: data.occurredAt || new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- ADMIN: delete checkpoint ----------
export const deleteCheckpoint = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from('product_auth_checkpoints').delete().eq('id', data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- PUBLIC: counterfeit heatmap (last 90 days) ----------
export const counterfeitHeatmap = createServerFn({ method: 'GET' })
  .handler(async () => {
    const since = new Date(Date.now() - 90 * 86400000).toISOString();
    const { data: rows } = await supabaseAdmin
      .from('product_auth_scans')
      .select('city, region, country, accepted, rejection_reason, scanned_at')
      .gte('scanned_at', since)
      .limit(5000);
    const cityMap = new Map<string, { city: string; country: string; rejected: number; accepted: number }>();
    let totalRejected = 0;
    let totalAccepted = 0;
    (rows || []).forEach((r: any) => {
      if (r.accepted) totalAccepted++; else totalRejected++;
      const city = r.city || 'Unknown';
      const country = r.country || '—';
      const key = `${city}|${country}`;
      const entry = cityMap.get(key) || { city, country, rejected: 0, accepted: 0 };
      if (r.accepted) entry.accepted++; else entry.rejected++;
      cityMap.set(key, entry);
    });
    const cities = Array.from(cityMap.values())
      .sort((a, b) => b.rejected - a.rejected)
      .slice(0, 30);
    return { totalAccepted, totalRejected, cities, since };
  });

// ---------- ADMIN: anomaly scan, auto-flag batches ----------
export const runAnomalyScan = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    const { data: scans } = await supabaseAdmin
      .from('product_auth_scans')
      .select('code, accepted')
      .gte('scanned_at', since)
      .limit(20000);

    const codeStats = new Map<string, { total: number; rejected: number }>();
    (scans || []).forEach((s: any) => {
      const e = codeStats.get(s.code) || { total: 0, rejected: 0 };
      e.total++;
      if (!s.accepted) e.rejected++;
      codeStats.set(s.code, e);
    });

    // batch-level aggregate
    const batchStats = new Map<string, { total: number; rejected: number; codes: string[] }>();
    for (const [code, s] of codeStats) {
      const batch = code.split('-')[0];
      const e = batchStats.get(batch) || { total: 0, rejected: 0, codes: [] };
      e.total += s.total;
      e.rejected += s.rejected;
      e.codes.push(code);
      batchStats.set(batch, e);
    }

    const flagged: any[] = [];
    for (const [batch, s] of batchStats) {
      const rate = s.total > 0 ? s.rejected / s.total : 0;
      if (s.total >= 10 && rate >= 0.3) {
        flagged.push({ batch, total: s.total, rejected: s.rejected, rate: Math.round(rate * 100) });
        // auto-flag all unused codes in batch
        await supabaseAdmin.from('product_auth_codes')
          .update({ status: 'flagged_duplicate', notes: `Auto-flagged: batch rejection rate ${Math.round(rate * 100)}%` })
          .eq('batch_code', batch)
          .in('status', ['unused', 'verified']);
      }
    }
    return { ok: true, flaggedBatches: flagged, scannedBatches: batchStats.size };
  });

// ============= PHASE 4: Trust Layer & Distribution =============

// ---------- PUBLIC: batch trust stats (for badge + certificate) ----------
export const batchTrustStats = createServerFn({ method: 'POST' })
  .inputValidator((i) => z.object({ batchCode: z.string().min(1).max(32) }).parse(i))
  .handler(async ({ data }) => {
    const batch = data.batchCode.toUpperCase();
    const { data: codes } = await supabaseAdmin
      .from('product_auth_codes')
      .select('status, scan_count, manufactured_at')
      .eq('batch_code', batch);
    if (!codes || codes.length === 0) {
      return { ok: false as const, batch };
    }
    const total = codes.length;
    const verified = codes.filter((c: any) => ['verified', 'unused'].includes(c.status)).length;
    const flagged = codes.filter((c: any) => String(c.status).startsWith('flagged') || c.status === 'blocked').length;
    const scans = codes.reduce((a: number, c: any) => a + (c.scan_count || 0), 0);
    const trustScore = total > 0 ? Math.round((verified / total) * 100) : 0;
    const manufactured = codes[0]?.manufactured_at || null;
    return { ok: true as const, batch, total, verified, flagged, scans, trustScore, manufactured };
  });

// ---------- PUBLIC: certificate data for a claimed code ----------
export const getCertificate = createServerFn({ method: 'POST' })
  .inputValidator((i) => z.object({ fullCode: z.string().min(4).max(80) }).parse(i))
  .handler(async ({ data }) => {
    const parts = data.fullCode.trim().toUpperCase().split('-');
    if (parts.length < 3) return { ok: false as const, reason: 'INVALID' };
    const providedHmac = parts.pop()!;
    const code = parts.join('-');
    const { data: row } = await supabaseAdmin.from('product_auth_codes').select('*').eq('code', code).maybeSingle();
    if (!row) return { ok: false as const, reason: 'NOT_FOUND' };
    try {
      const { timingSafeEqual } = await getCrypto();
      const a = Buffer.from(row.hmac_signature, 'utf8');
      const b = Buffer.from(providedHmac, 'utf8');
      if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false as const, reason: 'BAD_SIGNATURE' };
    } catch { return { ok: false as const, reason: 'BAD_SIGNATURE' }; }
    if (row.status === 'blocked' || row.status === 'flagged_tamper') return { ok: false as const, reason: 'BLOCKED' };

    let productName: string | null = null;
    let productImage: string | null = null;
    if (row.product_id) {
      const { data: p } = await supabaseAdmin.from('products').select('name, images').eq('id', row.product_id).maybeSingle();
      productName = (p as any)?.name || null;
      productImage = Array.isArray((p as any)?.images) ? (p as any).images[0] : null;
    }
    let ownerName: string | null = null;
    if (row.registered_user_id) {
      const { data: prof } = await supabaseAdmin.from('profiles').select('name').eq('id', row.registered_user_id).maybeSingle();
      ownerName = prof?.name || null;
    }
    return {
      ok: true as const,
      code,
      batch: row.batch_code,
      status: row.status,
      productName,
      productImage,
      ownerName,
      registeredAt: row.registered_at,
      warrantyUntil: row.warranty_until,
      manufacturedAt: row.manufactured_at,
      firstScanAt: row.first_scan_at,
      firstScanCity: row.first_scan_city,
      firstScanCountry: row.first_scan_country,
      scanCount: row.scan_count || 0,
    };
  });

// ===================== PHASE 5: Active Defense & Brand Intelligence =====================

// ---------- Guardian Points (customer authenticity score) ----------
function tierFor(points: number): 'bronze' | 'silver' | 'gold' | 'platinum' {
  if (points >= 500) return 'platinum';
  if (points >= 150) return 'gold';
  if (points >= 50) return 'silver';
  return 'bronze';
}

async function addGuardianPoints(userId: string, delta: number, kind: 'verify' | 'report' | 'confirmed_report') {
  const { data: existing } = await supabaseAdmin
    .from('guardian_points').select('*').eq('user_id', userId).maybeSingle();
  const cur: any = existing || { points: 0, verifications_count: 0, reports_count: 0, confirmed_reports_count: 0 };
  const next = {
    user_id: userId,
    points: (cur.points || 0) + delta,
    verifications_count: (cur.verifications_count || 0) + (kind === 'verify' ? 1 : 0),
    reports_count: (cur.reports_count || 0) + (kind === 'report' ? 1 : 0),
    confirmed_reports_count: (cur.confirmed_reports_count || 0) + (kind === 'confirmed_report' ? 1 : 0),
    tier: tierFor((cur.points || 0) + delta),
  };
  await supabaseAdmin.from('guardian_points').upsert(next, { onConflict: 'user_id' });
  return next;
}

export const recordVerificationPoints = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    code: z.string().min(3).max(80).regex(/^[A-Z0-9-]+$/i),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const codeUp = data.code.toUpperCase();
    // Rate-limit: 1 award per code per user (idempotent)
    const { data: existing } = await supabaseAdmin
      .from('product_auth_codes').select('code, status').eq('code', codeUp).maybeSingle();
    if (!existing) return { ok: false, reason: 'NOT_FOUND' };
    // Check rate limit: max 20 awards / hour / user
    try {
      const { data: rl } = await supabaseAdmin.rpc('check_rate_limit', {
        _bucket: 'guardian_verify', _key: context.userId, _limit: 20, _window_seconds: 3600,
      });
      if (Array.isArray(rl) && rl[0] && rl[0].allowed === false) {
        return { ok: false, reason: 'RATE_LIMITED' };
      }
    } catch { /* fail open */ }
    const next = await addGuardianPoints(context.userId, 5, 'verify');
    return { ok: true, points: next.points, tier: next.tier };
  });

export const guardianLeaderboard = createServerFn({ method: 'GET' })
  .handler(async () => {
    const { data } = await supabaseAdmin
      .from('guardian_points')
      .select('user_id, points, verifications_count, reports_count, tier')
      .order('points', { ascending: false })
      .limit(25);
    const ids = (data || []).map((r: any) => r.user_id);
    let names: Record<string, string> = {};
    if (ids.length) {
      const { data: profs } = await supabaseAdmin.from('profiles').select('id, name').in('id', ids);
      names = Object.fromEntries((profs || []).map((p: any) => [p.id, p.name || 'Guardian']));
    }
    return {
      ok: true,
      entries: (data || []).map((r: any, idx: number) => ({
        rank: idx + 1,
        name: maskName(names[r.user_id] || 'Guardian'),
        points: r.points,
        tier: r.tier,
        verifications: r.verifications_count,
        reports: r.reports_count,
      })),
    };
  });

function maskName(n: string) {
  const parts = n.trim().split(/\s+/);
  if (!parts[0]) return 'Guardian';
  const first = parts[0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] + '.' : '';
  return first.slice(0, 1) + '*'.repeat(Math.max(1, first.length - 1)) + (last ? ' ' + last : '');
}

export const myGuardianStats = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await supabaseAdmin
      .from('guardian_points').select('*').eq('user_id', context.userId).maybeSingle();
    if (!data) return { ok: true, points: 0, tier: 'bronze' as const, verifications: 0, reports: 0 };
    return {
      ok: true,
      points: data.points,
      tier: data.tier as 'bronze' | 'silver' | 'gold' | 'platinum',
      verifications: data.verifications_count,
      reports: data.reports_count,
    };
  });

// ---------- Distributors ----------
export const listDistributors = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data } = await supabaseAdmin
      .from('product_auth_distributors').select('*').order('created_at', { ascending: false });
    return { ok: true, distributors: data || [] };
  });

export const saveDistributor = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    id: z.string().uuid().optional(),
    name: z.string().min(1).max(120),
    region: z.string().max(120).optional(),
    contact_name: z.string().max(120).optional(),
    contact_phone: z.string().max(40).optional(),
    contact_email: z.string().email().optional().or(z.literal('')),
    status: z.enum(['active', 'suspended', 'investigation']).optional(),
    notes: z.string().max(2000).optional(),
  }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const payload: any = { ...data };
    if (payload.contact_email === '') payload.contact_email = null;
    if (data.id) {
      const { error } = await supabaseAdmin.from('product_auth_distributors').update(payload).eq('id', data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from('product_auth_distributors').insert(payload);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteDistributor = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from('product_auth_distributors').delete().eq('id', data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const distributorHealth = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data: dists } = await supabaseAdmin.from('product_auth_distributors').select('id, name, region, status');
    const { data: codes } = await supabaseAdmin.from('product_auth_codes').select('distributor_id, status').not('distributor_id', 'is', null);
    const byDist: Record<string, { total: number; flagged: number }> = {};
    (codes || []).forEach((c: any) => {
      const k = c.distributor_id as string;
      byDist[k] = byDist[k] || { total: 0, flagged: 0 };
      byDist[k].total++;
      if (String(c.status).startsWith('flagged') || c.status === 'blocked') byDist[k].flagged++;
    });
    const result = (dists || []).map((d: any) => {
      const s = byDist[d.id] || { total: 0, flagged: 0 };
      const flagRate = s.total > 0 ? Math.round((s.flagged / s.total) * 100) : 0;
      const health: 'good' | 'warning' | 'critical' = flagRate >= 10 ? 'critical' : flagRate >= 5 ? 'warning' : 'good';
      return { ...d, totalCodes: s.total, flaggedCodes: s.flagged, flagRate, health };
    });
    return { ok: true, distributors: result };
  });

// ---------- Marketplace listings (counterfeit hunting via Gemini) ----------
export const listMarketplaceListings = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data } = await supabaseAdmin
      .from('product_auth_marketplace_listings').select('*')
      .order('created_at', { ascending: false }).limit(100);
    return { ok: true, listings: data || [] };
  });

async function geminiAnalyzeListing(input: { platform: string; url: string; sellerName?: string; price?: number; mrp?: number; pasteText?: string }) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { verdict: 'unknown', confidence: 0, notes: 'GEMINI_API_KEY not configured' };
  const discountPct = input.mrp && input.price ? Math.round(((input.mrp - input.price) / input.mrp) * 100) : null;
  const prompt = `You are a brand-protection analyst for NutroPact (Indian sports nutrition brand: whey, creatine, supplements). Assess this third-party marketplace listing for counterfeit risk.

Platform: ${input.platform}
URL: ${input.url}
Seller: ${input.sellerName || 'unknown'}
Listed price: ${input.price ?? 'unknown'} INR
Our MRP: ${input.mrp ?? 'unknown'} INR
Discount vs MRP: ${discountPct !== null ? discountPct + '%' : 'unknown'}
Listing text/details: ${(input.pasteText || '').slice(0, 1500)}

Score from 0-100 counterfeit risk. Consider: deep discount (>30%), generic seller name, no FSSAI mention, vague product description, image-only listing, suspicious bulk packs, mismatched batch info. Reply ONLY as compact JSON:
{"verdict":"authentic|suspicious|likely_counterfeit","confidence":0-100,"notes":"<2 sentence reason>"}`;
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
      }),
    });
    if (!res.ok) return { verdict: 'unknown', confidence: 0, notes: `AI error ${res.status}` };
    const j: any = await res.json();
    const text = j?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const parsed = JSON.parse(text);
    return {
      verdict: ['authentic', 'suspicious', 'likely_counterfeit'].includes(parsed.verdict) ? parsed.verdict : 'suspicious',
      confidence: Math.min(100, Math.max(0, Number(parsed.confidence) || 0)),
      notes: String(parsed.notes || '').slice(0, 500),
    };
  } catch (e: any) {
    return { verdict: 'unknown', confidence: 0, notes: 'AI parse failed: ' + (e?.message || 'unknown') };
  }
}

export const submitMarketplaceListing = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    platform: z.enum(['amazon', 'flipkart', 'meesho', 'jiomart', 'other']),
    listing_url: z.string().url().max(500),
    seller_name: z.string().max(200).optional(),
    listed_price: z.number().min(0).max(1000000).optional(),
    our_mrp: z.number().min(0).max(1000000).optional(),
    paste_text: z.string().max(5000).optional(),
  }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const ai = await geminiAnalyzeListing({
      platform: data.platform,
      url: data.listing_url,
      sellerName: data.seller_name,
      price: data.listed_price,
      mrp: data.our_mrp,
      pasteText: data.paste_text,
    });
    const discount_pct = data.our_mrp && data.listed_price
      ? Math.round(((data.our_mrp - data.listed_price) / data.our_mrp) * 100)
      : null;
    const { data: row, error } = await supabaseAdmin.from('product_auth_marketplace_listings').insert({
      platform: data.platform,
      listing_url: data.listing_url,
      seller_name: data.seller_name || null,
      listed_price: data.listed_price ?? null,
      our_mrp: data.our_mrp ?? null,
      discount_pct,
      ai_verdict: ai.verdict,
      ai_confidence: ai.confidence,
      ai_notes: ai.notes,
      created_by: context.userId,
    }).select('*').single();
    if (error) throw new Error(error.message);
    return { ok: true, listing: row };
  });

export const updateMarketplaceListing = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    id: z.string().uuid(),
    status: z.enum(['open', 'takedown_sent', 'resolved', 'dismissed']),
  }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const patch: any = { status: data.status };
    if (data.status === 'resolved' || data.status === 'dismissed') patch.resolved_at = new Date().toISOString();
    const { error } = await supabaseAdmin.from('product_auth_marketplace_listings').update(patch).eq('id', data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Legal cases (cease & desist) ----------
export const generateCeaseDesist = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    listing_id: z.string().uuid().optional(),
    report_id: z.string().uuid().optional(),
    recipient: z.string().max(300).optional(),
    brand: z.string().max(120).default('NutroPact'),
  }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    let context_md = '';
    let subject = `Cease & Desist — Unauthorized sale of ${data.brand} products`;
    if (data.listing_id) {
      const { data: l } = await supabaseAdmin.from('product_auth_marketplace_listings').select('*').eq('id', data.listing_id).maybeSingle();
      if (l) {
        context_md = `**Platform:** ${l.platform}\n**URL:** ${l.listing_url}\n**Seller:** ${l.seller_name || 'Unknown'}\n**Listed price:** ₹${l.listed_price ?? 'N/A'}\n**Our MRP:** ₹${l.our_mrp ?? 'N/A'}\n**AI verdict:** ${l.ai_verdict} (${l.ai_confidence}% confidence)\n`;
      }
    }
    if (data.report_id) {
      const { data: r } = await supabaseAdmin.from('product_auth_reports').select('*').eq('id', data.report_id).maybeSingle();
      if (r) {
        context_md += `\n**Customer report ID:** ${r.id}\n**Reported code:** ${r.code || 'N/A'}\n**Reason:** ${r.reason || 'N/A'}\n**Customer details:** ${r.details || 'N/A'}\n**Purchase location:** ${r.purchase_location || 'N/A'}\n`;
      }
    }
    const body = `# CEASE AND DESIST NOTICE

**To:** ${data.recipient || '[Recipient name and address]'}
**From:** ${data.brand} (legal@nutropact.com)
**Date:** ${new Date().toISOString().slice(0, 10)}
**Subject:** ${subject}

## 1. Notice of Infringement

It has come to our attention that you are offering for sale products bearing the trademark **${data.brand}** which are not authentic, are not sourced through our authorized distribution network, or are being sold in a manner that violates our intellectual property rights and the rights of Indian consumers under the Consumer Protection Act, 2019.

## 2. Evidence

${context_md || '[Evidence attached separately]'}

## 3. Legal Basis

Your conduct constitutes:
- Trademark infringement under **Sections 29 and 30 of the Trade Marks Act, 1999**
- Passing off under common law
- Copyright infringement under **Section 63 of the Copyright Act, 1957** (criminal offence, punishable up to 3 years imprisonment)
- Violation of **Section 17 of the Food Safety and Standards Act, 2006** (sale of misbranded food)
- Unfair trade practice under **Section 2(47) of the Consumer Protection Act, 2019**

## 4. Demands

You are hereby required, within **SEVEN (7) DAYS** from receipt of this notice, to:

1. **CEASE AND DESIST** all sale, marketing, distribution, and promotion of any product bearing the ${data.brand} mark;
2. **REMOVE** the listing(s) referenced above from all platforms;
3. **DISCLOSE** in writing the source of all such inventory in your possession, names of suppliers, quantities purchased, and dates;
4. **DESTROY** all remaining counterfeit inventory in your possession and provide certified proof of destruction;
5. **PAY** damages to ${data.brand} in such amount as may be quantified, plus the costs of this notice.

## 5. Consequences of Non-Compliance

Failure to comply within the said period will compel us to initiate, **without further notice**:
- Criminal complaint under Section 63 Copyright Act, 1957 and Section 103 Trade Marks Act, 1999
- Civil suit for permanent injunction, damages, account of profits, and delivery-up
- Complaint to FSSAI for sale of misbranded food
- Takedown notices to the platform(s) under their Brand Registry / Brand Protection programmes
- Recovery of all legal costs

## 6. Without Prejudice

This notice is issued without prejudice to any other rights and remedies available to ${data.brand} in law or equity, all of which are expressly reserved.

---

**Yours faithfully,**
For ${data.brand}
Authorized Signatory

*This is a computer-generated draft. Please review with qualified legal counsel before dispatch.*
`;
    const { data: row, error } = await supabaseAdmin.from('product_auth_legal_cases').insert({
      report_id: data.report_id || null,
      listing_id: data.listing_id || null,
      case_type: 'cease_desist',
      subject,
      recipient: data.recipient || null,
      body_markdown: body,
      created_by: context.userId,
    }).select('*').single();
    if (error) throw new Error(error.message);
    return { ok: true, case: row };
  });

export const listLegalCases = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data } = await supabaseAdmin.from('product_auth_legal_cases')
      .select('id, subject, recipient, case_type, status, created_at, sent_at')
      .order('created_at', { ascending: false }).limit(100);
    return { ok: true, cases: data || [] };
  });

export const getLegalCase = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: row } = await supabaseAdmin.from('product_auth_legal_cases').select('*').eq('id', data.id).maybeSingle();
    return { ok: !!row, case: row };
  });

export const updateLegalCase = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    id: z.string().uuid(),
    status: z.enum(['draft', 'sent', 'acknowledged', 'resolved', 'escalated']),
  }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const patch: any = { status: data.status };
    if (data.status === 'sent') patch.sent_at = new Date().toISOString();
    const { error } = await supabaseAdmin.from('product_auth_legal_cases').update(patch).eq('id', data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Trust Wall (public stats) ----------
export const trustWallStats = createServerFn({ method: 'GET' })
  .handler(async () => {
    const since24h = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const since30d = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    const [scansTotal, scans24, citiesRow, counterfeitsRow, guardiansRow] = await Promise.all([
      supabaseAdmin.from('product_auth_scans').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('product_auth_scans').select('id', { count: 'exact', head: true }).gte('created_at', since24h),
      supabaseAdmin.from('product_auth_scans').select('city').gte('created_at', since30d).not('city', 'is', null),
      supabaseAdmin.from('product_auth_codes').select('id', { count: 'exact', head: true }).in('status', ['flagged_duplicate', 'flagged_geo', 'flagged_tamper', 'blocked']),
      supabaseAdmin.from('guardian_points').select('user_id', { count: 'exact', head: true }),
    ]);
    const citySet = new Set<string>();
    (citiesRow.data || []).forEach((r: any) => r.city && citySet.add(String(r.city).toLowerCase()));
    return {
      ok: true,
      totalScans: scansTotal.count || 0,
      scans24h: scans24.count || 0,
      uniqueCities30d: citySet.size,
      counterfeitsBlocked: counterfeitsRow.count || 0,
      guardians: guardiansRow.count || 0,
    };
  });

// ---------- Velocity anomaly: rapid city spike ----------
export const velocityCheck = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const since1h = new Date(Date.now() - 3600 * 1000).toISOString();
    const since7d = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
    const [{ data: recent }, { data: baseline }] = await Promise.all([
      supabaseAdmin.from('product_auth_scans').select('city').gte('created_at', since1h).not('city', 'is', null),
      supabaseAdmin.from('product_auth_scans').select('city').gte('created_at', since7d).not('city', 'is', null),
    ]);
    const recentByCity: Record<string, number> = {};
    const baseByCity: Record<string, number> = {};
    (recent || []).forEach((r: any) => { const c = String(r.city).toLowerCase(); recentByCity[c] = (recentByCity[c] || 0) + 1; });
    (baseline || []).forEach((r: any) => { const c = String(r.city).toLowerCase(); baseByCity[c] = (baseByCity[c] || 0) + 1; });
    const anomalies: any[] = [];
    Object.entries(recentByCity).forEach(([city, n1h]) => {
      const baselineHourly = (baseByCity[city] || 0) / (7 * 24); // avg per hour over 7d
      if (n1h >= 5 && baselineHourly > 0 && n1h / baselineHourly >= 10) {
        anomalies.push({ city, last1h: n1h, baselineHourly: Math.round(baselineHourly * 10) / 10, spike: Math.round(n1h / baselineHourly) + 'x' });
      } else if (n1h >= 10 && baselineHourly === 0) {
        anomalies.push({ city, last1h: n1h, baselineHourly: 0, spike: 'new' });
      }
    });
    return { ok: true, anomalies, totalLast1h: (recent || []).length };
  });
