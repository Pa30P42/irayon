'use client';

import type { Listing, Locale } from '@/types';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ListingsMapLoader } from './listings-map-loader';
import { ListingsMapPaneToggle, type MobilePane } from './listings-map-pane-toggle';
import { ListingsMapRow } from './listings-map-row';

type Props = {
  listings: Listing[];
  locale: Locale;
};

export function ListingsMapView({ listings, locale }: Props) {
  const tMap = useTranslations('listings.map');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [mobilePane, setMobilePane] = useState<MobilePane>('map');
  const listRef = useRef<HTMLUListElement>(null);

  // Scroll the row corresponding to a marker click into view in the sidebar.
  useEffect(() => {
    if (!selectedId || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLLIElement>(
      `[data-listing-id="${selectedId}"]`,
    );
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [selectedId]);

  const handleRowEnter = useCallback((id: string) => setHoverId(id), []);
  const handleRowLeave = useCallback(() => setHoverId(null), []);

  if (listings.length === 0) {
    return (
      <div className="border-border bg-accent/40 grid h-80 place-items-center rounded-2xl border border-dashed">
        <p className="text-foreground-muted">{tMap('empty')}</p>
      </div>
    );
  }

  return (
    <div className="border-border overflow-hidden rounded-2xl border">
      <ListingsMapPaneToggle value={mobilePane} onChange={setMobilePane} />

      <div className="relative grid h-[calc(100vh-13rem)] min-h-[560px] grid-cols-1 lg:grid-cols-[minmax(360px,38%)_1fr]">
        <aside
          className={
            mobilePane === 'list'
              ? 'border-border bg-background h-full overflow-y-auto lg:border-r'
              : 'border-border bg-background hidden h-full overflow-y-auto lg:block lg:border-r'
          }
          aria-label={tMap('title')}
        >
          <ul ref={listRef} className="divide-border divide-y">
            {listings.map((listing) => (
              <ListingsMapRow
                key={listing.id}
                listing={listing}
                locale={locale}
                isSelected={selectedId === listing.id}
                isHovered={hoverId === listing.id}
                onMouseEnter={handleRowEnter}
                onMouseLeave={handleRowLeave}
              />
            ))}
          </ul>
        </aside>

        <div
          className={
            mobilePane === 'map' ? 'relative h-full' : 'relative hidden h-full lg:block'
          }
        >
          <ListingsMapLoader
            listings={listings}
            locale={locale}
            selectedId={selectedId}
            highlightedId={hoverId}
            onSelect={setSelectedId}
            cluster
            showPopups
          />
        </div>
      </div>
    </div>
  );
}
