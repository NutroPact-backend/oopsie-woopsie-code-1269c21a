// @ts-nocheck
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Mail, MessageCircle, Smartphone, Save, Send, Shield, Info, Eye, EyeOff } from "lucide-react";
import {
  getMessagingConfig,
  saveMessagingConfig,
  sendTestMessage,
} from "@/lib/messaging.functions";
import AppSecretsPanel from "./AppSecretsPanel";
import { TabHelp } from "./_TabHelp";
import { SelectCheckbox, BulkActionBar } from "@/pages/admin/components/BulkSelect";

type Channel = "email" | "sms" | "whatsapp";
type Mailbox = { key: string; from: string; name?: string; replyTo?: string };
type ChannelConfig = {
  enabled?: boolean;
  label?: string;
  endpoint?: string;
  method?: "POST" | "GET" | "PUT";
  contentType?: string;
  headers?: Record<string, string>;
  bodyTemplate?: string;
  defaultFrom?: string;
  defaultSubject?: string;
  successPath?: string;
  templates?: Record<string, string>;
  mailboxes?: Mailbox[];
  defaultMailboxKey?: string;
  templateMailbox?: Record<string, string>;
};
type MessagingConfig = {
  channels: { email?: ChannelConfig; sms?: ChannelConfig; whatsapp?: ChannelConfig };
  cronSecret?: string;
  batchSize?: number;
};

const CHANNELS: { id: Channel; icon: React.ReactNode; label: string; hint: string }[] = [
  { id: "email", icon: <Mail size={16} />, label: "Email", hint: "Resend, Brevo, SendGrid, Postmark, SMTP-relay HTTP" },
  { id: "sms", icon: <Smartphone size={16} />, label: "SMS", hint: "MSG91, Fast2SMS, Twilio, TextLocal" },
  { id: "whatsapp", icon: <MessageCircle size={16} />, label: "WhatsApp", hint: "Meta Cloud API, Twilio, UltraMsg, Wassenger" },
];

const TEMPLATE_KEYS = ["order_placed", "payment_confirmed", "shipped", "out_for_delivery", "delivered"];

const PRESETS: Record<Channel, { label: string; cfg: Partial<ChannelConfig> }[]> = {
  sms: [
    {
      label: "Fast2SMS — Quick SMS (no DLT)",
      cfg: {
        label: "Fast2SMS Quick",
        endpoint: "https://www.fast2sms.com/dev/bulkV2",
        method: "POST",
        contentType: "application/json",
        headers: { authorization: "${FAST2SMS_API_KEY}" },
        bodyTemplate: JSON.stringify(
          { route: "q", message: "{{message}}", language: "english", flash: 0, numbers: "{{to}}" },
          null,
          2,
        ),
      },
    },
    {
      label: "Fast2SMS — DLT (transactional)",
      cfg: {
        label: "Fast2SMS DLT",
        endpoint: "https://www.fast2sms.com/dev/bulkV2",
        method: "POST",
        contentType: "application/json",
        headers: { authorization: "${FAST2SMS_API_KEY}" },
        bodyTemplate: JSON.stringify(
          { route: "dlt", sender_id: "YOUR_DLT_SENDER", message: "YOUR_DLT_TEMPLATE_ID", variables_values: "{{message}}", numbers: "{{to}}" },
          null,
          2,
        ),
      },
    },
    {
      label: "MSG91 — Flow API v5",
      cfg: {
        label: "MSG91",
        endpoint: "https://control.msg91.com/api/v5/flow/",
        method: "POST",
        contentType: "application/json",
        headers: { authkey: "${MSG91_AUTH_KEY}", accept: "application/json" },
        bodyTemplate: JSON.stringify(
          {
            template_id: "YOUR_FLOW_TEMPLATE_ID",
            short_url: "0",
            recipients: [{ mobiles: "{{to}}", VAR1: "{{message}}" }],
          },
          null,
          2,
        ),
      },
    },
    {
      label: "Twilio SMS",
      cfg: {
        label: "Twilio",
        endpoint: "https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json",
        method: "POST",
        contentType: "application/x-www-form-urlencoded",
        headers: { Authorization: "Basic ${TWILIO_BASIC_AUTH}" },
        bodyTemplate: "To={{to}}&From={{from}}&Body={{message}}",
        defaultFrom: "+1234567890",
      },
    },
    {
      label: "Plivo SMS",
      cfg: {
        label: "Plivo",
        endpoint: "https://api.plivo.com/v1/Account/${PLIVO_AUTH_ID}/Message/",
        method: "POST",
        contentType: "application/json",
        headers: { Authorization: "Basic ${PLIVO_BASIC_AUTH}" },
        bodyTemplate: JSON.stringify({ src: "{{from}}", dst: "{{to}}", text: "{{message}}" }, null, 2),
        defaultFrom: "SENDERID",
      },
    },
  ],
  whatsapp: [
    {
      label: "Meta WhatsApp Cloud — text",
      cfg: {
        label: "Meta WhatsApp Cloud (text)",
        endpoint: "https://graph.facebook.com/v20.0/${META_PHONE_NUMBER_ID}/messages",
        method: "POST",
        contentType: "application/json",
        headers: { Authorization: "Bearer ${META_WHATSAPP_TOKEN}" },
        bodyTemplate: JSON.stringify(
          { messaging_product: "whatsapp", recipient_type: "individual", to: "{{to}}", type: "text", text: { preview_url: false, body: "{{message}}" } },
          null,
          2,
        ),
      },
    },
    {
      label: "Meta WhatsApp Cloud — template",
      cfg: {
        label: "Meta WhatsApp Cloud (template)",
        endpoint: "https://graph.facebook.com/v20.0/${META_PHONE_NUMBER_ID}/messages",
        method: "POST",
        contentType: "application/json",
        headers: { Authorization: "Bearer ${META_WHATSAPP_TOKEN}" },
        bodyTemplate: JSON.stringify(
          {
            messaging_product: "whatsapp",
            to: "{{to}}",
            type: "template",
            template: {
              name: "YOUR_TEMPLATE_NAME",
              language: { code: "en_US" },
              components: [{ type: "body", parameters: [{ type: "text", text: "{{message}}" }] }],
            },
          },
          null,
          2,
        ),
      },
    },
    {
      label: "MSG91 WhatsApp",
      cfg: {
        label: "MSG91 WhatsApp",
        endpoint: "https://control.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/",
        method: "POST",
        contentType: "application/json",
        headers: { authkey: "${MSG91_AUTH_KEY}" },
        bodyTemplate: JSON.stringify(
          {
            integrated_number: "YOUR_INTEGRATED_NUMBER",
            content_type: "template",
            payload: {
              messaging_product: "whatsapp",
              type: "template",
              template: {
                name: "YOUR_TEMPLATE_NAME",
                language: { code: "en", policy: "deterministic" },
                to_and_components: [
                  { to: ["{{to}}"], components: { body_1: { type: "text", value: "{{message}}" } } },
                ],
              },
            },
          },
          null,
          2,
        ),
      },
    },
    {
      label: "Twilio WhatsApp",
      cfg: {
        label: "Twilio WhatsApp",
        endpoint: "https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json",
        method: "POST",
        contentType: "application/x-www-form-urlencoded",
        headers: { Authorization: "Basic ${TWILIO_BASIC_AUTH}" },
        bodyTemplate: "To=whatsapp:{{to}}&From=whatsapp:{{from}}&Body={{message}}",
        defaultFrom: "+14155238886",
      },
    },
    {
      label: "UltraMsg",
      cfg: {
        label: "UltraMsg",
        endpoint: "https://api.ultramsg.com/${ULTRAMSG_INSTANCE}/messages/chat",
        method: "POST",
        contentType: "application/x-www-form-urlencoded",
        bodyTemplate: "token=${ULTRAMSG_TOKEN}&to={{to}}&body={{message}}&priority=10",
      },
    },
  ],
  email: [
    {
      label: "📧 Gmail SMTP (your own Gmail — free, requires app password)",
      cfg: {
        label: "Gmail SMTP",
        endpoint: "smtps://smtp.gmail.com:465",
        method: "POST",
        headers: { user: "${SMTP_USER}", pass: "${SMTP_PASS}" },
        bodyTemplate: "<p>{{message}}</p>",
        defaultFrom: "yourname@gmail.com",
        defaultSubject: "{{siteName}} — {{orderNumber}}",
      },
    },
    {
      label: "📧 Zoho Mail SMTP (free custom domain)",
      cfg: {
        label: "Zoho SMTP",
        endpoint: "smtps://smtp.zoho.in:465",
        method: "POST",
        headers: { user: "${SMTP_USER}", pass: "${SMTP_PASS}" },
        bodyTemplate: "<p>{{message}}</p>",
        defaultFrom: "you@yourdomain.com",
        defaultSubject: "{{siteName}} — {{orderNumber}}",
      },
    },
    {
      label: "📧 Generic SMTP (cPanel / Hostinger / GoDaddy / koi bhi)",
      cfg: {
        label: "Custom SMTP",
        endpoint: "smtps://mail.yourdomain.com:465",
        method: "POST",
        headers: { user: "${SMTP_USER}", pass: "${SMTP_PASS}" },
        bodyTemplate: "<p>{{message}}</p>",
        defaultFrom: "you@yourdomain.com",
        defaultSubject: "{{siteName}} — {{orderNumber}}",
      },
    },
    {
      label: "🏠 Self-hosted SMTP relay (your own VPS)",
      cfg: {
        label: "Self-hosted SMTP",
        endpoint: "https://mail.yourdomain.com/send",
        method: "POST",
        contentType: "application/json",
        headers: { Authorization: "Bearer ${MAIL_RELAY_TOKEN}" },
        bodyTemplate: JSON.stringify(
          {
            from: "{{from}}",
            fromName: "{{fromName}}",
            to: "{{to}}",
            replyTo: "{{replyTo}}",
            subject: "{{subject}}",
            text: "{{message}}",
            html: "<p>{{message}}</p>",
          },
          null,
          2,
        ),
        defaultSubject: "{{siteName}} — {{orderNumber}}",
      },
    },
    {
      label: "Resend",
      cfg: {
        label: "Resend",
        endpoint: "https://api.resend.com/emails",
        method: "POST",
        contentType: "application/json",
        headers: { Authorization: "Bearer ${RESEND_API_KEY}" },
        bodyTemplate: JSON.stringify(
          { from: "{{from}}", to: ["{{to}}"], subject: "{{subject}}", text: "{{message}}" },
          null,
          2,
        ),
        defaultFrom: "noreply@yourdomain.com",
        defaultSubject: "{{siteName}}",
      },
    },
    {
      label: "Brevo (Sendinblue)",
      cfg: {
        label: "Brevo",
        endpoint: "https://api.brevo.com/v3/smtp/email",
        method: "POST",
        contentType: "application/json",
        headers: { "api-key": "${BREVO_API_KEY}", accept: "application/json" },
        bodyTemplate: JSON.stringify(
          { sender: { email: "{{from}}", name: "{{siteName}}" }, to: [{ email: "{{to}}" }], subject: "{{subject}}", textContent: "{{message}}" },
          null,
          2,
        ),
        defaultFrom: "noreply@yourdomain.com",
        defaultSubject: "{{siteName}}",
      },
    },
    {
      label: "SendGrid",
      cfg: {
        label: "SendGrid",
        endpoint: "https://api.sendgrid.com/v3/mail/send",
        method: "POST",
        contentType: "application/json",
        headers: { Authorization: "Bearer ${SENDGRID_API_KEY}" },
        bodyTemplate: JSON.stringify(
          {
            personalizations: [{ to: [{ email: "{{to}}" }], subject: "{{subject}}" }],
            from: { email: "{{from}}", name: "{{siteName}}" },
            content: [{ type: "text/plain", value: "{{message}}" }],
          },
          null,
          2,
        ),
        defaultFrom: "noreply@yourdomain.com",
        defaultSubject: "{{siteName}}",
      },
    },
    {
      label: "Postmark",
      cfg: {
        label: "Postmark",
        endpoint: "https://api.postmarkapp.com/email",
        method: "POST",
        contentType: "application/json",
        headers: { "X-Postmark-Server-Token": "${POSTMARK_SERVER_TOKEN}", accept: "application/json" },
        bodyTemplate: JSON.stringify(
          { From: "{{from}}", To: "{{to}}", Subject: "{{subject}}", TextBody: "{{message}}", MessageStream: "outbound" },
          null,
          2,
        ),
        defaultFrom: "noreply@yourdomain.com",
        defaultSubject: "{{siteName}}",
      },
    },
    {
      label: "MSG91 Email",
      cfg: {
        label: "MSG91 Email",
        endpoint: "https://control.msg91.com/api/v5/email/send",
        method: "POST",
        contentType: "application/json",
        headers: { authkey: "${MSG91_AUTH_KEY}", accept: "application/json" },
        bodyTemplate: JSON.stringify(
          {
            from: { email: "{{from}}", name: "{{siteName}}" },
            domain: "YOUR_VERIFIED_DOMAIN",
            recipients: [{ to: [{ email: "{{to}}" }], variables: { message: "{{message}}", subject: "{{subject}}" } }],
            subject: "{{subject}}",
            text: "{{message}}",
          },
          null,
          2,
        ),
        defaultFrom: "noreply@yourdomain.com",
        defaultSubject: "{{siteName}}",
      },
    },
  ],
};

export default function MessagingTab() {
  const fetchCfg = useServerFn(getMessagingConfig);
  const saveCfg = useServerFn(saveMessagingConfig);
  const sendTest = useServerFn(sendTestMessage);

  const [cfg, setCfg] = useState<MessagingConfig | null>(null);
  const [active, setActive] = useState<Channel>("email");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [testTo, setTestTo] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [selMb, setSelMb] = useState<Set<string>>(new Set());

  const toggleMb = (k: string) => setSelMb((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });

  useEffect(() => {
    fetchCfg({})
      .then((c) => setCfg(c || { channels: {} }))
      .catch(() => setCfg({ channels: {} }));
  }, [fetchCfg]);

  if (!cfg) return <div className="text-gray-400 text-sm">Loading…</div>;

  const ch = (cfg.channels[active] ?? {}) as ChannelConfig;
  const updateChannel = (patch: Partial<ChannelConfig>) =>
    setCfg({ ...cfg, channels: { ...cfg.channels, [active]: { ...ch, ...patch } } });

  const handleSave = async () => {
    setSaving(true);
    setMsg(null);
    try {
      await saveCfg({ data: cfg });
      setMsg({ kind: "ok", text: "Saved." });
    } catch (e: any) {
      setMsg({ kind: "err", text: e?.message || "Save failed" });
    }
    setSaving(false);
    setTimeout(() => setMsg(null), 3000);
  };

  const handleTest = async () => {
    if (!testTo) return setMsg({ kind: "err", text: "Enter a recipient" });
    setMsg(null);
    try {
      await saveCfg({ data: cfg }); // save first so test reads latest
      const r = await sendTest({ data: { channel: active, to: testTo, template: "test" } });
      setMsg({ kind: "ok", text: `Sent. Preview: ${r.messagePreview.slice(0, 100)}` });
    } catch (e: any) {
      setMsg({ kind: "err", text: e?.message || "Test failed" });
    }
  };

  const applyPreset = (preset: Partial<ChannelConfig>) => {
    updateChannel({ ...preset, enabled: ch.enabled ?? true });
  };

  return (
    <div className="space-y-5">
      <TabHelp topic="messaging" />
      <AppSecretsPanel />


      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800 flex items-start gap-2">
        <Info size={16} className="mt-0.5 shrink-0" />
        <div>
          <b>Provider-agnostic gateway.</b> Configure HTTP endpoint + headers + body
          template for each channel. Variables you can use in headers/URL/body:{" "}
          <code>{`{{to}} {{message}} {{subject}} {{from}} {{siteName}} {{orderNumber}} {{customerName}} {{total}}`}</code>{" "}
          and any payload field. Use <code>${"${ENV_VAR_NAME}"}</code> to inject
          secret API keys (set via Secrets).
        </div>
      </div>

      <div className="flex gap-1 border-b">
        {CHANNELS.map((c) => (
          <button
            key={c.id}
            onClick={() => setActive(c.id)}
            className={`px-4 py-2 font-bold text-sm border-b-2 flex items-center gap-2 ${
              active === c.id ? "border-orange-500 text-orange-600" : "border-transparent text-gray-500"
            }`}
          >
            {c.icon} {c.label}
            {cfg.channels[c.id]?.enabled && <span className="w-1.5 h-1.5 rounded-full bg-green-500" />}
          </button>
        ))}
      </div>

      <div className="bg-white border rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-black text-lg flex items-center gap-2">
              {CHANNELS.find((c) => c.id === active)?.icon} {CHANNELS.find((c) => c.id === active)?.label} provider
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">{CHANNELS.find((c) => c.id === active)?.hint}</p>
          </div>
          <label className="flex items-center gap-2 text-sm font-bold cursor-pointer">
            <input
              type="checkbox"
              checked={!!ch.enabled}
              onChange={(e) => updateChannel({ enabled: e.target.checked })}
              className="w-4 h-4 accent-orange-500"
            />
            Enabled
          </label>
        </div>

        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Quick presets</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {PRESETS[active].map((p) => (
              <button
                key={p.label}
                onClick={() => applyPreset(p.cfg)}
                className="text-xs px-3 py-1.5 border rounded-full hover:bg-gray-50 font-semibold"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <Field label="Provider label (for your reference)">
          <input
            value={ch.label ?? ""}
            onChange={(e) => updateChannel({ label: e.target.value })}
            placeholder="e.g. MSG91 / Resend / Twilio"
            className="w-full px-3 py-2 border rounded-lg"
          />
        </Field>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-3">
            <Field label="Endpoint URL">
              <input
                value={ch.endpoint ?? ""}
                onChange={(e) => updateChannel({ endpoint: e.target.value })}
                placeholder="https://api.example.com/send"
                className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
              />
            </Field>
          </div>
          <Field label="Method">
            <select
              value={ch.method ?? "POST"}
              onChange={(e) => updateChannel({ method: e.target.value as any })}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option>POST</option>
              <option>GET</option>
              <option>PUT</option>
            </select>
          </Field>
        </div>

        <Field label="Content-Type">
          <select
            value={ch.contentType ?? "application/json"}
            onChange={(e) => updateChannel({ contentType: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg"
          >
            <option value="application/json">application/json</option>
            <option value="application/x-www-form-urlencoded">application/x-www-form-urlencoded</option>
            <option value="text/plain">text/plain</option>
          </select>
        </Field>

        <Field label="Headers (JSON object — values can use ${ENV_VAR})">
          <textarea
            value={JSON.stringify(ch.headers ?? {}, null, 2)}
            onChange={(e) => {
              try {
                updateChannel({ headers: JSON.parse(e.target.value || "{}") });
                setMsg(null);
              } catch {
                /* keep invalid input visible without crashing */
              }
            }}
            rows={5}
            className="w-full px-3 py-2 border rounded-lg font-mono text-xs"
            placeholder='{ "Authorization": "Bearer ${RESEND_API_KEY}" }'
          />
        </Field>

        <Field label={`Body template (supports {{to}} {{message}} {{subject}} {{from}} and payload vars)`}>
          <textarea
            value={ch.bodyTemplate ?? ""}
            onChange={(e) => updateChannel({ bodyTemplate: e.target.value })}
            rows={6}
            className="w-full px-3 py-2 border rounded-lg font-mono text-xs"
            placeholder='{"to":"{{to}}","message":"{{message}}"}'
          />
        </Field>

        {active === "email" && (
          <div className="space-y-3">
            <Field label="Default Subject">
              <input
                value={ch.defaultSubject ?? ""}
                onChange={(e) => updateChannel({ defaultSubject: e.target.value })}
                placeholder="{{siteName}} — {{orderNumber}}"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </Field>

            <div className="border-2 border-dashed border-orange-200 rounded-xl p-4 bg-orange-50/40 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-black text-sm flex items-center gap-2"><Mail size={14} /> Mailboxes (add as many as you want)</h4>
                  <p className="text-[11px] text-gray-600 mt-0.5">Each mailbox = one "From" address. Use different ones for support, no-reply, orders, info, etc. Then choose which mailbox sends which event below.</p>
                </div>
                <button
                  onClick={() => {
                    const boxes = ch.mailboxes ?? [];
                    const k = `box${boxes.length + 1}`;
                    updateChannel({ mailboxes: [...boxes, { key: k, from: "", name: "" }] });
                  }}
                  className="px-3 py-1.5 rounded-lg bg-orange-500 text-white text-xs font-bold"
                >
                  + Add mailbox
                </button>
              </div>

              {(ch.mailboxes ?? []).length === 0 && (
                <div className="text-xs text-gray-500 italic py-2">No mailboxes yet. Click "Add mailbox" to create one (e.g. support@yourdomain.com).</div>
              )}

              <BulkActionBar
                count={selMb.size}
                ids={Array.from(selMb)}
                onClear={() => setSelMb(new Set())}
                actions={[
                  { key: 'delete', label: 'Delete selected', color: 'bg-red-600 hover:bg-red-700', confirm: 'Delete {n} mailboxes?', run: (keys) => {
                    const next = (ch.mailboxes ?? []).filter((m) => !keys.includes(m.key));
                    const patch: Partial<ChannelConfig> = { mailboxes: next };
                    if (ch.defaultMailboxKey && keys.includes(ch.defaultMailboxKey)) patch.defaultMailboxKey = next[0]?.key ?? "";
                    updateChannel(patch);
                  } },
                ]}
              />

              {(ch.mailboxes ?? []).map((mb, idx) => (
                <div key={idx} className={`bg-white border rounded-lg p-3 grid grid-cols-1 md:grid-cols-12 gap-2 items-end ${selMb.has(mb.key) ? 'ring-1 ring-orange-300' : ''}`}>
                  <div className="md:col-span-12 -mb-1 flex items-center gap-2">
                    <SelectCheckbox checked={selMb.has(mb.key)} onChange={() => toggleMb(mb.key)} />
                    <span className="text-[10px] font-bold text-gray-400">Select for bulk action</span>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-bold uppercase text-gray-500">Key</label>
                    <input
                      value={mb.key}
                      onChange={(e) => {
                        const next = [...(ch.mailboxes ?? [])];
                        next[idx] = { ...mb, key: e.target.value.replace(/[^a-z0-9_-]/gi, "").toLowerCase() };
                        updateChannel({ mailboxes: next });
                      }}
                      placeholder="support"
                      className="w-full px-2 py-1.5 border rounded text-xs font-mono"
                    />
                  </div>
                  <div className="md:col-span-4">
                    <label className="text-[10px] font-bold uppercase text-gray-500">From (email)</label>
                    <input
                      value={mb.from}
                      onChange={(e) => {
                        const next = [...(ch.mailboxes ?? [])];
                        next[idx] = { ...mb, from: e.target.value };
                        updateChannel({ mailboxes: next });
                      }}
                      placeholder="support@yourdomain.com"
                      className="w-full px-2 py-1.5 border rounded text-xs"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="text-[10px] font-bold uppercase text-gray-500">Display name</label>
                    <input
                      value={mb.name ?? ""}
                      onChange={(e) => {
                        const next = [...(ch.mailboxes ?? [])];
                        next[idx] = { ...mb, name: e.target.value };
                        updateChannel({ mailboxes: next });
                      }}
                      placeholder="Support Team"
                      className="w-full px-2 py-1.5 border rounded text-xs"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-bold uppercase text-gray-500">Reply-to</label>
                    <input
                      value={mb.replyTo ?? ""}
                      onChange={(e) => {
                        const next = [...(ch.mailboxes ?? [])];
                        next[idx] = { ...mb, replyTo: e.target.value };
                        updateChannel({ mailboxes: next });
                      }}
                      placeholder="(optional)"
                      className="w-full px-2 py-1.5 border rounded text-xs"
                    />
                  </div>
                  <button
                    onClick={() => {
                      const next = (ch.mailboxes ?? []).filter((_, i) => i !== idx);
                      const patch: Partial<ChannelConfig> = { mailboxes: next };
                      if (ch.defaultMailboxKey === mb.key) patch.defaultMailboxKey = next[0]?.key ?? "";
                      updateChannel(patch);
                    }}
                    className="md:col-span-1 px-2 py-1.5 rounded bg-red-500 text-white text-xs font-bold"
                  >
                    ✕
                  </button>
                </div>
              ))}

              {(ch.mailboxes ?? []).length > 0 && (
                <Field label="Default mailbox (used when an event has no specific mapping)">
                  <select
                    value={ch.defaultMailboxKey ?? ""}
                    onChange={(e) => updateChannel({ defaultMailboxKey: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  >
                    <option value="">— pick one —</option>
                    {(ch.mailboxes ?? []).map((mb) => (
                      <option key={mb.key} value={mb.key}>{mb.key} — {mb.from}</option>
                    ))}
                  </select>
                </Field>
              )}
            </div>

            {(ch.mailboxes ?? []).length > 0 && (
              <div className="border rounded-xl p-4 bg-blue-50/40 space-y-2">
                <h4 className="font-black text-sm">Route each event to a mailbox</h4>
                <p className="text-[11px] text-gray-600">Which "From" address sends each notification.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {TEMPLATE_KEYS.map((k) => (
                    <div key={k} className="flex items-center gap-2">
                      <span className="text-xs font-mono w-40 truncate" title={k}>{k}</span>
                      <select
                        value={ch.templateMailbox?.[k] ?? ""}
                        onChange={(e) =>
                          updateChannel({ templateMailbox: { ...(ch.templateMailbox ?? {}), [k]: e.target.value } })
                        }
                        className="flex-1 px-2 py-1.5 border rounded text-xs"
                      >
                        <option value="">(use default)</option>
                        {(ch.mailboxes ?? []).map((mb) => (
                          <option key={mb.key} value={mb.key}>{mb.key} — {mb.from}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <details className="border rounded-lg">
          <summary className="px-3 py-2 text-sm font-bold cursor-pointer">Message templates per event (optional)</summary>
          <div className="p-3 space-y-2">
            {TEMPLATE_KEYS.map((k) => (
              <Field key={k} label={k}>
                <textarea
                  value={ch.templates?.[k] ?? ""}
                  onChange={(e) =>
                    updateChannel({ templates: { ...(ch.templates ?? {}), [k]: e.target.value } })
                  }
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="Defaults will be used if blank"
                />
              </Field>
            ))}
          </div>
        </details>

        <div className="flex items-end gap-2 pt-2 border-t">
          <Field label={`Test recipient (${active})`}>
            <input
              value={testTo}
              onChange={(e) => setTestTo(e.target.value)}
              placeholder={active === "email" ? "you@example.com" : "+919876543210"}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </Field>
          <button
            onClick={handleTest}
            className="px-4 py-2 rounded-lg bg-gray-900 text-white font-bold text-sm flex items-center gap-2 whitespace-nowrap"
          >
            <Send size={14} /> Send test
          </button>
        </div>
      </div>

      <div className="bg-white border rounded-2xl p-5 space-y-3">
        <h3 className="font-black text-lg flex items-center gap-2"><Shield size={16} /> Cron / dispatcher</h3>
        <p className="text-xs text-gray-500">
          POST <code className="bg-gray-100 px-1 py-0.5 rounded">/api/public/dispatch-messages</code> every minute with{" "}
          <code>Authorization: Bearer &lt;secret&gt;</code> to drain the queue.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <Field label="Cron secret (or set MESSAGING_CRON_SECRET env)">
              <div className="relative">
                <input
                  type={showSecret ? "text" : "password"}
                  value={cfg.cronSecret ?? ""}
                  onChange={(e) => setCfg({ ...cfg, cronSecret: e.target.value })}
                  placeholder="Generate any random string"
                  className="w-full px-3 py-2 pr-10 border rounded-lg font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
                >
                  {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>
          </div>
          <Field label="Batch size">
            <input
              type="number"
              value={cfg.batchSize ?? 25}
              onChange={(e) => setCfg({ ...cfg, batchSize: Number(e.target.value) || 25 })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </Field>
        </div>
      </div>

      <div className="sticky bottom-4 flex items-center justify-between bg-white border rounded-2xl p-3 shadow-lg">
        <div className="text-sm">
          {msg ? (
            <span className={msg.kind === "ok" ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
              {msg.text}
            </span>
          ) : (
            <span className="text-gray-500">Changes are local until you save.</span>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm flex items-center gap-2 disabled:opacity-50"
        >
          <Save size={14} /> {saving ? "Saving…" : "Save configuration"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
