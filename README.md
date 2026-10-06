# ssMarket Frontend

Web app for ssMarket, an internal marketplace where company employees buy and
sell personal items. The API lives in a separate repository, `ssMarket-be`.

**Stack:** Next.js (App Router) · TypeScript · Tailwind CSS · shadcn/ui · TanStack Query · React Hook Form · Zod · Zustand · Vitest · Docker · GitHub Actions

## Getting started

Requirements: Node.js 24, pnpm, and the backend running on port 4000.

```bash
cp .env.example .env.local
pnpm install
pnpm dev
```

Open http://localhost:3000.

## Testing

```bash
pnpm test        # run tests
pnpm test:cov    # fails under 80% coverage
pnpm e2e         # Playwright against the real backend (see CLAUDE.md)
```

## Features

- Browse and search listings, with category and mode filters kept in the URL.
- Post a listing in two steps: choose in-stock or pre-order, then fill in a
  form that only shows the fields for that mode. Up to five photos.
- Manage your own listings: drafts, open and closed.
- Order from a listing, pay by a per-order VietQR code, follow the order's
  payment and delivery state.
- Sellers get a summary table per listing (totals, grouping by delivery
  location, bulk actions, CSV export) and can reopen a finished pre-order.
- Seller profile with delivery location and bank details.
- A colour palette checked for WCAG AA contrast by a test.

## Architecture

The browser only talks to this app. `src/proxy.ts` forwards `/api/*` to the
backend at `API_URL`, which is read at runtime, so session cookies stay on one
origin and the same Docker image runs in every environment.

API types in `src/lib/api/schema.d.ts` are generated from the backend's OpenAPI
document with `pnpm gen:api`.

See [CLAUDE.md](./CLAUDE.md) for conventions and [DESIGN.md](./DESIGN.md) for
the design system.
