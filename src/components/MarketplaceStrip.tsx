// @ts-nocheck
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getGrowthBoosters } from "@/lib/growthBoosters.functions";
import SmartImg from "@/components/SmartImg";

export default function MarketplaceStrip() {
  const get = useServerFn(getGrowthBoosters);
  const [data, setData] = useState<any>(null);
  useEffect(() => { get({}).then(setData).catch(() => {}); }, []);
  const m = data?.marketplace;
  if (!m?.enabled) return null;
  const brands = (m.brands || []).filter((b: any) => b.enabled && b.logo && b.url);
  if (!brands.length) return null;
  return (
    <div className="border-t border-black/10 pt-4 pb-2 max-w-1400 mx-auto" style={{ maxWidth: 1400 }}>
      <p className="text-center text-xs font-bold opacity-70 mb-3 uppercase tracking-wider">{m.heading || "Also available on"}</p>
      <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-6 px-4">
        {brands.map((b: any) => (
          <a key={b.id} href={b.url} target="_blank" rel="noopener noreferrer" aria-label={b.label}
            className="opacity-70 hover:opacity-100 transition grayscale hover:grayscale-0">
            <SmartImg src={b.logo} alt={b.label} className="h-7 sm:h-8 w-auto object-contain" loading="lazy" decoding="async" />
          </a>
        ))}
      </div>
    </div>
  );
}
