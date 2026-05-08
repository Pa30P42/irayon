/** Roughly the geographic centre of Azerbaijan. The map fits to the
 *  listings' bounds on mount, so this only paints for the first frame. */
export const AZ_CENTER: [number, number] = [40.5, 47.7];

export const AZ_DEFAULT_ZOOM = 7;

/** Carto Voyager raster tiles — free, no token, complements forest-green theme. */
export const TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

export const TILE_SUBDOMAINS = ['a', 'b', 'c', 'd'];

export const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';
