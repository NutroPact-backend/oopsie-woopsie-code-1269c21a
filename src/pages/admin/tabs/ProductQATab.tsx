// @ts-nocheck
/**
 * Product Q&A admin tab — moderate questions, answer, publish/hide/delete.
 */
import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { MessageCircle, Check, EyeOff, Trash2, Send, RefreshCw } from "lucide-react";
import {
  adminListAllQA, adminAnswerQuestion, adminSetQAStatus, adminDeleteQuestion,
} from "@/lib/product-qa.functions";
import { useBulkSelection, BulkActionBar, SelectCheckbox, runForEach } from "@/pages/admin/components/BulkSelect";
import { TabHelp } from './_TabHelp';

type Row = {
  id: string;
  product_id: string;
  product_name: string;
  asker_name: string;
  question: string;
  answer: string | null;
  answered_by_name: string | null;
  answered_at: string | null;
  status: "pending" | "published" | "hidden";
  helpful_count: number;
  created_at: string;
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  published: "bg-green-100 text-green-800",
  hidden: "bg-gray-200 text-gray-600",
};

export default function ProductQATab() {
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "published" | "hidden">("pending");
  const [busy, setBusy] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const listFn = useServerFn(adminListAllQA);
  const answerFn = useServerFn(adminAnswerQuestion);
  const statusFn = useServerFn(adminSetQAStatus);
  const deleteFn = useServerFn(adminDeleteQuestion);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const r: any = await listFn({ data: { status: filter } });
      setRows(r.items || []);
    } finally { setBusy(false); }
  }, [listFn, filter]);

  useEffect(() => { load(); }, [load]);

  const submitAnswer = async (id: string, publish: boolean) => {
    const answer = (drafts[id] || "").trim();
    if (!answer) return alert("Write an answer first");
    await answerFn({ data: { id, answer, answeredByName: "NutroPact Team", publish } });
    setDrafts(d => { const c = { ...d }; delete c[id]; return c; });
    load();
  };

  const setStatus = async (id: string, status: "pending" | "published" | "hidden") => {
    await statusFn({ data: { id, status } });
    load();
  };

  const del = async (id: string) => {
    if (!confirm("Delete question?")) return;
    await deleteFn({ data: { id } });
    load();
  };

  const counts = rows.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {} as Record<string, number>);

  const bulk = useBulkSelection(rows, (r) => r.id);

  return (
    <div className="space-y-5">
      <TabHelp topic="productqa" />
      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <MessageCircle className="text-orange-500" size={20} />
            <div>
              <h2 className="font-black text-gray-900">Product Q&A</h2>
              <p className="text-xs text-gray-500">Customer questions on PDP — answer & publish</p>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            {(["pending", "published", "hidden", "all"] as const).map(s => (
              <button key={s} onClick={() => setFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize ${filter === s ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                {s} {s !== "all" && counts[s] ? `(${counts[s]})` : ""}
              </button>
            ))}
            <button onClick={load} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200" title="Refresh"><RefreshCw size={14} /></button>
          </div>
        </div>
      </div>

      {busy && rows.length === 0 ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-32 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-dashed border-gray-200 text-gray-500">
          No questions {filter !== "all" ? `with status "${filter}"` : "yet"}.
        </div>
      ) : (
        <div className="space-y-3">
          <BulkActionBar
            count={bulk.count}
            ids={[...bulk.selected]}
            onClear={bulk.clear}
            actions={[
              { key: 'publish', label: 'Publish', color: 'bg-green-600 hover:bg-green-700', confirm: 'Publish {n} question(s)?', run: async (ids) => { await runForEach(ids, (id) => statusFn({ data: { id, status: 'published' } })); load(); } },
              { key: 'hide', label: 'Hide', color: 'bg-gray-600 hover:bg-gray-700', confirm: 'Hide {n} question(s)?', run: async (ids) => { await runForEach(ids, (id) => statusFn({ data: { id, status: 'hidden' } })); load(); } },
              { key: 'pending', label: 'Mark Pending', color: 'bg-yellow-600 hover:bg-yellow-700', run: async (ids) => { await runForEach(ids, (id) => statusFn({ data: { id, status: 'pending' } })); load(); } },
              { key: 'del', label: 'Delete', color: 'bg-red-600 hover:bg-red-700', confirm: 'Delete {n} question(s)? This cannot be undone.', run: async (ids) => { await runForEach(ids, (id) => deleteFn({ data: { id } })); load(); } },
            ]}
          />
          <label className="flex items-center gap-2 text-xs font-bold text-gray-500 px-2">
            <SelectCheckbox checked={bulk.allSelected} indeterminate={bulk.someSelected} onChange={bulk.toggleAll} />
            Select all ({rows.length})
          </label>
          {rows.map(r => (
            <div key={r.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-start gap-2 min-w-0">
                  <div className="pt-1"><SelectCheckbox checked={bulk.isSelected(r.id)} onChange={() => bulk.toggleOne(r.id)} /></div>
                  <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${STATUS_COLORS[r.status]}`}>{r.status}</span>
                    <span className="text-xs text-gray-500">{new Date(r.created_at).toLocaleString()}</span>
                    {r.helpful_count > 0 && <span className="text-xs text-gray-400">👍 {r.helpful_count}</span>}
                  </div>
                  <p className="text-xs text-gray-500 truncate">on <b className="text-gray-700">{r.product_name}</b> · asked by {r.asker_name}</p>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  {r.status !== "hidden" && <button onClick={() => setStatus(r.id, "hidden")} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200" title="Hide"><EyeOff size={14} /></button>}
                  {r.status !== "published" && r.answer && <button onClick={() => setStatus(r.id, "published")} className="p-2 rounded-lg bg-green-100 text-green-700 hover:bg-green-200" title="Publish"><Check size={14} /></button>}
                  <button onClick={() => del(r.id)} className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100" title="Delete"><Trash2 size={14} /></button>
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 mb-3">
                <p className="text-[10px] font-black text-gray-500 uppercase mb-1">Question</p>
                <p className="text-sm text-gray-800 whitespace-pre-line">{r.question}</p>
              </div>

              {r.answer ? (
                <div className="bg-orange-50 rounded-xl p-3 mb-3">
                  <p className="text-[10px] font-black text-orange-600 uppercase mb-1">Answer by {r.answered_by_name}</p>
                  <p className="text-sm text-gray-800 whitespace-pre-line">{r.answer}</p>
                  <p className="text-[10px] text-gray-400 mt-1">{r.answered_at && new Date(r.answered_at).toLocaleString()}</p>
                </div>
              ) : null}

              <div className="space-y-2">
                <textarea
                  value={drafts[r.id] ?? r.answer ?? ""}
                  onChange={e => setDrafts(d => ({ ...d, [r.id]: e.target.value }))}
                  placeholder={r.answer ? "Edit answer…" : "Write answer…"}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-orange-500"
                />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => submitAnswer(r.id, false)} className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs font-bold">Save as draft</button>
                  <button onClick={() => submitAnswer(r.id, true)} className="px-3 py-1.5 rounded-lg bg-orange-500 text-white hover:bg-orange-600 text-xs font-bold flex items-center gap-1.5"><Send size={12} /> Answer & publish</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
