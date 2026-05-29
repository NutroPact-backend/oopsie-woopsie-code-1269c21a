// @ts-nocheck
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Key, Plus, Trash2, Eye, EyeOff, Save, Check } from "lucide-react";
import { getAppSecrets, saveAppSecret, deleteAppSecret } from "@/lib/messaging.functions";
import { TabHelp } from "./_TabHelp";

/**
 * Backend-managed API keys (app_secrets table).
 * Admin can add provider tokens (TWILIO_ACCOUNT_SID, RESEND_API_KEY, etc.)
 * directly from the UI. The dispatcher resolves ${VAR_NAME} from this table
 * first, then falls back to process.env.
 */

const COMMON_KEYS = [
  { key: "GOOGLE_TRANSLATE_API_KEY", hint: "Google Cloud Console → Cloud Translation API → Credentials → API key (best accuracy for Indian languages)" },
  { key: "SMTP_USER", hint: "SMTP username (Gmail/Zoho/cPanel mail address)" },
  { key: "SMTP_PASS", hint: "SMTP password / Gmail App Password (16 chars)" },
  { key: "TWILIO_ACCOUNT_SID", hint: "Twilio Console → Account → API credentials" },
  { key: "TWILIO_BASIC_AUTH", hint: "base64(AccountSID:AuthToken) — Twilio HTTP basic auth" },
  { key: "META_WHATSAPP_TOKEN", hint: "Meta WhatsApp Cloud — permanent access token" },
  { key: "META_PHONE_NUMBER_ID", hint: "Meta WhatsApp Cloud — phone number ID" },
  { key: "FAST2SMS_API_KEY", hint: "Fast2SMS dashboard → API key" },
  { key: "MSG91_AUTH_KEY", hint: "MSG91 dashboard → API → Auth key" },
  { key: "RESEND_API_KEY", hint: "resend.com → API keys" },
  { key: "BREVO_API_KEY", hint: "brevo.com → SMTP & API → API keys" },
  { key: "SENDGRID_API_KEY", hint: "sendgrid.com → Settings → API keys" },
  { key: "POSTMARK_SERVER_TOKEN", hint: "postmarkapp.com → Server → API tokens" },
  { key: "MAIL_RELAY_TOKEN", hint: "Self-hosted SMTP relay shared secret" },
  { key: "ULTRAMSG_TOKEN", hint: "UltraMsg instance token" },
  { key: "ULTRAMSG_INSTANCE", hint: "UltraMsg instance ID" },
  { key: "PLIVO_AUTH_ID", hint: "Plivo console → Auth ID" },
  { key: "PLIVO_BASIC_AUTH", hint: "base64(AuthID:AuthToken)" },
];

type Secret = { key: string; value: string; updated_at: string };

export default function AppSecretsPanel() {
  const fetchAll = useServerFn(getAppSecrets);
  const save = useServerFn(saveAppSecret);
  const del = useServerFn(deleteAppSecret);

  const [items, setItems] = useState<Secret[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<{ key: string; value: string }>({ key: "", value: "" });
  const [show, setShow] = useState<Record<string, boolean>>({});
  const [savingKey, setSavingKey] = useState<string>("");
  const [savedKey, setSavedKey] = useState<string>("");
  const [edits, setEdits] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    try {
      const r = (await fetchAll({})) as Secret[];
      setItems(r);
    } catch { setItems([]); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleSave = async (key: string, value: string) => {
    setSavingKey(key);
    try {
      await save({ data: { key, value } });
      setSavedKey(key);
      setTimeout(() => setSavedKey(""), 1500);
      setEdits((e) => { const n = { ...e }; delete n[key]; return n; });
      await load();
    } catch (e: any) {
      alert(e?.message || "Save failed");
    }
    setSavingKey("");
  };

  const handleAdd = async () => {
    if (!draft.key.trim() || !draft.value.trim()) return;
    await handleSave(draft.key.trim().toUpperCase(), draft.value);
    setDraft({ key: "", value: "" });
  };

  const handleDelete = async (key: string) => {
    if (!confirm(`Delete secret ${key}?`)) return;
    await del({ data: { key } });
    await load();
  };

  const existingKeys = new Set(items.map((i) => i.key));
  const missing = COMMON_KEYS.filter((c) => !existingKeys.has(c.key));

  return (
    <div className="bg-white border-2 border-orange-300 rounded-2xl p-5 space-y-4">
      <TabHelp topic="secrets" />
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-black text-lg flex items-center gap-2">
            <Key size={18} className="text-orange-500" /> API Keys / Secrets
          </h3>
          <p className="text-xs text-gray-500 mt-1 max-w-2xl">
            Yahan provider ke tokens add kar (Twilio, Resend, MSG91 etc.). Endpoint/Headers/Body me 
            <code className="bg-gray-100 px-1 mx-1 rounded">${"{KEY_NAME}"}</code> likhne par yeh values 
            wahan inject ho jayengi. Backend me securely store hote hain — kabhi bhi yahan se change/delete kar sakte ho.
          </p>
        </div>
      </div>

      {/* Existing keys */}
      {loading ? (
        <div className="text-sm text-gray-400">Loading…</div>
      ) : items.length === 0 ? (
        <div className="text-xs text-gray-500 italic bg-gray-50 border rounded-lg p-3">
          Koi key add nahi hui abhi. Niche se add kar.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((s) => {
            const editValue = edits[s.key] ?? s.value;
            const dirty = edits[s.key] !== undefined && edits[s.key] !== s.value;
            const showVal = show[s.key];
            return (
              <div key={s.key} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center border rounded-lg p-2">
                <div className="md:col-span-4">
                  <code className="text-xs font-bold bg-gray-100 px-2 py-1 rounded">{s.key}</code>
                </div>
                <div className="md:col-span-6 relative">
                  <input
                    type={showVal ? "text" : "password"}
                    value={editValue}
                    onChange={(e) => setEdits((p) => ({ ...p, [s.key]: e.target.value }))}
                    className="w-full px-3 py-2 pr-10 border rounded font-mono text-xs"
                    placeholder="(empty)"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((p) => ({ ...p, [s.key]: !p[s.key] }))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                  >
                    {showVal ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <div className="md:col-span-2 flex gap-1 justify-end">
                  <button
                    onClick={() => handleSave(s.key, editValue)}
                    disabled={!dirty || savingKey === s.key}
                    className={`px-2 py-1.5 rounded text-xs font-bold flex items-center gap-1 ${
                      dirty ? "bg-orange-500 hover:bg-orange-600 text-white" : "bg-gray-100 text-gray-400"
                    } disabled:opacity-50`}
                  >
                    {savedKey === s.key ? <Check size={12} /> : <Save size={12} />}
                    {savingKey === s.key ? "…" : savedKey === s.key ? "Saved" : "Save"}
                  </button>
                  <button
                    onClick={() => handleDelete(s.key)}
                    className="px-2 py-1.5 rounded text-xs font-bold bg-red-50 hover:bg-red-100 text-red-600"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add new */}
      <div className="border-t pt-3 space-y-2">
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Add new secret</label>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
          <input
            list="common-keys"
            value={draft.key}
            onChange={(e) => setDraft({ ...draft, key: e.target.value.toUpperCase() })}
            placeholder="TWILIO_ACCOUNT_SID"
            className="md:col-span-4 px-3 py-2 border rounded font-mono text-xs uppercase"
          />
          <datalist id="common-keys">
            {COMMON_KEYS.map((c) => <option key={c.key} value={c.key}>{c.hint}</option>)}
          </datalist>
          <input
            type="password"
            value={draft.value}
            onChange={(e) => setDraft({ ...draft, value: e.target.value })}
            placeholder="paste secret value"
            className="md:col-span-6 px-3 py-2 border rounded font-mono text-xs"
          />
          <button
            onClick={handleAdd}
            disabled={!draft.key || !draft.value}
            className="md:col-span-2 px-3 py-2 rounded bg-gray-900 hover:bg-gray-700 text-white text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-1"
          >
            <Plus size={14} /> Add
          </button>
        </div>

        {missing.length > 0 && (
          <div className="pt-2">
            <div className="text-[10px] font-bold uppercase text-gray-400 mb-1">Quick add:</div>
            <div className="flex flex-wrap gap-1">
              {missing.slice(0, 10).map((c) => (
                <button
                  key={c.key}
                  onClick={() => setDraft({ key: c.key, value: "" })}
                  title={c.hint}
                  className="text-[10px] px-2 py-1 border rounded-full hover:bg-orange-50 hover:border-orange-300 font-mono"
                >
                  + {c.key}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
