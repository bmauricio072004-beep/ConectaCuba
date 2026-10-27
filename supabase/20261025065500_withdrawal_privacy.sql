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
      new.cv_snapshot:='{}'::jsonb;new.contact:='Retirada';new.message:='';
    elsif new.business_user_id=(select auth.uid()) then
      if old.status='withdrawn' or new.status not in ('reviewing','contacted','not_selected') then raise exception 'No puedes cambiar una postulación retirada'; end if;
    else raise exception 'No autorizado';
    end if;
  end if;
  new.updated_at:=now();return new;
end;
$$;
revoke all on function private.guard_job_application() from public,anon,authenticated;
