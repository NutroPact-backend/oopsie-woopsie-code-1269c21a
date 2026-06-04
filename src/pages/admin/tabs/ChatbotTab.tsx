// @ts-nocheck
/**
 * Admin Chatbot console: Inbox (handoff), Knowledge Base, Settings.
 */
import { useEffect, useState, useCallback, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  MessageSquare, Send, CheckCircle2, RefreshCw, User, Bot, Headphones, Filter,
  BookOpen, Settings as SettingsIcon, Plus, Trash2, Save, Inbox, Search, Eye, EyeOff,
} from "lucide-react";
import {
  adminListConversations, adminGetConversation, adminReplyMessage, adminSetStatus,
  adminListKB, adminUpsertKB, adminDeleteKB, adminReembedKB,
  adminGetChatSettings, adminUpdateChatSettings,
} from "@/lib/chatbot.functions";
import { TabHelp } from "./_TabHelp";
import { supabase } from "@/integrations/supabase/client";

type Conv = {
  id: string; status: "open" | "handoff" | "closed";
  user_id: string | null; guest_token: string | null;
  last_message_at: string; created_at: string;
};
type Msg = { id: string; role: "user" | "assistant" | "admin" | "system"; content: string; created_at: string };

type SubTab = "inbox" | "kb" | "settings";

export default function ChatbotTab() {
  const [sub, setSub] = useState<SubTab>("inbox");

  return (
    <div className="space-y-4">
      <TabHelp topic="chatbot" />

      <div className="flex gap-1 border-b border-gray-200">
        {([
          ["inbox", "Inbox", <Inbox key="i" size={13} />],
          ["kb", "Knowledge Base", <BookOpen key="k" size={13} />],
          ["settings", "Settings", <SettingsIcon key="s" size={13} />],
        ] as const).map(([k, label, icon]) => (
          <button key={k} onClick={() => setSub(k as SubTab)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-wide border-b-2 -mb-px transition ${
              sub === k ? "border-orange-500 text-orange-600" : "border-transparent text-gray-500 hover:text-gray-800"
            }`}>
            {icon} {label}
          </button>
        ))}
      </div>

      {sub === "inbox" && <InboxView />}
      {sub === "kb" && <KBView />}
      {sub === "settings" && <SettingsView />}
    </div>
  );
}

/* ────────────────────────── INBOX ────────────────────────── */
function InboxView() {
  const [filter, setFilter] = useState<"all" | "open" | "handoff" | "closed">("handoff");
  const [list, setList] = useState<Conv[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [activeConv, setActiveConv] = useState<Conv | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  const listFn = useServerFn(adminListConversations);
  const getFn = useServerFn(adminGetConversation);
  const replyFn = useServerFn(adminReplyMessage);
  const statusFn = useServerFn(adminSetStatus);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r: any = await listFn({ data: { status: filter, limit: 100 } });
      setList(r.conversations || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [filter, listFn]);

  useEffect(() => { load(); }, [load]);

  const openConv = useCallback(async (id: string) => {
    setActive(id);
    const r: any = await getFn({ data: { conversationId: id } });
    setMsgs(r.messages || []);
    setActiveConv(r.conversation || null);
  }, [getFn]);

  useEffect(() => {
    if (!active) return;
    const ch = supabase.channel(`admin-chat-${active}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `conversation_id=eq.${active}` },
        (p: any) => setMsgs(prev => prev.some(x => x.id === p.new.id) ? prev : [...prev, p.new]))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [active]);

  async function sendReply() {
    if (!active || !reply.trim() || sending) return;
    setSending(true);
    try {
      await replyFn({ data: { conversationId: active, content: reply.trim() } });
      setReply("");
      load();
    } catch (e: any) { alert(e.message || "Failed"); }
    finally { setSending(false); }
  }

  async function changeStatus(s: "open" | "handoff" | "closed") {
    if (!active) return;
    await statusFn({ data: { conversationId: active, status: s } });
    setActiveConv(c => c ? { ...c, status: s } : c);
    load();
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="md:col-span-1 bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="p-3 border-b flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-600">
            <Filter size={13} /> Filter
          </div>
          <div className="flex gap-1">
            {(["handoff", "open", "closed", "all"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${filter === f ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between px-3 py-2 text-[11px] text-gray-500">
          <span>{loading ? "Loading…" : `${list.length} chat${list.length === 1 ? "" : "s"}`}</span>
          <button onClick={load} className="flex items-center gap-1 hover:text-gray-900"><RefreshCw size={11} /> Refresh</button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto divide-y">
          {list.map(c => (
            <button key={c.id} onClick={() => openConv(c.id)}
              className={`w-full text-left p-3 hover:bg-orange-50 transition ${active === c.id ? "bg-orange-50" : ""}`}>
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare size={12} className="text-orange-500" />
                <span className="text-[10px] font-mono text-gray-500 truncate">{c.id.slice(0, 8)}</span>
                <span className={`ml-auto text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                  c.status === "handoff" ? "bg-red-100 text-red-700" :
                  c.status === "open" ? "bg-emerald-100 text-emerald-700" :
                  "bg-gray-100 text-gray-600"}`}>{c.status}</span>
              </div>
              <p className="text-[11px] text-gray-600 truncate">
                {c.user_id ? `User: ${c.user_id.slice(0, 8)}` : c.guest_token ? `Guest` : "—"}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">{new Date(c.last_message_at).toLocaleString()}</p>
            </button>
          ))}
          {!loading && list.length === 0 && (
            <p className="p-6 text-center text-xs text-gray-400">No conversations.</p>
          )}
        </div>
      </div>

      <div className="md:col-span-2 bg-white rounded-2xl border border-gray-200 overflow-hidden flex flex-col min-h-[60vh]">
        {!active ? (
          <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
            Select a conversation
          </div>
        ) : (
          <>
            <header className="px-4 py-3 border-b flex items-center justify-between bg-gray-50">
              <div>
                <p className="text-[11px] text-gray-500">Conversation</p>
                <p className="text-xs font-mono">{active}</p>
              </div>
              <div className="flex items-center gap-2">
                <select value={activeConv?.status || "open"} onChange={e => changeStatus(e.target.value as any)}
                  className="text-xs border rounded px-2 py-1">
                  <option value="open">open</option>
                  <option value="handoff">handoff</option>
                  <option value="closed">closed</option>
                </select>
                {activeConv?.status !== "closed" && (
                  <button onClick={() => changeStatus("closed")}
                    className="flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded font-bold">
                    <CheckCircle2 size={12} /> Close
                  </button>
                )}
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
              {msgs.map(m => <AdminBubble key={m.id} m={m} />)}
              {msgs.length === 0 && <p className="text-center text-xs text-gray-400">No messages yet.</p>}
            </div>

            <form onSubmit={e => { e.preventDefault(); sendReply(); }}
              className="border-t p-3 flex gap-2 bg-white">
              <input value={reply} onChange={e => setReply(e.target.value)}
                placeholder="Type a reply as a human agent…" maxLength={4000}
                className="flex-1 border rounded-lg px-3 py-2 text-sm" />
              <button type="submit" disabled={!reply.trim() || sending}
                className="flex items-center gap-1 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-lg px-3 py-2 disabled:opacity-50">
                <Send size={13} /> Send
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function AdminBubble({ m }: { m: Msg }) {
  if (m.role === "system") {
    return <div className="text-center text-[11px] text-amber-700 bg-amber-50 rounded px-3 py-1 mx-auto max-w-md">{m.content}</div>;
  }
  const isCustomer = m.role === "user";
  const meta = isCustomer ? { icon: <User size={11} />, label: "Customer", color: "bg-blue-50 border-blue-200" }
    : m.role === "admin" ? { icon: <Headphones size={11} />, label: "You", color: "bg-emerald-50 border-emerald-200" }
    : { icon: <Bot size={11} />, label: "AI", color: "bg-gray-50 border-gray-200" };
  return (
    <div className={`flex ${isCustomer ? "" : "flex-row-reverse"} items-start gap-2`}>
      <div className={`max-w-[75%] border rounded-2xl px-3 py-2 ${meta.color}`}>
        <div className="flex items-center gap-1 text-[10px] font-bold text-gray-600 mb-1">
          {meta.icon} {meta.label} · {new Date(m.created_at).toLocaleTimeString()}
        </div>
        <p className="text-sm whitespace-pre-wrap text-gray-800">{m.content}</p>
      </div>
    </div>
  );
}

/* ────────────────────────── KNOWLEDGE BASE ────────────────────────── */
type KB = {
  id: string; title: string; body: string; tags: string[];
  category: string; priority: number; active: boolean;
};
const EMPTY_KB: Omit<KB, "id"> = { title: "", body: "", tags: [], category: "general", priority: 0, active: true };

function KBView() {
  const listFn = useServerFn(adminListKB);
  const upsertFn = useServerFn(adminUpsertKB);
  const delFn = useServerFn(adminDeleteKB);
  const reembedFn = useServerFn(adminReembedKB);
  async function reembedAll() {
    if (!confirm("Re-embed all active KB articles? (uses Gemini API)")) return;
    try { const r: any = await (reembedFn as any)(); alert(`Embedded ${r.embedded}/${r.total} (failed: ${r.failed})`); load(); }
    catch (e: any) { alert(e?.message || "Failed"); }
  }
  const [items, setItems] = useState<KB[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Partial<KB> | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);

  // ── Filters ────────────────────────────────────────────────────────
  const [query, setQuery] = useState("");
  const [catFilter, setCatFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const load = useCallback(async () => {
    setLoading(true);
    try { const r: any = await (listFn as any)(); setItems(r.items || []); }
    finally { setLoading(false); }
  }, [listFn]);
  useEffect(() => { load(); }, [load]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach(i => i.category && set.add(i.category));
    return Array.from(set).sort();
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(it => {
      if (catFilter !== "all" && it.category !== catFilter) return false;
      if (statusFilter === "active" && !it.active) return false;
      if (statusFilter === "inactive" && it.active) return false;
      if (!q) return true;
      const hay = `${it.title} ${it.body} ${(it.tags || []).join(" ")} ${it.category}`.toLowerCase();
      return hay.includes(q);
    });
  }, [items, query, catFilter, statusFilter]);

  async function save() {
    if (!editing?.title || !editing?.body) { alert("Title and body are required"); return; }
    setSaving(true);
    try {
      await upsertFn({ data: {
        id: editing.id, title: editing.title, body: editing.body,
        tags: editing.tags || [], category: editing.category || "general",
        priority: editing.priority || 0, active: editing.active !== false,
      } });
      setEditing(null); setTagInput(""); load();
    } catch (e: any) { alert(e.message || "Save failed"); }
    finally { setSaving(false); }
  }

  async function remove(id: string) {
    if (!confirm("Delete this article?")) return;
    await delFn({ data: { id } });
    if (editing?.id === id) setEditing(null);
    load();
  }

  async function toggleActive(e: React.MouseEvent, it: KB) {
    e.stopPropagation();
    // optimistic update
    setItems(prev => prev.map(x => x.id === it.id ? { ...x, active: !x.active } : x));
    try {
      await upsertFn({ data: {
        id: it.id, title: it.title, body: it.body,
        tags: it.tags || [], category: it.category || "general",
        priority: it.priority || 0, active: !it.active,
      } });
    } catch (err: any) {
      setItems(prev => prev.map(x => x.id === it.id ? { ...x, active: it.active } : x));
      alert(err?.message || "Toggle failed");
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
      {/* List */}
      <div className="md:col-span-2 bg-white rounded-2xl border border-gray-200">
        <div className="p-3 border-b flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-800">
            Articles ({filtered.length}{filtered.length !== items.length ? `/${items.length}` : ""})
          </h3>
          <div className="flex items-center gap-2">
            <button onClick={reembedAll}
              className="text-[11px] border border-gray-300 hover:bg-gray-50 text-gray-700 rounded px-2 py-1">
              Re-embed all
            </button>
            <button onClick={() => { setEditing({ ...EMPTY_KB }); setTagInput(""); }}
              className="flex items-center gap-1 text-xs bg-orange-500 hover:bg-orange-600 text-white font-bold rounded px-2 py-1">
              <Plus size={12} /> New
            </button>
          </div>
        </div>

        {/* Filters bar */}
        <div className="p-2.5 border-b bg-gray-50 space-y-2">
          <div className="relative">
            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Search title, body, tags…"
              className="w-full border rounded pl-7 pr-2 py-1.5 text-xs" />
          </div>
          <div className="flex gap-2">
            <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
              className="flex-1 border rounded px-2 py-1 text-[11px] bg-white">
              <option value="all">All categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <div className="flex rounded border overflow-hidden">
              {(["all", "active", "inactive"] as const).map(s => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={`px-2 py-1 text-[10px] font-bold uppercase ${
                    statusFilter === s ? "bg-orange-500 text-white" : "bg-white text-gray-600 hover:bg-gray-100"
                  }`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="max-h-[58vh] overflow-y-auto divide-y">
          {loading && <p className="p-4 text-xs text-gray-400">Loading…</p>}
          {!loading && filtered.length === 0 && (
            <p className="p-4 text-xs text-gray-400">
              {items.length === 0 ? "No articles. Add your first FAQ." : "No articles match filters."}
            </p>
          )}
          {filtered.map(it => (
            <div key={it.id}
              className={`group w-full flex items-start gap-2 p-3 hover:bg-orange-50 transition cursor-pointer ${editing?.id === it.id ? "bg-orange-50" : ""} ${!it.active ? "opacity-60" : ""}`}
              onClick={() => { setEditing(it); setTagInput(""); }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${it.active ? "bg-emerald-500" : "bg-gray-300"}`} />
                  <span className="text-xs font-bold text-gray-800 truncate flex-1">{it.title}</span>
                  <span className="text-[9px] text-gray-500">P{it.priority}</span>
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-[9px] uppercase font-bold text-blue-700 bg-blue-50 rounded px-1.5">{it.category}</span>
                  {it.tags.slice(0, 3).map(t => (
                    <span key={t} className="text-[9px] text-gray-600 bg-gray-100 rounded px-1.5">{t}</span>
                  ))}
                </div>
              </div>
              <button onClick={(e) => toggleActive(e, it)}
                title={it.active ? "Click to deactivate (hide from AI)" : "Click to activate"}
                className={`shrink-0 p-1 rounded transition ${
                  it.active ? "text-emerald-600 hover:bg-emerald-100" : "text-gray-400 hover:bg-gray-200"
                }`}>
                {it.active ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>
            </div>
          ))}
        </div>
      </div>


      {/* Editor */}
      <div className="md:col-span-3 bg-white rounded-2xl border border-gray-200 p-4">
        {!editing ? (
          <div className="h-full flex items-center justify-center text-sm text-gray-400 py-20">
            Select an article or click <span className="font-bold mx-1">New</span> to add one.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-800">{editing.id ? "Edit article" : "New article"}</h3>
              <div className="flex gap-2">
                {editing.id && (
                  <button onClick={() => remove(editing.id!)}
                    className="flex items-center gap-1 text-xs text-red-600 hover:bg-red-50 rounded px-2 py-1">
                    <Trash2 size={12} /> Delete
                  </button>
                )}
                <button onClick={save} disabled={saving}
                  className="flex items-center gap-1 text-xs bg-orange-500 hover:bg-orange-600 text-white font-bold rounded px-3 py-1 disabled:opacity-50">
                  <Save size={12} /> {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
            <Field label="Title">
              <input className="w-full border rounded px-2 py-1.5 text-sm" maxLength={200}
                value={editing.title || ""} onChange={e => setEditing({ ...editing, title: e.target.value })}
                placeholder="e.g. Return policy" />
            </Field>
            <Field label="Body (what the AI will answer with)">
              <textarea className="w-full border rounded px-2 py-1.5 text-sm h-40" maxLength={8000}
                value={editing.body || ""} onChange={e => setEditing({ ...editing, body: e.target.value })}
                placeholder="Plain text. Include exact policies, timelines, amounts, links." />
              <p className="text-[10px] text-gray-400 mt-1">{(editing.body || "").length}/8000</p>
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Category">
                <input className="w-full border rounded px-2 py-1.5 text-sm" maxLength={40}
                  value={editing.category || "general"} onChange={e => setEditing({ ...editing, category: e.target.value })} />
              </Field>
              <Field label="Priority (0–1000)">
                <input type="number" min={0} max={1000} className="w-full border rounded px-2 py-1.5 text-sm"
                  value={editing.priority ?? 0} onChange={e => setEditing({ ...editing, priority: Number(e.target.value) })} />
              </Field>
              <Field label="Active">
                <label className="flex items-center gap-2 text-sm pt-1.5">
                  <input type="checkbox" checked={editing.active !== false}
                    onChange={e => setEditing({ ...editing, active: e.target.checked })} />
                  Visible to AI
                </label>
              </Field>
            </div>
            <Field label="Tags (boost matching keywords)">
              <div className="flex gap-2 flex-wrap mb-2">
                {(editing.tags || []).map(t => (
                  <span key={t} className="text-xs bg-gray-100 rounded-full px-2 py-0.5 flex items-center gap-1">
                    {t}
                    <button onClick={() => setEditing({ ...editing, tags: (editing.tags || []).filter(x => x !== t) })}
                      className="text-gray-500 hover:text-red-600">×</button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input className="flex-1 border rounded px-2 py-1.5 text-sm" maxLength={40}
                  value={tagInput} onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const v = tagInput.trim().toLowerCase();
                      if (v && !(editing.tags || []).includes(v)) {
                        setEditing({ ...editing, tags: [...(editing.tags || []), v] });
                      }
                      setTagInput("");
                    }
                  }}
                  placeholder="e.g. shipping, refund, cod (press Enter)" />
              </div>
            </Field>
          </div>
        )}
      </div>
    </div>
  );
}

/* ────────────────────────── SETTINGS ────────────────────────── */
function SettingsView() {
  const getFn = useServerFn(adminGetChatSettings);
  const saveFn = useServerFn(adminUpdateChatSettings);
  const [s, setS] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const r: any = await (getFn as any)();
      setS(r.settings || null);
    })();
  }, [getFn]);

  async function save() {
    if (!s) return;
    setSaving(true);
    try {
      await saveFn({ data: {
        brand_name: s.brand_name, welcome_message: s.welcome_message,
        system_prompt: s.system_prompt || "", provider: "gemini",
        model: s.model, api_key_secret_name: s.api_key_secret_name || "GEMINI_API_KEY",
        quick_actions: s.quick_actions || [],
        escalation_label: s.escalation_label,
        escalation_after_messages: Number(s.escalation_after_messages) || 4,
        enable_order_context: !!s.enable_order_context,
        enabled: !!s.enabled,
        confidence_threshold: Math.max(0, Math.min(1, Number(s.confidence_threshold ?? 0.55))),
        escalate_on_low_confidence: !!s.escalate_on_low_confidence,
        escalate_on_no_kb: !!s.escalate_on_no_kb,
        escalate_on_negative_sentiment: !!s.escalate_on_negative_sentiment,
        escalate_keywords: Array.isArray(s.escalate_keywords) ? s.escalate_keywords : [],
        max_failed_turns: Number(s.max_failed_turns) || 3,
      } });
      alert("Saved");
    } catch (e: any) { alert(e.message || "Save failed"); }
    finally { setSaving(false); }
  }

  function setKw(v: string) {
    const arr = v.split(",").map(x => x.trim()).filter(Boolean).slice(0, 30);
    setS({ ...s, escalate_keywords: arr });
  }

  function setQA(i: number, key: "label" | "prompt", v: string) {
    const qa = [...(s.quick_actions || [])];
    qa[i] = { ...qa[i], [key]: v };
    setS({ ...s, quick_actions: qa });
  }
  function addQA() {
    setS({ ...s, quick_actions: [...(s.quick_actions || []), { label: "", prompt: "" }] });
  }
  function rmQA(i: number) {
    setS({ ...s, quick_actions: (s.quick_actions || []).filter((_: any, j: number) => j !== i) });
  }

  if (!s) return <p className="p-6 text-sm text-gray-400">Loading…</p>;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-5 max-w-4xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Brand name (shown in chat header)">
          <input className="w-full border rounded px-2 py-1.5 text-sm" maxLength={80}
            value={s.brand_name || ""} onChange={e => setS({ ...s, brand_name: e.target.value })} />
        </Field>
        <Field label="Chatbot enabled">
          <label className="flex items-center gap-2 text-sm pt-1.5">
            <input type="checkbox" checked={!!s.enabled} onChange={e => setS({ ...s, enabled: e.target.checked })} />
            Show widget on storefront
          </label>
        </Field>
      </div>

      <Field label="Welcome message">
        <textarea className="w-full border rounded px-2 py-1.5 text-sm h-16" maxLength={500}
          value={s.welcome_message || ""} onChange={e => setS({ ...s, welcome_message: e.target.value })} />
      </Field>

      <Field label="Brand-specific instructions (optional, appended to system prompt)">
        <textarea className="w-full border rounded px-2 py-1.5 text-sm h-24" maxLength={4000}
          value={s.system_prompt || ""} onChange={e => setS({ ...s, system_prompt: e.target.value })}
          placeholder="e.g. Always greet by name if known. Mention our 7-day fitness challenge after the answer." />
      </Field>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="AI Model">
          <select className="w-full border rounded px-2 py-1.5 text-sm"
            value={s.model || "gemini-2.5-flash"} onChange={e => setS({ ...s, model: e.target.value })}>
            <option value="gemini-2.5-flash">gemini-2.5-flash (fast, cheap)</option>
            <option value="gemini-2.5-pro">gemini-2.5-pro (smarter)</option>
            <option value="gemini-2.5-flash-lite">gemini-2.5-flash-lite (cheapest)</option>
          </select>
        </Field>
        <Field label="Escalation button label">
          <input className="w-full border rounded px-2 py-1.5 text-sm" maxLength={40}
            value={s.escalation_label || ""} onChange={e => setS({ ...s, escalation_label: e.target.value })} />
        </Field>
        <Field label="Show escalation after N user messages">
          <input type="number" min={1} max={20} className="w-full border rounded px-2 py-1.5 text-sm"
            value={s.escalation_after_messages ?? 4}
            onChange={e => setS({ ...s, escalation_after_messages: Number(e.target.value) })} />
        </Field>
      </div>

      <Field label="Use logged-in user's order context">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={!!s.enable_order_context}
            onChange={e => setS({ ...s, enable_order_context: e.target.checked })} />
          Inject last 3 orders into AI context (recommended)
        </label>
      </Field>

      {/* ── Escalation Rules ───────────────────────────────────────── */}
      <div className="border border-orange-200 bg-orange-50/40 rounded-xl p-4 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-gray-800">Auto-escalation rules</h3>
          <p className="text-[11px] text-gray-500 mt-0.5">
            The AI decides on its own when to hand off to a human agent. You can tune the rules.
          </p>
        </div>

        <Field label={`Confidence threshold: ${Number(s.confidence_threshold ?? 0.55).toFixed(2)}`}>
          <input type="range" min={0} max={1} step={0.05}
            value={Number(s.confidence_threshold ?? 0.55)}
            onChange={e => setS({ ...s, confidence_threshold: Number(e.target.value) })}
            className="w-full" />
          <div className="flex justify-between text-[10px] text-gray-500">
            <span>0 — AI har baat khud handle kare</span>
            <span>1 — only 100% confident replies, otherwise escalate</span>
          </div>
          <p className="text-[11px] text-gray-600 mt-1">
            Recommended: <b>0.55–0.65</b>. The AI returns a 0–1 confidence with every reply; below this threshold it auto-escalates.
          </p>
        </Field>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="flex items-start gap-2 text-sm bg-white border rounded-lg p-3">
            <input type="checkbox" className="mt-0.5"
              checked={!!s.escalate_on_low_confidence}
              onChange={e => setS({ ...s, escalate_on_low_confidence: e.target.checked })} />
            <span>
              <b className="block text-xs">Low confidence par escalate</b>
              <span className="text-[11px] text-gray-500">Confidence threshold se kam ho to human bhejo.</span>
            </span>
          </label>

          <label className="flex items-start gap-2 text-sm bg-white border rounded-lg p-3">
            <input type="checkbox" className="mt-0.5"
              checked={!!s.escalate_on_no_kb}
              onChange={e => setS({ ...s, escalate_on_no_kb: e.target.checked })} />
            <span>
              <b className="block text-xs">KB match na milne par escalate</b>
              <span className="text-[11px] text-gray-500">Strict mode — if no article matches, escalate straight to a human.</span>
            </span>
          </label>

          <label className="flex items-start gap-2 text-sm bg-white border rounded-lg p-3">
            <input type="checkbox" className="mt-0.5"
              checked={!!s.escalate_on_negative_sentiment}
              onChange={e => setS({ ...s, escalate_on_negative_sentiment: e.target.checked })} />
            <span>
              <b className="block text-xs">Negative sentiment streak par escalate</b>
              <span className="text-[11px] text-gray-500">User lagatar angry/upset lage to handoff.</span>
            </span>
          </label>

          <Field label="Max consecutive negative turns">
            <input type="number" min={1} max={10}
              className="w-full border rounded px-2 py-1.5 text-sm"
              value={s.max_failed_turns ?? 3}
              onChange={e => setS({ ...s, max_failed_turns: Number(e.target.value) })} />
            <p className="text-[10px] text-gray-500 mt-1">How many negative replies trigger a handoff.</p>
          </Field>
        </div>

        <Field label="Trigger keywords (comma separated — match hote hi instant escalate)">
          <input className="w-full border rounded px-2 py-1.5 text-sm font-mono"
            value={(s.escalate_keywords || []).join(", ")}
            onChange={e => setKw(e.target.value)}
            placeholder="refund, complaint, manager, lawsuit, legal, fraud" />
          <p className="text-[10px] text-gray-500 mt-1">
            When any of these words appear in the user message, escalate without calling the AI. {(s.escalate_keywords || []).length}/30.
          </p>
        </Field>
      </div>



      <Field label="Quick action chips (shown on welcome screen)">
        <div className="space-y-2">
          {(s.quick_actions || []).map((qa: any, i: number) => (
            <div key={i} className="flex gap-2 items-center">
              <input className="border rounded px-2 py-1 text-sm w-1/3" placeholder="Label" maxLength={40}
                value={qa.label || ""} onChange={e => setQA(i, "label", e.target.value)} />
              <input className="border rounded px-2 py-1 text-sm flex-1" placeholder="Prompt sent to AI" maxLength={200}
                value={qa.prompt || ""} onChange={e => setQA(i, "prompt", e.target.value)} />
              <button onClick={() => rmQA(i)} className="text-red-600 hover:bg-red-50 rounded p-1">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {(s.quick_actions || []).length < 8 && (
            <button onClick={addQA} className="flex items-center gap-1 text-xs text-orange-600 font-bold">
              <Plus size={12} /> Add quick action
            </button>
          )}
        </div>
      </Field>

      <div className="pt-3 border-t flex justify-end">
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm rounded-lg px-4 py-2 disabled:opacity-50">
          <Save size={14} /> {saving ? "Saving…" : "Save settings"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-bold uppercase tracking-wide text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
}
