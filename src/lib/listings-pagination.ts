/**
 * Page size for the public catalogue grid. Lives in its own module (not a
 * component file) so both server components (SSR seed fetch) and client hooks
 * can import it without pulling client code into the server graph.
 */
export const GRID_PAGE_SIZE = 24;
