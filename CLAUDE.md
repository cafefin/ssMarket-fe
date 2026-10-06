@AGENTS.md

# ssMarket Frontend

Next.js web app for ssMarket, an internal marketplace where company employees
buy and sell personal items. The API lives in a separate repository
(`ssMarket-be`). This app has no backend logic of its own.

## Commands

```bash
pnpm dev                  # http://localhost:3000 (backend must run on API_URL)
pnpm test                 # unit and component tests
pnpm test:cov             # tests with the 80% coverage gate
pnpm lint && pnpm typecheck
pnpm gen:api              # regenerate src/lib/api/schema.d.ts from the backend
pnpm e2e                  # Playwright, real frontend + backend (see End-to-end tests)
```

## Structure

```
src/
├── proxy.ts              forwards /api/* to the backend; redirects signed-out visitors
├── app/
│   ├── globals.css       design tokens
│   ├── login/            public
│   └── (app)/            everything that requires a session
│       ├── page.tsx              browse and search
│       ├── listings/[id]/        detail and edit
│       ├── sell/                 my listings, new listing, received orders, summary
│       ├── orders/               my orders, order page
│       └── profile/
├── components/
│   ├── ui/               shadcn/ui primitives (Base UI); change only to apply design tokens
│   ├── brand/            logo mark, wordmark
│   ├── layout/           header, search box, user menu, navigation items, phone tab bar
│   ├── form/             Field wrapper and shared control styles
│   ├── listings/         card, filters, closing-soon carousel, detail view, gallery, item table
│   ├── sell/             mode step, listing form, my listings
│   ├── orders/           order panel, order page, editor, QR block, actions, lists, summary
│   └── profile/
└── lib/
    ├── api/              typed client, session refresh, query hooks, ApiError
    ├── listings/         URL filters, form schema, draft store, save sequence
    ├── orders/           order arithmetic shared with the backend's rules
    ├── query/            TanStack Query provider
    ├── theme/            contrast helpers and the palette contrast gate
    └── format/           money, dates, closing times, initials
```

Pages under `app/` stay thin: they render one component from `components/`,
which holds the behaviour and has the tests.

## Talking to the backend

- The browser only calls same-origin `/api/*`. `src/proxy.ts` forwards those
  requests to `API_URL`, which is read at runtime. Never reference the backend
  origin anywhere else, and never add `NEXT_PUBLIC_API_URL`.
- Use the typed client: `api.GET("/users/me")`, `api.POST("/auth/logout")`.
  Wrap reads in a TanStack Query hook under `src/lib/api/`.
- `src/lib/api/schema.d.ts` is generated. When the backend API changes: merge
  the backend change, run `pnpm gen:api` here, fix the type errors, commit the
  regenerated file.
- A 401 triggers one session refresh and one retry (`auth-fetch.ts`). Do not
  add retry logic elsewhere.
- Links that start the sign-in flow must be plain `<a href="/api/auth/google">`,
  not `next/link`.

## Errors

- Hooks throw `ApiError` (built with `toApiError`), which carries the
  backend's `code`.
- Show `userMessage(error)` to people. Backend messages are English text for
  developers and must never be rendered. Add new codes to the map in
  `api-error.ts`.

## State

- **Server data**: TanStack Query hooks in `src/lib/api/`. After a write,
  invalidate `["listings"]`, `["my-listings"]` and `["listing", id]`.
- **Browse filters**: the URL query string, through
  `parseListingFilters` / `listingsHref`. Filters are links, so a search can
  be shared and the back button works.
- **Unfinished new listing**: the Zustand store in `sell-draft-store.ts`
  (sessionStorage). It exists so typed values survive the detour to the
  profile page. Do not put server data in Zustand.

## Forms

- React Hook Form with a Zod schema. The schema mirrors the backend rules and
  gives Vietnamese messages; the backend stays the authority.
- Wrap controls in `Field`, which wires the label, hint and error message.
- Use a native `<select>` with `selectClassName`. When its options load after
  the first render, re-apply the value (see `profile-form.tsx`), or the
  browser silently falls back to the first option.
- Prices and quantities are typed as text and parsed with `parsePrice` /
  `parseQuantity`, so "35.000" and "2,5" work.

## Images

Listing images come from `/api/media/...` behind the session cookie, so use a
plain `<img>` (the Next.js image optimizer cannot fetch them). The backend
already serves a 400px thumbnail and a 1600px full size.

## Orders

- `src/lib/orders/order-math.ts` mirrors the backend's rounding and quantity
  rules and is tested with the same table. It only previews the total; the
  amount that counts is the one the server returns.
- `OrderPanel` holds one idempotency key for its lifetime and sends it with
  every attempt. Do not generate a new key per click.
- `availableActions(order)` is the single place that decides which buttons a
  person sees for an order. Buttons that undo something (cancel, "Chưa nhận
  được") ask for confirmation; the seller must give a reason to cancel.
- When an action fails because the order changed, the order is refetched so
  the page shows its real state.
- Status is always shown as text badges (`OrderStatusBadges`), never by
  colour alone.
- `SalesSummary` (`/sell/listings/[id]`) shows the seller's table. Figures and
  the totals row come from the server; only the per-group subtotals are added
  up in the browser. Bulk actions report how many orders changed and list the
  ones that did not.
- `editBlockedReason(order, now)` decides whether a buyer sees "Sửa đơn", an
  explanation, or nothing. The editor shows already-ordered items at their
  ordered price, as the server will charge them.
- When editing a listing, send each existing item's `id`; the backend then
  updates it in place and existing orders stay valid.

## Design system

`DESIGN.md` is the source of truth. Its tokens are declared in
`src/app/globals.css` and exposed as Tailwind theme classes.

- Use theme classes (`bg-primary`, `text-muted-foreground`, `border-border`,
  `rounded-lg`). Never write hex colours in components.
- Blue (`primary`) is for actions: main buttons, links, focus rings, selected
  states. The selected selling-mode segment is the exception: it is navy
  (`bg-foreground`). Green (`positive`) means something good happened or is
  available: in stock, paid, delivered. Do not use green for decoration.
- Orange (`deadline`) marks a pre-order and when it closes. Text uses
  `text-deadline-deep` on `bg-deadline-soft`; a pre-order closing today uses
  `bg-deadline` with `text-foreground`. Do not use orange for anything else.
- The design token `accent` in `DESIGN.md` is `positive` in CSS, because
  shadcn/ui uses `accent` for neutral hover surfaces.
- White text goes only on `bg-primary`, `bg-primary-deep` and `bg-foreground`
  (the selected selling-mode segment). Coloured text uses the `-deep` variant
  (`text-positive-deep`, `text-warn-deep`, `text-error-deep`); the base colours
  are for icons, borders, dots and backgrounds with dark text.
- `src/lib/theme/contrast.test.ts` fails when a text/background pair drops
  below WCAG AA. Add new pairs there when you introduce them.
- Buttons are always pills (`rounded-full`); cards use `rounded-lg` (12px).
- The header is `h-16` and sticky; anything that sticks under it uses
  `top-16`. Navigation lives in `nav-items.ts`: the header shows it from `md`
  up, `MobileTabBar` below. Add a destination there, not in either component.
- Fixed and sticky chrome (header, tab bar) is `z-20`; things that stick under
  the header are `z-10`. `main` reserves `pb-24` below `md` for the tab bar.
- `ListingCard` is a row (photo left) below 560px and stacked above; pass
  `layout="stacked"` where it must always be stacked, as in the carousel.
- `font-heading` (Bricolage Grotesque) for h1, h2, prices and the wordmark;
  Inter for other UI text; Geist Mono for codes people copy.
- `h1` and `h2` get `font-heading` from the base layer, and shadcn's
  `AlertDialogTitle` uses `font-heading` too, so changing `--font-heading`
  restyles dialogs.
- Use the `Wordmark` component for the product name. Never add the SmartOSC
  logo file to this repository.
- To style a link as a button, use `buttonVariants(...)` on an `<a>`.
- Every screen must work from 360px wide.

## Testing

- Write the test first. Tests sit next to the code as `*.test.ts(x)`.
- Test behaviour through the DOM (roles and visible text), not implementation.
- Mock `@/lib/api/client` in component tests; never call the network.
- Coverage must stay at or above 80% for lines, branches, functions and
  statements. Add tests rather than exclusions.

## End-to-end tests

`pnpm e2e` runs Playwright against the real frontend and backend.

- It needs the backend repository next to this one (`../ssMarket-be`, or set
  `E2E_BACKEND_DIR`) with `docker compose up -d` running, and Chromium's
  system libraries (`sudo npx playwright install-deps chromium`, once).
- `e2e/support/start-backend.sh` recreates the database `ssmarket_e2e`, uses
  Redis database 2 and ports 4100/3100, so a running `pnpm dev` and its data
  are not touched.
- Tests sign in through the backend's development sign-in and create their
  own uniquely named people and listings (`e2e/support/people.ts`); they never
  depend on existing data or on each other.
- Find elements the way a person does: by role and visible Vietnamese text.
- Add a scenario here when a flow crosses both apps or two people. Rules of a
  single component belong in Vitest.

## Environment

Copy `.env.example` to `.env.local`. Never commit `.env.local`.

| Variable | Purpose |
|---|---|
| `API_URL` | Backend origin, e.g. `http://localhost:4000` |

## Conventions

- TypeScript strict. Server components by default; add `"use client"` only when
  a component needs state, effects or browser APIs.
- User-facing text in Vietnamese; code, comments and commits in English.
- Conventional Commits. Work on `feat/...`, `fix/...` or `chore/...` branches.
