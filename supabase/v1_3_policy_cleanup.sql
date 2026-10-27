-- Combine owner and administrator SELECT access into one policy per table.
drop policy if exists "profile_select_own" on public.profiles;
drop policy if exists "profile_select_admin" on public.profiles;
create policy "profile_select_owner_or_admin" on public.profiles for select to authenticated
using ((select auth.uid()) = id or (select private.is_conectacuba_admin()));

drop policy if exists "business_application_select_own" on public.business_applications;
drop policy if exists "business_application_select_admin" on public.business_applications;
create policy "business_application_select_owner_or_admin" on public.business_applications for select to authenticated
using ((select auth.uid()) = user_id or (select private.is_conectacuba_admin()));
