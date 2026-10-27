-- Counts per vacancy, evaluated with the caller's existing RLS permissions.
create or replace function public.cc_job_application_counts()
returns table(
  job_id uuid,
  total bigint,
  new_count bigint,
  reviewing_count bigint,
  contacted_count bigint,
  closed_count bigint,
  withdrawn_count bigint
)
language sql stable security invoker set search_path = ''
as $$
  select j.id,
         count(a.id),
         count(a.id) filter(where a.status='submitted'),
         count(a.id) filter(where a.status='reviewing'),
         count(a.id) filter(where a.status='contacted'),
         count(a.id) filter(where a.status='not_selected'),
         count(a.id) filter(where a.status='withdrawn')
    from public.job_posts j
    left join public.job_applications a on a.job_id=j.id and a.business_user_id=(select auth.uid())
   where j.business_user_id=(select auth.uid())
   group by j.id;
$$;
revoke all on function public.cc_job_application_counts() from public,anon,authenticated;
grant execute on function public.cc_job_application_counts() to authenticated;

