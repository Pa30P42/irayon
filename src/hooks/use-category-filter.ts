'use client';

import { useQueryState, parseAsStringLiteral } from 'nuqs';
import { HOME_CATEGORIES } from '@/lib/constants';
import type { HomeCategory } from '@/types';

const categoryParser = parseAsStringLiteral(HOME_CATEGORIES).withDefault('all');

export function useCategoryFilter() {
  const [category, setCategory] = useQueryState('category', categoryParser);

  return {
    category: category as HomeCategory,
    setCategory: (next: HomeCategory) => setCategory(next === 'all' ? null : next),
    isActive: (target: HomeCategory) => category === target,
  };
}
