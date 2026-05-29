// @ts-nocheck
/**
 * Provider-agnostic messaging dispatcher.
 *
 * Admin configures each channel (email / sms / whatsapp) via the
 * `site_settings.messaging` row — endpoint, HTTP method, headers, body template,
 * and a secret env-var name. The dispatcher reads pending rows from
 * `notification_queue`, renders the body, calls the provider, and updates the row.
 *
 * Zero hard dependency on any single provider — works with Twilio, MSG91,
 * Fast2SMS, Meta WhatsApp Cloud, Resend, Brevo, SMTP-relay HTTP endpoints,
 * or anything else that takes an HTTP request.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdmin } from "./users.functions";

type Channel = "email" | "sms" | "whatsapp";

type Mailbox = {
  key: string;        // short id like "support", "noreply", "info"
  from: string;       // support@yourdomain.com
  name?: string;      // display name "Support Team"
  replyTo?: string;
};

type ChannelConfig = {
  enabled?: boolean;
  label?: string;        // free-text provider name (Twilio, MSG91, Resend, ...)
  endpoint?: string;     // full URL, supports ${ENV_VAR}
  method?: "POST" | "GET" | "PUT";
  contentType?: string;  // application/json | application/x-www-form-urlencoded | text/plain
  headers?: Record<string, string>;   // values support ${ENV_VAR}
  bodyTemplate?: string; // any string; supports {{to}} {{message}} {{subject}} {{from}} {{fromName}} {{replyTo}} {{...payload}}
  defaultFrom?: string;
  defaultSubject?: string;
  successPath?: string;  // optional jsonpath-ish "data.success" (truthy check). Else 2xx = success.
  templates?: Record<string, string>; // template_name -> message body (with {{var}} interpolation)
  // Email-only: unlimited mailboxes + per-template routing
  mailboxes?: Mailbox[];
  defaultMailboxKey?: string;
  templateMailbox?: Record<string, string>; // template_name -> mailbox.key
};

type MessagingConfig = {
  channels: { email?: ChannelConfig; sms?: ChannelConfig; whatsapp?: ChannelConfig };
  cronSecret?: string;
  batchSize?: number;
};

const DEFAULT_TEMPLATES: Record<string, string> = {
  order_placed: "Hi {{customerName}}, your order {{orderNumber}} of ₹{{total}} is confirmed. Track: {{trackUrl}}",
  payment_confirmed: "Payment received for order {{orderNumber}}. Thank you!",
  shipped: "Your order {{orderNumber}} has been shipped. Track: {{trackUrl}}",
  out_for_delivery: "Your order {{orderNumber}} is out for delivery today!",
  delivered: "Your order {{orderNumber}} has been delivered. Enjoy!",
  test: "This is a test message from {{siteName}}.",
  // raw HTML/text payloads — used by bulk campaigns + analytics reports
  broadcast: "{{message}}",
  analytics_report: "{{message}}",
};

function resolveEnv(s: string, secrets: Record<string, string> = {}): string {
  return s.replace(/\$\{(\w+)\}/g, (_, name) => secrets[name] ?? process.env[name] ?? "");
}

async function loadAppSecrets(): Promise<Record<string, string>> {
  const { data } = await supabaseAdmin.from("app_secrets").select("key,value");
  const map: Record<string, string> = {};
  for (const r of (data ?? []) as any[]) map[r.key] = r.value ?? "";
  return map;
}

function renderTemplate(tpl: string, vars: Record<string, any>): string {
  return tpl.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, path) => {
    const parts = path.split(".");
    let cur: any = vars;
    for (const p of parts) cur = cur?.[p];
    return cur == null ? "" : String(cur);
  });
}

async function loadConfig(): Promise<MessagingConfig> {
  const { data } = await supabaseAdmin
    .from("site_settings")
    .select("settings")
    .eq("key", "messaging")
    .maybeSingle();
  const cfg = ((data?.settings as any) ?? {}) as MessagingConfig;
  cfg.channels = cfg.channels ?? {};
  return cfg;
}

async function loadSiteName(): Promise<string> {
  const { data } = await supabaseAdmin
    .from("site_settings")
    .select("settings")
    .eq("key", "default")
    .maybeSingle();
  return ((data?.settings as any)?.siteName as string) || "Our Store";
}

function resolveMailbox(channelCfg: ChannelConfig, template: string): { from: string; fromName: string; replyTo: string } {
  const boxes = channelCfg.mailboxes ?? [];
  const key = channelCfg.templateMailbox?.[template] || channelCfg.defaultMailboxKey || boxes[0]?.key;
  const mb = boxes.find((b) => b.key === key);
  if (mb) return { from: mb.from || "", fromName: mb.name || "", replyTo: mb.replyTo || "" };
  return { from: channelCfg.defaultFrom ?? "", fromName: "", replyTo: "" };
}

async function sendViaSMTP(
  channelCfg: ChannelConfig,
  to: string,
  message: string,
  subject: string,
  from: string,
  fromName: string,
  replyTo: string,
  secrets: Record<string, string>,
): Promise<{ ok: true; responseSnippet: string } | { ok: false; error: string }> {
  // endpoint format: smtp://host:port  or  smtps://host:port  (smtps = implicit TLS / port 465)
  // credentials via headers.user / headers.pass — values support ${SMTP_USER} style refs
  try {
    const url = new URL(resolveEnv(channelCfg.endpoint!, secrets));
    const secure = url.protocol === "smtps:" || url.port === "465";
    const host = url.hostname;
    const port = Number(url.port || (secure ? 465 : 587));

    const hdrs = channelCfg.headers ?? {};
    const userRaw = String(hdrs.user ?? hdrs.username ?? "${SMTP_USER}");
    const passRaw = String(hdrs.pass ?? hdrs.password ?? "${SMTP_PASS}");
    const user = resolveEnv(userRaw, secrets);
    const pass = resolveEnv(passRaw, secrets);

    if (!host) return { ok: false, error: "SMTP host missing in endpoint" };
    if (!user || !pass) return { ok: false, error: "SMTP user/pass missing (set SMTP_USER & SMTP_PASS in API Keys)" };

    const nodemailer = (await import("nodemailer")).default;
    const transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });

    const fromAddr = from || user;
    const fromHeader = fromName ? `"${fromName.replace(/"/g, "")}" <${fromAddr}>` : fromAddr;
    const html = channelCfg.bodyTemplate
      ? renderTemplate(channelCfg.bodyTemplate, { to, subject, message, from: fromAddr, fromName, replyTo })
      : `<p>${message.replace(/\n/g, "<br/>")}</p>`;

    const info = await transporter.sendMail({
      from: fromHeader,
      to,
      replyTo: replyTo || undefined,
      subject,
      text: message,
      html,
    });
    return { ok: true, responseSnippet: `SMTP OK ${info.messageId ?? ""}`.slice(0, 200) };
  } catch (e: any) {
    return { ok: false, error: `smtp: ${e?.message || "send failed"}`.slice(0, 500) };
  }
}

async function sendOnce(
  channel: Channel,
  channelCfg: ChannelConfig,
  to: string,
  message: string,
  subject: string,
  extras: Record<string, any>,
  template: string,
  secrets: Record<string, string>,
): Promise<{ ok: true; responseSnippet: string } | { ok: false; error: string }> {
  if (!channelCfg.enabled) return { ok: false, error: `${channel} channel disabled` };
  if (!channelCfg.endpoint) return { ok: false, error: `${channel} endpoint not configured` };

  const mb = channel === "email" ? resolveMailbox(channelCfg, template) : { from: channelCfg.defaultFrom ?? "", fromName: "", replyTo: "" };

  // SMTP branch — when endpoint is smtp:// or smtps://, use nodemailer instead of HTTP fetch
  const rawEndpoint = resolveEnv(channelCfg.endpoint, secrets);
  if (channel === "email" && /^smtps?:\/\//i.test(rawEndpoint)) {
    return sendViaSMTP(channelCfg, to, message, subject, mb.from, mb.fromName, mb.replyTo, secrets);
  }

  const vars: Record<string, any> = {
    to, message, subject,
    from: mb.from, fromName: mb.fromName, replyTo: mb.replyTo,
    ...extras,
  };

  const url = renderTemplate(rawEndpoint, vars);
  const method = (channelCfg.method ?? "POST").toUpperCase();
  const headers: Record<string, string> = {};
  if (channelCfg.contentType) headers["Content-Type"] = channelCfg.contentType;
  else if (method !== "GET") headers["Content-Type"] = "application/json";
  for (const [k, v] of Object.entries(channelCfg.headers ?? {})) {
    // user/pass are SMTP-only — skip them for HTTP requests
    if (["user", "username", "pass", "password"].includes(k.toLowerCase())) continue;
    headers[k] = renderTemplate(resolveEnv(String(v), secrets), vars);
  }

  let body: string | undefined;
  if (method !== "GET" && channelCfg.bodyTemplate) {
    body = renderTemplate(resolveEnv(channelCfg.bodyTemplate, secrets), vars);
  }

  let res: Response;
  try {
    res = await fetch(url, { method, headers, body });
  } catch (e: any) {
    return { ok: false, error: `network: ${e?.message || "fetch failed"}` };
  }
  const text = await res.text().catch(() => "");
  if (!res.ok) {
    return { ok: false, error: `HTTP ${res.status}: ${text.slice(0, 250)}` };
  }
  if (channelCfg.successPath) {
    try {
      const json = JSON.parse(text);
      const parts = channelCfg.successPath.split(".");
      let cur: any = json;
      for (const p of parts) cur = cur?.[p];
      if (!cur) return { ok: false, error: `success path falsy: ${text.slice(0, 200)}` };
    } catch { /* non-JSON, treat 2xx as success */ }
  }
  return { ok: true, responseSnippet: text.slice(0, 200) };
}

function pickTemplate(channelCfg: ChannelConfig, template: string): string {
  return (
    channelCfg.templates?.[template] ??
    DEFAULT_TEMPLATES[template] ??
    DEFAULT_TEMPLATES.test
  );
}

// ───────────────────────── Public dispatcher ─────────────────────────

export const dispatchMessages = createServerFn({ method: "POST" })
  .inputValidator(z.object({ batchSize: z.number().int().min(1).max(200).optional() }).parse)
  .handler(async ({ data }) => {
    const { requireCronSecret } = await import("./cron-auth");
    await requireCronSecret();
    const cfg = await loadConfig();
    const siteName = await loadSiteName();
    const secrets = await loadAppSecrets();
    const limit = data.batchSize ?? cfg.batchSize ?? 25;

    const { data: pending } = await supabaseAdmin
      .from("notification_queue")
      .select("*")
      .in("status", ["pending", "pending_external"])
      .lt("attempts", 5)
      .lte("next_attempt_at", new Date().toISOString())
      .order("created_at", { ascending: true })
      .limit(limit);

    const results = { processed: 0, sent: 0, failed: 0, skipped: 0 };

    for (const row of pending ?? []) {
      results.processed++;
      const channel = row.channel as Channel;
      if (channel === "inapp" as any) {
        await supabaseAdmin
          .from("notification_queue")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", row.id);
        results.skipped++;
        continue;
      }
      const channelCfg = cfg.channels?.[channel] ?? {};
      if (!channelCfg.enabled || !channelCfg.endpoint) {
        await supabaseAdmin
          .from("notification_queue")
          .update({
            status: "pending_external",
            error: `${channel} provider not configured`,
            attempts: (row.attempts ?? 0) + 1,
            next_attempt_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
          })
          .eq("id", row.id);
        results.skipped++;
        continue;
      }

      const payload = (row.payload as any) ?? {};
      const tpl = pickTemplate(channelCfg, row.template);
      const message = renderTemplate(tpl, {
        ...payload,
        siteName,
        trackUrl: payload.trackUrl || (row.order_number ? `/track-order?order=${row.order_number}` : ""),
      });
      const subject = channelCfg.defaultSubject
        ? renderTemplate(channelCfg.defaultSubject, { ...payload, siteName })
        : `${siteName} — ${row.template.replace(/_/g, " ")}`;

      const send = await sendOnce(channel, channelCfg, row.recipient, message, subject, {
        ...payload,
        siteName,
      }, row.template, secrets);

      if (send.ok) {
        await supabaseAdmin
          .from("notification_queue")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            attempts: (row.attempts ?? 0) + 1,
            error: "",
          })
          .eq("id", row.id);
        results.sent++;
      } else {
        const nextAttempts = (row.attempts ?? 0) + 1;
        const isFinal = nextAttempts >= 5;
        await supabaseAdmin
          .from("notification_queue")
          .update({
            status: isFinal ? "failed" : "pending",
            attempts: nextAttempts,
            error: send.error.slice(0, 500),
            next_attempt_at: new Date(Date.now() + Math.min(60, 2 ** nextAttempts) * 60 * 1000).toISOString(),
          })
          .eq("id", row.id);
        results.failed++;
      }
    }

    return results;
  });

// ───────────────────────── Admin: config CRUD ─────────────────────────

export const getMessagingConfig = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    return await loadConfig();
  });

export const saveMessagingConfig = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((d: unknown) => d as MessagingConfig)
  .handler(async ({ data }) => {
    const safe: MessagingConfig = {
      channels: data?.channels ?? {},
      cronSecret: data?.cronSecret ?? "",
      batchSize: data?.batchSize ?? 25,
    };
    await supabaseAdmin.from("site_settings").upsert({ key: "messaging", settings: safe as any });
    return { ok: true };
  });

// ───────────────────────── Admin: send test ─────────────────────────

export const sendTestMessage = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator(z.object({
    channel: z.enum(["email", "sms", "whatsapp"]),
    to: z.string().min(3).max(320),
    template: z.string().min(1).max(64).default("test"),
  }).parse)
  .handler(async ({ data }) => {
    const cfg = await loadConfig();
    const siteName = await loadSiteName();
    const secrets = await loadAppSecrets();
    const channelCfg = cfg.channels?.[data.channel] ?? {};
    if (!channelCfg.enabled) throw new Error(`${data.channel} channel is disabled`);
    if (!channelCfg.endpoint) throw new Error(`${data.channel} endpoint not configured`);

    const tpl = pickTemplate(channelCfg, data.template);
    const message = renderTemplate(tpl, { siteName, customerName: "Test User", orderNumber: "TEST-001", total: "0" });
    const subject = renderTemplate(channelCfg.defaultSubject || `${siteName} — Test`, { siteName });
    const res = await sendOnce(data.channel, channelCfg, data.to, message, subject, { siteName }, data.template, secrets);
    if (!res.ok) throw new Error(res.error);
    return { ok: true, messagePreview: message, response: res.responseSnippet };
  });

// ───────────────────────── Admin: app secrets (API keys) ─────────────────────────

export const getAppSecrets = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { data } = await supabaseAdmin.from("app_secrets").select("key,value,updated_at").order("key");
    return (data ?? []) as { key: string; value: string; updated_at: string }[];
  });

export const saveAppSecret = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator(z.object({
    key: z.string().min(1).max(100).regex(/^[A-Z][A-Z0-9_]*$/, "Use UPPER_SNAKE_CASE"),
    value: z.string().max(4000),
  }).parse)
  .handler(async ({ data }) => {
    await supabaseAdmin.from("app_secrets").upsert({ key: data.key, value: data.value, updated_at: new Date().toISOString() });
    return { ok: true };
  });

export const deleteAppSecret = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator(z.object({ key: z.string().min(1).max(100) }).parse)
  .handler(async ({ data }) => {
    await supabaseAdmin.from("app_secrets").delete().eq("key", data.key);
    return { ok: true };
  });
