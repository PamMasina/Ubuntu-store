-- Ubuntu Store: core schema
-- Campus marketplace. Meetup-only fulfilment, cash on collection.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.user_role as enum ('student', 'vendor');
create type public.listing_status as enum ('active', 'sold', 'archived');
create type public.order_status as enum (
  'pending',   -- placed by student, awaiting vendor
  'confirmed', -- vendor accepted the meetup
  'ready',     -- waiting at the meetup point
  'collected', -- handed over, complete
  'cancelled'  -- called off, stock restored
);
create type public.payment_status as enum ('unpaid', 'paid', 'refunded');

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role public.user_role not null default 'student',
  university text,
  -- Meetup contact details. No postal addresses anywhere: this is a
  -- hand-to-hand campus market.
  phone text,
  whatsapp text,
  bio text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Public-facing profile for every auth user. Mirrors the signup metadata.';

create index profiles_role_idx on public.profiles (role);

-- ---------------------------------------------------------------------------
-- listings
-- ---------------------------------------------------------------------------

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 3 and 120),
  description text,
  price numeric(10, 2) not null check (price > 0),
  category text not null,
  image_url text,
  -- Units still available to buy. Decremented atomically when an order is
  -- placed, restored if the order is cancelled.
  stock integer not null default 1 check (stock >= 0),
  status public.listing_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index listings_seller_idx on public.listings (seller_id);
create index listings_status_created_idx on public.listings (status, created_at desc);
create index listings_category_idx on public.listings (category);

-- A seller cannot push stock below whatever is already out on live orders.
create or replace function public.enforce_listing_stock_consistency()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'active' and new.stock > 0 then
    new.status := 'active';
  elsif new.stock = 0 and new.status = 'active' then
    new.status := 'sold';
  end if;
  return new;
end;
$$;

create trigger listings_stock_consistency
  before insert or update on public.listings
  for each row execute function public.enforce_listing_stock_consistency();

-- ---------------------------------------------------------------------------
-- orders
-- ---------------------------------------------------------------------------

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  -- Short human-readable code the buyer and seller quote to each other,
  -- standing in for a delivery number. Meetup only, so nothing ships.
  reference text not null unique,
  buyer_id uuid not null references public.profiles (id) on delete cascade,
  -- Denormalised so multi-seller baskets stay trivial to query later, even
  -- though checkout currently creates one order per seller.
  seller_id uuid not null references public.profiles (id) on delete cascade,
  status public.order_status not null default 'pending',
  payment_status public.payment_status not null default 'unpaid',
  payment_method text not null default 'cash',
  meetup_point text not null,
  meetup_slot text not null,
  note text,
  total numeric(10, 2) not null check (total >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index orders_buyer_idx on public.orders (buyer_id, created_at desc);
create index orders_seller_idx on public.orders (seller_id, created_at desc);
create index orders_status_idx on public.orders (status);

-- ---------------------------------------------------------------------------
-- order_items
-- ---------------------------------------------------------------------------

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  listing_id uuid references public.listings (id) on delete set null,
  -- Title and price are snapshotted so an order still reads correctly after
  -- the vendor edits or deletes the listing it came from.
  title text not null,
  unit_price numeric(10, 2) not null,
  quantity integer not null check (quantity > 0)
);

create index order_items_order_idx on public.order_items (order_id);

-- ---------------------------------------------------------------------------
-- reviews
-- ---------------------------------------------------------------------------

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  -- One review per order, enforced by the unique constraint below. This is
  -- what makes a review proof of a completed purchase.
  order_id uuid not null unique references public.orders (id) on delete cascade,
  seller_id uuid not null references public.profiles (id) on delete cascade,
  reviewer_id uuid not null references public.profiles (id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  constraint reviews_no_self_review check (seller_id <> reviewer_id)
);

create index reviews_seller_idx on public.reviews (seller_id, created_at desc);

-- ---------------------------------------------------------------------------
-- board_posts
-- ---------------------------------------------------------------------------

create table public.board_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 3 and 120),
  content text not null,
  created_at timestamptz not null default now()
);

create index board_posts_created_idx on public.board_posts (created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger listings_set_updated_at
  before update on public.listings
  for each row execute function public.set_updated_at();

create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Create a profile whenever a user signs up
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, university)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), 'New user'),
    -- Guard against an arbitrary string arriving in user_metadata; anything
    -- that is not exactly 'vendor' becomes a student.
    case when new.raw_user_meta_data ->> 'role' = 'vendor'
      then 'vendor'::public.user_role
      else 'student'::public.user_role
    end,
    nullif(new.raw_user_meta_data ->> 'university', '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Vendor rating rollup
-- ---------------------------------------------------------------------------

create or replace view public.vendor_ratings
with (security_invoker = true) as
  select
    p.id as seller_id,
    coalesce(round(avg(r.rating)::numeric, 1), 0) as average_rating,
    count(r.id) as review_count
  from public.profiles p
  left join public.reviews r on r.seller_id = p.id
  where p.role = 'vendor'
  group by p.id;
