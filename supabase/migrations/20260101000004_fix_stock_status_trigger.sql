-- Ubuntu Store: restore a listing to active when stock comes back
--
-- enforce_listing_stock_consistency() only ever moved active -> sold. It never
-- moved sold -> active, so once a listing sold out and an order was cancelled,
-- the cancellation restored the units but left status = 'sold'. The listing then
-- rejected every future order with "This listing is no longer available", even
-- though it had stock again.
--
-- Both directions are derived from stock here. 'archived' is a deliberate vendor
-- action and is never undone by stock arithmetic.
--
-- The trigger and its binding already exist from 20260101000001_schema.sql, so
-- CREATE OR REPLACE is enough; no drop or re-create of the trigger is needed.

create or replace function public.enforce_listing_stock_consistency()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'archived' then
    return new;
  end if;

  if new.stock <= 0 then
    new.status := 'sold';
  else
    new.status := 'active';
  end if;

  return new;
end;
$$;
