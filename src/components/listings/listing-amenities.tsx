import { Eyebrow, Heading } from '@/components/ui/typography';
import { groupAmenities, type AmenityGroupKey } from '@/lib/amenity-groups';
import type { Amenity, Listing } from '@/types';
import { useTranslations } from 'next-intl';
import { AmenityIcon } from './amenity-icon';

type ListingAmenitiesProps = {
  listing: Listing;
};

const GROUP_ORDER: readonly AmenityGroupKey[] = [
  'essentials',
  'outdoor',
  'kitchen',
  'family',
  'extras',
] as const;

export function ListingAmenities({ listing }: ListingAmenitiesProps) {
  const t = useTranslations('detail.amenities');
  const tAmenity = useTranslations('amenity');
  const groups = groupAmenities(listing.amenities);

  const nonEmptyGroups = GROUP_ORDER.filter((g) => groups[g].length > 0);

  return (
    <section className="space-y-6">
      <Heading level="subsection">{t('title')}</Heading>

      <div className="space-y-6">
        {nonEmptyGroups.map((groupKey) => (
          <div key={groupKey}>
            <Eyebrow as="h3" className="mb-3 block">
              {t(`groups.${groupKey}`)}
            </Eyebrow>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {groups[groupKey].map((amenity: Amenity) => (
                <li key={amenity} className="flex items-center gap-3">
                  <AmenityIcon amenity={amenity} size={20} className="text-primary" />
                  <span>{tAmenity(amenity)}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
