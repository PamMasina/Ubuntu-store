-- Ubuntu Store: row level security and transactional order placement
--
-- The API runs with the service_role key, which bypasses RLS. These policies
-- are the backstop for anything that talks to Postgres directly with the anon
-- key. Defence in depth: the API checks ownership itself, RLS checks it again.

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere
-- ---------------------------------------------------------------------------

alter table public.profiles   enable row level security;
alter table public.listings   enable row level security;
alter table public.orders     enable row level security;
alter table public.order_items enable row level security;
alter table public.reviews    enable row level security;
alter table public.board_posts enable row level security;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create policy "profiles are readable when signed in"
  on public.profiles for select to authenticated
  using (true);

create policy "users update their own profile"
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- No insert/delete policies: profiles are created by the on_auth_user_created
-- trigger and removed by the auth.users cascade. role is deliberately absent
-- from the update policy, so nobody can promote themselves to vendor client-side.

-- ---------------------------------------------------------------------------
-- listings
-- ---------------------------------------------------------------------------

create policy "anyone sees active listings"
  on public.listings for select to anon, authenticated
  using (status = 'active' or seller_id = auth.uid());

create policy "vendors create their own listings"
  on public.listings for insert to authenticated
  with check (seller_id = auth.uid());

create policy "vendors update their own listings"
  on public.listings for update to authenticated
  using (seller_id = auth.uid())
  with check (seller_id = auth.uid());

create policy "vendors delete their own listings"
  on public.listings for delete to authenticated
  using (seller_id = auth.uid());

-- ---------------------------------------------------------------------------
-- orders and order_items
-- ---------------------------------------------------------------------------

create policy "buyers and sellers see their own orders"
  on public.orders for select to authenticated
  using (buyer_id = auth.uid() or seller_id = auth.uid());

create policy "order items follow their order"
  on public.order_items for select to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (o.buyer_id = auth.uid() or o.seller_id = auth.uid())
    )
  );

-- Orders are only ever created through place_order() and mutated through
-- update_order_status(). There is deliberately no insert/update policy.

-- ---------------------------------------------------------------------------
-- reviews
-- ---------------------------------------------------------------------------

create policy "reviews are public"
  on public.reviews for select to anon, authenticated
  using (true);

-- Review creation is validated in the API: the reviewer must have collected
-- the order, must be the buyer, and the unique index blocks a second review.

-- ---------------------------------------------------------------------------
-- board_posts
-- ---------------------------------------------------------------------------

create policy "board posts are public"
  on public.board_posts for select to anon, authenticated
  using (true);

create policy "signed in users post as themselves"
  on public.board_posts for insert to authenticated
  with check (author_id = auth.uid());

create policy "authors delete their own posts"
  on public.board_posts for delete to authenticated
  using (author_id = auth.uid());

-- ---------------------------------------------------------------------------
-- place_order: reserve stock and create the order in one transaction
-- ---------------------------------------------------------------------------

create or replace function public.place_order(
  p_listing_id uuid,
  p_quantity integer,
  p_meetup_point text,
  p_meetup_slot text,
  p_note text default null
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_listing public.listings;
  v_order public.orders;
  v_reference text;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  if p_quantity is null or p_quantity < 1 then
    raise exception 'Quantity must be at least 1' using errcode = '22023';
  end if;

  if p_meetup_point is null or p_meetup_slot is null then
    raise exception 'A meetup point and time slot are required' using errcode = '22023';
  end if;

  -- Take a row lock first: two students checking out at the same instant must
  -- not both pass the stock check.
  select * into v_listing
    from public.listings
    where id = p_listing_id
    for update;

  if not found then
    raise exception 'Listing not found' using errcode = 'P0002';
  end if;

  if v_listing.seller_id = v_uid then
    raise exception 'You cannot buy your own listing' using errcode = '22023';
  end if;

  if v_listing.status <> 'active' then
    raise exception 'This listing is no longer available' using errcode = '22023';
  end if;

  if v_listing.stock < p_quantity then
    declare
      v_msg text;
    begin
      v_msg := 'Only ' || v_listing.stock || ' left in stock';
      raise exception '%', v_msg using errcode = '22023';
    end;
  end if;

  update public.listings
     set stock = stock - p_quantity
   where id = p_listing_id;

  v_reference := 'UBS-' || upper(substr(encode(gen_random_bytes(3), 'hex'), 1, 6));

  insert into public.orders (
    reference, buyer_id, seller_id, meetup_point, meetup_slot, note, total
  )
  values (
    v_reference,
    v_uid,
    v_listing.seller_id,
    p_meetup_point,
    p_meetup_slot,
    nullif(trim(p_note), ''),
    v_listing.price * p_quantity
  )
  returning * into v_order;

  insert into public.order_items (order_id, listing_id, title, unit_price, quantity)
  values (v_order.id, v_listing.id, v_listing.title, v_listing.price, p_quantity);

  return v_order;
end;
$$;

-- ---------------------------------------------------------------------------
-- update_order_status: the only sanctioned way to move an order along
-- ---------------------------------------------------------------------------

create or replace function public.update_order_status(
  p_order_id uuid,
  p_status public.order_status
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_order public.orders;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  select * into v_order
    from public.orders
    where id = p_order_id
    for update;

  if not found then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;

  if v_order.buyer_id <> v_uid and v_order.seller_id <> v_uid then
    raise exception 'Not your order' using errcode = '42501';
  end if;

  -- Only these transitions exist. Anything else is rejected outright.
  if not (
      (v_order.status = 'pending'   and p_status in ('confirmed', 'cancelled'))
   or (v_order.status = 'confirmed' and p_status in ('ready', 'cancelled'))
   or (v_order.status = 'ready'     and p_status = 'collected')
  ) then
    declare
      v_msg text;
    begin
      v_msg := 'Cannot change an order from ' || v_order.status || ' to ' || p_status;
      raise exception '%', v_msg using errcode = '22023';
    end;
  end if;

  -- The buyer can back out up until the meetup is under way.
  if p_status = 'cancelled' and v_order.seller_id = v_uid
     and v_order.status not in ('pending', 'confirmed') then
    raise exception 'Only the buyer can cancel at this stage' using errcode = '42501';
  end if;

  -- Confirming, marking ready and marking collected are the vendor's moves.
  if p_status in ('confirmed', 'ready')
     and v_order.seller_id <> v_uid then
    raise exception 'Only the seller can do that' using errcode = '42501';
  end if;

  -- Marking collected is the buyer's confirmation of handover, and it is what
  -- marks cash-on-meetup as paid and unlocks the review.
  if p_status = 'collected' and v_order.buyer_id <> v_uid then
    raise exception 'Only the buyer can confirm collection' using errcode = '42501';
  end if;

  update public.orders
     set status = p_status,
         payment_status = case
           when p_status = 'collected' then 'paid'::public.payment_status
           else payment_status
         end
   where id = p_order_id
  returning * into v_order;

  -- Cancelling puts the units back on the shelf.
  if p_status = 'cancelled' then
    update public.listings l
       set stock = l.stock + oi.quantity
      from public.order_items oi
     where oi.order_id = v_order.id
       and oi.listing_id = l.id;
  end if;

  return v_order;
end;
$$;

-- ---------------------------------------------------------------------------
-- grants
-- ---------------------------------------------------------------------------

revoke all on function public.place_order(uuid, integer, text, text, text) from public;
grant execute on function public.place_order(uuid, integer, text, text, text) to authenticated;

revoke all on function public.update_order_status(uuid, public.order_status) from public;
grant execute on function public.update_order_status(uuid, public.order_status) to authenticated;
