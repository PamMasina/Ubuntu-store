# Frontend

React 19 + Vite. Talks to the API in `../backend` for all data, and uses
Supabase directly only for authentication.

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Needs the API running on port 3000. Vite proxies `/api` there, so the browser
never makes a cross-origin request in development.

## Environment

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Public anon key. RLS protects it |
| `VITE_API_BASE` | Defaults to `/api` |
| `VITE_PROXY_TARGET` | Where the dev proxy forwards. Defaults to `http://localhost:3000` |

The service_role key must never appear in this app. All privileged writes go
through the API.

## Layout

```
api.js              typed client for every endpoint, plus ApiError
context/
  AuthContext.jsx   session, authoritative role, sign out
  CartContext.jsx   cart, persisted to localStorage
components/         Header, StatusBadge, StarRating, States
pages/              one file per route
index.css           design tokens and shared components
pages.css           page-specific styles
```

## Two things worth knowing

**Role is not trusted from the token.** `user_metadata.role` is writable by the
account holder, so `AuthContext` fetches the role from `profiles` via
`/api/auth/me` and treats that as authoritative. Vendor-only routes wait for it
to load rather than assuming.

**The API does the authorization.** This app never writes to a table directly.
Vendor update and delete go through endpoints that scope by the verified user
id, so one vendor cannot touch another's listings.
