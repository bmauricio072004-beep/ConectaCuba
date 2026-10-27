create or replace function private.can_business_publish_jobs(owner_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
 select (select auth.uid()) is not null and (select auth.uid())=owner_id
 and exists(select 1 from public.business_applications b where b.user_id=owner_id and b.review_status='approved' and b.email_confirmed);
$$;
revoke all on function private.can_business_publish_jobs(uuid) from public,anon;
grant execute on function private.can_business_publish_jobs(uuid) to authenticated;
drop policy job_posts_public_or_owner_select on public.job_posts;
create policy job_posts_public_or_owner_select on public.job_posts for select to anon,authenticated
using((select auth.uid())=business_user_id or (status='published' and exists(select 1 from public.business_directory d where d.user_id=business_user_id)));
alter table public.profiles add constraint cc_profile_province check(province in ('La Habana','Artemisa','Mayabeque','Matanzas','Pinar del Río','Villa Clara','Cienfuegos','Sancti Spíritus','Ciego de Ávila','Camagüey','Las Tunas','Granma','Holguín','Santiago de Cuba','Guantánamo','Isla de la Juventud')) not valid;
alter table public.business_applications add constraint cc_business_province check(province in ('La Habana','Artemisa','Mayabeque','Matanzas','Pinar del Río','Villa Clara','Cienfuegos','Sancti Spíritus','Ciego de Ávila','Camagüey','Las Tunas','Granma','Holguín','Santiago de Cuba','Guantánamo','Isla de la Juventud')) not valid;
alter table public.job_posts add constraint cc_job_province check(province in ('La Habana','Artemisa','Mayabeque','Matanzas','Pinar del Río','Villa Clara','Cienfuegos','Sancti Spíritus','Ciego de Ávila','Camagüey','Las Tunas','Granma','Holguín','Santiago de Cuba','Guantánamo','Isla de la Juventud')) not valid;

