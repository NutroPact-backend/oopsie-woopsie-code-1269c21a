// @ts-nocheck
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { listPageBackgrounds } from "@/lib/page-backgrounds.functions";

type Bg = {
  page_key: string;
  image_url: string | null;
  opacity: number;
  enabled: boolean;
  position: string;
  size: string;
  repeat: string;
  blend_mode: string;
};

// Map current pathname → preferred page_key. Falls back to "global".
function pathToKey(pathname: string): string {
  if (pathname === "/" || pathname === "") return "home";
  const seg = pathname.replace(/^\/+/, "").split("/")[0].toLowerCase();
  return seg || "global";
}

export default function PageBackground() {
  const router = useRouter();
  const pathname = router.state.location.pathname;
  const { data } = useQuery({
    queryKey: ["page-backgrounds"],
    queryFn: () => listPageBackgrounds(),
    staleTime: 5 * 60_000,
  });

  if (pathname.startsWith("/admin")) return null;
  const list: Bg[] = (data?.backgrounds as any) ?? [];
  if (!list.length) return null;

  const key = pathToKey(pathname);
  const bg = list.find((b) => b.page_key === key && b.enabled && b.image_url)
    ?? list.find((b) => b.page_key === "global" && b.enabled && b.image_url);
  if (!bg || !bg.image_url) return null;

  // Fixed full-viewport layer. `100vw/100dvh` keeps it edge-to-edge on every
  // screen size; `background-size: cover` + center keeps the image responsive
  // (no cropping bias on portrait phones vs wide desktops). We avoid
  // `background-attachment: fixed` because it's broken on iOS Safari and
  // hurts scroll perf on low-end Android — `position: fixed` on the layer
  // itself already gives the same parallax-free effect cross-device.
  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100dvh",
        zIndex: -1,
        pointerEvents: "none",
        backgroundImage: `url(${bg.image_url})`,
        backgroundPosition: bg.position,
        backgroundSize: bg.size,
        backgroundRepeat: bg.repeat,
        opacity: bg.opacity,
        mixBlendMode: bg.blend_mode as any,
      }}
    />
  );
}
