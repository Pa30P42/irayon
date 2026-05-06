# IRayon

Villa and cottage rentals across Azerbaijan — built with Next.js 15, React 19, Tailwind v4, next-intl, Prisma.

## Quick start

```bash
npm install
cp .env.example .env
npm run prisma:generate
npm run dev
```

Open <http://localhost:3000> — the middleware redirects to the default locale (`/az`).

## Scripts

| Command             | Purpose                     |
| ------------------- | --------------------------- |
| `npm run dev`       | Next dev server (Turbopack) |
| `npm run build`     | Production build            |
| `npm run start`     | Run production build        |
| `npm run lint`      | ESLint flat config          |
| `npm run format`    | Prettier                    |
| `npm run typecheck` | `tsc --noEmit`              |
| `npm run test`      | Vitest                      |

## Locales

`az` (default), `ru`, `en` — files in `src/i18n/messages/`.

## Project structure

See `src/`:

- `app/[locale]/` — App Router pages with localized routing
- `components/{ui,layout,listings,shared}` — colocated UI
- `hooks/` — custom hooks (filters, listings, locale)
- `lib/` — utils, constants, Prisma client, zod schemas
- `data/` — mock data
- `i18n/` — next-intl routing, navigation, request config
- `types/` — shared types
- `prisma/schema.prisma` — DB schema (no live connection yet)
