# CropConnect

CropConnect connects Indian farmers and buyers with multilingual phone OTP access, live mandi price discovery, crop listings, and local produce ordering.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/farmai/src/` — React/Vite app, role-based routes, translations, and the CropConnect visual system
- `artifacts/api-server/src/routes/farm.ts` — phone OTP, mandi price, dashboard, listing, order, and assistant API behavior
- `lib/api-spec/openapi.yaml` — source of truth for the typed API contract
- `lib/api-client-react/src/generated/` and `lib/api-zod/src/generated/` — generated client hooks and server validators

## Architecture decisions

- Mandi prices prefer data.gov.in's Agmarknet resource and fall back to clearly labelled demo rows when the provider is unavailable, so the dashboard remains useful offline.
- Phone OTP is intentionally the only sign-in path; the current demo flow uses a server-issued challenge and development-only demo code rather than social sign-in.
- Listings and orders use a small in-memory seed store for the first demo build, keeping the product immediately runnable while preserving typed endpoints for a later persistent database.
- Translation is client-side for fast language switching and supports English, Hindi, and Marathi input without translating user-entered text.

## Product

Farmers can review live market prices, compare trends, publish produce with photos and expected prices, and ask an agricultural assistant for negotiation and quality guidance. Buyers can source by nearby district, filter listings, request paid samples, place orders, and track delivery.

## User preferences

- No Google or other social sign-in; farmers and buyers enter a phone number and OTP.
- Major UI copy should remain usable in English, Hindi, and Marathi.

## Gotchas

- `DATA_GOV_API_KEY` is read only by the API server; restart `artifacts/api-server: API Server` after changing the secret.
- The app expects the shared API at `/api`; do not add a Vite proxy or hard-code localhost URLs in the frontend.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
