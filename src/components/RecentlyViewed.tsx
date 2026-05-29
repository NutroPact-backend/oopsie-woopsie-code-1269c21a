// @ts-nocheck
import { Link } from '@tanstack/react-router';
import { useRecentlyViewed } from '@/lib/recentlyViewed';
import { formatPrice } from '@/lib/utils';

interface Props {
  excludeSlug?: string;
  title?: string;
  className?: string;
}

export default function RecentlyViewed({ excludeSlug, title = 'Recently viewed', className = '' }: Props) {
  const items = useRecentlyViewed(excludeSlug);
  if (!items.length) return null;

  return (
    <section className={`w-full ${className}`} aria-label="Recently viewed products">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <h2 className="mb-4 text-base font-semibold text-foreground sm:text-lg">{title}</h2>
        <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&amp;::-webkit-scrollbar]:hidden">
          {items.map(it => (
            <Link
              key={it.slug}
              to="/products/$slug"
              params={{ slug: it.slug }}
              className="group flex w-32 shrink-0 snap-start flex-col rounded-lg border border-border bg-card p-2 transition hover:border-primary/50 sm:w-36"
            >
              <div className="aspect-square w-full overflow-hidden rounded-md bg-muted">
                {it.image ? (
                  <img
                    src={it.image}
                    alt={it.name}
                    width={144}
                    height={144}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition group-hover:scale-105"
                  />
                ) : null}
              </div>
              <p className="mt-2 line-clamp-2 text-xs font-medium text-foreground">{it.name}</p>
              {typeof it.price === 'number' && (
                <p className="mt-0.5 text-xs font-semibold text-primary">{formatPrice(it.price)}</p>
              )}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
