import type { RegionWithVillages } from '@/types';

const normalize = (s: string): string => s.trim().toLowerCase();

/**
 * Returns regions filtered by `query`. A region matches if its name OR any
 * of its villages' names contain the query (in any of the three locales).
 * Match results carry their matching villages to drive auto-expand.
 */
export function filterRegions(
  regions: readonly RegionWithVillages[],
  query: string,
): { matched: RegionWithVillages[]; matchingVillagesByRegion: Map<string, Set<string>> } {
  const q = normalize(query);
  if (!q) return { matched: [...regions], matchingVillagesByRegion: new Map() };

  const matched: RegionWithVillages[] = [];
  const matchingVillagesByRegion = new Map<string, Set<string>>();

  for (const region of regions) {
    const regionHay = [region.slug, region.name.en, region.name.ru, region.name.az]
      .map(normalize)
      .join(' ');
    const regionMatches = regionHay.includes(q);

    const villageHits = new Set<string>();
    for (const v of region.villages) {
      const hay = [v.slug, v.name.en, v.name.ru, v.name.az].map(normalize).join(' ');
      if (hay.includes(q)) villageHits.add(v.slug);
    }

    if (regionMatches || villageHits.size > 0) {
      matched.push(region);
      if (villageHits.size > 0) matchingVillagesByRegion.set(region.slug, villageHits);
    }
  }

  return { matched, matchingVillagesByRegion };
}
