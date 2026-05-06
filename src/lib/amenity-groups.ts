import type { Amenity } from '@/types';

export type AmenityGroupKey = 'essentials' | 'outdoor' | 'kitchen' | 'family' | 'extras';

const GROUP_OF: Record<Amenity, AmenityGroupKey> = {
  wifi: 'essentials',
  tv: 'essentials',
  ac: 'essentials',
  heating: 'essentials',
  iron: 'essentials',
  hairdryer: 'essentials',
  pool: 'outdoor',
  sauna: 'outdoor',
  jacuzzi: 'outdoor',
  fireplace: 'outdoor',
  bbq: 'outdoor',
  kitchen: 'kitchen',
  washer: 'kitchen',
  crib: 'family',
  kids: 'family',
  pets: 'family',
  parking: 'extras',
  'ev-charger': 'extras',
};

export function groupAmenities(amenities: Amenity[]): Record<AmenityGroupKey, Amenity[]> {
  const groups: Record<AmenityGroupKey, Amenity[]> = {
    essentials: [],
    outdoor: [],
    kitchen: [],
    family: [],
    extras: [],
  };
  for (const a of amenities) {
    groups[GROUP_OF[a]].push(a);
  }
  return groups;
}
