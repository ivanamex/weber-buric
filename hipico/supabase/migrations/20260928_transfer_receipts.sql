-- Transfer receipts: the club's bank details, a private bucket for receipts (photo or PDF),
-- and a review step in Cobros (approve → paid by transfer; reject with a note → upload again).

-- ───────── Club settings (one row) ─────────
create table if not exists club_settings (
  id             integer primary key default 1 check (id = 1),
  bank_name      text,
  account_holder text,
  clabe          text check (clabe is null or clabe ~ '^[0-9]{18}$'),
  updated_at     timestamptz not null default now()
);
insert into club_settings (id) values (1) on conflict (id) do nothing;
alter table club_settings enable row level security;
drop policy if exists read_all on club_settings;
create policy read_all on club_settings for select to authenticated using (true);
drop policy if exists admin_all on club_settings;
create policy admin_all on club_settings for all to authenticated using (is_admin()) with check (is_admin());
grant select, update on club_settings to authenticated;

-- ───────── Receipt state on each payment ─────────
alter table payments add column if not exists receipt_path text;
alter table payments add column if not exists receipt_status text check (receipt_status in ('review', 'approved', 'rejected'));
alter table payments add column if not exists receipt_note text;
alter table payments add column if not exists receipt_uploaded_at timestamptz;
alter table payments add column if not exists reviewed_at timestamptz;

-- ───────── Private bucket: <family_id>/<payment_id>/<file> ─────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('receipts', 'receipts', false, 10485760,
        array['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'application/pdf'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Management reads every receipt; a family reads only files under its own folder.
drop policy if exists receipts_read on storage.objects;
create policy receipts_read on storage.objects for select to authenticated
using (bucket_id = 'receipts' and (public.is_admin() or (storage.foldername(name))[1] = public.my_family_id()::text));

-- A family uploads only into its own folder, for one of its own payments that is still pending.
drop policy if exists receipts_upload on storage.objects;
create policy receipts_upload on storage.objects for insert to authenticated
with check (
  bucket_id = 'receipts'
  and (storage.foldername(name))[1] = public.my_family_id()::text
  and exists (select 1 from public.payments p
              where p.id::text = (storage.foldername(name))[2]
                and p.family_id = public.my_family_id() and p.status = 'pending')
);

drop policy if exists receipts_admin on storage.objects;
create policy receipts_admin on storage.objects for all to authenticated
using (bucket_id = 'receipts' and public.is_admin()) with check (bucket_id = 'receipts' and public.is_admin());

-- ───────── Functions ─────────
-- The family attaches an uploaded file to its pending payment → "Por revisar".
create or replace function submit_receipt(p_payment uuid, p_path text) returns json
language plpgsql security definer set search_path = public as $$
declare v_p payments;
begin
  select * into v_p from payments where id = p_payment for update;
  if v_p.id is null or v_p.family_id is distinct from my_family_id() or v_p.status <> 'pending'
     or p_path is null or p_path not like (v_p.family_id::text || '/' || v_p.id::text || '/%') then
    return json_build_object('ok', false, 'code', 'notFound');
  end if;
  update payments set receipt_path = p_path, receipt_status = 'review', receipt_note = null,
    receipt_uploaded_at = now(), reviewed_at = null
  where id = p_payment;
  return json_build_object('ok', true);
end $$;

-- Management: approve (paid by transfer; the plan activates) or reject with a short note.
create or replace function review_receipt(p_payment uuid, p_approve boolean, p_note text default null) returns json
language plpgsql security definer set search_path = public as $$
declare v_p payments;
begin
  if not is_admin() then return json_build_object('ok', false, 'code', 'notFound'); end if;
  select * into v_p from payments where id = p_payment for update;
  if v_p.id is null or v_p.status <> 'pending' or v_p.receipt_status is distinct from 'review' then
    return json_build_object('ok', false, 'code', 'notFound');
  end if;
  if p_approve then
    update payments set status = 'paid', method = 'transfer', paid_at = now(),
      receipt_status = 'approved', receipt_note = null, reviewed_at = now()
    where id = p_payment;
    if v_p.service = 'plan' then
      update plans set paid = true where rider_id = (v_p.meta ->> 'riderId')::uuid and month = v_p.meta ->> 'month';
    end if;
  else
    if coalesce(trim(p_note), '') = '' then return json_build_object('ok', false, 'code', 'noteRequired'); end if;
    update payments set receipt_status = 'rejected', receipt_note = left(trim(p_note), 280), reviewed_at = now()
    where id = p_payment;
  end if;
  return json_build_object('ok', true);
end $$;

-- Cash payment marked in Cobros also closes any receipt waiting for review.
create or replace function mark_paid(p_payment uuid, p_method text) returns json
language plpgsql security definer set search_path = public as $$
declare v_p payments;
begin
  if not is_admin() or p_method not in ('cash', 'transfer', 'card') then return json_build_object('ok', false, 'code', 'notFound'); end if;
  select * into v_p from payments where id = p_payment for update;
  if v_p.id is null or v_p.status <> 'pending' then return json_build_object('ok', false, 'code', 'notFound'); end if;
  update payments set status = 'paid', method = p_method, paid_at = now(),
    receipt_status = case when receipt_status is null then null else 'approved' end, reviewed_at = now()
  where id = p_payment;
  if v_p.service = 'plan' then
    update plans set paid = true where rider_id = (v_p.meta ->> 'riderId')::uuid and month = v_p.meta ->> 'month';
  end if;
  return json_build_object('ok', true);
end $$;

revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;
revoke execute on function create_family_record(jsonb, boolean) from authenticated;
