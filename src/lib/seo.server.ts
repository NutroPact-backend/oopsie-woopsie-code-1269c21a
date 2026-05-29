// @ts-nocheck
// Server-only helpers for SEO Command Center
import { supabaseAdmin } from '@/integrations/supabase/client.server';

export async function ensureAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from('user_roles').select('role').eq('user_id', userId).eq('role', 'admin').maybeSingle();
  if (!data) throw new Error('Forbidden');
}

// ── Google Search Console: mint OAuth access token from service-account JSON ──
// Uses Web Crypto (Workers-compatible). No external deps.
function b64url(buf: ArrayBuffer | Uint8Array | string): string {
  let bytes: Uint8Array;
  if (typeof buf === 'string') bytes = new TextEncoder().encode(buf);
  else if (buf instanceof Uint8Array) bytes = buf;
  else bytes = new Uint8Array(buf);
  let s = ''; for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

let cachedToken: { token: string; exp: number } | null = null;

export async function getGscAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.exp > Date.now() + 60_000) return cachedToken.token;
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON not configured');
  const sa = JSON.parse(raw);
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/webmasters.readonly https://www.googleapis.com/auth/indexing',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claim))}`;
  const key = await crypto.subtle.importKey(
    'pkcs8', pemToArrayBuffer(sa.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned));
  const jwt = `${unsigned}.${b64url(sig)}`;
  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  if (!resp.ok) throw new Error(`GSC token error: ${resp.status} ${await resp.text()}`);
  const j: any = await resp.json();
  cachedToken = { token: j.access_token, exp: Date.now() + (j.expires_in || 3600) * 1000 };
  return cachedToken.token;
}

export async function gscFetch(path: string, init: RequestInit = {}): Promise<any> {
  const token = await getGscAccessToken();
  const url = path.startsWith('http') ? path : `https://searchconsole.googleapis.com${path}`;
  const resp = await fetch(url, {
    ...init,
    headers: { ...(init.headers || {}), Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  if (!resp.ok) throw new Error(`GSC ${resp.status}: ${await resp.text()}`);
  return resp.json();
}

// ── Semrush ──
const SEMRUSH_BASE = 'https://api.semrush.com';

export async function semrushCsv(params: Record<string, string>): Promise<{ headers: string[]; rows: string[][] }> {
  const key = process.env.SEMRUSH_API_KEY;
  if (!key) throw new Error('SEMRUSH_API_KEY not configured');
  const q = new URLSearchParams({ ...params, key }).toString();
  const resp = await fetch(`${SEMRUSH_BASE}/?${q}`);
  const text = await resp.text();
  if (text.startsWith('ERROR')) throw new Error(`Semrush: ${text.trim()}`);
  const lines = text.trim().split('\n');
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = lines[0].split(';');
  const rows = lines.slice(1).map(l => l.split(';'));
  return { headers, rows };
}

export function csvToObjects(res: { headers: string[]; rows: string[][] }): Array<Record<string, string>> {
  return res.rows.map(r => Object.fromEntries(res.headers.map((h, i) => [h, r[i] ?? ''])));
}

// ── Gemini (direct Google Generative Language API) ──
export async function geminiJson(prompt: string, model = 'gemini-2.5-flash'): Promise<any> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY not configured');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.4 },
    }),
  });
  if (!resp.ok) throw new Error(`Gemini ${resp.status}: ${await resp.text()}`);
  const j: any = await resp.json();
  const text = j.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  try { return JSON.parse(text); } catch { return { _raw: text }; }
}
