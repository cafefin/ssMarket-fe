# Frontend architecture

Status: accepted, 2026-10-06. Scope: `ssMarket-fe` only.

## Context

The first phases grouped code by layer: `src/components/` (with a folder per
area) and `src/lib/` (api, format, theme, and per-area logic). That worked
for a handful of screens. By phase 2d it stopped scaling:

- One feature was spread over several folders. Changing orders meant touching
  `components/orders/`, `lib/orders/` and `lib/api/use-orders.ts`.
- Nothing enforced boundaries. `ListingDetailView` rendered `OrderPanel`
  while `orders` needed the types and hooks of `listings`, so the two
  features formed a cycle that no tool reported.
- The same small pieces (prices in the heading font, avatars with initials)
  were copied into three or four places.

The structure below fixes this without changing behaviour, appearance or the
API.

## Structure and rules

```
src/
├── proxy.ts                  forwards /api/*; Next.js convention, stays here
├── app/                      routing; each page composes features
├── shared/                   knows nothing about the business
│   ├── ui/
│   │   ├── atoms/            logo-mark, wordmark, price
│   │   │   └── shadcn/       generated shadcn/ui primitives
│   │   └── molecules/        field, user-avatar
│   ├── api/                  client, auth-fetch, api-error, schema.d.ts,
│   │                         query-provider, use-current-user, use-public-user,
│   │                         use-user-message
│   ├── i18n/                 locales, request config, messages/{vi,en}.json,
│   │                         locale cookie, Translator type, test-utils
│   └── lib/                  utils.ts, format/, theme/
└── features/
    ├── listings/             browse, search and read listings
    ├── profile/              profile form, bank account
    ├── shell/                header, search, user menu, tab bar, nav items
    ├── sellers/              a seller's public page
    ├── admin/                category management
    ├── orders/               ordering, tracking, the seller's summary
    └── sell/                 posting and managing my listings
```

Every feature has the same shape; a folder with no files is not created:

```
features/<name>/
├── components/    UI and behaviour; tests sit next to the file
├── api/           TanStack Query hooks
├── lib/           pure business rules, schemas, stores
└── index.ts       public entry point
```

Rules:

1. `shared` never imports from `features` or `app`.
2. A feature uses another feature only through that feature's `index.ts`,
   never by reaching inside it.
3. Dependencies between features run one way, with no cycles:

   | Feature | May import from |
   |---|---|
   | `listings` | `shared` |
   | `profile` | `shared` |
   | `shell` | `shared` |
   | `sellers` | `shared`, `listings` |
   | `admin` | `shared`, `listings` |
   | `orders` | `shared`, `listings` |
   | `sell` | `shared`, `listings` |
   | `cart` | `shared`, `listings`, `orders` |

4. `app` may import everything, and it is the only place that joins two peer
   features. It also goes through each feature's `index.ts`.
5. Inside a feature use relative imports; to leave it use
   `@/features/<name>` or `@/shared/...`.

**Enforcement.** `eslint.config.mjs` declares `FEATURE_DEPS` (feature to
allowed features) and builds one `no-restricted-imports` block per feature
folder, plus one for `src/shared/**` and one for `src/app/**`. No new
dependency. `pnpm lint` runs in CI and fails on a wrong-way import, a deep
import into another feature, or an import of `app/` from a feature. It checks
static imports and re-exports, including relative paths that leave a feature,
`shared/` or `app/`. It does not check dynamic `import()` or `vi.mock` strings.

## Atoms and molecules

- **Atom:** renders no other project component. It does not call the API and
  knows nothing about listings or orders. Example: `Price` (an amount in the
  heading typeface, with the optional "từ" prefix and unit, in three sizes).
- **Molecule:** built from atoms. It does not call the API and knows nothing
  about the business. It exists only when two or more features use it.
  Example: `UserAvatar` (an `Avatar` with the picture, or the initials of the
  name; `aria-hidden` when the name is shown next to it). `Field` is the other.
- **Anything that knows the business is a feature component**, however small.
  `ModeBadge` knows "in stock / pre-order", so it lives in `listings`.

Feature components play the role of organisms; `app/` plays templates and
pages. There are no folders for those layers. Only pieces repeated in three
or more places were extracted; filter chips, the search box and status labels
are used in one feature each and stay there.

## Adding a feature

1. Create `src/features/<name>/` with only the folders it needs
   (`components/`, `api/`, `lib/`) and an `index.ts`.
2. Add it to `FEATURE_DEPS` in `eslint.config.mjs` with the features it may
   import (usually none or `listings`). Do not add a dependency that closes a
   cycle; move the shared piece into `listings` or `shared` instead.
3. Export from `index.ts` only what code outside the feature uses. It
   re-exports and has no `"use client"`; each component declares its own.
4. Joining two peer features happens in `app/`. Example: `listings` must show
   an order form on the detail page, but `listings` may not import `orders`
   (and `orders` already needs `listings`). `ListingDetailView` therefore takes
   a `renderOrderPanel?: (listing: ListingDetail) => ReactNode` prop, and
   `app/(app)/listings/[id]/page.tsx` passes
   `renderOrderPanel={(listing) => <OrderPanel listing={listing} />}`.
5. Put tests next to the code and keep coverage at or above 80%.

## Rejected alternatives

- **Pure atomic design** (atoms, molecules, organisms, templates, pages for
  everything). It scatters one feature across layers by size. It says nothing
  about data or business rules. It collides with Next.js `app/` and shadcn's
  `ui/`. The organisms layer tends to become a bin for everything.
- **Full Feature-Sliced Design.** It suits scaling problems, but with about
  47 components most layers would be nearly empty, and the layer names `app`
  and `pages` collide with Next.js. The chosen structure keeps its spirit
  (layers, one direction, public entry points), so moving to FSD later would
  not mean starting over.

## Deviations recorded during planning

1. `use-public-user.ts` lives in `shared/api/`, not `features/sellers/api/`.
   Phase 2d made `profile`'s `use-update-profile.ts` import
   `publicUserQueryKey` from it, and `profile` may only import `shared`. A
   public user profile is no more "business" than the current user, which is
   already in `shared/api`.
2. There is no `listing-detail-screen.tsx`. `app/(app)/listings/[id]/page.tsx`
   is already a client component, so it passes the render prop itself.
3. `app/` imports features through their `index.ts` too (the original spec
   only said `app` may import everything). Every public export is then one
   that someone really uses.
4. Phase 2e added `shared/i18n/`: the locale config, the request config that
   reads the `NEXT_LOCALE` cookie, the message files and test helpers. It is
   infrastructure like `shared/api`, so every feature may use it. The
   language switch lives in `shell`, which may only import `shared`, so it
   has its own `useUpdateLocale` instead of reusing `profile`'s
   `useUpdateProfile`.
