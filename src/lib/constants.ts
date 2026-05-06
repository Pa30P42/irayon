import type { ListingCategory, Region, Amenity, HomeCategory } from '@/types';

export const SITE = {
  name: 'IRayon',
  description: 'Villa and cottage rentals across Azerbaijan',
  url: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
} as const;

export const CATEGORIES: readonly ListingCategory[] = [
  'mountain',
  'forest',
  'river',
  'sea',
  'lake',
] as const;

export const REGIONS: readonly Region[] = [
  'gabala',
  'sheki',
  'guba',
  'lankaran',
  'gusar',
  'gakh',
  'ismayilli',
  'goychay',
  'absheron',
  'lerik',
] as const;

export const AMENITIES: readonly Amenity[] = [
  'wifi',
  'parking',
  'pool',
  'sauna',
  'fireplace',
  'kitchen',
  'bbq',
  'pets',
  'heating',
  'ac',
  'tv',
  'washer',
] as const;

export const PRICE_BOUNDS = {
  min: 50,
  max: 1000,
  step: 10,
} as const;

export const DEFAULT_PAGE_SIZE = 12;

export const HOME_CATEGORIES: readonly HomeCategory[] = [
  'all',
  'mountain',
  'forest',
  'river',
  'sea',
  'pool',
  'bbq',
  'winter',
  'cabin',
] as const;

export const HOME_FEATURED_LIMIT = 8;

export const FEATURED_REGIONS: readonly Region[] = [
  'gabala',
  'sheki',
  'guba',
  'gusar',
  'lankaran',
  'absheron',
] as const;
