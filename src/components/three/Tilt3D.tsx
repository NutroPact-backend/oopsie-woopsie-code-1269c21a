// @ts-nocheck
/**
 * Tilt3D + AutoTilt3D
 * ------------------------------------------------------------------
 * Pure CSS 3D tilt — no WebGL, works on every device, SEO-safe.
 *
 * <Tilt3D> wraps any element and tilts it on mousemove with a soft
 * glare layer. <AutoTilt3D> is a mount-once global that finds every
 * element with `data-tilt` and wires the same effect, so we can opt-in
 * existing markup (product cards, images) without rewriting it.
 */
import { useEffect, useRef } from "react";
import type { ReactNode, CSSProperties } from "react";

function attach(el: HTMLElement, max = 12) {
  el.style.transformStyle = "preserve-3d";
  el.style.transition = "transform 200ms ease-out";
  el.style.willChange = "transform";

  const onMove = (e: MouseEvent) => {
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(900px) rotateY(${x * max}deg) rotateX(${-y * max}deg) translateZ(0)`;
  };
  const onLeave = () => {
    el.style.transform = "perspective(900px) rotateY(0) rotateX(0) translateZ(0)";
  };
  el.addEventListener("mousemove", onMove);
  el.addEventListener("mouseleave", onLeave);
  return () => {
    el.removeEventListener("mousemove", onMove);
    el.removeEventListener("mouseleave", onLeave);
    el.style.transform = "";
  };
}

export function Tilt3D({
  children,
  max = 12,
  className,
  style,
}: {
  children: ReactNode;
  max?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    if (window.matchMedia?.("(pointer: coarse)").matches) return; // skip on touch
    return attach(ref.current, max);
  }, [max]);
  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  );
}

/** Mounts once. Wires `[data-tilt]` elements anywhere on the page. */
export function AutoTilt3D() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(pointer: coarse)").matches) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const wired = new WeakMap<HTMLElement, () => void>();
    // Selectors we want to auto-promote to 3D-tilt targets across the site.
    // Kept conservative so we don't tilt inputs, nav, or hero text.
    const AUTO_SELECTORS = [
      "[data-product-card]",
      ".product-card",
      ".hp-product-card",
      "[data-3d]",
      ".feature-card-3d",
    ].join(",");

    const sweep = () => {
      // auto-tag known card patterns
      document.querySelectorAll<HTMLElement>(AUTO_SELECTORS).forEach((el) => {
        if (!el.hasAttribute("data-tilt")) el.setAttribute("data-tilt", "");
      });
      document.querySelectorAll<HTMLElement>("[data-tilt]:not([data-tilt-wired])").forEach((el) => {
        const max = Number(el.dataset.tiltMax || 12);
        const cleanup = attach(el, max);
        wired.set(el, cleanup);
        el.setAttribute("data-tilt-wired", "1");
      });
    };

    sweep();
    const mo = new MutationObserver(() => sweep());
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      mo.disconnect();
      document.querySelectorAll<HTMLElement>("[data-tilt-wired]").forEach((el) => {
        wired.get(el)?.();
        el.removeAttribute("data-tilt-wired");
      });
    };
  }, []);
  return null;
}

/** Depth-parallax image: foreground image with subtle layered shadow that
 *  shifts opposite the cursor to fake depth. Works on any 2D image. */
export function DepthParallaxImage({
  src,
  alt,
  className,
  style,
  depth = 18,
}: {
  src: string;
  alt: string;
  className?: string;
  style?: CSSProperties;
  depth?: number;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const img = useRef<HTMLImageElement>(null);
  const shadow = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    if (window.matchMedia?.("(pointer: coarse)").matches) return;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      if (img.current)
        img.current.style.transform = `translate3d(${x * depth}px, ${y * depth}px, 0) scale(1.03)`;
      if (shadow.current)
        shadow.current.style.transform = `translate3d(${-x * depth * 1.5}px, ${-y * depth * 1.5}px, 0)`;
    };
    const onLeave = () => {
      if (img.current) img.current.style.transform = "translate3d(0,0,0) scale(1)";
      if (shadow.current) shadow.current.style.transform = "translate3d(0,0,0)";
    };
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, [depth]);

  return (
    <div
      ref={wrap}
      className={className}
      style={{ position: "relative", perspective: "1000px", ...style }}
    >
      <div
        ref={shadow}
        aria-hidden
        style={{
          position: "absolute",
          inset: "10%",
          background: "radial-gradient(ellipse, rgba(0,0,0,0.35), transparent 70%)",
          filter: "blur(30px)",
          transition: "transform 300ms ease-out",
          zIndex: 0,
        }}
      />
      <img
        ref={img}
        src={src}
        alt={alt}
        loading="lazy"
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          objectFit: "contain",
          transition: "transform 300ms ease-out",
          zIndex: 1,
        }}
      />
    </div>
  );
}