// @ts-nocheck
/**
 * Brand-grade chat widget: welcome chips, suggested follow-ups, smart escalation.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { MessageSquare, X, Send, User, Bot, Headphones, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  sendChatMessage, getChatHistory, requestHandoff, getChatBootstrap,
} from "@/lib/chatbot.functions";

type Msg = { id?: string; role: "user" | "assistant" | "admin" | "system"; content: string; created_at?: string; meta?: any };
type QuickAction = { label: string; prompt: string };

const LS_TOKEN = "np_chat_guest_token";
const LS_CONV = "np_chat_conv_id";

function getGuestToken(): string {
  try {
    let t = localStorage.getItem(LS_TOKEN);
    if (!t) {
      t = "g_" + crypto.randomUUID().replace(/-/g, "");
      localStorage.setItem(LS_TOKEN, t);
    }
    return t;
  } catch { return "g_" + Math.random().toString(36).slice(2); }
}

// minimal markdown: **bold**, *italic*, line breaks, bullets
function renderText(text: string) {
  const html = text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code class='bg-black/5 px-1 rounded'>$1</code>")
    .replace(/^[•\-*] (.+)$/gm, "• $1")
    .replace(/\n/g, "<br/>");
  return { __html: html };
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [convId, setConvId] = useState<string | null>(null);
  const [status, setStatus] = useState<"open" | "handoff" | "closed">("open");
  const [userId, setUserId] = useState<string | null>(null);
  const [followups, setFollowups] = useState<string[]>([]);
  const [needsHuman, setNeedsHuman] = useState(false);
  const [bootstrap, setBootstrap] = useState<{ enabled: boolean; brandName: string; welcome: string; quickActions: QuickAction[]; escalationLabel: string; escalationAfterMessages: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const send = useServerFn(sendChatMessage);
  const history = useServerFn(getChatHistory);
  const handoff = useServerFn(requestHandoff);
  const boot = useServerFn(getChatBootstrap);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUserId(s?.user?.id ?? null));
    try { const stored = localStorage.getItem(LS_CONV); if (stored) setConvId(stored); } catch { /* */ }
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!open || bootstrap) return;
    boot().then((b: any) => setBootstrap(b)).catch(() => setBootstrap({ enabled: true, brandName: "Store", welcome: "How can I help?", quickActions: [], escalationLabel: "Connect with team", escalationAfterMessages: 4 }));
  }, [open, bootstrap, boot]);

  useEffect(() => {
    if (!open || !convId) return;
    const token = getGuestToken();
    history({ data: { conversationId: convId, guestToken: token } }).then((r: any) => {
      if (r?.messages) {
        setMsgs(r.messages);
        if (r.conversation?.status) setStatus(r.conversation.status);
        const last = [...r.messages].reverse().find((m: Msg) => m.role === "assistant");
        if (last?.meta) {
          setFollowups(Array.isArray(last.meta.followups) ? last.meta.followups : []);
          setNeedsHuman(Boolean(last.meta.needs_human));
        }
      }
    }).catch(() => { /* */ });
  }, [open, convId, history]);

  useEffect(() => {
    if (!convId) return;
    const ch = supabase.channel(`chat-${convId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `conversation_id=eq.${convId}` },
        (payload: any) => {
          const m = payload.new as Msg;
          setMsgs(prev => prev.some(x => x.id === m.id) ? prev : [...prev, m]);
          if (!open && (m.role === "admin" || m.role === "assistant")) setUnread(u => u + 1);
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [convId, open]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [msgs, open, followups]);

  useEffect(() => { if (open) setUnread(0); }, [open]);

  const doSend = useCallback(async (text: string) => {
    if (!text.trim() || sending) return;
    setSending(true);
    setInput("");
    setFollowups([]);
    const optimistic: Msg = { role: "user", content: text };
    setMsgs(prev => [...prev, optimistic]);
    try {
      const token = getGuestToken();
      const r: any = await send({ data: {
        conversationId: convId ?? undefined,
        guestToken: token,
        userId: userId ?? undefined,
        message: text,
      }});
      if (r?.conversationId && r.conversationId !== convId) {
        setConvId(r.conversationId);
        try { localStorage.setItem(LS_CONV, r.conversationId); } catch { /* */ }
      }
      if (r?.status) setStatus(r.status);
      if (r?.reply) setMsgs(prev => [...prev, { role: "assistant", content: r.reply, meta: { needs_human: r.needsHuman, followups: r.followups, sources: (r as any).sources || [] } }]);
      setFollowups(Array.isArray(r?.followups) ? r.followups : []);
      setNeedsHuman(Boolean(r?.needsHuman));
    } catch (e: any) {
      setMsgs(prev => [...prev, { role: "system", content: `Couldn't send: ${e?.message || "network error"}` }]);
    } finally {
      setSending(false);
    }
  }, [send, sending, convId, userId]);

  async function onHandoff() {
    if (!convId || status === "handoff") return;
    try {
      await handoff({ data: { conversationId: convId } });
      setStatus("handoff");
      setMsgs(prev => [...prev, { role: "system", content: "Our team is notified — we'll reply here shortly." }]);
      setNeedsHuman(false);
    } catch { /* */ }
  }

  const escalationLabel = bootstrap?.escalationLabel || "Connect with team";
  const userTurns = msgs.filter(m => m.role === "user").length;
  const showEscalation = status !== "handoff" && (needsHuman || userTurns >= (bootstrap?.escalationAfterMessages ?? 4));
  const showWelcome = msgs.length === 0 && status !== "handoff";

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Open chat"
        className="fixed bottom-5 left-5 z-[60] flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition hover:scale-105"
      >
        {open ? <X size={20} /> : <MessageSquare size={20} />}
        {!open && unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed bottom-20 left-5 z-[60] flex h-[78vh] max-h-[640px] w-[94vw] max-w-sm flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
          <header className="flex items-center gap-2 border-b border-border bg-primary px-4 py-3 text-primary-foreground">
            <div className="relative">
              <Bot size={18} />
              <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold leading-none">{bootstrap?.brandName || "Assistant"}</p>
              <p className="mt-0.5 text-[10px] opacity-80">
                {status === "handoff" ? "Connected to our team" : "AI assistant • usually replies instantly"}
              </p>
            </div>
            <button onClick={() => setOpen(false)} className="rounded p-1 hover:bg-white/10" aria-label="Close"><X size={16} /></button>
          </header>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-muted/30 p-3">
            {showWelcome && bootstrap && (
              <>
                <div className="flex items-start gap-2">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted"><Sparkles size={12} /></div>
                  <div className="max-w-[85%] rounded-2xl border border-border bg-background px-3 py-2 text-sm whitespace-pre-wrap">
                    {bootstrap.welcome}
                  </div>
                </div>
                {bootstrap.quickActions?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pl-8">
                    {bootstrap.quickActions.map((a, i) => (
                      <button key={i} onClick={() => doSend(a.prompt)}
                        className="rounded-full border border-primary/30 bg-background px-3 py-1.5 text-[11px] font-semibold text-primary hover:bg-primary hover:text-primary-foreground transition">
                        {a.label}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            {msgs.map((m, i) => <Bubble key={m.id || i} role={m.role} content={m.content} meta={m.meta} />)}

            {sending && (
              <div className="flex items-center gap-2 pl-8 text-xs text-muted-foreground">
                <Loader2 size={12} className="animate-spin" /> Thinking…
              </div>
            )}

            {!sending && followups.length > 0 && status === "open" && (
              <div className="flex flex-wrap gap-1.5 pl-8">
                {followups.map((f, i) => (
                  <button key={i} onClick={() => doSend(f)}
                    className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-foreground/80 hover:border-primary hover:text-primary transition">
                    {f}
                  </button>
                ))}
              </div>
            )}

            {showEscalation && (
              <div className="mx-2 mt-2 rounded-xl border border-dashed border-primary/30 bg-primary/5 p-3 text-center">
                <p className="text-[11px] text-muted-foreground mb-2">
                  {needsHuman ? "Mujhe lagta h ye human team behtar handle karegi." : "Aur help chahiye?"}
                </p>
                <button onClick={onHandoff}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:opacity-90">
                  <Headphones size={12} /> {escalationLabel}
                </button>
              </div>
            )}
          </div>

          <form
            className="flex items-center gap-2 border-t border-border bg-background p-2"
            onSubmit={e => { e.preventDefault(); doSend(input); }}
          >
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={status === "handoff" ? "Message the team…" : "Ask anything…"}
              maxLength={2000}
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button type="submit" disabled={!input.trim() || sending}
              className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground disabled:opacity-50"
              aria-label="Send">
              <Send size={15} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}

function Bubble({ role, content, meta }: { role: Msg["role"]; content: string; meta?: any }) {
  if (role === "system") {
    return (
      <div className="mx-auto max-w-[85%] rounded-md bg-amber-50 px-3 py-1.5 text-center text-[11px] text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
        {content}
      </div>
    );
  }
  const isUser = role === "user";
  const sources: Array<{ id: string; title: string }> = Array.isArray(meta?.sources) ? meta.sources : [];
  return (
    <div className={`flex items-start gap-2 ${isUser ? "flex-row-reverse" : ""}`}>
      <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${isUser ? "bg-primary text-primary-foreground" : role === "admin" ? "bg-emerald-600 text-white" : "bg-muted text-foreground"}`}>
        {isUser ? <User size={12} /> : role === "admin" ? <Headphones size={12} /> : <Bot size={12} />}
      </div>
      <div className={`max-w-[78%] ${isUser ? "" : "space-y-1.5"}`}>
        <div className={`whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${isUser ? "bg-primary text-primary-foreground" : role === "admin" ? "bg-emerald-50 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-100" : "bg-background border border-border"}`}>
          {isUser ? content : <span dangerouslySetInnerHTML={renderText(content)} />}
        </div>
        {!isUser && sources.length > 0 && (
          <div className="flex flex-wrap gap-1 px-1">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Source:</span>
            {sources.map(s => (
              <span key={s.id} className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-foreground/70">{s.title}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

