/**
 * URL-safe slug from arbitrary text. Lowercases, strips diacritics, collapses
 * non-alphanumerics to single hyphens, trims leading/trailing hyphens.
 */
export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/**
 * Returns a slug that does not collide with `taken`. If `base` is already free
 * we return it as-is; otherwise append `-2`, `-3`, … until free.
 */
export function uniqueSlug(base: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}
