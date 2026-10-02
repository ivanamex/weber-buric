-- A family adds photos of its own boarded horse; the club can hide (or delete) any of them.

alter table horses add column if not exists hidden_photos text[] not null default '{}';

-- Families may upload into their own horse's folder of the public horse-photos bucket.
drop policy if exists horse_photos_owner on storage.objects;
create policy horse_photos_owner on storage.objects for insert to authenticated
with check (
  bucket_id = 'horse-photos'
  and exists (select 1 from public.horses h
              where h.id::text = (storage.foldername(objects.name))[1] and h.type = 'boarded' and h.owner_family_id = public.my_family_id())
);

-- List the photo on the horse (at most 12); only the owner family or management.
create or replace function add_horse_photo(p_horse uuid, p_path text) returns json
language plpgsql security definer set search_path = public as $$
declare v_photos text[];
begin
  if not (is_admin() or owns_horse(p_horse)) then return json_build_object('ok', false, 'code', 'notFound'); end if;
  if p_path is null or split_part(p_path, '/', 1) <> p_horse::text or p_path like '%..%' then
    return json_build_object('ok', false, 'code', 'notFound');
  end if;
  select photos into v_photos from horses where id = p_horse for update;
  if coalesce(array_length(v_photos, 1), 0) >= 12 then return json_build_object('ok', false, 'code', 'tooManyPhotos'); end if;
  update horses set photos = array_append(coalesce(photos, '{}'), p_path) where id = p_horse and not (p_path = any (coalesce(photos, '{}')));
  return json_build_object('ok', true);
end $$;

revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;
grant execute on function public_site() to anon;
revoke execute on function create_family_record(jsonb, boolean) from authenticated;
revoke execute on function apply_plan_payment(payments) from authenticated;
revoke execute on function release_booking(bookings) from authenticated;
revoke execute on function pick_horse(uuid, date, text, integer) from authenticated;
revoke execute on function horse_busy(uuid, date, text, integer) from authenticated;
revoke execute on function rider_busy(uuid, date, text, integer, uuid) from authenticated;
revoke execute on function mark_moved(uuid, text, text, date, date) from authenticated;
revoke execute on function open_period(riders, date) from authenticated;
revoke execute on function plan_at(uuid, date) from authenticated;
revoke execute on function plans_fill_period() from authenticated;
revoke execute on function slot_with(slots, jsonb) from authenticated;
revoke execute on function payment_due(payments) from authenticated;
revoke execute on function payments_fill_due() from authenticated;
revoke execute on function materialize_due_charges(date) from authenticated;
revoke execute on function reminders_due(date) from authenticated;
revoke execute on function reminder_mark(uuid, text) from authenticated;
revoke execute on function reminders_finish(boolean) from authenticated;
