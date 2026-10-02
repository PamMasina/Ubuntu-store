-- Capture contact details at signup.
--
-- The original handle_new_user only copied full_name, role and university out
-- of raw_user_meta_data. profiles.phone and profiles.whatsapp have existed
-- since 001 and are editable on the profile page, but a brand new account
-- could never populate them at signup: the values were either not sent or were
-- dropped here. That left a seller looking at a buyer with no way to make
-- contact, on an app whose entire point is a physical meetup.
--
-- Frontend and backend now send phone (required) and whatsapp (optional) as
-- signup metadata. This trigger persists them.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, university, phone, whatsapp)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), 'New user'),
    -- Guard against an arbitrary string arriving in user_metadata; anything
    -- that is not exactly 'vendor' becomes a student.
    case when new.raw_user_meta_data ->> 'role' = 'vendor'
      then 'vendor'::public.user_role
      else 'student'::public.user_role
    end,
    nullif(new.raw_user_meta_data ->> 'university', ''),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    nullif(new.raw_user_meta_data ->> 'whatsapp', '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;
