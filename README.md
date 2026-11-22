# ZoolGo — Transport Company Portal

Web portal for transport companies (لوحة شركة النقل): the company's managers and staff run their own fleet, drivers, routes, trip schedule and prices, follow bookings, manifests and live tracking, and read their financial statement and settlements. API: `/api/v1/carrier/*` (decision D-CARRIER-PORTAL-01; settlement model D-REV-02). Everything is scoped to the signed-in employee's company; the platform admin dashboard keeps full oversight.

- Stack: React 19, TypeScript, Vite, Tailwind 3, React Router 7, TanStack Query 5, Leaflet (react-leaflet). RTL Arabic UI.
- Backend & docs: `zool-go-backend` (contract: `docs/openapi.yaml`, tags "Carrier Auth" / "Carrier Portal"; rules: `docs/API_CONVENTIONS.md`).
- Shares the UI kit and API client with the broker panel (`zool-broker-dashboard`); fleet, network and tracking screens are adapted from the admin dashboard (`zool-dashboard`).

## Run

Start the backend first (`zool-go-backend`: `npm run dev`, port 4000), then:

```bash
npm ci
cp .env.example .env   # optional; defaults: VITE_API_BASE_URL=/api/v1, proxy target http://localhost:4000
npm run dev            # http://localhost:5175 — Vite proxies /api to the backend
```

Dev seed account: company manager `+249900000401` («سودان إكسبريس»). The OTP is shown on the login screen in development.

Production (Vercel): `vercel.json` rewrites `/api/:path*` to `https://zoolgo-api.nodeteam.site/api/:path*` so the API stays same-origin (needed for the refresh cookie), and every other path to `index.html`.

## Auth

- Phone + 6-digit OTP: `POST /carrier/auth/otp/request` → `POST /carrier/auth/otp/verify` → `{ accessToken, employee }`.
- Access token in memory only; the refresh token is an HttpOnly cookie scoped to `/api/v1/carrier/auth`. On reload `POST /carrier/auth/refresh` restores the session; a 401 triggers **one shared refresh** and a retry (`src/lib/api/client.ts`). Logout: `POST /carrier/auth/logout`.
- Changing an employee's role, permissions or status revokes their sessions on the server, so changes apply at once.

## Permissions

`employee.permissions` comes from the API (managers hold all four; staff hold their flags). `useAuth().can(p)` reads it; nav items, routes (`RequirePermission`) and buttons are hidden without it, and the API enforces the same rules.

| Permission | Flag | Unlocks |
|---|---|---|
| `carrier.fleet` | `canManageFleet` | add / edit vehicles (seat-layout editor, amenities) and drivers |
| `carrier.schedule` | `canManageSchedule` | add / edit routes, schedule trips, change vehicle/driver, change price, cancel a trip |
| `carrier.finance` | `canViewFinance` | Reports (statement, cash by driver) and Settlements |
| `carrier.staff` | `canManageStaff` | Staff page (add, edit role/permissions, suspend) |

Everyone sees: Home, Trips (read + manifest), Routes, Vehicles and Drivers (read), Bookings, Live tracking, Brokers.

## Pages

| Path | Page |
|---|---|
| `/home` | Today's KPIs (Sudan day), live trips, next departures |
| `/trips`, `/trips/:id` | Trip list with filters; detail with stops, seat map and passenger manifest; schedule trips from a route, change vehicle/driver, change price (new sales only), cancel (full refund to everyone — strong warning + acknowledgement) |
| `/routes` | Company routes (stations from `GET /public/cities`) |
| `/vehicles`, `/vehicles/new`, `/vehicles/:id`, `/vehicles/:id/edit` | Fleet with the visual seat-layout editor |
| `/drivers` | Drivers (add, edit, suspend) |
| `/bookings` | Bookings on the company's trips (filters, detail drawer) |
| `/tracking`, `/tracking/:tripId` | Live map, polled every 15 s; one trip with its GPS trail |
| `/reports` | Live statement for a date range: sales by channel (online / broker / cash), refunds, platform fee, broker commission, net; cash collected by driver |
| `/settlements`, `/settlements/:id` | Settlements issued by the platform (read-only) with per-trip lines |
| `/brokers` | Broker offices selling the company and their commission |
| `/staff` | Managers and staff with permission toggles |

Money is always integer minor units from the API (100 = 1 SDG); dates and day filters are Sudan time (`Africa/Khartoum`).

Statement rule (backend `computeCarrierStatement`): **net = online + broker + platform-funded discounts − refunds − platform fee − broker commission (only when the carrier bears it)**. Cash collected by drivers is already held by the company: it is shown but never part of the net. See `src/features/reports/statement.ts`.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Dev server (:5175) |
| `npm run build` | Typecheck + production build |
| `npm run lint` | oxlint — warnings fail |
| `npm test` | Vitest unit tests (permissions & nav filtering, money/percent formatting, statement breakdown, API client, date ranges, seat layout, tracking state) |

## Workflow

Commit and push directly to `main`. Run `npm run lint && npx tsc -b && npm test` before pushing; CI (`.github/workflows/ci.yml`) re-runs lint, typecheck, tests and build on every push.
