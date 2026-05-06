/**
 * Idempotent seed: upserts every region, amenity, and listing so it can be
 * re-run safely. Run with `pnpm prisma:seed` after `pnpm prisma migrate dev`.
 */
import { PrismaClient, type Prisma } from '@prisma/client';
import { mockListings } from '../src/data/mock-listings';
import azMessages from '../src/i18n/messages/az.json' with { type: 'json' };
import enMessages from '../src/i18n/messages/en.json' with { type: 'json' };
import ruMessages from '../src/i18n/messages/ru.json' with { type: 'json' };
import { groupAmenities } from '../src/lib/amenity-groups';
import { AMENITIES, REGIONS } from '../src/lib/constants';
import type { Amenity, Region } from '../src/types';

const prisma = new PrismaClient();

type LocalizedNames = { az: string; ru: string; en: string };

const regionNameFor = (slug: Region): LocalizedNames => ({
  az: (azMessages.regions as Record<string, string>)[slug] ?? slug,
  ru: (ruMessages.regions as Record<string, string>)[slug] ?? slug,
  en: (enMessages.regions as Record<string, string>)[slug] ?? slug,
});

const amenityNameFor = (slug: Amenity): LocalizedNames => ({
  az: (azMessages.amenity as Record<string, string>)[slug] ?? slug,
  ru: (ruMessages.amenity as Record<string, string>)[slug] ?? slug,
  en: (enMessages.amenity as Record<string, string>)[slug] ?? slug,
});

/** Maps an amenity to its UI group (essentials/outdoor/kitchen/family/extras). */
const amenityGroupFor = (amenity: Amenity): string => {
  const grouped = groupAmenities([amenity]);
  for (const [group, items] of Object.entries(grouped)) {
    if (items.length > 0) return group;
  }
  return 'extras';
};

async function seedRegions(): Promise<Map<Region, string>> {
  const idBySlug = new Map<Region, string>();

  for (const slug of REGIONS) {
    const row = await prisma.region.upsert({
      where: { slug },
      create: { slug, name: regionNameFor(slug) as Prisma.InputJsonValue },
      update: { name: regionNameFor(slug) as Prisma.InputJsonValue },
    });
    idBySlug.set(slug, row.id);
  }

  return idBySlug;
}

async function seedAmenities(): Promise<Map<Amenity, string>> {
  const idBySlug = new Map<Amenity, string>();

  for (const slug of AMENITIES) {
    const row = await prisma.amenity.upsert({
      where: { slug },
      create: {
        slug,
        category: amenityGroupFor(slug),
        name: amenityNameFor(slug) as Prisma.InputJsonValue,
      },
      update: {
        category: amenityGroupFor(slug),
        name: amenityNameFor(slug) as Prisma.InputJsonValue,
      },
    });
    idBySlug.set(slug, row.id);
  }

  return idBySlug;
}

const toEnumValue = (s: string): string => s.toUpperCase().replace(/-/g, '_');

async function seedListings(
  regionIds: Map<Region, string>,
  amenityIds: Map<Amenity, string>,
): Promise<void> {
  for (const listing of mockListings) {
    const regionId = regionIds.get(listing.region);
    if (!regionId) {
      throw new Error(`Region "${listing.region}" not seeded for listing ${listing.slug}`);
    }

    // Upsert listing fields, then replace its amenity + image relations atomically.
    await prisma.$transaction(async (tx) => {
      const upserted = await tx.listing.upsert({
        where: { slug: listing.slug },
        create: {
          slug: listing.slug,
          title: listing.title as unknown as Prisma.InputJsonValue,
          description: listing.description as unknown as Prisma.InputJsonValue,
          regionId,
          direction: toEnumValue(listing.direction) as Prisma.ListingCreateInput['direction'],
          placeType: toEnumValue(listing.placeType) as Prisma.ListingCreateInput['placeType'],
          category: toEnumValue(listing.category) as Prisma.ListingCreateInput['category'],
          price: listing.price,
          rating: listing.rating,
          reviewCount: listing.reviewCount,
          capacity: listing.capacity,
          bedrooms: listing.bedrooms,
          lat: listing.location.lat,
          lng: listing.location.lng,
          address: listing.location.address,
          phone: listing.phone,
          meals: listing.meals.map(toEnumValue) as Prisma.ListingCreateInput['meals'],
          activities: listing.activities.map(
            toEnumValue,
          ) as Prisma.ListingCreateInput['activities'],
        },
        update: {
          title: listing.title as unknown as Prisma.InputJsonValue,
          description: listing.description as unknown as Prisma.InputJsonValue,
          regionId,
          direction: toEnumValue(listing.direction) as Prisma.ListingUpdateInput['direction'],
          placeType: toEnumValue(listing.placeType) as Prisma.ListingUpdateInput['placeType'],
          category: toEnumValue(listing.category) as Prisma.ListingUpdateInput['category'],
          price: listing.price,
          rating: listing.rating,
          reviewCount: listing.reviewCount,
          capacity: listing.capacity,
          bedrooms: listing.bedrooms,
          lat: listing.location.lat,
          lng: listing.location.lng,
          address: listing.location.address,
          phone: listing.phone,
          meals: listing.meals.map(toEnumValue) as Prisma.ListingUpdateInput['meals'],
          activities: listing.activities.map(
            toEnumValue,
          ) as Prisma.ListingUpdateInput['activities'],
        },
      });

      // Replace amenity links: delete existing, recreate from current list.
      await tx.listingAmenity.deleteMany({ where: { listingId: upserted.id } });
      if (listing.amenities.length > 0) {
        await tx.listingAmenity.createMany({
          data: listing.amenities.map((slug) => {
            const amenityId = amenityIds.get(slug);
            if (!amenityId) {
              throw new Error(`Amenity "${slug}" not seeded for listing ${listing.slug}`);
            }
            return { listingId: upserted.id, amenityId };
          }),
        });
      }

      // Same approach for images — order is preserved by array index.
      await tx.image.deleteMany({ where: { listingId: upserted.id } });
      if (listing.images.length > 0) {
        await tx.image.createMany({
          data: listing.images.map((url, order) => ({
            listingId: upserted.id,
            url,
            order,
            alt: listing.title.en,
          })),
        });
      }
    });
  }
}

async function main(): Promise<void> {
  // eslint-disable-next-line no-console
  console.log('Seeding regions…');
  const regionIds = await seedRegions();

  // eslint-disable-next-line no-console
  console.log('Seeding amenities…');
  const amenityIds = await seedAmenities();

  // eslint-disable-next-line no-console
  console.log(`Seeding ${mockListings.length} listings…`);
  await seedListings(regionIds, amenityIds);

  // eslint-disable-next-line no-console
  console.log('Done.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
