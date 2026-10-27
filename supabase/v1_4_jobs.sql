-- Publicación de vacantes por negocios aprobados.
create table if not exists public.job_posts (
  id uuid primary key default gen_random_uuid(),
  business_user_id uuid not null references public.profiles(id) on delete cascade,
  business_name text not null default '',
  title text not null check (length(trim(title)) between 3 and 100),
  category text not null,
  category_other text not null default '',
  description text not null check (length(trim(description)) between 10 and 5000),
  province text not null,
  municipality text not null,
  work_schedule text not null default 'A convenir',
  work_modality text not null default 'Presencial' check (work_modality in ('Presencial','Remoto','Híbrido')),
  salary_min numeric(12,2),
  salary_max numeric(12,2),
  salary_currency text not null default 'CUP',
  salary_period text not null default 'negotiable' check (salary_period in ('monthly','weekly','daily','hourly','negotiable')),
  status text not null default 'published' check (status in ('published','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint job_posts_salary_range_check check (salary_min is null or salary_max is null or salary_min <= salary_max)
);
create index if not exists job_posts_public_created_idx on public.job_posts (created_at desc) where status='published';
create index if not exists job_posts_business_created_idx on public.job_posts (business_user_id, created_at desc);

create or replace function private.can_business_publish_jobs(owner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
     and (select auth.uid()) = owner_id
     and exists (
       select 1 from public.business_applications b
       where b.user_id = owner_id and b.review_status = 'approved'
     );
$$;
revoke all on function private.can_business_publish_jobs(uuid) from public, anon;
grant execute on function private.can_business_publish_jobs(uuid) to authenticated;

create or replace function private.set_approved_job_business_name()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  resolved_name text;
begin
  select b.business_name into resolved_name
    from public.business_applications b
   where b.user_id = new.business_user_id and b.review_status = 'approved';
  if resolved_name is null then
    raise exception 'El negocio debe estar aprobado para publicar vacantes';
  end if;
  new.business_name := resolved_name;
  return new;
end;
$$;
revoke all on function private.set_approved_job_business_name() from public, anon, authenticated;
drop trigger if exists set_approved_job_business_name on public.job_posts;
create trigger set_approved_job_business_name before insert or update of business_user_id on public.job_posts
for each row execute function private.set_approved_job_business_name();

alter table public.job_posts enable row level security;
revoke all on public.job_posts from anon, authenticated;
grant select on public.job_posts to anon, authenticated;
grant insert, update, delete on public.job_posts to authenticated;

drop policy if exists "job_posts_public_or_owner_select" on public.job_posts;
create policy "job_posts_public_or_owner_select" on public.job_posts for select to anon, authenticated
using (status = 'published' or (select auth.uid()) = business_user_id);
drop policy if exists "job_posts_insert_approved_business" on public.job_posts;
create policy "job_posts_insert_approved_business" on public.job_posts for insert to authenticated
with check ((select private.can_business_publish_jobs(business_user_id)));
drop policy if exists "job_posts_update_approved_owner" on public.job_posts;
create policy "job_posts_update_approved_owner" on public.job_posts for update to authenticated
using ((select auth.uid()) = business_user_id and (select private.can_business_publish_jobs(business_user_id)))
with check ((select auth.uid()) = business_user_id and (select private.can_business_publish_jobs(business_user_id)));
drop policy if exists "job_posts_delete_approved_owner" on public.job_posts;
create policy "job_posts_delete_approved_owner" on public.job_posts for delete to authenticated
using ((select auth.uid()) = business_user_id and (select private.can_business_publish_jobs(business_user_id)));
