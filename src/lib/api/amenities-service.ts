import azMessages from '@/i18n/messages/az.json';
import enMessages from '@/i18n/messages/en.json';
import ruMessages from '@/i18n/messages/ru.json';
import { groupAmenities } from '@/lib/amenity-groups';
import { AMENITIES } from '@/lib/constants';
import { prisma } from '@/lib/prisma';
import type { Amenity, AmenityOption } from '@/types';
import { isUsingMockData } from './listings-service';
import { parseLocalized } from './localized-text';

const mockAmenityName = (slug: string) => ({
  az: (azMessages.amenity as Record<string, string>)[slug] ?? slug,
  ru: (ruMessages.amenity as Record<string, string>)[slug] ?? slug,
  en: (enMessages.amenity as Record<string, string>)[slug] ?? slug,
});

const mockGroupFor = (slug: Amenity): string => {
  const grouped = groupAmenities([slug]);
  for (const [group, items] of Object.entries(grouped)) {
    if (items.length > 0) return group;
  }
  return 'extras';
};

/**
 * Amenity catalogue — the DB is the source of truth (admin CRUD at
 * /admin/amenities); the mock path derives the same shape from the legacy
 * constants + i18n messages so dev-without-DB keeps working.
 */
export async function listAmenities(): Promise<AmenityOption[]> {
  if (isUsingMockData()) {
    return AMENITIES.map((slug, idx) => ({
      id: `mock_amenity_${idx}`,
      slug,
      icon: null,
      category: mockGroupFor(slug),
      name: mockAmenityName(slug),
    }));
  }
  const rows = await prisma.amenity.findMany({ orderBy: [{ category: 'asc' }, { slug: 'asc' }] });
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    icon: r.icon,
    category: r.category,
    name: parseLocalized(r.name),
  }));
}
