import { IconRiver } from '@/components/icons/icon-river';
import type { Listing, ListingCategory } from '@/types';
import {
  IconBeach,
  IconBed,
  IconMountain,
  IconRipple,
  IconTrees,
  IconUsers,
  type Icon,
} from '@tabler/icons-react';
import { useTranslations } from 'next-intl';

const CATEGORY_ICONS: Record<ListingCategory, Icon> = {
  mountain: IconMountain,
  forest: IconTrees,
  river: IconRiver,
  sea: IconBeach,
  lake: IconRipple,
};

type ListingHighlightsProps = {
  listing: Listing;
};

export function ListingHighlights({ listing }: ListingHighlightsProps) {
  const t = useTranslations('detail.highlights');
  // A listing may belong to multiple categories now. The highlight row only
  // has space for one chip, so we surface the first one as the canonical
  // category — header badges cover the rest.
  const primaryCategory = listing.categories[0] ?? 'mountain';
  const CategoryIcon = CATEGORY_ICONS[primaryCategory];

  const items = [
    { icon: IconUsers, label: t('guests', { count: listing.capacity }) },
    { icon: IconBed, label: t('bedrooms', { count: listing.bedrooms }) },
    { icon: CategoryIcon, label: t(`category.${primaryCategory}`) },
  ];

  return (
    <ul className="grid gap-4 sm:grid-cols-3">
      {items.map((item) => (
        <li
          key={item.label}
          className="border-border flex items-center gap-3 rounded-lg border p-4"
        >
          <item.icon size={28} className="text-primary shrink-0" aria-hidden />
          <span className="text-sm font-medium">{item.label}</span>
        </li>
      ))}
    </ul>
  );
}
