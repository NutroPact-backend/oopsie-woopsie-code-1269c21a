// @ts-nocheck
/**
 * Renders category (and sub-category) links that admin has marked as
 * visible on the given page. Drop into any page:
 *   <CategoryLinks pageKey="home" />
 * Lite-mode: uses cached fetchCategories (1 min TTL), no extra network.
 */
import { useEffect, useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { fetchCategories, type Category } from "@/hooks/useCategories";

interface Props {
  pageKey: string;
  title?: string;
  className?: string;
  showSubcategories?: boolean;
}

export default function CategoryLinks({ pageKey, title, className = "", showSubcategories = true }: Props) {
  const [cats, setCats] = useState<Category[]>([]);
  useEffect(() => {
    let alive = true;
    fetchCategories().then((rows) => alive && setCats(rows)).catch(() => {});
    return () => { alive = false; };
  }, []);

  const visible = useMemo(() => {
    const match = (c: Category) => {
      const v = c.visible_on_pages || [];
      return v.includes(pageKey) || v.includes("global");
    };
    const parents = cats.filter((c) => !c.parent_id && match(c));
    return parents.map((p) => ({
      ...p,
      children: showSubcategories ? cats.filter((c) => c.parent_id === p.id && match(c)) : [],
    }));
  }, [cats, pageKey, showSubcategories]);

  if (visible.length === 0) return null;

  return (
    <nav aria-label={title || "Categories"} className={className}>
      {title && <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500 mb-3">{title}</h3>}
      <ul className="flex flex-wrap gap-2">
        {visible.map((p) => (
          <li key={p.id} className="flex flex-col">
            <Link
              to={`/category/${p.slug}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-50 hover:bg-orange-100 text-orange-700 text-sm font-semibold border border-orange-100"
            >
              {p.icon && <span>{p.icon}</span>}
              {p.name}
            </Link>
            {p.children.length > 0 && (
              <ul className="mt-1 ml-3 flex flex-wrap gap-1">
                {p.children.map((c) => (
                  <li key={c.id}>
                    <Link
                      to={`/category/${c.slug}`}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-medium border border-gray-200"
                    >
                      {c.icon && <span>{c.icon}</span>}
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
