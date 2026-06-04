// @ts-nocheck
import { createFileRoute, notFound } from "@tanstack/react-router";
import ProductPage from "@/pages/ProductPage";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/products/$slug")({
  loader: async ({ params }) => {
    const { data } = await supabase
      .from("products")
      .select("id,name,slug,short_description,description,price,compare_price,images,sku,stock,rating,review_count")
      .eq("slug", params.slug)
      .maybeSingle();
    if (!data) throw notFound();
    // Pull top approved Q&A + reviews for richer JSON-LD (AEO + Reputation).
    const [qa, reviews] = await Promise.all([
      supabase
        .from("product_questions")
        .select("question,answer,user_name,created_at")
        .eq("product_id", data.id)
        .eq("is_approved", true)
        .not("answer", "is", null)
        .order("helpful_count", { ascending: false })
        .limit(5),
      supabase
        .from("product_reviews")
        .select("rating,title,comment,user_name,created_at")
        .eq("product_id", data.id)
        .eq("is_approved", true)
        .order("helpful_count", { ascending: false })
        .limit(5),
    ]);
    return { product: data, qa: qa.data || [], reviews: reviews.data || [] };
  },
  head: ({ params, loaderData }) => {
    const p = loaderData?.product;
    const qa = loaderData?.qa || [];
    const reviews = loaderData?.reviews || [];
    const name = p?.name || "Product";
    const rawDesc = (p?.short_description || p?.description || `Buy ${name} at NutroPact. Lab-tested, authentic supplements with free delivery above ₹999.`).replace(/\s+/g, " ").trim();
    const desc = rawDesc.length > 160 ? rawDesc.slice(0, 157) + "…" : (rawDesc.length < 60 ? `${rawDesc} Lab-tested, authentic, free delivery above ₹999 across India.` : rawDesc);
    const title = `${name} — Buy Online | NutroPact`;
    const image = Array.isArray(p?.images) && p?.images?.[0] ? String(p.images[0]) : undefined;
    const url = `/products/${params.slug}`;
    const meta: Array<Record<string, string>> = [
      { title },
      { name: "description", content: desc },
      { property: "og:title", content: title },
      { property: "og:description", content: desc },
      { property: "og:type", content: "product" },
      { property: "og:url", content: url },
    ];
    const ogImage = image || "https://www.nutropact.com/og-image.jpg";
    meta.push({ property: "og:image", content: ogImage });
    meta.push({ property: "og:image:alt", content: `${name} — NutroPact` });
    meta.push({ name: "twitter:image", content: ogImage });
    return {
      meta,
      links: [{ rel: "canonical", href: url }],
      scripts: p ? [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name,
            description: desc,
            image: image ? [image] : undefined,
            sku: p.sku || undefined,
            brand: { "@type": "Brand", name: "NutroPact" },
            offers: {
              "@type": "Offer",
              url,
              priceCurrency: "INR",
              price: p.price,
              availability: (p.stock ?? 0) > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            },
            ...(Number(p.rating) > 0 && Number(p.review_count) > 0 ? {
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: Number(p.rating).toFixed(1),
                reviewCount: Number(p.review_count),
                bestRating: "5",
                worstRating: "1",
              },
            } : {}),
            ...(reviews.length ? {
              review: reviews.map((r: any) => ({
                "@type": "Review",
                author: { "@type": "Person", name: r.user_name || "Verified buyer" },
                datePublished: r.created_at,
                reviewBody: r.comment || r.title || "",
                name: r.title || undefined,
                reviewRating: { "@type": "Rating", ratingValue: String(r.rating), bestRating: "5", worstRating: "1" },
              })),
            } : {}),
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: "/" },
              { "@type": "ListItem", position: 2, name: "Products", item: "/products" },
              { "@type": "ListItem", position: 3, name, item: url },
            ],
          }),
        },
        ...(qa.length ? [{
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "QAPage",
            mainEntity: qa.map((q: any) => ({
              "@type": "Question",
              name: q.question,
              answerCount: 1,
              acceptedAnswer: { "@type": "Answer", text: q.answer, dateCreated: q.created_at },
            })),
          }),
        }] : []),
      ] : [],
    };
  },
  component: ProductPage,
});
