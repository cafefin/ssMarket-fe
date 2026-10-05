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
```

## Structure

```
src/
├── proxy.ts              forwards /api/* to the backend; redirects signed-out visitors
├── app/
│   ├── globals.css       design tokens
│   ├── login/            public
│   └── (app)/            everything that requires a session
├── components/
│   ├── ui/               shadcn/ui primitives (Base UI); change only to apply design tokens
│   ├── brand/            wordmark
│   └── layout/           header and other shell pieces
└── lib/
    ├── api/              typed client, session refresh, query hooks
    ├── query/            TanStack Query provider
    ├── theme/            contrast helpers and the palette contrast gate
    └── format/           pure formatting helpers
```

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

## Design system

`DESIGN.md` is the source of truth. Its tokens are declared in
`src/app/globals.css` and exposed as Tailwind theme classes.

- Use theme classes (`bg-primary`, `text-muted-foreground`, `border-border`,
  `rounded-lg`). Never write hex colours in components.
- Blue (`primary`) is for actions: main buttons, links, focus rings, selected
  states. Green (`positive`) means something good happened or is available:
  in stock, paid, delivered. Do not use green for decoration.
- The design token `accent` in `DESIGN.md` is `positive` in CSS, because
  shadcn/ui uses `accent` for neutral hover surfaces.
- White text goes only on `bg-primary` and `bg-primary-deep`. Coloured text
  uses the `-deep` variant (`text-positive-deep`, `text-warn-deep`,
  `text-error-deep`); the base colours are for icons, borders, dots and
  backgrounds with dark text.
- `src/lib/theme/contrast.test.ts` fails when a text/background pair drops
  below WCAG AA. Add new pairs there when you introduce them.
- Buttons are always pills (`rounded-full`); cards use `rounded-lg` (12px).
- Inter for UI text, Geist Mono for codes people copy. No third typeface.
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
