'use client';

import 'leaflet/dist/leaflet.css';
import 'react-leaflet-cluster/dist/assets/MarkerCluster.css';
import 'react-leaflet-cluster/dist/assets/MarkerCluster.Default.css';

import { formatPrice } from '@/lib/utils';
import type { Listing, Locale } from '@/types';
import L from 'leaflet';
import { useCallback, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import {
  AZ_CENTER,
  AZ_DEFAULT_ZOOM,
  TILE_ATTRIBUTION,
  TILE_SUBDOMAINS,
  TILE_URL,
} from './listings-map-constants';
import { ListingMapMarker } from './listings-map-marker';

type ListingsMapProps = {
  listings: Listing[];
  locale: Locale;
  /** Drives fly-to + popup + selected marker style. */
  selectedId?: string | null;
  /** Adds the selected style without panning (e.g. for sidebar hover). */
  highlightedId?: string | null;
  onSelect?: (id: string | null) => void;
  /** When false, disables drag/zoom controls entirely (decorative). */
  interactive?: boolean;
  /** Disable scroll-wheel zoom so page scroll isn't hijacked (teasers). */
  scrollWheelZoom?: boolean;
  showPopups?: boolean;
  cluster?: boolean;
  className?: string;
};

function priceIcon(price: number, locale: Locale, selected: boolean): L.DivIcon {
  const formatted = formatPrice(price, locale);
  return L.divIcon({
    className: 'irayon-price-marker',
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    html: `<button type="button" class="irayon-price-pin${selected ? ' is-selected' : ''}" aria-label="${formatted} AZN">${formatted} <span class="irayon-price-pin__unit">₼</span></button>`,
  });
}

function clusterIcon(cluster: { getChildCount(): number }): L.DivIcon {
  const count = cluster.getChildCount();
  return L.divIcon({
    className: 'irayon-cluster-marker',
    iconSize: L.point(40, 40),
    html: `<div class="irayon-cluster-pin">${count}</div>`,
  });
}

function FitToBounds({ listings }: { listings: Listing[] }) {
  const map = useMap();
  useEffect(() => {
    if (listings.length === 0) return;
    const first = listings[0];
    if (listings.length === 1 && first) {
      map.setView([first.location.lat, first.location.lng], 11, { animate: true });
      return;
    }
    const bounds = L.latLngBounds(listings.map((l) => [l.location.lat, l.location.lng]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12, animate: true });
  }, [listings, map]);
  return null;
}

function PanToSelected({
  listings,
  selectedId,
}: {
  listings: Listing[];
  selectedId: string | null | undefined;
}) {
  const map = useMap();
  useEffect(() => {
    if (!selectedId) return;
    const target = listings.find((l) => l.id === selectedId);
    if (!target) return;
    map.flyTo([target.location.lat, target.location.lng], Math.max(map.getZoom(), 11), {
      animate: true,
      duration: 0.6,
    });
  }, [selectedId, listings, map]);
  return null;
}

export function ListingsMap({
  listings,
  locale,
  selectedId = null,
  highlightedId = null,
  onSelect,
  interactive = true,
  scrollWheelZoom,
  showPopups = true,
  cluster = true,
  className,
}: ListingsMapProps) {
  const points = useMemo(
    () =>
      listings.filter((l) => Number.isFinite(l.location.lat) && Number.isFinite(l.location.lng)),
    [listings],
  );

  // Build two icon variants per listing (idle + selected) and only swap which
  // one we hand to the marker — keeps Leaflet's marker DOM stable.
  const icons = useMemo(() => {
    const map = new Map<string, { idle: L.DivIcon; selected: L.DivIcon }>();
    for (const l of points) {
      map.set(l.id, {
        idle: priceIcon(l.price, locale, false),
        selected: priceIcon(l.price, locale, true),
      });
    }
    return map;
  }, [points, locale]);

  const handleSelect = useCallback(
    (id: string) => {
      onSelect?.(id);
    },
    [onSelect],
  );

  const markers = points.map((listing) => {
    const icon = icons.get(listing.id);
    if (!icon) return null;
    const isHighlighted = listing.id === selectedId || listing.id === highlightedId;
    return (
      <ListingMapMarker
        key={listing.id}
        listing={listing}
        locale={locale}
        isSelected={isHighlighted}
        iconUnselected={icon.idle}
        iconSelected={icon.selected}
        showPopup={showPopups}
        onSelect={handleSelect}
      />
    );
  });

  return (
    <MapContainer
      center={AZ_CENTER}
      zoom={AZ_DEFAULT_ZOOM}
      scrollWheelZoom={scrollWheelZoom ?? interactive}
      dragging={interactive}
      doubleClickZoom={interactive}
      zoomControl={interactive}
      touchZoom={interactive}
      boxZoom={interactive}
      keyboard={interactive}
      attributionControl={interactive}
      className={className}
      style={{ width: '100%', height: '100%' }}
    >
      <TileLayer
        url={TILE_URL}
        attribution={TILE_ATTRIBUTION}
        subdomains={TILE_SUBDOMAINS}
        maxZoom={19}
      />
      <FitToBounds listings={points} />
      <PanToSelected listings={points} selectedId={selectedId} />
      {cluster && points.length > 1 ? (
        <MarkerClusterGroup
          chunkedLoading
          showCoverageOnHover={false}
          spiderfyOnMaxZoom
          maxClusterRadius={48}
          iconCreateFunction={clusterIcon}
        >
          {markers}
        </MarkerClusterGroup>
      ) : (
        markers
      )}
    </MapContainer>
  );
}

export default ListingsMap;
