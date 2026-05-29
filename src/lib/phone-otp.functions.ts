// @ts-nocheck
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import crypto from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdmin } from "./users.functions";

// ---------- helpers ----------

function normalizePhone(raw: string): string {
  let p = raw.trim().replace(/[\s-()]/g, "");
  if (!p.startsWith("+")) {
    // assume India if 10-digit
    if (/^\d{10}$/.test(p)) p = "+91" + p;
    else if (/^\d{12}$/.test(p)) p = "+" + p;
  }
  if (!/^\+\d{8,15}$/.test(p)) throw new Error("Invalid phone number");
  return p;
}

function genCode(len: number): string {
  const max = 10 ** len;
  const n = crypto.randomInt(0, max);
  return n.toString().padStart(len, "0");
}

function hashCode(phone: string, code: string): string {
  return crypto.createHash("sha256").update(`${phone}:${code}`).digest("hex");
}

function renderTemplate(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => vars[k] ?? "");
}

async function loadAuthSettings() {
  const { data } = await supabaseAdmin
    .from("site_settings")
    .select("settings")
    .eq("key", "default")
    .maybeSingle();
  const s: any = data?.settings ?? {};
  return (s.auth ?? {}) as Record<string, any>;
}

async function sendViaProvider(
  phone: string,
  message: string,
  cfg: Record<string, any>,
): Promise<{ ok: boolean; mode: "real" | "test"; debugOtp?: string }> {
  const provider = cfg.phoneSmsProvider ?? "none";

  // Test mode: no real SMS
  if (provider === "none") {
    console.log(`[PHONE OTP – TEST MODE] ${phone} → ${message}`);
    return { ok: true, mode: "test" };
  }


  if (provider === "custom") {
    if (!cfg.customHttpUrl) throw new Error("Custom HTTP URL not configured");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (cfg.customHttpHeaders) {
      try {
        const parsed = JSON.parse(cfg.customHttpHeaders);
        // resolve ${ENV_VAR} placeholders in header values
        for (const [k, v] of Object.entries(parsed)) {
          headers[k] = String(v).replace(/\$\{(\w+)\}/g, (_, name) => process.env[name] ?? "");
        }
      } catch {
        throw new Error("Custom HTTP headers must be valid JSON");
      }
    }
    const body = renderTemplate(cfg.customHttpBodyTemplate || "", {
      phone,
      message,
      // expose raw code via {{code}} too — template author can choose
    });
    const method = cfg.customHttpMethod || "POST";
    const url = method === "GET"
      ? `${cfg.customHttpUrl}${cfg.customHttpUrl.includes("?") ? "&" : "?"}to=${encodeURIComponent(phone)}&message=${encodeURIComponent(message)}`
      : cfg.customHttpUrl;

    const res = await fetch(url, {
      method,
      headers,
      body: method === "GET" ? undefined : body,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`SMS provider error ${res.status}: ${text.slice(0, 200)}`);
    }
    return { ok: true, mode: "real" };
  }

  // Built-in providers not yet implemented in this scaffold
  throw new Error(`Provider "${provider}" not implemented. Use "custom" with HTTP config or "none" for test mode.`);
}

// ---------- public: request OTP ----------

export const requestPhoneOtp = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    phone: z.string().min(8).max(20),
    captchaToken: z.string().max(4096).optional(),
  }).parse)
  .handler(async ({ data }) => {
    const phone = normalizePhone(data.phone);
    const cfg = await loadAuthSettings();

    if (cfg.phoneLoginEnabled === false && cfg.phoneOtpEnabled === false) {
      throw new Error("Phone OTP is disabled");
    }

    // CAPTCHA verify (no-op if TURNSTILE_SECRET_KEY not set)
    const { verifyTurnstile } = await import("./turnstile.server");
    const cap = await verifyTurnstile(data.captchaToken);
    if (!cap.ok) throw new Error("CAPTCHA verification failed");

    // Rate limit: count OTPs sent in last hour
    const hourAgo = new Date(Date.now() - 3600_000).toISOString();
    const { count } = await supabaseAdmin
      .from("phone_otps")
      .select("id", { count: "exact", head: true })
      .eq("phone", phone)
      .gte("created_at", hourAgo);
    const limit = cfg.phoneRateLimitPerHour ?? 10;
    if ((count ?? 0) >= limit) {
      throw new Error(`Too many OTP requests. Try again later.`);
    }

    const len = cfg.phoneOtpLength ?? 6;
    const expirySec = cfg.phoneOtpExpirySec ?? 300;
    const code = genCode(len);
    const codeHash = hashCode(phone, code);
    const expiresAt = new Date(Date.now() + expirySec * 1000).toISOString();

    const { error } = await supabaseAdmin.from("phone_otps").insert({
      phone,
      code_hash: codeHash,
      expires_at: expiresAt,
    });
    if (error) throw new Error(error.message);

    const message = renderTemplate(
      cfg.phoneSmsTemplate || "Your OTP is {{code}}",
      { code, phone },
    );

    const send = await sendViaProvider(phone, message, cfg);

    return {
      ok: true,
      mode: send.mode,
      expiresInSec: expirySec,
      // ONLY include OTP in response when devModeShowOtp is on (test mode)
      debugOtp: cfg.devModeShowOtp && send.mode === "test" ? code : undefined,
    };
  });

// ---------- public: verify OTP ----------

export const verifyPhoneOtp = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    phone: z.string().min(8).max(20),
    code: z.string().min(4).max(10).regex(/^\d+$/),
  }).parse)
  .handler(async ({ data }) => {
    const phone = normalizePhone(data.phone);
    const codeHash = hashCode(phone, data.code);

    const { data: rows } = await supabaseAdmin
      .from("phone_otps")
      .select("*")
      .eq("phone", phone)
      .is("consumed_at", null)
      .order("created_at", { ascending: false })
      .limit(1);

    const row = rows?.[0];
    if (!row) throw new Error("No OTP requested for this number");
    if (new Date(row.expires_at).getTime() < Date.now()) throw new Error("OTP expired");
    if (row.attempts >= 5) throw new Error("Too many attempts. Request a new OTP.");

    if (row.code_hash !== codeHash) {
      await supabaseAdmin
        .from("phone_otps")
        .update({ attempts: row.attempts + 1 })
        .eq("id", row.id);
      throw new Error("Invalid OTP");
    }

    await supabaseAdmin
      .from("phone_otps")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", row.id);

    return { ok: true, phone };
  });

// ---------- public: verify OTP AND sign in (returns magiclink token_hash) ----------

function phoneToEmail(phone: string): string {
  return `${phone.replace(/^\+/, "")}@phone.local`;
}

export const phoneSignIn = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    phone: z.string().min(8).max(20),
    code: z.string().min(4).max(10).regex(/^\d+$/),
  }).parse)
  .handler(async ({ data }) => {
    const phone = normalizePhone(data.phone);
    const codeHash = hashCode(phone, data.code);

    const { data: rows } = await supabaseAdmin
      .from("phone_otps")
      .select("*")
      .eq("phone", phone)
      .is("consumed_at", null)
      .order("created_at", { ascending: false })
      .limit(1);

    const row = rows?.[0];
    if (!row) throw new Error("No OTP requested for this number");
    if (new Date(row.expires_at).getTime() < Date.now()) throw new Error("OTP expired");
    if (row.attempts >= 5) throw new Error("Too many attempts. Request a new OTP.");
    if (row.code_hash !== codeHash) {
      await supabaseAdmin.from("phone_otps").update({ attempts: row.attempts + 1 }).eq("id", row.id);
      throw new Error("Invalid OTP");
    }
    await supabaseAdmin.from("phone_otps").update({ consumed_at: new Date().toISOString() }).eq("id", row.id);

    const email = phoneToEmail(phone);
    const { error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      phone,
      email_confirm: true,
      phone_confirm: true,
      user_metadata: { phone, signup_method: "phone_otp" },
    });
    if (createErr && !/already|exists|registered/i.test(createErr.message)) {
      throw new Error(createErr.message);
    }

    const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    if (linkErr || !linkData) throw new Error(linkErr?.message ?? "Failed to create session");

    const tokenHash = (linkData as any).properties?.hashed_token;
    if (!tokenHash) throw new Error("Failed to create session token");

    return { ok: true, email, tokenHash };
  });

// ---------- admin: send a test SMS ----------

export const testSendSms = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator(z.object({ phone: z.string().min(8).max(20) }).parse)
  .handler(async ({ data }) => {
    const phone = normalizePhone(data.phone);
    const cfg = await loadAuthSettings();
    const code = genCode(cfg.phoneOtpLength ?? 6);
    const message = renderTemplate(
      cfg.phoneSmsTemplate || "Test: your OTP is {{code}}",
      { code, phone },
    );
    const res = await sendViaProvider(phone, message, cfg);
    return {
      ok: true,
      mode: res.mode,
      messageSent: message,
      // always show in admin test (admin already authenticated)
      previewOtp: code,
    };
  });
