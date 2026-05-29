// @ts-nocheck
/**
 * Product Q&A block — shows on PDP after info tabs.
 * Public list of published Q&A + "Ask a question" form for logged-in users.
 */
import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { MessageCircle, ThumbsUp, Send, HelpCircle } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { listProductQA, askProductQuestion, markQuestionHelpful } from "@/lib/product-qa.functions";
import { useAuthStore } from "@/store/authStore";

type Item = {
  id: string;
  asker_name: string;
  question: string;
  answer: string | null;
  answered_by_name: string | null;
  answered_at: string | null;
  helpful_count: number;
  created_at: string;
};

export default function ProductQA({ productId, productName }: { productId: string; productName: string }) {
  const user = useAuthStore(s => s.user);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [expanded, setExpanded] = useState(3);

  const listFn = useServerFn(listProductQA);
  const askFn = useServerFn(askProductQuestion);
  const helpfulFn = useServerFn(markQuestionHelpful);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r: any = await listFn({ data: { productId, limit: 50 } });
      setItems(r.items || []);
    } finally { setLoading(false); }
  }, [listFn, productId]);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (question.trim().length < 5) return;
    setSubmitting(true);
    try {
      const r: any = await askFn({ data: { productId, productName, question } });
      if (r?.ok) {
        setQuestion("");
        setSubmitted(true);
        setTimeout(() => setSubmitted(false), 5000);
      }
    } finally { setSubmitting(false); }
  };

  const onHelpful = async (id: string) => {
    setItems(arr => arr.map(it => it.id === id ? { ...it, helpful_count: it.helpful_count + 1 } : it));
    await helpfulFn({ data: { id } });
  };

  const visible = items.slice(0, expanded);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 mb-10" aria-label="Product questions and answers">
      <div className="flex items-center gap-2 mb-5">
        <MessageCircle className="text-orange-500" size={22} />
        <h2 className="text-2xl font-black text-gray-900">Questions & Answers</h2>
        {items.length > 0 && <span className="text-sm text-gray-500">({items.length})</span>}
      </div>

      {/* Ask form */}
      <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-5 border border-orange-100 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <HelpCircle size={18} className="text-orange-600" />
          <p className="font-black text-gray-900">Have a question about this product?</p>
        </div>
        {user ? (
          <>
            <textarea
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder="e.g. Is this suitable for lactose intolerance? Kya size 1kg me available h?"
              rows={2}
              maxLength={1000}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-orange-500 bg-white"
            />
            <div className="flex justify-between items-center mt-2">
              <p className="text-xs text-gray-500">
                {submitted ? "✓ Submitted — we'll publish once answered." : `${question.length}/1000`}
              </p>
              <button
                onClick={submit}
                disabled={submitting || question.trim().length < 5}
                className="px-4 py-2 rounded-xl bg-orange-500 text-white font-bold text-sm hover:bg-orange-600 disabled:opacity-50 flex items-center gap-2"
              >
                <Send size={14} /> {submitting ? "Posting…" : "Ask question"}
              </button>
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-700">
            <Link to="/login" className="text-orange-600 font-bold underline">Sign in</Link> to ask a question about this product.
          </p>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">{[...Array(2)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}</div>
      ) : items.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm bg-gray-50 rounded-2xl">
          No questions yet — be the first to ask!
        </div>
      ) : (
        <div className="space-y-4">
          {visible.map(it => (
            <article key={it.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <div className="flex gap-3 items-start">
                <span className="shrink-0 w-7 h-7 rounded-full bg-gray-100 grid place-items-center text-xs font-black text-gray-600">Q</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 whitespace-pre-line">{it.question}</p>
                  <p className="text-xs text-gray-400 mt-1">— {it.asker_name}, {new Date(it.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              {it.answer && (
                <div className="flex gap-3 items-start mt-4 pl-3 border-l-2 border-orange-200">
                  <span className="shrink-0 w-7 h-7 rounded-full bg-orange-500 text-white grid place-items-center text-xs font-black">A</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 whitespace-pre-line">{it.answer}</p>
                    <div className="flex items-center justify-between mt-2 flex-wrap gap-2">
                      <p className="text-xs text-gray-400">— {it.answered_by_name}{it.answered_at ? `, ${new Date(it.answered_at).toLocaleDateString()}` : ""}</p>
                      <button onClick={() => onHelpful(it.id)} className="flex items-center gap-1 text-xs text-gray-500 hover:text-orange-600 font-semibold">
                        <ThumbsUp size={12} /> Helpful {it.helpful_count > 0 && `(${it.helpful_count})`}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </article>
          ))}
          {items.length > expanded && (
            <button onClick={() => setExpanded(n => n + 5)} className="w-full py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-bold text-gray-700">
              Show more questions ({items.length - expanded} remaining)
            </button>
          )}
        </div>
      )}
    </section>
  );
}
