import type { LocalizedText } from '@/types';

export type RegionSeed = {
  slug: string;
  name: LocalizedText;
  featured: boolean;
  sortOrder: number;
};

/**
 * Initial catalogue of Azerbaijani villa-rental regions. Admin can add/edit
 * after deploy — this is the starting set, not a closed list. Six regions
 * marked `featured: true` populate the homepage Regions grid by default.
 */
export const REGION_SEED: readonly RegionSeed[] = [
  {
    slug: 'gabala',
    name: { az: 'Qəbələ', ru: 'Габала', en: 'Gabala' },
    featured: true,
    sortOrder: 10,
  },
  {
    slug: 'sheki',
    name: { az: 'Şəki', ru: 'Шеки', en: 'Sheki' },
    featured: true,
    sortOrder: 20,
  },
  {
    slug: 'guba',
    name: { az: 'Quba', ru: 'Губа', en: 'Guba' },
    featured: true,
    sortOrder: 30,
  },
  {
    slug: 'gusar',
    name: { az: 'Qusar', ru: 'Гусар', en: 'Gusar' },
    featured: true,
    sortOrder: 40,
  },
  {
    slug: 'lankaran',
    name: { az: 'Lənkəran', ru: 'Ленкорань', en: 'Lankaran' },
    featured: true,
    sortOrder: 50,
  },
  {
    slug: 'absheron',
    name: { az: 'Abşeron', ru: 'Апшерон', en: 'Absheron' },
    featured: true,
    sortOrder: 60,
  },
  {
    slug: 'ismayilli',
    name: { az: 'İsmayıllı', ru: 'Исмаиллы', en: 'Ismayilli' },
    featured: false,
    sortOrder: 70,
  },
  {
    slug: 'shamakhi',
    name: { az: 'Şamaxı', ru: 'Шемаха', en: 'Shamakhi' },
    featured: false,
    sortOrder: 80,
  },
  {
    slug: 'zagatala',
    name: { az: 'Zaqatala', ru: 'Загатала', en: 'Zagatala' },
    featured: false,
    sortOrder: 90,
  },
  {
    slug: 'gakh',
    name: { az: 'Qax', ru: 'Гах', en: 'Gakh' },
    featured: false,
    sortOrder: 100,
  },
  {
    slug: 'khachmaz',
    name: { az: 'Xaçmaz', ru: 'Хачмаз', en: 'Khachmaz' },
    featured: false,
    sortOrder: 110,
  },
  {
    slug: 'shabran',
    name: { az: 'Şabran', ru: 'Шабран', en: 'Shabran' },
    featured: false,
    sortOrder: 120,
  },
  {
    slug: 'naftalan',
    name: { az: 'Naftalan', ru: 'Нафталан', en: 'Naftalan' },
    featured: false,
    sortOrder: 130,
  },
  {
    slug: 'goychay',
    name: { az: 'Göyçay', ru: 'Гёйчай', en: 'Goychay' },
    featured: false,
    sortOrder: 140,
  },
  {
    slug: 'lerik',
    name: { az: 'Lerik', ru: 'Лерик', en: 'Lerik' },
    featured: false,
    sortOrder: 150,
  },
  {
    slug: 'astara',
    name: { az: 'Astara', ru: 'Астара', en: 'Astara' },
    featured: false,
    sortOrder: 160,
  },
  {
    slug: 'masally',
    name: { az: 'Masallı', ru: 'Масаллы', en: 'Masally' },
    featured: false,
    sortOrder: 170,
  },
];
