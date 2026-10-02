-- Ubuntu Store: fix order reference generation
--
-- place_order() built its reference with gen_random_bytes(), which is part of
-- pgcrypto. pgcrypto is not in public, and the function runs with
-- `set search_path = public`, so every checkout failed with:
--
--   function gen_random_bytes(integer) does not exist   (SQLSTATE 42883)
--
-- gen_random_uuid() is core from PostgreSQL 13 onwards, so slicing its hex text
-- gives the same six-character reference with no extension dependency and
-- nothing to install.
--
-- Only the reference line differs from 20260101000002_rls.sql; the body is
-- repeated in full because CREATE OR REPLACE needs the complete definition.

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

  -- gen_random_uuid() is core, so this works regardless of which extensions
  -- are installed. The hex form is 32 characters with no dashes to strip.
  v_reference := 'UBS-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

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
