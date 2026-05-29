// @ts-nocheck
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminIssueGiftCard, adminListGiftCards, adminUpdateGiftCard } from "@/lib/giftcards.functions";
import { TabHelp } from "./_TabHelp";
import { Gift, Plus, Copy, Ban, RefreshCw } from "lucide-react";
import { useBulkSelection, BulkActionBar, SelectCheckbox, runForEach } from "@/pages/admin/components/BulkSelect";

type Card = {
  id: string; code: string; amount: number; balance: number; currency: string;
  recipient_email: string; recipient_name: string; sender_name: string; message: string;
  status: string; expires_at: string | null; created_at: string; redeemed_at: string | null;
  notes: string;
};

export default function GiftCardsTab() {
  const issueFn = useServerFn(adminIssueGiftCard);
  const listFn = useServerFn(adminListGiftCards);
  const updFn = useServerFn(adminUpdateGiftCard);

  const [cards, setCards] = useState<Card[]>([]);
  const [filter, setFilter] = useState<"all" | "active" | "redeemed" | "expired" | "disabled">("all");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r: any = await listFn({ data: { status: filter, limit: 200 } });
      setCards(r.cards || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);

  const toggleDisable = async (c: Card) => {
    await updFn({ data: { id: c.id, status: c.status === "disabled" ? "active" : "disabled" } });
    load();
  };

  const copy = (code: string) => { navigator.clipboard?.writeText(code); };

  const bulk = useBulkSelection(cards, (c) => c.id);

  return (
    <div className="space-y-4">
      <TabHelp topic="giftcards" />
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <h2 className="text-lg font-black flex items-center gap-2"><Gift size={18} className="text-orange-500" /> Gift Cards</h2>
          <div className="flex-1" />
          <select value={filter} onChange={e => setFilter(e.target.value as any)}
            className="px-3 py-2 border rounded-lg text-sm">
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="redeemed">Redeemed</option>
            <option value="disabled">Disabled</option>
          </select>
          <button onClick={load} className="px-3 py-2 bg-gray-100 rounded-lg text-sm font-bold flex items-center gap-1"><RefreshCw size={14} /> Refresh</button>
          <button onClick={() => setOpen(true)} className="px-3 py-2 bg-orange-500 text-white rounded-lg text-sm font-bold flex items-center gap-1"><Plus size={14} /> Issue card</button>
        </div>

        {loading ? (
          <div className="text-sm text-gray-400">Loading…</div>
        ) : cards.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-500">No gift cards yet.</div>
        ) : (
          <>
            <BulkActionBar
              count={bulk.count}
              ids={[...bulk.selected]}
              onClear={bulk.clear}
              actions={[
                { key: 'disable', label: 'Disable', color: 'bg-red-600 hover:bg-red-700', confirm: 'Disable {n} gift card(s)?', run: async (ids) => { await runForEach(ids, (id) => updFn({ data: { id, status: 'disabled' } })); load(); } },
                { key: 'enable', label: 'Enable', color: 'bg-green-600 hover:bg-green-700', confirm: 'Enable {n} gift card(s)?', run: async (ids) => { await runForEach(ids, (id) => updFn({ data: { id, status: 'active' } })); load(); } },
              ]}
            />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-gray-500 border-b">
                <tr>
                  <th className="text-left py-2 pr-3 w-8">
                    <SelectCheckbox checked={bulk.allSelected} indeterminate={bulk.someSelected} onChange={bulk.toggleAll} />
                  </th>
                  <th className="text-left py-2 pr-3">Code</th><th className="text-left py-2 pr-3">Amount</th><th className="text-left py-2 pr-3">Recipient</th><th className="text-left py-2 pr-3">Status</th><th className="text-left py-2 pr-3">Expires</th><th className="text-left py-2 pr-3">Created</th><th /></tr>
              </thead>
              <tbody>
                {cards.map(c => (
                  <tr key={c.id} className="border-b last:border-0">
                    <td className="py-2 pr-3">
                      <SelectCheckbox checked={bulk.isSelected(c.id)} onChange={() => bulk.toggleOne(c.id)} />
                    </td>
                    <td className="py-2 pr-3 font-mono text-xs">
                      <button onClick={() => copy(c.code)} className="inline-flex items-center gap-1 hover:text-orange-500" title="Copy">
                        {c.code} <Copy size={11} />
                      </button>
                    </td>
                    <td className="py-2 pr-3 font-bold">₹{Number(c.amount).toFixed(0)}</td>
                    <td className="py-2 pr-3 text-xs">{c.recipient_email || c.recipient_name || <span className="text-gray-400">—</span>}</td>
                    <td className="py-2 pr-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        c.status === "active" ? "bg-green-100 text-green-700" :
                        c.status === "redeemed" ? "bg-gray-200 text-gray-700" :
                        c.status === "disabled" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                      }`}>{c.status.toUpperCase()}</span>
                    </td>
                    <td className="py-2 pr-3 text-xs text-gray-500">{c.expires_at ? new Date(c.expires_at).toLocaleDateString() : "—"}</td>
                    <td className="py-2 pr-3 text-xs text-gray-500">{new Date(c.created_at).toLocaleDateString()}</td>
                    <td className="py-2">
                      {c.status !== "redeemed" && (
                        <button onClick={() => toggleDisable(c)} title={c.status === "disabled" ? "Enable" : "Disable"}
                          className="p-1.5 text-gray-400 hover:text-red-500"><Ban size={14} /></button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>

      {open && <IssueModal onClose={() => setOpen(false)} onDone={() => { setOpen(false); load(); }} issueFn={issueFn} />}
    </div>
  );
}

function IssueModal({ onClose, onDone, issueFn }: { onClose: () => void; onDone: () => void; issueFn: any }) {
  const [amount, setAmount] = useState(1000);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [senderName, setSenderName] = useState("");
  const [message, setMessage] = useState("");
  const [expiresInDays, setExpires] = useState(365);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [issuedCode, setIssuedCode] = useState("");

  const submit = async () => {
    setBusy(true);
    try {
      const r: any = await issueFn({ data: { amount: Number(amount), recipientEmail, recipientName, senderName, message, expiresInDays: Number(expiresInDays), notes } });
      setIssuedCode(r.card.code);
    } catch (e: any) { alert(e.message || "Failed"); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-3">
        <h3 className="text-lg font-black flex items-center gap-2"><Gift size={18} /> Issue gift card</h3>
        {issuedCode ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">Gift card created. Share this code with the recipient:</p>
            <div className="p-4 bg-orange-50 border-2 border-dashed border-orange-300 rounded-xl text-center">
              <p className="text-xl font-mono font-black tracking-widest">{issuedCode}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => navigator.clipboard?.writeText(issuedCode)} className="flex-1 px-4 py-2 bg-gray-100 rounded-lg text-sm font-bold">Copy code</button>
              <button onClick={onDone} className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-bold">Done</button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Amount (₹)"><input type="number" min={1} value={amount} onChange={e => setAmount(+e.target.value)} className="inp" /></Field>
              <Field label="Expires (days)"><input type="number" min={1} value={expiresInDays} onChange={e => setExpires(+e.target.value)} className="inp" /></Field>
            </div>
            <Field label="Recipient email (optional)"><input type="email" value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)} className="inp" placeholder="friend@example.com" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Recipient name"><input value={recipientName} onChange={e => setRecipientName(e.target.value)} className="inp" /></Field>
              <Field label="From"><input value={senderName} onChange={e => setSenderName(e.target.value)} className="inp" /></Field>
            </div>
            <Field label="Personal message"><textarea value={message} onChange={e => setMessage(e.target.value)} className="inp h-16" /></Field>
            <Field label="Internal notes"><input value={notes} onChange={e => setNotes(e.target.value)} className="inp" /></Field>
            <div className="flex gap-2 pt-1">
              <button onClick={onClose} className="flex-1 px-4 py-2 bg-gray-100 rounded-lg text-sm font-bold">Cancel</button>
              <button disabled={busy} onClick={submit} className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-bold disabled:opacity-60">{busy ? "Issuing…" : "Issue card"}</button>
            </div>
          </>
        )}
        <style>{`.inp{width:100%;border:1px solid #e5e7eb;border-radius:10px;padding:.5rem .75rem;font-size:.875rem;outline:none}.inp:focus{border-color:#fb923c}`}</style>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: any }) {
  return <label className="block"><span className="text-xs font-bold text-gray-500 block mb-1">{label}</span>{children}</label>;
}
