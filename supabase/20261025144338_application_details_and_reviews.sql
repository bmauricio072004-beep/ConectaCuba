-- Application outcomes and public business reviews. Existing application data stays intact.
alter table public.job_applications drop constraint job_applications_status_check;
alter table public.job_applications add constraint job_applications_status_check
  check(status in ('submitted','reviewing','contacted','accepted','not_selected','withdrawn'));
alter table public.job_applications add column job_snapshot jsonb not null default '{}'::jsonb
  check(jsonb_typeof(job_snapshot)='object' and octet_length(job_snapshot::text)<=20000);

create or replace function private.guard_job_application()
returns trigger language plpgsql security definer set search_path=''
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
    new.job_snapshot:=jsonb_build_object('title',j.title,'business_name',j.business_name,'province',j.province,
      'municipality',j.municipality,'category',j.category,'category_other',j.category_other,
      'description',j.description,'work_schedule',j.work_schedule,'work_modality',j.work_modality,
      'salary_min',j.salary_min,'salary_max',j.salary_max,'salary_currency',j.salary_currency,'salary_period',j.salary_period);
  else
    if new.applicant_id=(select auth.uid()) then
      if new.status<>'withdrawn' then raise exception 'Solo puedes retirar tu postulación'; end if;
      new.cv_snapshot:='{}'::jsonb;new.contact:='Retirada';new.message:='';
    elsif new.business_user_id=(select auth.uid()) then
      if old.status='withdrawn' or new.status not in ('reviewing','contacted','accepted','not_selected') then raise exception 'No puedes cambiar una postulación retirada'; end if;
    else raise exception 'No autorizado';
    end if;
  end if;
  new.updated_at:=now();return new;
end;
$$;
revoke all on function private.guard_job_application() from public,anon,authenticated;

drop function public.cc_job_application_counts();
create function public.cc_job_application_counts()
returns table(job_id uuid,total bigint,new_count bigint,reviewing_count bigint,contacted_count bigint,closed_count bigint,withdrawn_count bigint,accepted_count bigint)
language sql stable security invoker set search_path=''
as $$
  select j.id,count(a.id),count(a.id) filter(where a.status='submitted'),
    count(a.id) filter(where a.status='reviewing'),count(a.id) filter(where a.status='contacted'),
    count(a.id) filter(where a.status='not_selected'),count(a.id) filter(where a.status='withdrawn'),
    count(a.id) filter(where a.status='accepted')
  from public.job_posts j left join public.job_applications a
    on a.job_id=j.id and a.business_user_id=(select auth.uid())
  where j.business_user_id=(select auth.uid()) group by j.id;
$$;
revoke all on function public.cc_job_application_counts() from public,anon,authenticated;
grant execute on function public.cc_job_application_counts() to authenticated;

-- The private submission stores authorship and evidence. It is never publicly readable.
create table public.business_reviews(
  id uuid primary key default gen_random_uuid(),
  business_user_id uuid not null references public.profiles(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  rating smallint not null check(rating between 1 and 5),
  job_role text not null check(length(trim(job_role)) between 2 and 100),
  employment_status text not null check(employment_status in ('current','former')),
  body text not null check(length(trim(body)) between 30 and 2000),
  evidence text not null check(length(trim(evidence)) between 10 and 1000),
  confirms_work boolean not null check(confirms_work),
  review_status text not null default 'pending' check(review_status in ('pending','approved','rejected','withdrawn')),
  review_note text not null default '' check(length(review_note)<=1000),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(author_id,business_user_id),
  check(author_id<>business_user_id)
);
create index cc_reviews_business_idx on public.business_reviews(business_user_id);
create index cc_reviews_author_created_idx on public.business_reviews(author_id,created_at desc);
create index cc_reviews_pending_idx on public.business_reviews(created_at) where review_status='pending';
alter table public.business_reviews enable row level security;
revoke all on public.business_reviews from public,anon,authenticated;
grant select on public.business_reviews to authenticated;
grant insert(business_user_id,author_id,rating,job_role,employment_status,body,evidence,confirms_work) on public.business_reviews to authenticated;
grant update(rating,job_role,employment_status,body,evidence,confirms_work,review_status,review_note) on public.business_reviews to authenticated;
create policy cc_review_private_read on public.business_reviews for select to authenticated
  using(author_id=(select auth.uid()) or (select private.is_conectacuba_admin()));
create policy cc_review_insert_self on public.business_reviews for insert to authenticated
  with check(author_id=(select auth.uid()) and review_status='pending');
create policy cc_review_update_self_or_admin on public.business_reviews for update to authenticated
  using(author_id=(select auth.uid()) or (select private.is_conectacuba_admin()))
  with check(author_id=(select auth.uid()) or (select private.is_conectacuba_admin()));

-- A separate publication contains only the text and anonymous employment context.
create table public.business_review_public(
  id uuid primary key references public.business_reviews(id) on delete cascade,
  business_user_id uuid not null references public.profiles(id) on delete cascade,
  rating smallint not null check(rating between 1 and 5),
  job_role text not null, employment_status text not null, body text not null,
  created_at timestamptz not null, updated_at timestamptz not null
);
create index cc_public_reviews_business_idx on public.business_review_public(business_user_id,created_at desc);
alter table public.business_review_public enable row level security;
revoke all on public.business_review_public from public,anon,authenticated;
grant select on public.business_review_public to anon,authenticated;
create policy cc_review_public_read on public.business_review_public for select to anon,authenticated
  using(exists(select 1 from public.business_directory b where b.user_id=business_user_id));

create or replace function private.guard_business_review()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
  if (select auth.uid()) is null then raise exception 'Inicia sesión'; end if;
  if tg_op='INSERT' then
    if new.author_id<>(select auth.uid()) or new.author_id=new.business_user_id then raise exception 'No autorizado'; end if;
    if not exists(select 1 from public.profiles p join auth.users u on u.id=p.id
      where p.id=new.author_id and p.account_type='person' and u.email_confirmed_at is not null) then
      raise exception 'Necesitas una cuenta personal y correo confirmado para escribir una reseña';
    end if;
    if not exists(select 1 from public.business_applications where user_id=new.business_user_id and review_status='approved' and email_confirmed) then
      raise exception 'El negocio no está disponible para reseñas';
    end if;
    perform pg_advisory_xact_lock(hashtext('review:'||new.author_id::text));
    if (select count(*) from public.business_reviews where author_id=new.author_id and created_at>now()-interval '1 day')>=3 then
      raise exception 'Puedes enviar hasta tres reseñas por día';
    end if;
    new.review_status:='pending';new.review_note:='';new.reviewed_at:=null;
  else
    if row(new.id,new.business_user_id,new.author_id,new.created_at) is distinct from row(old.id,old.business_user_id,old.author_id,old.created_at) then raise exception 'No puedes cambiar la autoría ni el negocio'; end if;
    if private.is_conectacuba_admin() then
      if row(new.rating,new.job_role,new.employment_status,new.body,new.evidence,new.confirms_work)
        is distinct from row(old.rating,old.job_role,old.employment_status,old.body,old.evidence,old.confirms_work) then raise exception 'Administración modera la reseña sin reescribirla'; end if;
      if new.review_status not in ('approved','rejected','withdrawn') then raise exception 'Selecciona un estado de moderación'; end if;
      if new.review_status='rejected' and length(trim(new.review_note))<3 then raise exception 'Explica qué debe corregir la persona'; end if;
      new.reviewed_at:=now();
    elsif new.author_id=(select auth.uid()) then
      if new.review_note is distinct from old.review_note then raise exception 'Solo administración puede escribir la revisión'; end if;
      if new.review_status is distinct from old.review_status and new.review_status not in ('pending','withdrawn') then raise exception 'Tu reseña necesita revisión manual'; end if;
      if new.review_status<>'withdrawn' then new.review_status:='pending';new.review_note:='';new.reviewed_at:=null; end if;
    else raise exception 'No autorizado';
    end if;
  end if;
  new.updated_at:=now();return new;
end;
$$;
revoke all on function private.guard_business_review() from public,anon,authenticated;
create trigger cc_guard_business_review before insert or update on public.business_reviews
  for each row execute function private.guard_business_review();

create or replace function private.publish_business_review()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
  if new.review_status='approved' then
    insert into public.business_review_public(id,business_user_id,rating,job_role,employment_status,body,created_at,updated_at)
      values(new.id,new.business_user_id,new.rating,new.job_role,new.employment_status,new.body,new.created_at,new.updated_at)
      on conflict(id) do update set rating=excluded.rating,job_role=excluded.job_role,
        employment_status=excluded.employment_status,body=excluded.body,updated_at=excluded.updated_at;
  else delete from public.business_review_public where id=new.id;
  end if;
  return new;
end;
$$;
revoke all on function private.publish_business_review() from public,anon,authenticated;
create trigger cc_publish_business_review after insert or update on public.business_reviews
  for each row execute function private.publish_business_review();

create view public.business_rating_stats with(security_invoker=true) as
  select business_user_id,count(*)::integer as review_count,round(avg(rating),1) as average_rating
  from public.business_review_public group by business_user_id;
revoke all on public.business_rating_stats from public,anon,authenticated;
grant select on public.business_rating_stats to anon,authenticated;
