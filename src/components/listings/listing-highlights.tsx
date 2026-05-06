import type { Listing, ListingCategory } from '@/types';
import {
  IconBeach,
  IconBed,
  IconMountain,
  IconTrees,
  IconUsers,
  IconWaveSine,
  type Icon,
} from '@tabler/icons-react';
import { useTranslations } from 'next-intl';

const CATEGORY_ICONS: Record<ListingCategory, Icon> = {
  mountain: IconMountain,
  forest: IconTrees,
  river: IconWaveSine,
  sea: IconBeach,
  lake: IconWaveSine,
};

type ListingHighlightsProps = {
  listing: Listing;
};

export function ListingHighlights({ listing }: ListingHighlightsProps) {
  const t = useTranslations('detail.highlights');
  const CategoryIcon = CATEGORY_ICONS[listing.category];

  const items = [
    { icon: IconUsers, label: t('guests', { count: listing.capacity }) },
    { icon: IconBed, label: t('bedrooms', { count: listing.bedrooms }) },
    { icon: CategoryIcon, label: t(`category.${listing.category}`) },
  ];

  return (
    <ul className="grid gap-4 sm:grid-cols-3">
      {items.map((item, idx) => (
        <li key={idx} className="border-border flex items-center gap-3 rounded-lg border p-4">
          <item.icon size={28} className="text-primary shrink-0" aria-hidden />
          <span className="text-sm font-medium">{item.label}</span>
        </li>
      ))}
    </ul>
  );
}
