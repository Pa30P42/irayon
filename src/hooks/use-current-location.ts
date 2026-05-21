'use client';

import { useCallback, useState } from 'react';

type Coordinates = { lat: number; lng: number };

type UseCurrentLocationOptions = {
  onSuccess?: (coords: Coordinates) => void;
};

export function useCurrentLocation({ onSuccess }: UseCurrentLocationOptions = {}) {
  const [isLocating, setIsLocating] = useState(false);

  const getCurrentLocation = useCallback(() => {
    if (!('geolocation' in navigator)) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
        };
        onSuccess?.(coords);
        setIsLocating(false);
      },
      () => {
        // Permission denied / unavailable — silently keep manual input.
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }, [onSuccess]);

  return { getCurrentLocation, isLocating };
}
