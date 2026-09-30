# Backend

Express API for Ubuntu Store, backed by Supabase (Postgres + GoTrue auth).

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

## Environment

| Variable | Purpose |
|---|---|
| `SUPABASE_URL` | Project URL |
| `SUPABASE_SERVICE_KEY` | Privileged client. Bypasses RLS. Never commit, never send to a browser |
| `SUPABASE_ANON_KEY` | Used only to verify tokens and create sessions |
| `ALLOWED_ORIGINS` | Comma-separated browser origins allowed by CORS |
| `PORT` | Defaults to 3000 |
| `PAYFAST_*` | Unused. Reserved for a future payment provider |

The database schema lives in `../supabase/migrations`. Run it before starting
the API, or every request will fail with a missing-relation error.

## Layout

```
config/
  supabase.js         two clients: admin (service_role) and auth (anon)
  constants.js        categories, meetup points and slots, shared with the browser
  paymentProvider.js  payment seam, currently cash only
middleware/
  auth.js             bearer token verification, plus requireRole
  errorHandler.js     maps Postgres error codes onto HTTP statuses
routes/               one module per resource
utils/validate.js     input validation helpers, throws HttpError
```

## Two clients, on purpose

`supabaseAdmin` uses the service_role key and bypasses row level security, so
every route that reads or writes user data checks ownership itself. Using that
same client for authentication would mean this process could mint a session for
any account, so identity work goes through `supabaseAuth` on the anon key.

## Error handling

Routes throw `HttpError` for expected failures and let everything else fall
through to `errorHandler`. Raw database error messages are logged but not
returned, since they leak table and column names. The `place_order` and
`update_order_status` functions in Postgres raise with user-facing text, and
those messages are passed through as 400s.

## Payments

`config/paymentProvider.js` holds a provider registry. Cash is implemented: an
order is created unpaid and settles when the buyer marks it collected. Adding
PayFast means implementing `start` and `confirm` in that file and registering
it. Nothing under `routes/` needs to change.
