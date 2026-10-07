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
pnpm gen:api              # regenerate src/shared/api/schema.d.ts from the backend
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
│       ├── cart/                 the cart, grouped by seller
│       ├── checkout/             one checkout, one order per seller
│       ├── sellers/[id]/         a seller's public page
│       ├── admin/categories/     category management (admins only)
│       └── profile/
├── shared/               knows nothing about the business
│   ├── ui/
│   │   ├── atoms/        logo-mark, wordmark, price
│   │   │   └── shadcn/   shadcn/ui primitives (Base UI); change only to apply design tokens
│   │   └── molecules/    field (and shared control styles), user-avatar
│   ├── api/              typed client, session refresh, ApiError, schema.d.ts,
│   │                     query provider, use-current-user, use-public-user, use-user-message
│   ├── i18n/             locales, request config (cookie), messages/vi.json and en.json,
│   │                     locale cookie, Translator type, test-utils (renderWithIntl)
│   └── lib/              utils.ts, format/ (money, dates, quantities, initials, useFormat), theme/
└── features/
    ├── listings/         components/ (card, grid, filters, carousel, detail view, gallery,
    │                     item table), api/ (listing and category hooks), lib/ (URL filters,
    │                     pricing and combos, condition)
    ├── profile/          components/, api/ (banks, update profile), lib/ (schema)
    ├── shell/            components/ (header, search box, user menu, phone tab bar,
    │                     language switch and sync), api/ (update locale),
    │                     lib/ (nav-items, use-switch-locale)
    ├── sellers/          components/ (seller page)
    ├── admin/            components/ (category admin), api/
    ├── orders/           components/ (panel, order page, editor, QR block, actions, lists,
    │                     summary), api/ (use-orders), lib/ (order-math)
    ├── sell/             components/ (mode step, listing form, my listings),
    │                     lib/ (form schema, units, draft store, save sequence)
    └── cart/             components/ (card actions, stepper, cart button, cart page,
                          checkout page, add to cart), api/ (use-cart), lib/ (checkout link)
```

Each feature has `components/`, `api/`, `lib/` (only the ones it needs) and an
`index.ts`, its public entry point. `shared` never imports features;
features import each other only through `index.ts`, and only
`orders`, `sell`, `sellers`, `admin` and `cart` may import `listings` (`cart`
also imports `orders`); `app/` is the
one place that joins two features. ESLint enforces this (`FEATURE_DEPS` in
`eslint.config.mjs`). See `docs/architecture.md` for the rules, the atom and
molecule definitions, and how to add a feature.

Pages under `app/` stay thin: they render one component from a feature,
which holds the behaviour and has the tests.

## Talking to the backend

- The browser only calls same-origin `/api/*`. `src/proxy.ts` forwards those
  requests to `API_URL`, which is read at runtime. Never reference the backend
  origin anywhere else, and never add `NEXT_PUBLIC_API_URL`.
- Use the typed client: `api.GET("/users/me")`, `api.POST("/auth/logout")`.
  Wrap reads in a TanStack Query hook under the owning feature's `api/` folder (or `src/shared/api/` if several features need it).
- `src/shared/api/schema.d.ts` is generated. When the backend API changes: merge
  the backend change, run `pnpm gen:api` here, fix the type errors, commit the
  regenerated file.
- A 401 triggers one session refresh and one retry (`src/shared/api/auth-fetch.ts`). Do not
  add retry logic elsewhere.
- Links that start the sign-in flow must be plain `<a href="/api/auth/google">`,
  not `next/link`.

## Errors

- Hooks throw `ApiError` (built with `toApiError`), which carries the
  backend's `code`.
- Show `useUserMessage()(error)` to people. Backend messages are English text
  for developers and must never be rendered. Add new codes to `errors.codes` in
  **both** `vi.json` and `en.json`.

## Languages

The app speaks Vietnamese (default) and English, through `next-intl` without
locale routing: URLs never carry a language.

- `users.locale` is the source of truth. The `NEXT_LOCALE` cookie is a copy
  that `src/shared/i18n/request.ts` reads on every request, so the server
  renders the right language first time. No cookie means Vietnamese;
  `Accept-Language` is never read.
- `LocaleSwitch` (header, from `md`) and the user menu item (phones) save the
  choice with `PATCH /users/me`, write the cookie, then `router.refresh()`.
  `LocaleSync` corrects a stale cookie once when the account loads. The login
  page has no switch: it only follows the cookie.
- Every piece of UI text, `aria-label`, placeholder, toast and validation
  message lives in `src/shared/i18n/messages/{vi,en}.json`, grouped by
  namespace (`common`, `errors`, `format`, `shell`, `listings`, `sell`,
  `orders`, `profile`, `sellers`, `admin`, `login`, `metadata`). Keys are
  English camelCase; numbers and names are ICU arguments, counts use `plural`.
  Add every key to both files; `messages.test.ts` checks keys and arguments.
- `no-hardcoded-vietnamese.test.ts` fails on Vietnamese letters in any source
  file except tests, the message files, `schema.d.ts` and
  `features/sell/lib/units.ts` (units are stored data, shown as written).
- Components use `useTranslations("<namespace>")`; server components use
  `getTranslations`. Pure functions never hold text: schemas take a
  `Translator<"namespace">` (`listingSchema(mode, t)`), other helpers return
  codes or keys (`quantityProblem`, `imageProblem`, `editBlockedReason`,
  `NAV_ITEMS[].labelKey`).
- Format with `useFormat()` (money, quantities, deadlines in the page's
  language). Dates stay day/month and 24-hour in both languages.
- Show a category with `categoryName(category, locale)` (`nameEn` in English).
- User-entered content (titles, descriptions, item names, notes) and units are
  never translated.

## State

- **Server data**: TanStack Query hooks in each feature's `api/` folder. After a write,
  invalidate `["listings"]`, `["my-listings"]` and `["listing", id]`.
- **Closing soon and seller page**: the carousel uses `useClosingSoon`
  (`GET /listings?sort=deadline`) and the seller page uses `useSellerListings`,
  both under the `["listings"]` key.
- **Browse filters**: the URL query string, through
  `parseListingFilters` / `listingsHref`. Filters are links, so a search can
  be shared and the back button works.
- **Unfinished new listing**: the Zustand store in `features/sell/lib/sell-draft-store.ts`
  (sessionStorage). It exists so typed values survive the detour to the
  profile page. Do not put server data in Zustand.

## Forms

- React Hook Form with a Zod schema. The schema mirrors the backend rules and
  gives Vietnamese messages; the backend stays the authority.
- Wrap controls in `Field`, which wires the label, hint and error message.
- Use a native `<select>` with `selectClassName`. When its options load after
  the first render, re-apply the value (see `features/profile/components/profile-form.tsx`), or the
  browser silently falls back to the first option.
- Prices and quantities are typed as text and parsed with `parsePrice` /
  `parseQuantity`, so "35.000" and "2,5" work.

## Images

Listing images come from `/api/media/...` behind the session cookie, so use a
plain `<img>` (the Next.js image optimizer cannot fetch them). The backend
already serves a 400px thumbnail and a 1600px full size.

## Products, condition and combos

- A listing is one product with up to 10 options ("Phân loại", `MAX_ITEMS`).
  With one option the form names it after the title and the card and detail
  hide the option name.
- Condition (`CONDITIONS` in `features/listings/lib/condition.ts`) is chosen
  for in-stock goods outside perishable categories (`category.isPerishable`)
  and never for pre-orders; `needsCondition` in the form schema decides.
- Combos ("N for a set price", at most 3 per option) are priced by
  `lineTotalWithCombos` in `features/listings/lib/pricing.ts`, a mirror of the
  backend's function tested with the same table. Combos never add up across
  options. `nextCombo` gives the "buy N more" hint.
- Price and condition filters are URL params (`minPrice`, `maxPrice`,
  `minCondition`) handled by `parseListingFilters` / `listingsHref`.

## Cart and checkout

- The cart lives on the server (`/cart`); the header shows `CartButton` with
  `useCartCount`. The cart never reserves stock.
- `listings` may not import `cart`, so cards and the detail page receive cart
  buttons from `app/` (`renderCardActions`, `renderSecondaryAction`).
- `/checkout?items=<itemId>:<qty>,...` (built by `checkoutHref`) asks
  `POST /checkout/preview` how the lines split into orders: one per seller,
  one per listing for pre-orders. Each block picks its own payment method and
  delivery place; the page holds one idempotency key for its lifetime, and
  `CHECKOUT_CHANGED` refetches the preview.
- "Đặt hàng" on the detail page still places one order directly
  (`OrderPanel`); "Thêm vào giỏ" sits next to it.
- After a checkout invalidate the cart, `["orders"]` and `["listings"]`.

## Orders

- `src/features/orders/lib/order-math.ts` mirrors the backend's rounding and quantity
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

## Admin screens

- `role` on the current user (`useCurrentUser`) decides what an admin sees:
  the user menu shows "Quản lý danh mục" and `/admin/*` pages render; anyone
  else is sent to `/`. The backend enforces the same rule; the frontend check
  only avoids showing a screen that would fail.
- After a category change, invalidate `["admin-categories"]`,
  `CATEGORIES_QUERY_KEY` (`["categories"]`) and `["listings"]`
  (`features/admin/api/use-admin-categories.ts` does this).
- A listing may stay in a category that was hidden after it was posted. The
  edit form then shows that category as "(đã ẩn)" so the select keeps its
  value; new listings never offer hidden categories.
- Category names come from the API. Never hard-code a category list.

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
- `src/shared/lib/theme/contrast.test.ts` fails when a text/background pair drops
  below WCAG AA. Add new pairs there when you introduce them.
- Buttons are always pills (`rounded-full`); cards use `rounded-lg` (12px).
- The header is `h-16` and sticky; anything that sticks under it uses
  `top-16`. Navigation lives in `features/shell/lib/nav-items.ts`: the header shows it from `md`
  up, `MobileTabBar` below. Add a destination there, not in either component.
- Fixed and sticky chrome (header, tab bar) is `z-20`; things that stick under
  the header are `z-10`. `main` reserves `pb-24` below `md` for the tab bar.
- An in-stock card shows `còn N <unit>` when the API sends `stockQuantity`, and
  `Hết hàng` in muted text when it is 0.
- `ListingCard` is a row (photo left) below 560px and stacked above; pass
  `layout="stacked"` where it must always be stacked, as in the carousel.
- Nunito for all UI text (`font-sans`; `font-heading` is the same family at
  heavier weights for h1, h2, prices and the wordmark); prices use
  `tabular-nums`. Geist Mono for codes people copy.
- Icons come from Phosphor: import from `@phosphor-icons/react/ssr` (works
  in server and client components); regular weight, fill for the current tab.
- `h1` and `h2` get `font-heading` from the base layer, and shadcn's
  `AlertDialogTitle` uses `font-heading` too, so changing `--font-heading`
  restyles dialogs.
- Use `Price` for money in the heading typeface and `UserAvatar` for a person's picture.
- Use the `Wordmark` component for the product name. Never add the SmartOSC
  logo file to this repository.
- To style a link as a button, use `buttonVariants(...)` on an `<a>`.
- Every screen must work from 360px wide.

## Testing

- Write the test first. Tests sit next to the code as `*.test.ts(x)`.
- Test behaviour through the DOM (roles and visible text), not implementation.
- Mock `@/shared/api/client` in component tests; never call the network.
- Render with `renderWithIntl(ui, { locale })` from `@/shared/i18n/test-utils`
  (Vietnamese by default); hooks use `intlWrapper(locale)`. Server components
  get Vietnamese messages from the `next-intl/server` mock in
  `vitest.setup.ts`.
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
- `start-backend.sh` sets `ADMIN_EMAILS=e2e-admin@dev.invalid`, and
  `signInAsAdmin` signs in as that fixed admin.
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
- User-facing text in Vietnamese and English, from the message files; code,
  comments and commits in English.
- Conventional Commits. Work on `feat/...`, `fix/...` or `chore/...` branches.
