'use client';

import { useRegionsWithVillages } from '@/hooks/use-public-regions';
import { filterRegions } from '@/lib/filter-regions';
import type { ListingsFilterState } from '@/types';
import { useMemo, useState } from 'react';

type State = Pick<ListingsFilterState, 'region' | 'village'>;

type UseLocationFilterPickerArgs = {
  state: State;
  onChange: (next: { region: string[]; village: string[] }) => void;
};

export function useLocationFilterPicker({ state, onChange }: UseLocationFilterPickerArgs) {
  const { data: regions, isLoading } = useRegionsWithVillages();

  const [query, setQuery] = useState('');
  const [manuallyExpanded, setManuallyExpanded] = useState<Set<string>>(new Set());

  const selectedRegions = useMemo(() => new Set(state.region), [state.region]);
  const selectedVillages = useMemo(() => new Set(state.village), [state.village]);

  const { matched, matchingVillagesByRegion } = useMemo(
    () => filterRegions(regions ?? [], query),
    [regions, query],
  );

  // A region is "expanded" if the user toggled it open, OR a search match
  // landed inside it, OR its checkbox is selected, OR any of its villages
  // are selected (so user sees what's already chosen at a glance).
  const isExpanded = (regionSlug: string): boolean => {
    if (manuallyExpanded.has(regionSlug)) return true;
    if (selectedRegions.has(regionSlug)) return true;
    if (matchingVillagesByRegion.has(regionSlug)) return true;
    const region = regions?.find((r) => r.slug === regionSlug);
    if (region && region.villages.some((v) => selectedVillages.has(v.slug))) return true;
    return false;
  };

  const toggleManualExpand = (regionSlug: string) => {
    setManuallyExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(regionSlug)) next.delete(regionSlug);
      else next.add(regionSlug);
      return next;
    });
  };

  const toggleRegion = (regionSlug: string) => {
    const next = new Set(state.region);
    if (next.has(regionSlug)) next.delete(regionSlug);
    else next.add(regionSlug);
    onChange({ region: Array.from(next), village: state.village });
  };

  const toggleVillage = (villageSlug: string) => {
    const next = new Set(state.village);
    if (next.has(villageSlug)) next.delete(villageSlug);
    else next.add(villageSlug);
    onChange({ region: state.region, village: Array.from(next) });
  };

  const clearAll = () => {
    onChange({ region: [], village: [] });
    setQuery('');
  };

  const totalSelected = state.region.length + state.village.length;

  return {
    regions,
    isLoading,
    query,
    setQuery,
    matched,
    matchingVillagesByRegion,
    selectedRegions,
    selectedVillages,
    isExpanded,
    toggleManualExpand,
    toggleRegion,
    toggleVillage,
    clearAll,
    totalSelected,
  };
}
