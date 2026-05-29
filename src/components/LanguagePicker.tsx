// @ts-nocheck
/**
 * LanguagePicker — compact dropdown for switching locale.
 * - Updates local i18n store immediately.
 * - If user is signed in, best-effort persists to profile via server fn.
 * - Lite-mode safe: zero deps, no portals, native <select>.
 */
import { useEffect, useState } from "react";
import { Languages } from "lucide-react";
import { useLocale } from "@/lib/i18n";
import { LOCALES, type LocaleCode } from "@/lib/locales";
import { setMyLanguage, getMyLanguage } from "@/lib/translations.functions";
import { useServerFn } from "@tanstack/react-start";
import { useAuthStore } from "@/store/authStore";
import { syncLocaleFromProfile } from "@/lib/i18n";

type Variant = "header" | "drawer" | "inline";

export default function LanguagePicker({ variant = "header" }: { variant?: Variant }) {
  const [loc, setLoc] = useLocale();
  const { user } = useAuthStore();
  const saveFn = useServerFn(setMyLanguage);
  const readFn = useServerFn(getMyLanguage);
  const [busy, setBusy] = useState(false);

  // On first mount when signed in, pull profile language and sync down.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    readFn({})
      .then((r) => { if (!cancelled && r?.language) syncLocaleFromProfile(r.language); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user]);

  const onChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value as LocaleCode;
    setLoc(next);
    if (!user) return;
    setBusy(true);
    try { await saveFn({ data: { language: next } }); } catch { /* silent */ }
    setBusy(false);
  };

  const base = "appearance-none bg-transparent border rounded-full pl-8 pr-7 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer";
  const skins: Record<Variant, string> = {
    header: "border-gray-300 text-gray-800 hover:border-gray-400",
    drawer: "border-white/30 text-white bg-transparent",
    inline: "border-gray-300 text-gray-800 w-full",
  };

  return (
    <label className={`relative inline-flex items-center ${variant === "inline" ? "w-full" : ""}`} aria-label="Language">
      <Languages size={14} className="absolute left-2.5 opacity-70 pointer-events-none" />
      <select
        value={loc}
        onChange={onChange}
        disabled={busy}
        className={`${base} ${skins[variant]}`}
        style={{ backgroundColor: variant === "drawer" ? "transparent" : undefined }}
      >
        {LOCALES.map((l) => (
          <option key={l.code} value={l.code} className="text-gray-900">
            {l.native}
          </option>
        ))}
      </select>
      <svg className="absolute right-2 pointer-events-none opacity-60" width="10" height="10" viewBox="0 0 10 10"><path d="M1 3l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
    </label>
  );
}
