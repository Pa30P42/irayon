'use client';

import type { Village } from '@/types';
import { useEffect } from 'react';

type UseRegionVillageCascadeArgs = {
  regionSlug: string | undefined;
  villageId: string | null | undefined;
  villages: Village[] | undefined;
  onClearVillage: () => void;
};

/**
 * When the selected region changes, clears the village selection if the
 * current village doesn't belong to the new region.
 */
export function useRegionVillageCascade({
  regionSlug,
  villageId,
  villages,
  onClearVillage,
}: UseRegionVillageCascadeArgs) {
  useEffect(() => {
    if (!villageId || !villages) return;
    const stillBelongs = villages.some((v) => v.id === villageId);
    if (!stillBelongs) onClearVillage();
    // `onClearVillage` is a stable setter from the consumer; we only react to
    // region/villages/villageId changes.
  }, [regionSlug, villages, villageId, onClearVillage]);
}
