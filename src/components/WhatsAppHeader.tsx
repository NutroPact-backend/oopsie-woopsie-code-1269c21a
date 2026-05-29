// @ts-nocheck
import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { listPublicWhatsAppChannels } from "@/lib/whatsappChannels.functions";
import { useLocation } from "@tanstack/react-router";

function WhatsAppIcon({ size = 22, color }: { size?: number; color?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width={size} height={size}
      fill={color ?? "currentColor"} aria-hidden="true">
      <path d="M19.11 17.205c-.372 0-1.088 1.39-1.518 1.39a.63.63 0 0 1-.315-.1c-.802-.402-1.504-.817-2.163-1.447-.545-.516-1.146-1.29-1.46-1.963a.426.426 0 0 1-.073-.215c0-.33.99-.945.99-1.49 0-.143-.73-2.09-.832-2.335-.143-.372-.214-.487-.6-.487-.187 0-.36-.043-.53-.043-.302 0-.53.115-.746.315-.688.645-1.032 1.318-1.06 2.264v.114c-.015.99.472 1.977 1.017 2.78 1.23 1.82 2.506 3.41 4.554 4.34.616.287 2.035.888 2.722.888.817 0 2.15-.515 2.478-1.318.13-.33.231-.715.231-1.06 0-.058 0-.114-.014-.171-.05-.244-1.745-1.06-1.99-1.06zm-2.96 7.062a10.32 10.32 0 0 1-5.214-1.418l-3.65.954.954-3.5a10.27 10.27 0 0 1-1.55-5.4c0-5.687 4.63-10.317 10.317-10.317 5.686 0 10.316 4.63 10.316 10.317-.001 5.687-4.63 10.317-10.317 10.317l-.857.046zm0-22.487C9.305 1.78 3.71 7.375 3.71 14.225a12.32 12.32 0 0 0 1.65 6.165L3.385 27.72l7.515-1.962a12.42 12.42 0 0 0 5.245 1.175h.005c6.85 0 12.443-5.595 12.445-12.444 0-3.32-1.295-6.444-3.645-8.795A12.343 12.343 0 0 0 16.15 1.78z" />
    </svg>
  );
}

function pageKeyFromPath(pathname: string): string {
  if (pathname === "/") return "home";
  if (pathname.startsWith("/products")) return "products";
  if (pathname.startsWith("/cart")) return "cart";
  if (pathname.startsWith("/checkout")) return "checkout";
  if (pathname.startsWith("/account")) return "account";
  if (pathname.startsWith("/blog")) return "blog";
  if (pathname.startsWith("/about")) return "about";
  if (pathname.startsWith("/contact")) return "contact";
  if (pathname.startsWith("/faq")) return "faq";
  return pathname.replace(/^\//, "").split("/")[0] || "other";
}

function isWithinHours(hours: any): boolean {
  if (!hours || typeof hours !== "object" || !hours.start || !hours.end) return true;
  try {
    const now = new Date();
    const hhmm = now.getHours() * 60 + now.getMinutes();
    const [sh, sm] = String(hours.start).split(":").map(Number);
    const [eh, em] = String(hours.end).split(":").map(Number);
    const s = sh * 60 + (sm || 0);
    const e = eh * 60 + (em || 0);
    return hhmm >= s && hhmm <= e;
  } catch { return true; }
}

function buildHref(ch: any, online: boolean, pageKey: string) {
  const num = (ch.phone_e164 || "").replace(/\D/g, "");
  const msg = online ? ch.message_template : (ch.offline_message || ch.message_template);
  const text = String(msg || "").replace(/\{page\}/g, pageKey);
  return `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
}

function WhatsAppHeaderInner({ slot }: { slot: string }) {
  const { isEnabled } = useFeatureFlags();
  const fn = useServerFn(listPublicWhatsAppChannels);
  const { data } = useQuery({
    queryKey: ["whatsapp-channels-public"],
    queryFn: () => fn({}),
    staleTime: 5 * 60_000,
    enabled: isEnabled("whatsapp_header"),
  });
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (!isEnabled("whatsapp_header")) return null;
  const channels = (data?.channels ?? []) as any[];
  const pageKey = pageKeyFromPath(location.pathname);

  // Filter by page + device + slot
  const visible = channels.filter((c) => {
    const pages: string[] = c.show_on_pages || ["global"];
    const pageOk = pages.includes("global") || pages.includes(pageKey);
    const deviceOk = isMobile ? !c.hide_on_mobile : !c.hide_on_desktop;
    const slotOk = c.position === slot;
    return pageOk && deviceOk && slotOk;
  });
  if (visible.length === 0) return null;

  const renderIcon = (c: any) => {
    if (c.icon_style === "custom-svg" && c.custom_icon_url) {
      return <img src={c.custom_icon_url} alt="" width={22} height={22} loading="lazy" />;
    }
    const color = c.icon_style === "custom-color" ? c.icon_color : undefined;
    return <WhatsAppIcon size={22} color={color} />;
  };
  const btnBg = (c: any) => {
    if (c.icon_style === "brand-green" || c.icon_style === "filled") return "bg-[#25D366] text-white hover:bg-[#128C7E]";
    return "bg-white text-[#25D366] border border-[#25D366]/30 hover:bg-[#25D366]/10";
  };

  // Single channel → single icon button
  if (visible.length === 1) {
    const c = visible[0];
    const online = isWithinHours(c.business_hours);
    return (
      <a href={buildHref(c, online, pageKey)} target="_blank" rel="noopener noreferrer"
        title={c.label} aria-label={c.label}
        className={`inline-flex items-center justify-center w-10 h-10 rounded-full transition shadow-sm ${btnBg(c)}`}
        onClick={() => { try { (window as any).gtag?.("event", "whatsapp_header_click", { label: c.label }); } catch {} }}>
        {renderIcon(c)}
      </a>
    );
  }

  // Multi channel → dropdown
  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center justify-center w-10 h-10 rounded-full transition shadow-sm ${btnBg(visible[0])}`}
        aria-label="Chat on WhatsApp" aria-expanded={open}>
        {renderIcon(visible[0])}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
            <div className="px-3 py-2 text-xs font-bold text-gray-500 border-b">Chat with us</div>
            {visible.map((c) => {
              const online = isWithinHours(c.business_hours);
              return (
                <a key={c.id} href={buildHref(c, online, pageKey)} target="_blank" rel="noopener noreferrer"
                  onClick={() => { setOpen(false); try { (window as any).gtag?.("event", "whatsapp_header_click", { label: c.label }); } catch {} }}
                  className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition">
                  <span className="w-8 h-8 rounded-full bg-[#25D366]/10 text-[#25D366] flex items-center justify-center">
                    <WhatsAppIcon size={18} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-gray-900 truncate">{c.label}</span>
                    <span className="block text-[11px] text-gray-500">
                      {online ? <><span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full mr-1 align-middle"></span>Online now</> : "Reply when available"}
                    </span>
                  </span>
                </a>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default function WhatsAppHeader({ slot }: { slot: "header-right" | "header-left" | "before-cart" }) {
  return (
    <div data-whatsapp-slot={slot}>
      <WhatsAppHeaderInner slot={slot} />
    </div>
  );
}
