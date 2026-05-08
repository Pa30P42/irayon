/**
 * Idempotent seed: upserts every region, village, amenity, and listing so it
 * can be re-run safely. Run with `pnpm prisma:seed` after `pnpm prisma migrate dev`.
 */
import { PrismaClient, type Prisma } from '@prisma/client';
import { mockListings } from '../src/data/mock-listings';
import { REGION_SEED } from '../src/data/region-seed';
import { VILLAGE_SEED } from '../src/data/village-seed';
import azMessages from '../src/i18n/messages/az.json' with { type: 'json' };
import enMessages from '../src/i18n/messages/en.json' with { type: 'json' };
import ruMessages from '../src/i18n/messages/ru.json' with { type: 'json' };
import { groupAmenities } from '../src/lib/amenity-groups';
import { AMENITIES } from '../src/lib/constants';
import type { Amenity } from '../src/types';

const prisma = new PrismaClient();

type LocalizedNames = { az: string; ru: string; en: string };

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

async function seedRegions(): Promise<Map<string, string>> {
  const idBySlug = new Map<string, string>();

  for (const region of REGION_SEED) {
    const row = await prisma.region.upsert({
      where: { slug: region.slug },
      create: {
        slug: region.slug,
        name: region.name as unknown as Prisma.InputJsonValue,
        featured: region.featured,
        sortOrder: region.sortOrder,
      },
      update: {
        name: region.name as unknown as Prisma.InputJsonValue,
        featured: region.featured,
        sortOrder: region.sortOrder,
      },
    });
    idBySlug.set(region.slug, row.id);
  }

  return idBySlug;
}

async function seedVillages(regionIds: Map<string, string>): Promise<Map<string, string>> {
  // Key: `${regionSlug}:${villageSlug}` → village id.
  const idByCompositeKey = new Map<string, string>();

  for (const village of VILLAGE_SEED) {
    const regionId = regionIds.get(village.regionSlug);
    if (!regionId) {
      throw new Error(
        `Village "${village.slug}" references missing region "${village.regionSlug}"`,
      );
    }

    const row = await prisma.village.upsert({
      where: { regionId_slug: { regionId, slug: village.slug } },
      create: {
        slug: village.slug,
        regionId,
        name: village.name as unknown as Prisma.InputJsonValue,
        sortOrder: village.sortOrder,
      },
      update: {
        name: village.name as unknown as Prisma.InputJsonValue,
        sortOrder: village.sortOrder,
      },
    });
    idByCompositeKey.set(`${village.regionSlug}:${village.slug}`, row.id);
  }

  return idByCompositeKey;
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
  regionIds: Map<string, string>,
  villageIds: Map<string, string>,
  amenityIds: Map<Amenity, string>,
): Promise<void> {
  for (const listing of mockListings) {
    const regionId = regionIds.get(listing.region);
    if (!regionId) {
      throw new Error(`Region "${listing.region}" not seeded for listing ${listing.slug}`);
    }

    let villageId: string | null = null;
    if (listing.villageSlug) {
      const key = `${listing.region}:${listing.villageSlug}`;
      villageId = villageIds.get(key) ?? null;
      if (!villageId) {
        throw new Error(
          `Village "${listing.villageSlug}" not seeded under region "${listing.region}" for listing ${listing.slug}`,
        );
      }
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
          villageId,
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
          villageId,
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
  console.log(`Seeding ${REGION_SEED.length} regions…`);
  const regionIds = await seedRegions();

  // eslint-disable-next-line no-console
  console.log(`Seeding ${VILLAGE_SEED.length} villages…`);
  const villageIds = await seedVillages(regionIds);

  // eslint-disable-next-line no-console
  console.log('Seeding amenities…');
  const amenityIds = await seedAmenities();

  // eslint-disable-next-line no-console
  console.log(`Seeding ${mockListings.length} listings…`);
  await seedListings(regionIds, villageIds, amenityIds);

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
