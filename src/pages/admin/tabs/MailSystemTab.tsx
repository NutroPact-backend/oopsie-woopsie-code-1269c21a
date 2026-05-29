// @ts-nocheck
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Mail, Server, Copy, Check, ExternalLink, Info, Send } from "lucide-react";
import { getMessagingConfig, sendTestMessage } from "@/lib/messaging.functions";
import { TabHelp } from "./_TabHelp";

/**
 * Mail System — dedicated email management view.
 * Focuses on the self-hosted SMTP relay + Lovable Cloud built-in email path,
 * and shows the current "Email" channel state from the messaging gateway.
 *
 * For provider endpoint / mailbox / template editing, use the
 * Messaging Gateway tab (Email channel).
 */
export default function MailSystemTab() {
  const fetchCfg = useServerFn(getMessagingConfig);
  const sendTest = useServerFn(sendTestMessage);

  const [emailCfg, setEmailCfg] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string>("");
  const [testTo, setTestTo] = useState("");
  const [testMsg, setTestMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchCfg({})
      .then((c) => setEmailCfg(c?.channels?.email ?? {}))
      .catch(() => setEmailCfg({}))
      .finally(() => setLoading(false));
  }, [fetchCfg]);

  const copy = (label: string, txt: string) => {
    navigator.clipboard.writeText(txt);
    setCopied(label);
    setTimeout(() => setCopied(""), 1500);
  };

  const runTest = async () => {
    if (!testTo) return setTestMsg({ ok: false, text: "Enter a recipient email" });
    setSending(true);
    setTestMsg(null);
    try {
      const r = await sendTest({ data: { channel: "email", to: testTo, template: "test" } });
      setTestMsg({ ok: true, text: `Sent. Preview: ${r.messagePreview.slice(0, 120)}` });
    } catch (e: any) {
      setTestMsg({ ok: false, text: e?.message || "Test failed" });
    }
    setSending(false);
  };

  if (loading) return <div className="text-sm text-gray-400">Loading…</div>;

  const enabled = !!emailCfg?.enabled;
  const endpoint = emailCfg?.endpoint || "";
  const mailboxes = (emailCfg?.mailboxes ?? []) as { key: string; from: string; name?: string }[];

  return (
    <div className="space-y-5">
      <TabHelp topic="mail" />
      <div>
        <h2 className="text-2xl font-black flex items-center gap-2">
          <Mail size={22} /> Mail System
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Email channel ka status, mailboxes, aur self-hosted SMTP relay setup guide. 
          Detailed provider/template config karne ke liye <b>Messaging Gateway → Email</b> tab use kar.
        </p>
      </div>

      {/* Status card */}
      <div className="bg-white border rounded-2xl p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="text-xs font-bold uppercase text-gray-500 tracking-wider">Current status</div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`w-2.5 h-2.5 rounded-full ${enabled ? "bg-green-500" : "bg-gray-300"}`} />
              <span className="font-black text-lg">
                {enabled ? "Email sending enabled" : "Email channel disabled"}
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {endpoint ? <>Endpoint: <code className="bg-gray-100 px-1.5 py-0.5 rounded">{endpoint}</code></> : "No endpoint configured."}
            </div>
          </div>
          <a
            href="#/admin"
            onClick={(e) => { e.preventDefault(); (window as any).__adminGoTo?.("messaging"); }}
            className="px-3 py-2 rounded-lg bg-orange-500 text-white text-sm font-bold hover:bg-orange-600"
          >
            Open Messaging Gateway →
          </a>
        </div>

        {mailboxes.length > 0 && (
          <div className="mt-4">
            <div className="text-xs font-bold uppercase text-gray-500 tracking-wider mb-2">Mailboxes</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {mailboxes.map((mb) => (
                <div key={mb.key} className="border rounded-lg px-3 py-2 text-sm flex items-center justify-between">
                  <div>
                    <div className="font-bold">{mb.name || mb.key}</div>
                    <div className="text-xs text-gray-500 font-mono">{mb.from}</div>
                  </div>
                  <span className="text-[10px] font-bold uppercase bg-gray-100 px-2 py-0.5 rounded-full">{mb.key}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quick test */}
      <div className="bg-white border rounded-2xl p-5 space-y-3">
        <h3 className="font-black text-lg flex items-center gap-2"><Send size={16} /> Send a test email</h3>
        <div className="flex gap-2 flex-wrap">
          <input
            value={testTo}
            onChange={(e) => setTestTo(e.target.value)}
            placeholder="you@example.com"
            className="flex-1 min-w-[220px] px-3 py-2 border rounded-lg"
          />
          <button
            onClick={runTest}
            disabled={sending || !enabled}
            className="px-4 py-2 rounded-lg bg-gray-900 text-white font-bold text-sm disabled:opacity-50"
          >
            {sending ? "Sending…" : "Send test"}
          </button>
        </div>
        {!enabled && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
            Email channel disabled hai — pehle Messaging Gateway me enable kar aur endpoint set kar.
          </p>
        )}
        {testMsg && (
          <p className={`text-xs ${testMsg.ok ? "text-green-700" : "text-red-700"} font-bold`}>{testMsg.text}</p>
        )}
      </div>

      {/* Self-hosted relay setup */}
      <div className="bg-white border rounded-2xl p-5 space-y-4">
        <div>
          <h3 className="font-black text-lg flex items-center gap-2">
            <Server size={18} /> Option A — Self-hosted SMTP relay (apna mail server)
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            ₹400/month VPS pe khud ka mail server. Koi monthly per-email charge nahi. Unlimited mails.
            Setup ~30 min ka kaam hai.
          </p>
        </div>

        <ol className="space-y-3 text-sm">
          <Step n={1} title="VPS lo (Hetzner / Contabo / DigitalOcean — koi bhi)">
            Ubuntu 22.04, 1GB RAM kaafi hai. Static IPv4 must hai.
          </Step>
          <Step n={2} title="Domain pe DNS records add kar">
            <CodeRow label="MX" value="mail.yourdomain.com (priority 10)" onCopy={copy} copied={copied} />
            <CodeRow label="A" value="mail.yourdomain.com → <YOUR_VPS_IP>" onCopy={copy} copied={copied} />
            <CodeRow label="SPF (TXT)" value='"v=spf1 mx ~all"' onCopy={copy} copied={copied} />
            <CodeRow label="DMARC (TXT @ _dmarc)" value='"v=DMARC1; p=quarantine; rua=mailto:postmaster@yourdomain.com"' onCopy={copy} copied={copied} />
            <p className="text-[11px] text-gray-500 mt-1">DKIM record VPS setup ke baad milega.</p>
          </Step>
          <Step n={3} title="VPS pe relay app install kar">
            <p className="text-xs text-gray-600 mb-2">Yahan se relay package download karke VPS pe upload kar:</p>
            <a
              href="/api/public/mail-relay-download"
              className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 hover:underline"
            >
              <ExternalLink size={12} /> mail-relay-package.zip (Node.js + nodemailer)
            </a>
            <pre className="bg-gray-900 text-gray-100 text-xs p-3 rounded mt-2 overflow-x-auto">{`# VPS pe SSH karke
unzip mail-relay-package.zip
cd self-hosted-mail-relay
npm install
echo "RELAY_TOKEN=$(openssl rand -hex 32)" > .env
node server.js  # ya pm2 start server.js`}</pre>
          </Step>
          <Step n={4} title="Messaging Gateway me preset apply kar">
            <p className="text-xs text-gray-600">
              <b>Messaging Gateway → Email → "🏠 Self-hosted SMTP relay" preset</b> click kar, 
              endpoint ko apne VPS ka URL bana (<code>https://mail.yourdomain.com/send</code>), 
              fir <b>API Keys</b> section me <code>MAIL_RELAY_TOKEN</code> add kar (jo step 3 me banaya).
            </p>
          </Step>
          <Step n={5} title="Test bhej">
            Upar "Send a test email" se test kar. Inbox check kar.
          </Step>
        </ol>
      </div>

      {/* Option B — Hosted providers */}
      <div className="bg-white border rounded-2xl p-5">
        <h3 className="font-black text-lg flex items-center gap-2">
          <Mail size={18} /> Option B — Hosted (Resend / Brevo / SendGrid)
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          Setup 2 min me. Free tier: Resend 100/day, Brevo 300/day, SendGrid 100/day.
        </p>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
          {[
            { name: "Resend", url: "https://resend.com", env: "RESEND_API_KEY", free: "100 mails/day free" },
            { name: "Brevo", url: "https://brevo.com", env: "BREVO_API_KEY", free: "300 mails/day free" },
            { name: "SendGrid", url: "https://sendgrid.com", env: "SENDGRID_API_KEY", free: "100 mails/day free" },
          ].map((p) => (
            <a key={p.name} href={p.url} target="_blank" rel="noreferrer"
              className="border rounded-lg p-3 hover:border-orange-400 hover:bg-orange-50/40 transition">
              <div className="font-black flex items-center gap-1">{p.name} <ExternalLink size={12} className="text-gray-400" /></div>
              <div className="text-[11px] text-gray-500 mt-0.5">{p.free}</div>
              <div className="text-[11px] text-gray-500 font-mono mt-1">Add: <b>{p.env}</b></div>
            </a>
          ))}
        </div>
        <p className="text-xs text-gray-600 mt-3 flex items-start gap-1.5">
          <Info size={12} className="mt-0.5 text-blue-500 shrink-0" />
          Provider chuna → Messaging Gateway me preset apply kar → API Keys me apni key paste kar.
          Bas. Dispatcher khud bhejega.
        </p>
      </div>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="shrink-0 w-7 h-7 rounded-full bg-orange-500 text-white font-black text-xs flex items-center justify-center">{n}</span>
      <div className="flex-1 min-w-0">
        <div className="font-bold">{title}</div>
        <div className="text-xs text-gray-600 mt-1 space-y-1">{children}</div>
      </div>
    </li>
  );
}

function CodeRow({ label, value, onCopy, copied }: { label: string; value: string; onCopy: (l: string, v: string) => void; copied: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-bold uppercase text-gray-500 w-24 shrink-0">{label}</span>
      <code className="flex-1 bg-gray-50 border rounded px-2 py-1 text-xs font-mono truncate">{value}</code>
      <button onClick={() => onCopy(label, value)} className="p-1.5 text-gray-400 hover:text-orange-500">
        {copied === label ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
      </button>
    </div>
  );
}
