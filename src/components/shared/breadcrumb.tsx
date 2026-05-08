import { Link } from '@/i18n/navigation';
import { IconChevronRight } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import type { ComponentProps } from 'react';

type LinkHref = ComponentProps<typeof Link>['href'];

export type BreadcrumbItem = {
  name: string;
  /** When omitted, the item is rendered as the current page (no link). */
  href?: LinkHref;
};

type BreadcrumbProps = {
  items: BreadcrumbItem[];
};

/**
 * Visual breadcrumb that mirrors the BreadcrumbList JSON-LD on the page. Pair
 * with `breadcrumbLd()` so search results show the same trail.
 */
export function Breadcrumb({ items }: BreadcrumbProps) {
  const t = useTranslations('common');
  if (items.length === 0) return null;
  return (
    <nav aria-label={t('breadcrumb')} className="text-foreground-muted text-sm">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <li key={`${item.name}-${idx}`} className="flex items-center gap-1.5">
              {item.href && !isLast ? (
                <Link href={item.href} className="hover:text-foreground transition-colors">
                  {item.name}
                </Link>
              ) : (
                <span aria-current={isLast ? 'page' : undefined} className="text-foreground">
                  {item.name}
                </span>
              )}
              {!isLast ? (
                <IconChevronRight size={12} aria-hidden className="text-foreground-muted" />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
