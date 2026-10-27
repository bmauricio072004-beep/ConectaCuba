-- V1: edición de negocios, directorio público seguro y postulaciones.
alter table public.business_applications
  add column if not exists logo_path text not null default '',
  add column if not exists review_note text not null default '',
  add column if not exists reviewed_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

-- Los perfiles nacen con Auth: el cliente no puede borrarlos y recrear otro tipo.
revoke insert, delete on public.profiles from authenticated;
create or replace function private.is_conectacuba_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select (select auth.uid()) is not null and exists(
    select 1 from auth.users u join private.admins a on lower(u.email)=a.email
    where u.id=(select auth.uid()) and u.email_confirmed_at is not null
  );
$$;
revoke all on function private.is_conectacuba_admin() from public, anon;
grant execute on function private.is_conectacuba_admin() to authenticated;
create or replace function public.cc_is_admin()
returns boolean language sql stable security invoker set search_path = ''
as $$ select private.is_conectacuba_admin(); $$;
revoke all on function public.cc_is_admin() from public, anon;
grant execute on function public.cc_is_admin() to authenticated;

create table if not exists public.business_directory(
  user_id uuid primary key references public.profiles(id) on delete cascade,
  business_name text not null, business_activity text not null,
  business_activity_other text not null default '', description text not null default '',
  province text not null, municipality text not null,
  public_address text not null default '', whatsapp text not null default '',
  other_contact text not null default '', logo_path text not null default '',
  updated_at timestamptz not null default now()
);
alter table public.business_directory enable row level security;
revoke all on public.business_directory from public, anon, authenticated;
grant select on public.business_directory to anon, authenticated;
create policy directory_public_read on public.business_directory for select to anon,authenticated using (true);

create or replace function private.guard_business_edit()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.user_id is distinct from old.user_id then raise exception 'No puedes cambiar el titular del negocio'; end if;
  if pg_trigger_depth() > 1 then return new; end if;
  if (select auth.uid()) is not null and not private.is_conectacuba_admin() then
    if (select auth.uid())<>old.user_id then raise exception 'No autorizado'; end if;
    if new.review_status is distinct from old.review_status or new.review_note is distinct from old.review_note
       or new.contact_email is distinct from old.contact_email or new.email_confirmed is distinct from old.email_confirmed
       or new.reviewed_at is distinct from old.reviewed_at then
      raise exception 'Solo administración puede cambiar la revisión';
    end if;
    if row(new.business_name,new.contact_person,new.business_activity,new.business_activity_other,new.province,new.municipality,
           new.description,new.whatsapp,new.other_contact,new.proof_url,new.business_address,new.show_address,new.logo_path)
       is distinct from row(old.business_name,old.contact_person,old.business_activity,old.business_activity_other,old.province,old.municipality,
           old.description,old.whatsapp,old.other_contact,old.proof_url,old.business_address,old.show_address,old.logo_path) then
       new.review_status:='pending'; new.review_note:=''; new.reviewed_at:=null;
    end if;
  end if;
  if new.review_status='approved' and not exists(select 1 from auth.users where id=new.user_id and email_confirmed_at is not null) then
    raise exception 'El negocio debe confirmar su correo antes de aprobarse';
  end if;
  if new.review_status='rejected' and new.review_status is distinct from old.review_status and length(trim(new.review_note))<3 then
    raise exception 'Indica qué debe corregir el negocio';
  end if;
  if new.review_status is distinct from old.review_status and new.review_status<>'pending' then new.reviewed_at:=now(); end if;
  if length(trim(new.business_name))<2 or length(new.business_name)>120 or length(trim(new.municipality))<2
     or length(new.municipality)>100 or length(new.description)>3000 or length(new.business_address)>300
     or length(new.proof_url)>500 or length(trim(new.proof_url))<3 or length(new.whatsapp)>100 or length(new.other_contact)>200
     or length(trim(new.business_activity))<2 or (new.business_activity='Otra' and length(trim(new.business_activity_other))<2) then
    raise exception 'Revisa los datos del negocio: faltan campos o son demasiado largos';
  end if;
  if new.logo_path<>'' and new.logo_path!~('^'||new.user_id::text||'/[0-9a-f-]{36}[.]webp$') then raise exception 'La imagen no pertenece a este negocio'; end if;
  new.updated_at:=now(); return new;
end;
$$;
revoke all on function private.guard_business_edit() from public, anon, authenticated;
create trigger cc_guard_business_edit before update on public.business_applications for each row execute function private.guard_business_edit();
drop policy if exists business_application_update_admin on public.business_applications;
create policy business_application_update_owner_or_admin on public.business_applications for update to authenticated
using ((select auth.uid())=user_id or (select private.is_conectacuba_admin()))
with check ((select auth.uid())=user_id or (select private.is_conectacuba_admin()));

create or replace function private.sync_public_business()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.review_status='approved' and new.email_confirmed then
    insert into public.business_directory(user_id,business_name,business_activity,business_activity_other,description,province,municipality,public_address,whatsapp,other_contact,logo_path,updated_at)
    values(new.user_id,new.business_name,new.business_activity,new.business_activity_other,new.description,new.province,new.municipality,
      case when new.show_address then new.business_address else '' end,new.whatsapp,new.other_contact,new.logo_path,now())
    on conflict(user_id) do update set business_name=excluded.business_name,business_activity=excluded.business_activity,
      business_activity_other=excluded.business_activity_other,description=excluded.description,province=excluded.province,
      municipality=excluded.municipality,public_address=excluded.public_address,whatsapp=excluded.whatsapp,
      other_contact=excluded.other_contact,logo_path=excluded.logo_path,updated_at=now();
    update public.job_posts set business_name=new.business_name where business_user_id=new.user_id and business_name is distinct from new.business_name;
  else
    delete from public.business_directory where user_id=new.user_id;
    update public.job_posts set status='closed',updated_at=now() where business_user_id=new.user_id and status='published';
  end if;
  return new;
end;
$$;
revoke all on function private.sync_public_business() from public,anon,authenticated;
create trigger cc_sync_public_business after insert or update on public.business_applications for each row execute function private.sync_public_business();
insert into public.business_directory(user_id,business_name,business_activity,business_activity_other,description,province,municipality,public_address,whatsapp,other_contact,logo_path)
select user_id,business_name,business_activity,business_activity_other,description,province,municipality,
  case when show_address then business_address else '' end,whatsapp,other_contact,logo_path
from public.business_applications where review_status='approved' and email_confirmed;

-- Storage: únicamente imágenes del negocio, comprimidas por el cliente.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('business-logos','business-logos',true,2097152,array['image/webp'])
on conflict(id) do update set public=true,file_size_limit=2097152,allowed_mime_types=array['image/webp'];
create policy cc_logo_select_own on storage.objects for select to authenticated
using(bucket_id='business-logos' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy cc_logo_insert_own on storage.objects for insert to authenticated
with check(bucket_id='business-logos' and name ~ ('^'||(select auth.uid())::text||'/[0-9a-f-]{36}[.]webp$')
 and exists(select 1 from public.profiles where id=(select auth.uid()) and account_type='business'));
alter table public.job_posts add constraint cc_salary_nonnegative check ((salary_min is null or salary_min>=0) and (salary_max is null or salary_max>=0));
alter table public.job_posts add constraint cc_salary_currency check(salary_currency in ('CUP','USD','EUR','MLC'));
create unique index cc_unique_open_job on public.job_posts(business_user_id,lower(trim(title)),lower(trim(municipality)),province) where status='published';

create or replace function private.guard_job_post()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if pg_trigger_depth()>1 then return new; end if;
  if tg_op='UPDATE' and new.business_user_id is distinct from old.business_user_id then raise exception 'No puedes cambiar el titular de la vacante'; end if;
  if (select auth.uid()) is null or (select auth.uid())<>new.business_user_id then raise exception 'No autorizado'; end if;
  if not private.can_business_publish_jobs(new.business_user_id) then raise exception 'Tu negocio debe estar aprobado'; end if;
  if length(trim(new.municipality))<2 or length(new.municipality)>100 or length(trim(new.category))<2
     or (new.category='Otra' and length(trim(new.category_other))<2) then raise exception 'Completa la actividad y la ubicación de la vacante'; end if;
  perform pg_advisory_xact_lock(hashtext(new.business_user_id::text));
  if new.status='published' and (tg_op='INSERT' or old.status<>'published') and
     (select count(*) from public.job_posts where business_user_id=new.business_user_id and status='published')>=10 then
    raise exception 'Puedes mantener hasta 10 vacantes abiertas. Cierra las que ya cubriste';
  end if;
  new.updated_at:=now(); return new;
end;
$$;
revoke all on function private.guard_job_post() from public,anon,authenticated;
create trigger cc_guard_job_post before insert or update on public.job_posts for each row execute function private.guard_job_post();

create table public.job_applications(
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.job_posts(id) on delete cascade,
  applicant_id uuid not null references public.profiles(id) on delete cascade,
  business_user_id uuid not null references public.profiles(id) on delete cascade,
  job_title text not null, business_name text not null, applicant_name text not null,
  applicant_location text not null, desired_job text not null default '',
  cv_snapshot jsonb not null default '{}'::jsonb check(octet_length(cv_snapshot::text)<=40000),
  contact text not null check(length(trim(contact)) between 3 and 200),
  message text not null default '' check(length(message)<=2000),
  consent boolean not null check(consent),
  status text not null default 'submitted' check(status in ('submitted','reviewing','contacted','not_selected','withdrawn')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(job_id,applicant_id)
);
create index cc_applications_applicant_idx on public.job_applications(applicant_id,created_at desc);
create index cc_applications_business_idx on public.job_applications(business_user_id,created_at desc);
alter table public.job_applications enable row level security;
revoke all on public.job_applications from public,anon,authenticated;
grant select on public.job_applications to authenticated;
grant insert(job_id,applicant_id,cv_snapshot,contact,message,consent) on public.job_applications to authenticated;
grant update(status) on public.job_applications to authenticated;
create policy application_read_participant on public.job_applications for select to authenticated
using((select auth.uid())=applicant_id or (select auth.uid())=business_user_id);
create policy application_insert_own on public.job_applications for insert to authenticated
with check((select auth.uid())=applicant_id and status='submitted' and consent);
create policy application_update_participant on public.job_applications for update to authenticated
using((select auth.uid())=applicant_id or (select auth.uid())=business_user_id)
with check((select auth.uid())=applicant_id or (select auth.uid())=business_user_id);

create or replace function private.guard_job_application()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare j public.job_posts%rowtype; p public.profiles%rowtype;
begin
  if (select auth.uid()) is null then raise exception 'Inicia sesión'; end if;
  if tg_op='INSERT' then
    if (select auth.uid())<>new.applicant_id then raise exception 'No autorizado'; end if;
    select * into p from public.profiles where id=new.applicant_id and account_type='person';
    if not found then raise exception 'Solo las cuentas de persona pueden postularse'; end if;
    if not exists(select 1 from auth.users where id=new.applicant_id and email_confirmed_at is not null) then raise exception 'Confirma tu correo antes de postularte'; end if;
    select * into j from public.job_posts where id=new.job_id and status='published';
    if not found or not exists(select 1 from public.business_applications where user_id=j.business_user_id and review_status='approved' and email_confirmed) then
      raise exception 'Esta vacante ya no está disponible';
    end if;
    perform pg_advisory_xact_lock(hashtext(new.applicant_id::text));
    if (select count(*) from public.job_applications where applicant_id=new.applicant_id and created_at>now()-interval '1 day')>=10 then
      raise exception 'Has alcanzado las 10 postulaciones de hoy. Continúa mañana';
    end if;
    new.business_user_id:=j.business_user_id;new.job_title:=j.title;new.business_name:=j.business_name;
    new.applicant_name:=p.display_name;new.applicant_location:=p.municipality||', '||p.province;
    new.desired_job:=p.desired_job;new.status:='submitted';
  else
    if new.applicant_id=(select auth.uid()) then
      if new.status<>'withdrawn' then raise exception 'Solo puedes retirar tu postulación'; end if;
    elsif new.business_user_id=(select auth.uid()) then
      if old.status='withdrawn' or new.status not in ('reviewing','contacted','not_selected') then raise exception 'No puedes cambiar una postulación retirada'; end if;
    else raise exception 'No autorizado';
    end if;
  end if;
  new.updated_at:=now();return new;
end;
$$;
revoke all on function private.guard_job_application() from public,anon,authenticated;
create trigger cc_guard_job_application before insert or update on public.job_applications for each row execute function private.guard_job_application();

-- Límites de entrada; NOT VALID conserva registros anteriores sin modificarlos.
alter table public.profiles add constraint cc_profile_input_limits check(length(trim(display_name)) between 2 and 100 and length(trim(municipality)) between 2 and 100 and length(address)<=300 and length(profile_summary)<=3000 and length(contact_recovery)<=200 and length(desired_job)<=120) not valid;
alter table public.resumes add constraint cc_resume_input_limits check(length(intro)<=4000 and length(experience)<=10000 and length(education)<=10000 and length(skills)<=4000 and length(languages)<=500 and length(cv_contact)<=200) not valid;

