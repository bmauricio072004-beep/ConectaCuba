alter table public.business_reviews add column business_name text not null default '' check(length(business_name)<=120);
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
    new.business_name:=(select business_name from public.business_applications where user_id=new.business_user_id);
    new.review_status:='pending';new.review_note:='';new.reviewed_at:=null;
  else
    if row(new.id,new.business_user_id,new.author_id,new.created_at,new.business_name) is distinct from row(old.id,old.business_user_id,old.author_id,old.created_at,old.business_name) then raise exception 'No puedes cambiar la autoría ni el negocio'; end if;
    if new.business_name='' then new.business_name:=(select business_name from public.business_applications where user_id=new.business_user_id);end if;
    if private.is_conectacuba_admin() and new.author_id<>(select auth.uid()) then
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
