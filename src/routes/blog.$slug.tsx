// @ts-nocheck
import { createFileRoute, notFound } from "@tanstack/react-router";
import BlogPostPage from "@/pages/BlogPostPage";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/blog/$slug")({
  loader: async ({ params }) => {
    const { data } = await supabase
      .from("blog_posts")
      .select("title,slug,excerpt,image,author,created_at,updated_at,published")
      .eq("slug", params.slug)
      .eq("published", true)
      .maybeSingle();
    if (!data) throw notFound();
    return { post: data };
  },
  head: ({ params, loaderData }) => {
    const post = loaderData?.post;
    const title = post ? `${post.title} | NutroPact Blog` : "Blog Post — NutroPact";
    const rawDesc = (post?.excerpt || `Read ${post?.title || "this article"} on the NutroPact blog — nutrition, training, and wellness insights for serious athletes.`).replace(/\s+/g, " ").trim();
    const desc = rawDesc.length > 160 ? rawDesc.slice(0, 157) + "…" : (rawDesc.length < 60 ? `${rawDesc} Expert nutrition and training insights from the NutroPact team.` : rawDesc);
    const url = `/blog/${params.slug}`;
    const meta: Array<Record<string, string>> = [
      { title },
      { name: "description", content: desc },
      { property: "og:title", content: title },
      { property: "og:description", content: desc },
      { property: "og:type", content: "article" },
      { property: "og:url", content: url },
    ];
    const ogImage = post?.image || "https://www.nutropact.com/og-image.jpg";
    meta.push({ property: "og:image", content: ogImage });
    meta.push({ property: "og:image:alt", content: post?.title || "NutroPact Blog" });
    meta.push({ name: "twitter:image", content: ogImage });
    return {
      meta,
      links: [{ rel: "canonical", href: url }],
      scripts: post ? [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: post.title,
            description: desc,
            image: post.image || undefined,
            author: { "@type": "Person", name: post.author || "NutroPact Team" },
            datePublished: post.created_at,
            dateModified: post.updated_at,
            mainEntityOfPage: { "@type": "WebPage", "@id": `https://www.nutropact.com${url}` },
            publisher: {
              "@type": "Organization",
              name: "NutroPact",
              logo: { "@type": "ImageObject", url: "https://www.nutropact.com/favicon.svg" },
            },
            speakable: {
              "@type": "SpeakableSpecification",
              cssSelector: ["h1", "article p"],
            },
            inLanguage: "en-IN",
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: "/" },
              { "@type": "ListItem", position: 2, name: "Blog", item: "/blog" },
              { "@type": "ListItem", position: 3, name: post.title, item: url },
            ],
          }),
        },
      ] : [],
    };
  },
  component: BlogPostPage,
});
