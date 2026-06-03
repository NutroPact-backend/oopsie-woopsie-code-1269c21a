// @ts-nocheck
import { createFileRoute } from "@tanstack/react-router";
import TestimonialsPage from "@/pages/TestimonialsPage";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/testimonials")({
  loader: async () => {
    try {
      const { data } = await supabase
        .from("testimonials")
        .select("user_name,title,comment,rating,created_at")
        .eq("is_approved", true)
        .order("created_at", { ascending: false })
        .limit(50);
      return { testimonials: data || [] };
    } catch { return { testimonials: [] }; }
  },
  head: ({ loaderData }) => {
    const testimonials = loaderData?.testimonials || [];
    const ratings = testimonials.map((t: any) => Number(t.rating) || 0).filter((n: number) => n > 0);
    const avg = ratings.length ? (ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length) : 0;
    const url = "/testimonials";
    const scripts: any[] = [];
    if (ratings.length >= 3) {
      // Brand-level AggregateRating + individual reviews — boosts AI Overview citations.
      const reviewItems = testimonials
        .filter((t: any) => t.comment && Number(t.rating) > 0)
        .slice(0, 20)
        .map((t: any) => ({
          "@type": "Review",
          author: { "@type": "Person", name: t.user_name || "Verified customer" },
          datePublished: t.created_at,
          reviewBody: t.comment,
          name: t.title || undefined,
          reviewRating: {
            "@type": "Rating",
            ratingValue: String(t.rating),
            bestRating: "5",
            worstRating: "1",
          },
        }));
      scripts.push({
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "NutroPact",
          url: "https://www.nutropact.com",
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: avg.toFixed(1),
            reviewCount: ratings.length,
            bestRating: "5",
            worstRating: "1",
          },
          review: reviewItems,
        }),
      });
    }
    scripts.push({
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: "/" },
          { "@type": "ListItem", position: 2, name: "Testimonials", item: url },
        ],
      }),
    });
    return {
      meta: [
        { title: "Customer Testimonials — Real Reviews | NutroPact" },
        { name: "description", content: "Real verified reviews from NutroPact customers across India — see how our lab-tested protein, creatine, and supplements deliver results." },
        { property: "og:title", content: "Customer Testimonials — Real Reviews | NutroPact" },
        { property: "og:description", content: "Real reviews from NutroPact customers across India." },
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts,
    };
  },
  component: TestimonialsPage,
});
