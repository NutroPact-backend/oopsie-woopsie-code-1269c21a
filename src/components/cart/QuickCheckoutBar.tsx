// @ts-nocheck
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { listPublicQuickCheckout } from "@/lib/quickCheckout.functions";

type Method = {
  id: string;
  provider: string;
  label: string;
  icon_emoji: string | null;
  icon_url: string | null;
  sort_order: number;
  min_order: number | null;
  max_order: number | null;
  enabled: boolean;
};

const PROVIDER_EMOJI: Record<string, string> = {
  gpay: "🟢",
  phonepe: "🟣",
  paytm: "🔵",
  bhim: "🟠",
  amazonpay: "🟡",
  upi_generic: "💳",
  razorpay_upi: "⚡",
};

/**
 * QuickCheckoutBar
 * - Renders only if master flag `quick_checkout` is ON and at least one method exists
 * - Filters methods by min/max order amount
 * - Tap → /checkout?quick=<provider>  (checkout page can read & pre-select)
 * - Lite-mode: no animations, single tiny request (cached 5min via flags hook)
 */
export default function QuickCheckoutBar({
  amount,
  coupon,
}: {
  amount: number;
  coupon?: string;
}) {
  const { isEnabled, getConfig } = useFeatureFlags();
  const masterOn = isEnabled("quick_checkout");
  const cfg = getConfig<{ show_on_cart_page?: boolean }>("quick_checkout");

  const listFn = useServerFn(listPublicQuickCheckout);
  const { data } = useQuery({
    queryKey: ["public-quick-checkout"],
    queryFn: () => listFn({}),
    enabled: masterOn,
    staleTime: 5 * 60_000,
  });
  const navigate = useNavigate();

  if (!masterOn) return null;
  if (cfg.show_on_cart_page === false) return null;

  const methods: Method[] = ((data?.methods as Method[] | undefined) ?? []).filter((m) => {
    if (!m.enabled) return false;
    if (m.min_order != null && amount < m.min_order) return false;
    if (m.max_order != null && amount > m.max_order) return false;
    return true;
  });

  if (methods.length === 0) return null;

  const go = (provider: string) => {
    const search: Record<string, string> = { quick: provider };
    if (coupon) search.coupon = coupon;
    navigate({ to: "/checkout", search: search as any });
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-gray-700">Quick Pay</p>
        <p className="text-[10px] text-gray-400">UPI • Instant</p>
      </div>
      <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-1">
        {methods.map((m) => (
          <button
            key={m.id}
            onClick={() => go(m.provider)}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full border border-gray-200 hover:border-orange-400 hover:bg-orange-50 text-xs font-bold text-gray-700 transition"
            aria-label={`Pay with ${m.label}`}
          >
            <span className="text-base leading-none">
              {m.icon_emoji || PROVIDER_EMOJI[m.provider] || "💳"}
            </span>
            <span>{m.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
