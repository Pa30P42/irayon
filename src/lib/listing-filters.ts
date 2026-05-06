import type { HomeCategory, Listing } from '@/types';

export function filterByHomeCategory(listings: Listing[], category: HomeCategory): Listing[] {
  switch (category) {
    case 'all':
      return listings;
    case 'mountain':
    case 'forest':
    case 'river':
    case 'sea':
      return listings.filter((l) => l.category === category);
    case 'pool':
      return listings.filter((l) => l.amenities.includes('pool'));
    case 'bbq':
      return listings.filter((l) => l.amenities.includes('bbq'));
    case 'winter':
      return listings.filter(
        (l) => l.amenities.includes('fireplace') && l.amenities.includes('heating'),
      );
    case 'cabin':
      return listings.filter((l) => l.bedrooms <= 2);
  }
}
