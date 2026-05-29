// @ts-nocheck
import { createServerFn, createMiddleware } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import * as OTPAuth from "otpauth";
import QRCode from "qrcode";
import crypto from "crypto";

const csf = createServerFn;
const cm = createMiddleware;


// ───────────────────────── Helpers ─────────────────────────
const ISSUER = "NutroPact Admin";

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("hex");
}

function genBackupCode() {
  // 10-char alphanumeric, dash in middle (e.g. ABCD12-EF34GH)
  const raw = crypto.randomBytes(8).toString("base64")
    .replace(/[^A-Z0-9]/gi, "").toUpperCase().slice(0, 10);
  return raw.slice(0, 5) + "-" + raw.slice(5);
}

function clientIp(headers: Headers): string {
  return (
    headers.get("cf-connecting-ip") ||
    headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    headers.get("x-real-ip") ||
    ""
  );
}

function userAgent(headers: Headers): string {
  return (headers.get("user-agent") || "").slice(0, 300);
}

async function isAdminUser(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles").select("role")
    .eq("user_id", userId).eq("role", "admin").maybeSingle();
  return !!data;
}

async function logAttempt(opts: {
  email?: string; user_id?: string | null; ip?: string; ua?: string;
  success: boolean; stage: "password" | "otp" | "backup" | "lockout" | "ip"; reason?: string;
}) {
  try {
    await supabaseAdmin.from("admin_login_attempts").insert({
      email: opts.email ?? "",
      user_id: opts.user_id ?? null,
      ip: opts.ip ?? "",
      user_agent: opts.ua ?? "",
      success: opts.success,
      stage: opts.stage,
      reason: opts.reason ?? "",
    });
  } catch { /* never block */ }
}

// IP allowlist check — empty list ⇒ allow all
function ipInCidr(ip: string, cidr: string): boolean {
  if (!ip || !cidr) return false;
  if (!cidr.includes("/")) return ip === cidr;
  // Only IPv4 CIDR matching (good enough for admin whitelist)
  const [range, bitsStr] = cidr.split("/");
  const bits = parseInt(bitsStr, 10);
  if (!ip.includes(".") || !range.includes(".")) return false;
  const toInt = (s: string) =>
    s.split(".").reduce((a, p) => (a << 8) + parseInt(p, 10), 0) >>> 0;
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (toInt(ip) & mask) === (toInt(range) & mask);
}

async function ipAllowed(ip: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("admin_ip_allowlist").select("cidr,active").eq("active", true);
  const list = data ?? [];
  if (list.length === 0) return true; // no rules ⇒ allow
  return list.some((r: any) => ipInCidr(ip, r.cidr));
}

async function isLockedOut(email: string, ip: string) {
  const cutoff = new Date(Date.now() - 15 * 60_000).toISOString();
  const { data: byEmail } = await supabaseAdmin
    .from("admin_login_attempts")
    .select("id")
    .eq("email", email).eq("success", false)
    .gte("created_at", cutoff);
  if ((byEmail?.length ?? 0) >= 5) return "Too many failed attempts. Try again in 15 minutes.";
  if (ip) {
    const { data: byIp } = await supabaseAdmin
      .from("admin_login_attempts")
      .select("id").eq("ip", ip).eq("success", false)
      .gte("created_at", cutoff);
    if ((byIp?.length ?? 0) >= 10) return "Too many failed attempts from this network.";
  }
  return null;
}

// Admin-only middleware reused
const requireAdmin = cm({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }: any) => {
    const { userId } = context;
    if (!(await isAdminUser(userId))) throw new Error("Forbidden: admin only");
    return next({ context });
  });

// ────────────────────── Get 2FA status ──────────────────────
export const get2FAStatus = csf({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }: any) => {
    const { userId } = context;
    const [{ data: row }, { data: codes }, { data: sessions }] = await Promise.all([
      supabaseAdmin.from("user_2fa").select("*").eq("user_id", userId).maybeSingle(),
      supabaseAdmin.from("user_2fa_backup_codes").select("id,used_at").eq("user_id", userId),
      supabaseAdmin.from("admin_2fa_sessions")
        .select("id,ip,user_agent,trusted_device,expires_at,created_at,revoked_at")
        .eq("user_id", userId).order("created_at", { ascending: false }).limit(10),
    ]);
    return {
      enabled: !!row?.enabled,
      method: row?.method ?? null,
      lastVerifiedAt: row?.last_verified_at ?? null,
      backupCodesTotal: codes?.length ?? 0,
      backupCodesUnused: (codes ?? []).filter((c: any) => !c.used_at).length,
      sessions: sessions ?? [],
    };
  });

// ────────────────────── Start TOTP enrollment ──────────────────────
export const startTotpEnrollment = csf({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }: any) => {
    const { userId } = context;
    const { data: u } = await supabaseAdmin.auth.admin.getUserById(userId);
    const email = u?.user?.email || "admin";
    const secret = new OTPAuth.Secret({ size: 20 });
    const totp = new OTPAuth.TOTP({
      issuer: ISSUER, label: email, algorithm: "SHA1", digits: 6, period: 30, secret,
    });
    const uri = totp.toString();
    const qrDataUrl = await QRCode.toDataURL(uri, { margin: 1, width: 240 });
    // Store secret as pending (enabled=false)
    await supabaseAdmin.from("user_2fa").upsert({
      user_id: userId, method: "totp", secret: secret.base32, enabled: false,
    });
    return { secret: secret.base32, otpauth: uri, qrDataUrl };
  });

// ────────────────────── Confirm TOTP enrollment ──────────────────────
export const confirmTotpEnrollment = csf({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ code: z.string().min(6).max(8) }).parse(input))
  .handler(async ({ data, context }: any) => {
    const { userId } = context;
    const { data: row } = await supabaseAdmin
      .from("user_2fa").select("*").eq("user_id", userId).maybeSingle();
    if (!row?.secret || row.method !== "totp") throw new Error("No pending TOTP enrollment");
    const totp = new OTPAuth.TOTP({
      issuer: ISSUER, label: "verify", algorithm: "SHA1", digits: 6, period: 30,
      secret: OTPAuth.Secret.fromBase32(row.secret),
    });
    const delta = totp.validate({ token: data.code.replace(/\s/g, ""), window: 1 });
    if (delta === null) throw new Error("Invalid code");
    await supabaseAdmin.from("user_2fa").update({
      enabled: true, last_verified_at: new Date().toISOString(),
    }).eq("user_id", userId);
    return { ok: true };
  });

// ────────────────────── Email method enrollment ──────────────────────
export const enableEmailOtp = csf({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }: any) => {
    const { userId } = context;
    await supabaseAdmin.from("user_2fa").upsert({
      user_id: userId, method: "email", secret: "", enabled: true,
      last_verified_at: new Date().toISOString(),
    });
    return { ok: true };
  });

// ────────────────────── Disable 2FA ──────────────────────
export const disable2FA = csf({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }: any) => {
    const { userId } = context;
    await supabaseAdmin.from("user_2fa").delete().eq("user_id", userId);
    await supabaseAdmin.from("user_2fa_backup_codes").delete().eq("user_id", userId);
    await supabaseAdmin.from("admin_2fa_sessions").delete().eq("user_id", userId);
    return { ok: true };
  });

// ────────────────────── Generate backup codes ──────────────────────
export const regenerateBackupCodes = csf({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }: any) => {
    const { userId } = context;
    await supabaseAdmin.from("user_2fa_backup_codes").delete().eq("user_id", userId);
    const codes: string[] = Array.from({ length: 10 }, () => genBackupCode());
    await supabaseAdmin.from("user_2fa_backup_codes").insert(
      codes.map((c) => ({ user_id: userId, code_hash: sha256(c) }))
    );
    return { codes };
  });

// ────────────────────── Request login OTP (after password) ──────────────────────
// Called by client after successful password login but before granting admin access.
export const request2FAChallenge = csf({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }: any) => {
    const { userId, request } = context as any;
    const headers: Headers = request?.headers ?? new Headers();
    const ip = clientIp(headers);
    const ua = userAgent(headers);

    const { data: u } = await supabaseAdmin.auth.admin.getUserById(userId);
    const email = u?.user?.email || "";

    // Admin-only enforcement
    if (!(await isAdminUser(userId))) {
      return { required: false }; // customers don't need 2FA
    }

    // IP allowlist
    if (!(await ipAllowed(ip))) {
      await logAttempt({ email, user_id: userId, ip, ua, success: false, stage: "ip", reason: "IP not allowed" });
      throw new Error("Your IP is not allowed to access admin.");
    }
    // Lockout
    const locked = await isLockedOut(email, ip);
    if (locked) {
      await logAttempt({ email, user_id: userId, ip, ua, success: false, stage: "lockout", reason: locked });
      throw new Error(locked);
    }

    const { data: row } = await supabaseAdmin
      .from("user_2fa").select("*").eq("user_id", userId).maybeSingle();
    if (!row || !row.enabled) {
      // Not enrolled — must enroll before getting admin access
      return { required: true, method: null, enrolled: false };
    }
    if (row.method === "email") {
      // Generate 6-digit code, store hashed, queue notification
      const code = String(Math.floor(100000 + Math.random() * 900000));
      await supabaseAdmin.from("email_otp_challenges").insert({
        user_id: userId, code_hash: sha256(code), ip,
        expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
      });
      if (email) {
        await supabaseAdmin.from("notification_queue").insert({
          user_id: userId, channel: "email", template: "admin_login_otp",
          recipient: email, payload: { code, ip, ua },
        });
      }
      return { required: true, method: "email", enrolled: true };
    }
    return { required: true, method: "totp", enrolled: true };
  });

// ────────────────────── Verify 2FA challenge ──────────────────────
export const verify2FAChallenge = csf({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      code: z.string().min(6).max(20),
      kind: z.enum(["otp", "backup"]).default("otp"),
      trustDevice: z.boolean().default(false),
    }).parse(input)
  )
  .handler(async ({ data, context }: any) => {
    const { userId, request } = context as any;
    const headers: Headers = request?.headers ?? new Headers();
    const ip = clientIp(headers);
    const ua = userAgent(headers);
    const { data: u } = await supabaseAdmin.auth.admin.getUserById(userId);
    const email = u?.user?.email || "";

    if (!(await ipAllowed(ip))) throw new Error("IP not allowed");
    const locked = await isLockedOut(email, ip);
    if (locked) throw new Error(locked);

    const code = data.code.replace(/\s/g, "").toUpperCase();

    let ok = false;
    if (data.kind === "backup") {
      const hash = sha256(code);
      const { data: bc } = await supabaseAdmin
        .from("user_2fa_backup_codes")
        .select("id,used_at").eq("user_id", userId).eq("code_hash", hash).maybeSingle();
      if (bc && !bc.used_at) {
        await supabaseAdmin.from("user_2fa_backup_codes")
          .update({ used_at: new Date().toISOString() }).eq("id", bc.id);
        ok = true;
      }
    } else {
      const { data: row } = await supabaseAdmin
        .from("user_2fa").select("*").eq("user_id", userId).maybeSingle();
      if (!row?.enabled) throw new Error("2FA not enrolled");
      if (row.method === "totp") {
        const totp = new OTPAuth.TOTP({
          issuer: ISSUER, label: "verify", algorithm: "SHA1", digits: 6, period: 30,
          secret: OTPAuth.Secret.fromBase32(row.secret),
        });
        ok = totp.validate({ token: code, window: 1 }) !== null;
      } else if (row.method === "email") {
        const cutoff = new Date(Date.now() - 10 * 60_000).toISOString();
        const { data: ch } = await supabaseAdmin.from("email_otp_challenges")
          .select("id,code_hash,attempts,consumed_at,expires_at")
          .eq("user_id", userId)
          .gte("created_at", cutoff)
          .order("created_at", { ascending: false }).limit(1).maybeSingle();
        if (ch && !ch.consumed_at && new Date(ch.expires_at).getTime() > Date.now()) {
          if (ch.code_hash === sha256(code.toLowerCase()) || ch.code_hash === sha256(code)) {
            await supabaseAdmin.from("email_otp_challenges")
              .update({ consumed_at: new Date().toISOString() }).eq("id", ch.id);
            ok = true;
          } else {
            await supabaseAdmin.from("email_otp_challenges")
              .update({ attempts: (ch.attempts ?? 0) + 1 }).eq("id", ch.id);
          }
        }
      }
    }

    await logAttempt({
      email, user_id: userId, ip, ua, success: ok,
      stage: data.kind === "backup" ? "backup" : "otp",
      reason: ok ? "" : "Invalid code",
    });
    if (!ok) throw new Error("Invalid code");

    // Issue 2FA session token
    const token = randomToken(32);
    const ttlHours = data.trustDevice ? 24 * 30 : 8;
    await supabaseAdmin.from("admin_2fa_sessions").insert({
      user_id: userId, token_hash: sha256(token), ip, user_agent: ua,
      trusted_device: data.trustDevice,
      expires_at: new Date(Date.now() + ttlHours * 3600_000).toISOString(),
    });
    await supabaseAdmin.from("user_2fa")
      .update({ last_verified_at: new Date().toISOString() })
      .eq("user_id", userId);
    return { ok: true, token, expiresInHours: ttlHours };
  });

// ────────────────────── Validate 2FA session (used by admin guards) ──────────────────────
export const validate2FASession = csf({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ token: z.string().min(10).max(200) }).parse(input))
  .handler(async ({ data, context }: any) => {
    const { userId } = context;
    const { data: row } = await supabaseAdmin
      .from("admin_2fa_sessions").select("*")
      .eq("user_id", userId).eq("token_hash", sha256(data.token)).maybeSingle();
    if (!row || row.revoked_at || new Date(row.expires_at).getTime() < Date.now()) {
      return { valid: false };
    }
    return { valid: true, expiresAt: row.expires_at, trusted: row.trusted_device };
  });

// ────────────────────── Revoke session ──────────────────────
export const revoke2FASession = csf({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ sessionId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }: any) => {
    const { userId } = context;
    await supabaseAdmin.from("admin_2fa_sessions")
      .update({ revoked_at: new Date().toISOString() })
      .eq("user_id", userId).eq("id", data.sessionId);
    return { ok: true };
  });

// ────────────────────── IP allowlist mgmt ──────────────────────
export const listIpAllowlist = csf({ method: "POST" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { data } = await supabaseAdmin
      .from("admin_ip_allowlist").select("*").order("created_at", { ascending: false });
    return { rows: data ?? [] };
  });

export const addIpAllowlistEntry = csf({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input) =>
    z.object({
      cidr: z.string().min(7).max(43).regex(/^[0-9./:a-fA-F]+$/),
      label: z.string().max(120).default(""),
    }).parse(input)
  )
  .handler(async ({ data, context }: any) => {
    const { error } = await supabaseAdmin.from("admin_ip_allowlist").insert({
      cidr: data.cidr, label: data.label, created_by: context.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const toggleIpAllowlistEntry = csf({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input) =>
    z.object({ id: z.string().uuid(), active: z.boolean() }).parse(input)
  )
  .handler(async ({ data }) => {
    await supabaseAdmin.from("admin_ip_allowlist").update({ active: data.active }).eq("id", data.id);
    return { ok: true };
  });

export const deleteIpAllowlistEntry = csf({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    await supabaseAdmin.from("admin_ip_allowlist").delete().eq("id", data.id);
    return { ok: true };
  });

// ────────────────────── Login attempts feed ──────────────────────
export const listLoginAttempts = csf({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input) =>
    z.object({ limit: z.number().int().min(1).max(500).default(100) }).parse(input ?? {})
  )
  .handler(async ({ data }) => {
    const { data: rows } = await supabaseAdmin.from("admin_login_attempts")
      .select("*").order("created_at", { ascending: false }).limit(data.limit);
    return { rows: rows ?? [] };
  });

// ────────────────────── Get caller's IP (for setup help) ──────────────────────
export const getMyIp = csf({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }: any) => {
    const headers: Headers = context.request?.headers ?? new Headers();
    return { ip: clientIp(headers) };
  });
