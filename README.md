# Ubuntu Store

A campus marketplace where students and vendors trade on campus. Hand-to-hand
meetups, cash on collection, no shipping.

Built as a React frontend plus an Express API, both talking to Supabase.

## How a purchase works

There is no delivery number, because nothing is delivered. The order carries a
short reference (`UBS-A1B2C3`) that both parties quote at the meetup.

1. **Student** places an order and picks a meetup point and a time slot.
   Stock is reserved immediately so nobody else can buy the same item.
2. **Vendor** accepts, then marks the item ready once it is set aside.
3. **Student** confirms collection. The order is marked paid and stock is
   permanently consumed.
4. **Student** can leave one review, and only once collection is confirmed.

Either side can cancel before the meetup is under way, which releases the stock
back onto the listing.

## Requirements

- Node.js 20 or newer
- A Supabase project

## Setup

### 1. Database

Run the two migrations in order against your Supabase project. Either paste them
into the SQL editor in the dashboard, or use the CLI:

```bash
supabase link --project-ref your-project-ref
supabase db push
```

- `supabase/migrations/20260101000001_schema.sql` — tables, enums, triggers
- `supabase/migrations/20260101000002_rls.sql` — row level security, plus the
  `place_order` and `update_order_status` functions

You also need a storage bucket named `listing-images`, public, for vendor
listing images.

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env    # then fill in your Supabase keys
npm run dev
```

Runs on port 3000.

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env    # then fill in the same Supabase URL and anon key
npm run dev
```

Runs on port 5173 and proxies `/api` to the backend.

## What each role can do

**Students**

- Browse, search, filter and sort listings
- Add to cart and check out with a meetup point and time slot
- Track orders and see exactly who they are meeting and where
- Cancel an order, confirm collection
- Leave one review per completed purchase
- View and edit their profile and contact details

**Vendors**

- Create, edit and delete listings, with images and stock counts
- Restock, and mark a listing sold by setting stock to 0
- See incoming orders and move them through confirm, ready and collected
- Look up a buyer's contact details for a confirmed meetup
- See reviews and ratings from completed sales
- Edit their profile

## API

All protected routes take `Authorization: Bearer <access_token>`. Roles are
read from the `profiles` table on the server, never from client-supplied
metadata.

| Method | Path | Notes |
|---|---|---|
| GET | `/api/health` | |
| POST | `/api/auth/register` | Role lands in the profile trigger, not the token |
| POST | `/api/auth/login` | |
| GET | `/api/auth/me` | Authoritative role |
| POST | `/api/auth/verify` | Resend verification email |
| GET | `/api/meta` | Categories, meetup points, time slots |
| GET | `/api/profiles/:id` | Public seller card with rating |
| GET | `/api/profiles/me/details` | Own profile and stats |
| PUT | `/api/profiles/me` | Cannot change your own role |
| GET | `/api/listings` | Paginated, category and seller filters |
| GET | `/api/listings/:id` | |
| GET | `/api/listings/mine/all` | Vendor, including sold items |
| POST | `/api/listings` | Vendor only |
| PUT | `/api/listings/:id` | Vendor only, owner only |
| DELETE | `/api/listings/:id` | Vendor only, owner only |
| GET | `/api/orders` | Orders the caller bought |
| GET | `/api/orders/incoming` | Orders the caller is selling |
| POST | `/api/orders` | Reserves stock atomically |
| GET | `/api/orders/:id` | Buyer or seller only |
| PATCH | `/api/orders/:id/status` | Transitions validated in the database |
| GET | `/api/orders/:id/contact` | Contact card for a confirmed meetup |
| GET | `/api/payments/:orderId` | Settlement state |
| POST | `/api/payments/initiate` | Cash only today |
| GET | `/api/reviews/:sellerId` | Public |
| POST | `/api/reviews` | Requires a collected order |
| GET | `/api/reviews/pending/mine` | Collected orders awaiting a review |
| GET/POST/DELETE | `/api/board` | Community board |

## How stock stays correct

`place_order` locks the listing row, checks the remaining stock, decrements it
and writes the order in a single transaction. Two students checking out at the
same instant cannot both claim the last unit. Cancelling adds the units back.

Setting stock to 0 flips the listing to `sold` via a database trigger, so the
vendor dashboard's "Sold" count reflects reality.

## Payments

Cash on collection. `backend/config/paymentProvider.js` defines the seam: add a
provider there and the routes do not change. PayFast needs merchant
credentials and its own signature and callback handling, so it is deliberately
not half-implemented.

## Security notes

- The API holds the `service_role` key, which bypasses RLS, so every route
  checks ownership itself. The SQL policies are the backstop for anything
  talking to the database directly.
- Vendors can only see and edit their own listings, and role comes from the
  database rather than a claim in the request.
- Reviews require a completed order and are capped at one per order.
- Unknown ids return 404 rather than 403, so ids cannot be probed.
