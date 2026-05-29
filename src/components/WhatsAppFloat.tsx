// @ts-nocheck
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useLocation } from "@tanstack/react-router";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { listPublicWhatsAppChannels } from "@/lib/whatsappChannels.functions";
import { useSettings } from "@/lib/useSettings";

function WhatsAppIcon({ size = 28, color }: { size?: number; color?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width={size} height={size}
      fill={color ?? "currentColor"} aria-hidden="true">
      <path d="M19.11 17.205c-.372 0-1.088 1.39-1.518 1.39a.63.63 0 0 1-.315-.1c-.802-.402-1.504-.817-2.163-1.447-.545-.516-1.146-1.29-1.46-1.963a.426.426 0 0 1-.073-.215c0-.33.99-.945.99-1.49 0-.143-.73-2.09-.832-2.335-.143-.372-.214-.487-.6-.487-.187 0-.36-.043-.53-.043-.302 0-.53.115-.746.315-.688.645-1.032 1.318-1.06 2.264v.114c-.015.99.472 1.977 1.017 2.78 1.23 1.82 2.506 3.41 4.554 4.34.616.287 2.035.888 2.722.888.817 0 2.15-.515 2.478-1.318.13-.33.231-.715.231-1.06 0-.058 0-.114-.014-.171-.05-.244-1.745-1.06-1.99-1.06zm-2.96 7.062a10.32 10.32 0 0 1-5.214-1.418l-3.65.954.954-3.5a10.27 10.27 0 0 1-1.55-5.4c0-5.687 4.63-10.317 10.317-10.317 5.686 0 10.316 4.63 10.316 10.317-.001 5.687-4.63 10.317-10.317 10.317l-.857.046zm0-22.487C9.305 1.78 3.71 7.375 3.71 14.225a12.32 12.32 0 0 0 1.65 6.165L3.385 27.72l7.515-1.962a12.42 12.42 0 0 0 5.245 1.175h.005c6.85 0 12.443-5.595 12.445-12.444 0-3.32-1.295-6.444-3.645-8.795A12.343 12.343 0 0 0 16.15 1.78z" />
    </svg>
  );
}

function pageKeyFromPath(p: string): string {
  if (p === "/") return "home";
  if (p.startsWith("/products")) return "products";
  if (p.startsWith("/cart")) return "cart";
  if (p.startsWith("/checkout")) return "checkout";
  if (p.startsWith("/account")) return "account";
  if (p.startsWith("/blog")) return "blog";
  if (p.startsWith("/about")) return "about";
  if (p.startsWith("/contact")) return "contact";
  if (p.startsWith("/faq")) return "faq";
  return p.replace(/^\//, "").split("/")[0] || "other";
}

function isOnline(hours: any): boolean {
  if (!hours || !hours.start || !hours.end) return true;
  try {
    const now = new Date();
    const m = now.getHours() * 60 + now.getMinutes();
    const [sh, sm] = String(hours.start).split(":").map(Number);
    const [eh, em] = String(hours.end).split(":").map(Number);
    return m >= sh * 60 + (sm || 0) && m <= eh * 60 + (em || 0);
  } catch { return true; }
}

function buildHref(c: any, online: boolean, pageKey: string) {
  const num = (c.phone_e164 || "").replace(/\D/g, "");
  const msg = online ? c.message_template : (c.offline_message || c.message_template);
  return `https://wa.me/${num}?text=${encodeURIComponent(String(msg || "").replace(/\{page\}/g, pageKey))}`;
}

/**
 * Floating WhatsApp bubble (bottom-right).
 * Prefers new whatsapp_channels (position='float') gated by feature_flag.whatsapp_header.
 * Falls back to legacy settings.whatsappNumber if no channels configured (back-compat).
 */
export default function WhatsAppFloat() {
  const { isEnabled, isLoading: flagsLoading } = useFeatureFlags();
  const fn = useServerFn(listPublicWhatsAppChannels);
  const { data, isLoading: chLoading } = useQuery({
    queryKey: ["whatsapp-channels-public"],
    queryFn: () => fn({}),
    staleTime: 5 * 60_000,
    enabled: isEnabled("whatsapp_header"),
  });
  const { settings } = useSettings();
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (flagsLoading || chLoading) return null;

  const featureOn = isEnabled("whatsapp_header");
  const channels = (data?.channels ?? []) as any[];
  const pageKey = pageKeyFromPath(location.pathname);

  // Filter float-position channels visible on this page + device
  const floats = featureOn
    ? channels.filter((c) => {
        if (c.position !== "float") return false;
        const pages: string[] = c.show_on_pages || ["global"];
        const pageOk = pages.includes("global") || pages.includes(pageKey);
        const deviceOk = isMobile ? !c.hide_on_mobile : !c.hide_on_desktop;
        return pageOk && deviceOk;
      })
    : [];

  // === Legacy fallback: no channels configured at all → use old settings.whatsappNumber ===
  if (floats.length === 0 && channels.length === 0) {
    const num = (settings?.whatsappNumber || "").replace(/\D/g, "");
    if (!num) return null;
    const href = `https://wa.me/${num}?text=${encodeURIComponent(settings?.whatsappMessage || "Hi, I want to know more.")}`;
    return (
      <a href={href} target="_blank" rel="noopener noreferrer"
        aria-label="Chat on WhatsApp" title="Chat on WhatsApp"
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-green-500/40 hover:bg-[#128C7E] active:scale-95 transition">
        <WhatsAppIcon size={30} />
      </a>
    );
  }

  if (floats.length === 0) return null;

  // Single float channel → single bubble
  if (floats.length === 1) {
    const c = floats[0];
    const online = isOnline(c.business_hours);
    const color = c.icon_style === "custom-color" ? (c.icon_color || undefined) : undefined;
    return (
      <a href={buildHref(c, online, pageKey)} target="_blank" rel="noopener noreferrer"
        aria-label={c.label} title={c.label}
        onClick={() => { try { (window as any).gtag?.("event", "whatsapp_float_click", { label: c.label }); } catch {} }}
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-green-500/40 hover:bg-[#128C7E] active:scale-95 transition">
        {c.icon_style === "custom-svg" && c.custom_icon_url
          ? <img src={c.custom_icon_url} alt="" width={30} height={30} loading="lazy" />
          : <WhatsAppIcon size={30} color={color} />}
      </a>
    );
  }

  // Multi float channels → expandable stack
  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open && (
        <div className="mb-3 flex flex-col gap-2 items-end">
          {floats.map((c) => {
            const online = isOnline(c.business_hours);
            return (
              <a key={c.id} href={buildHref(c, online, pageKey)} target="_blank" rel="noopener noreferrer"
                onClick={() => { setOpen(false); try { (window as any).gtag?.("event", "whatsapp_float_click", { label: c.label }); } catch {} }}
                className="flex items-center gap-2 bg-white rounded-full pl-3 pr-2 py-1.5 shadow-lg border border-gray-200 hover:bg-gray-50 transition">
                <span className="text-sm font-semibold text-gray-900 whitespace-nowrap">{c.label}</span>
                <span className="w-9 h-9 rounded-full bg-[#25D366] text-white flex items-center justify-center">
                  <WhatsAppIcon size={20} />
                </span>
              </a>
            );
          })}
        </div>
      )}
      <button onClick={() => setOpen(v => !v)} aria-label="Chat on WhatsApp" aria-expanded={open}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-green-500/40 hover:bg-[#128C7E] active:scale-95 transition">
        <WhatsAppIcon size={30} />
      </button>
    </div>
  );
}
