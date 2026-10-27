-- ConectaCuba V1.1: acceso sin nombre de usuario y panel privado de revisión.
-- Se preservan los nombres de usuario de perfiles existentes, pero dejan de ser obligatorios.
alter table public.profiles alter column username drop not null;

alter table public.business_applications
  add column if not exists business_activity_other text not null default '',
  add column if not exists contact_email text not null default '',
  add column if not exists email_confirmed boolean not null default false;

update public.business_applications as b
set contact_email = coalesce(u.email, ''),
    email_confirmed = (u.email_confirmed_at is not null)
from auth.users as u
where u.id = b.user_id;

create table if not exists private.admins (
  email text primary key check (email = lower(email)),
  created_at timestamptz not null default now()
);
revoke all on private.admins from public, anon, authenticated;
alter table private.admins enable row level security;
-- Cuenta administradora original omitida por privacidad.
-- Configurar una cuenta autorizada de forma privada; no se crea ningún administrador en esta exportación.
grant usage on schema private to authenticated;

create or replace function private.is_conectacuba_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
     and exists (
       select 1 from private.admins a
       where a.email = lower(coalesce((select auth.jwt())->>'email', ''))
     );
$$;
revoke all on function private.is_conectacuba_admin() from public, anon;
grant execute on function private.is_conectacuba_admin() to authenticated;

create or replace function private.create_conectacuba_account()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  kind text := coalesce(meta ->> 'account_type', 'person');
begin
  if kind not in ('person','business') then
    raise exception 'Tipo de cuenta inválido';
  end if;
  insert into public.profiles (
    id, username, account_type, contact_recovery, display_name, province, municipality,
    address, desired_job, profile_summary, public_contact, discoverable
  ) values (
    new.id, nullif(meta ->> 'username',''), kind, coalesce(meta ->> 'contact_recovery',''),
    coalesce(meta ->> 'display_name',''), meta ->> 'province', meta ->> 'municipality',
    coalesce(meta ->> 'address',''), coalesce(meta ->> 'desired_job',''),
    coalesce(meta ->> 'profile_summary',''), coalesce(meta ->> 'public_contact',''),
    coalesce(meta ->> 'discoverable','false') = 'true'
  );
  if kind = 'business' then
    insert into public.business_applications (
      user_id, business_name, contact_person, business_activity, business_activity_other,
      province, municipality, description, whatsapp, other_contact, proof_url,
      business_address, show_address, contact_email, email_confirmed
    ) values (
      new.id, coalesce(meta ->> 'business_name',''), coalesce(meta ->> 'contact_person',''),
      coalesce(meta ->> 'business_activity',''), coalesce(meta ->> 'business_activity_other',''),
      meta ->> 'province', meta ->> 'municipality', coalesce(meta ->> 'description',''),
      coalesce(meta ->> 'whatsapp',''), coalesce(meta ->> 'other_contact',''),
      coalesce(meta ->> 'proof_url',''), coalesce(meta ->> 'business_address',''),
      coalesce(meta ->> 'show_address','false') = 'true', coalesce(new.email,''),
      new.email_confirmed_at is not null
    );
  end if;
  return new;
end;
$$;

create or replace function private.sync_business_email_confirmation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.business_applications
     set contact_email = coalesce(new.email,''),
         email_confirmed = (new.email_confirmed_at is not null)
   where user_id = new.id;
  return new;
end;
$$;
revoke all on function private.sync_business_email_confirmation() from public, anon, authenticated;
drop trigger if exists on_auth_user_business_confirmation on auth.users;
create trigger on_auth_user_business_confirmation
after update of email, email_confirmed_at on auth.users
for each row execute function private.sync_business_email_confirmation();

-- Only the account owner or the designated administrator can read profiles.
drop policy if exists "profile_select_admin" on public.profiles;
create policy "profile_select_admin" on public.profiles for select to authenticated
using (private.is_conectacuba_admin());

-- The owner manages approvals. Applicants can still read only their own request.
drop policy if exists "business_application_select_admin" on public.business_applications;
create policy "business_application_select_admin" on public.business_applications for select to authenticated
using (private.is_conectacuba_admin());
grant update on public.business_applications to authenticated;
drop policy if exists "business_application_update_admin" on public.business_applications;
create policy "business_application_update_admin" on public.business_applications for update to authenticated
using (private.is_conectacuba_admin())
with check (private.is_conectacuba_admin());
