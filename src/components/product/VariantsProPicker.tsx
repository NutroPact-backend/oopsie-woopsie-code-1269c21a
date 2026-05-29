// @ts-nocheck
/**
 * Pro variant picker — renders only when:
 *   1) feature_flag `variants_pro` is ON, AND
 *   2) product.variants_pro_config exists (admin configured it).
 * Otherwise the parent falls back to the legacy flavor/size pickers.
 *
 * Lite-mode: pure CSS (no framer-motion), no extra network calls — config
 * already comes embedded in the product payload.
 */
import { useMemo } from "react";
import { Star, Check } from "lucide-react";

type Variant = {
  flavor?: string;
  size?: string;
  price?: number;
  compare_price?: number;
  stock?: number;
  sku?: string;
  id?: string;
};

type Badge = { text: string; color?: string; bg_color?: string; icon?: string };

export type ProConfig = {
  display_mode?: "dropdown" | "radio-cards" | "tabs";
  recommended_variant_id?: string | null;
  badges?: Record<string, Badge>;
  per_pack_offers?: Record<string, string>;
  show_per_day_cost?: boolean;
  per_day_divisor?: Record<string, number>;
  show_save_chip?: boolean;
};

interface Props {
  product: any;
  config: ProConfig;
  selectedFlavor: string;
  selectedSize: string;
  onSelect: (flavor: string, size: string) => void;
}

/** Find a variant id by matching against product_variants list embedded in product, falling back to flavor+size key. */
function variantKey(v: Variant): string {
  return v.id || `${v.flavor || ""}__${v.size || ""}`;
}

export default function VariantsProPicker({ product, config, selectedFlavor, selectedSize, onSelect }: Props) {
  const mode = config.display_mode || "radio-cards";
  const variants: Variant[] = useMemo(
    () => (product?.variants ?? []).filter((v: any) => v && (v.flavor || v.size)),
    [product],
  );

  if (variants.length === 0) return null;

  const isActive = (v: Variant) =>
    (selectedFlavor || "") === (v.flavor || "") && (selectedSize || "") === (v.size || "");

  if (mode === "dropdown") {
    const value = variantKey(variants.find(isActive) || variants[0]);
    return (
      <div>
        <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Choose pack</p>
        <select
          value={value}
          onChange={(e) => {
            const v = variants.find((x) => variantKey(x) === e.target.value);
            if (v) onSelect(v.flavor || "", v.size || "");
          }}
          className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm font-bold"
        >
          {variants.map((v) => (
            <option key={variantKey(v)} value={variantKey(v)}>
              {[v.flavor, v.size].filter(Boolean).join(" · ")} — ₹{v.price}
            </option>
          ))}
        </select>
      </div>
    );
  }

  // shared card content for radio-cards & tabs
  const card = (v: Variant) => {
    const k = variantKey(v);
    const badge = config.badges?.[k] || (v.id ? config.badges?.[v.id] : undefined);
    const offer = config.per_pack_offers?.[k] || (v.id ? config.per_pack_offers?.[v.id] : undefined);
    const isRec = config.recommended_variant_id && v.id === config.recommended_variant_id;
    const oos = (v.stock ?? 0) <= 0;
    const compare = v.compare_price && v.compare_price > (v.price || 0) ? v.compare_price : null;
    const savePct = compare ? Math.round(((compare - (v.price || 0)) / compare) * 100) : 0;
    const divisor = v.id ? config.per_day_divisor?.[v.id] : undefined;
    const perDay = config.show_per_day_cost && divisor && divisor > 0 ? Math.round((v.price || 0) / divisor) : null;
    const active = isActive(v);

    return (
      <button
        key={k}
        type="button"
        onClick={() => onSelect(v.flavor || "", v.size || "")}
        disabled={oos}
        className={[
          "relative text-left rounded-2xl border-2 p-3 transition-all duration-150",
          active ? "border-gray-900 shadow-md ring-2 ring-gray-900/10" : "border-gray-200 hover:border-gray-400",
          isRec && !active ? "ring-2 ring-yellow-300/70" : "",
          oos ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
        ].join(" ")}
      >
        {isRec && (
          <span className="absolute -top-2 left-3 bg-yellow-400 text-black text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow">
            <Star size={10} fill="currentColor" /> RECOMMENDED
          </span>
        )}
        {badge?.text && (
          <span
            className="absolute -top-2 right-3 text-[10px] font-black px-2 py-0.5 rounded-full shadow"
            style={{ background: badge.bg_color || "#dc2626", color: badge.color || "#ffffff" }}
          >
            {badge.icon ? `${badge.icon} ` : ""}{badge.text}
          </span>
        )}

        <div className="flex items-center gap-2 mb-1">
          <span className="font-black text-sm">{[v.flavor, v.size].filter(Boolean).join(" · ")}</span>
          {active && <Check size={14} className="text-green-600" />}
        </div>

        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-lg font-black text-gray-900">₹{v.price}</span>
          {compare && <span className="text-xs text-gray-400 line-through">₹{compare}</span>}
          {compare && config.show_save_chip !== false && savePct > 0 && (
            <span className="text-[10px] font-black bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
              SAVE {savePct}%
            </span>
          )}
        </div>

        {perDay !== null && (
          <p className="text-[11px] text-gray-500 mt-0.5">just ₹{perDay}/day</p>
        )}
        {offer && <p className="text-[11px] text-orange-700 font-bold mt-1">🎁 {offer}</p>}
        {oos && <p className="text-[10px] font-black text-red-500 uppercase mt-1">Out of stock</p>}
      </button>
    );
  };

  if (mode === "tabs") {
    return (
      <div>
        <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Choose pack</p>
        <div className="flex border-b-2 border-gray-200 overflow-x-auto">
          {variants.map((v) => {
            const active = isActive(v);
            return (
              <button
                key={variantKey(v)}
                type="button"
                onClick={() => onSelect(v.flavor || "", v.size || "")}
                className={`px-4 py-2 text-xs font-bold whitespace-nowrap border-b-2 -mb-0.5 ${
                  active ? "border-gray-900 text-gray-900" : "border-transparent text-gray-500"
                }`}
              >
                {[v.flavor, v.size].filter(Boolean).join(" · ")}
              </button>
            );
          })}
        </div>
        <div className="mt-3">{card(variants.find(isActive) || variants[0])}</div>
      </div>
    );
  }

  // radio-cards (default)
  return (
    <div>
      <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3">Choose pack</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {variants.map(card)}
      </div>
    </div>
  );
}
