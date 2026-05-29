// @ts-nocheck
/**
 * Lite locale switcher — reads hreflang config from marketing_settings (already
 * loaded by __root). Hidden if admin hasn't configured multi-region. Pure HTML
 * <a> for zero JS weight on 2G.
 */
import { useQuery } from "@tanstack/react-query";
import { getMarketingPublic } from "@/lib/marketing.functions";

type HrefEntry = { hreflang: string; href: string; label?: string };

export default function LocaleSwitcher({ className = "" }: { className?: string }) {
  const { data } = useQuery({
    queryKey: ["marketing-public"],
    queryFn: () => getMarketingPublic(),
    staleTime: 1000 * 60 * 10,
  });
  const list: HrefEntry[] = ((data as any)?.config?.hreflang ?? []).filter(
    (h: any) => h?.hreflang && h?.href,
  );
  if (list.length < 2) return null;

  const current =
    typeof navigator !== "undefined" ? navigator.language?.toLowerCase() : "";

  return (
    <nav aria-label="Choose region" className={`flex flex-wrap gap-2 text-xs ${className}`}>
      {list.map((h) => {
        const active = current?.startsWith(h.hreflang.toLowerCase().split("-")[0]);
        return (
          <a
            key={h.hreflang}
            href={h.href}
            hrefLang={h.hreflang}
            rel={active ? undefined : "alternate"}
            className={`rounded border px-2 py-1 ${
              active
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {h.label || h.hreflang.toUpperCase()}
          </a>
        );
      })}
    </nav>
  );
}
