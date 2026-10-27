-- ConectaCuba V1: cuentas, perfiles privados, solicitudes de negocio y currículums.
-- El acceso a perfiles se restringe al titular hasta implementar un directorio público seguro.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null check (username ~ '^[A-Za-z0-9_-]{3,30}$'),
  account_type text not null check (account_type in ('person','business')),
  contact_recovery text not null default '',
  display_name text not null default '',
  province text not null,
  municipality text not null,
  address text not null default '',
  desired_job text not null default '',
  profile_summary text not null default '',
  public_contact text not null default '',
  discoverable boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists profiles_username_lower_uidx on public.profiles (lower(username));

create table if not exists public.business_applications (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  business_name text not null default '',
  contact_person text not null default '',
  business_activity text not null default '',
  province text not null,
  municipality text not null,
  description text not null default '',
  whatsapp text not null default '',
  other_contact text not null default '',
  proof_url text not null default '',
  business_address text not null default '',
  show_address boolean not null default false,
  review_status text not null default 'pending' check (review_status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.resumes (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  intro text not null default '',
  experience text not null default '',
  education text not null default '',
  skills text not null default '',
  languages text not null default '',
  cv_contact text not null default '',
  updated_at timestamptz not null default now()
);

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
    new.id, meta ->> 'username', kind, coalesce(meta ->> 'contact_recovery',''),
    coalesce(meta ->> 'display_name',''), meta ->> 'province', meta ->> 'municipality',
    coalesce(meta ->> 'address',''), coalesce(meta ->> 'desired_job',''),
    coalesce(meta ->> 'profile_summary',''), coalesce(meta ->> 'public_contact',''),
    coalesce(meta ->> 'discoverable','false') = 'true'
  );
  if kind = 'business' then
    insert into public.business_applications (
      user_id, business_name, contact_person, business_activity, province, municipality,
      description, whatsapp, other_contact, proof_url, business_address, show_address
    ) values (
      new.id, coalesce(meta ->> 'business_name',''), coalesce(meta ->> 'contact_person',''),
      coalesce(meta ->> 'business_activity',''), meta ->> 'province', meta ->> 'municipality',
      coalesce(meta ->> 'description',''), coalesce(meta ->> 'whatsapp',''),
      coalesce(meta ->> 'other_contact',''), coalesce(meta ->> 'proof_url',''),
      coalesce(meta ->> 'business_address',''), coalesce(meta ->> 'show_address','false') = 'true'
    );
  end if;
  return new;
end;
$$;
revoke all on function private.create_conectacuba_account() from public, anon, authenticated;
drop trigger if exists on_auth_user_created_conectacuba on auth.users;
create trigger on_auth_user_created_conectacuba
after insert on auth.users
for each row execute function private.create_conectacuba_account();

create or replace function private.keep_profile_type_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.account_type is distinct from old.account_type then
    raise exception 'El tipo de cuenta no se puede cambiar';
  end if;
  return new;
end;
$$;
revoke all on function private.keep_profile_type_immutable() from public, anon, authenticated;
drop trigger if exists profile_type_immutable on public.profiles;
create trigger profile_type_immutable before update on public.profiles
for each row execute function private.keep_profile_type_immutable();

alter table public.profiles enable row level security;
alter table public.business_applications enable row level security;
alter table public.resumes enable row level security;

revoke all on public.profiles, public.business_applications, public.resumes from anon, authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select on public.business_applications to authenticated;
grant select, insert, update, delete on public.resumes to authenticated;

drop policy if exists "profile_select_own" on public.profiles;
create policy "profile_select_own" on public.profiles for select to authenticated using ((select auth.uid()) = id);
drop policy if exists "profile_insert_own" on public.profiles;
create policy "profile_insert_own" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
drop policy if exists "profile_update_own" on public.profiles;
create policy "profile_update_own" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
drop policy if exists "profile_delete_own" on public.profiles;
create policy "profile_delete_own" on public.profiles for delete to authenticated using ((select auth.uid()) = id);

drop policy if exists "business_application_select_own" on public.business_applications;
create policy "business_application_select_own" on public.business_applications for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "resume_select_own" on public.resumes;
create policy "resume_select_own" on public.resumes for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "resume_insert_own" on public.resumes;
create policy "resume_insert_own" on public.resumes for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "resume_update_own" on public.resumes;
create policy "resume_update_own" on public.resumes for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "resume_delete_own" on public.resumes;
create policy "resume_delete_own" on public.resumes for delete to authenticated using ((select auth.uid()) = user_id);
