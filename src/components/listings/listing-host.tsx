import type { Listing } from '@/types';
import { IconUser } from '@tabler/icons-react';
import { useTranslations } from 'next-intl';

type ListingHostProps = {
  listing: Listing;
};

/**
 * Mock host info derived from listing metadata. Real host data will plug in
 * once the schema supports a Host relation; until then we fabricate a name
 * from the slug and "member since" from createdAt.
 */
const hostNameFromSlug = (slug: string): string => {
  const tail = slug.split('-').slice(0, 2).join(' ');
  return tail ? tail.replace(/\b\w/g, (c) => c.toUpperCase()) : 'IRayon Host';
};

export function ListingHost({ listing }: ListingHostProps) {
  const t = useTranslations('detail');
  const name = hostNameFromSlug(listing.slug);
  const year = new Date(listing.createdAt).getFullYear();

  return (
    <section className="border-border flex items-center gap-4 border-y py-6">
      <div
        className="bg-accent text-primary grid h-12 w-12 place-items-center rounded-full"
        aria-hidden
      >
        <IconUser size={24} />
      </div>
      <div>
        <p className="font-medium">{t('host', { name })}</p>
        <p className="text-foreground-muted text-sm">{t('memberSince', { year })}</p>
      </div>
    </section>
  );
}
