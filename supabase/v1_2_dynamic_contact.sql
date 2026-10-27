-- Optional custom contact channel for the user profile.
alter table public.profiles
  add column if not exists public_contact_other text not null default '';

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
    address, desired_job, profile_summary, public_contact, public_contact_other, discoverable
  ) values (
    new.id, nullif(meta ->> 'username',''), kind, coalesce(meta ->> 'contact_recovery',''),
    coalesce(meta ->> 'display_name',''), meta ->> 'province', meta ->> 'municipality',
    coalesce(meta ->> 'address',''), coalesce(meta ->> 'desired_job',''),
    coalesce(meta ->> 'profile_summary',''), coalesce(meta ->> 'public_contact',''),
    coalesce(meta ->> 'public_contact_other',''), coalesce(meta ->> 'discoverable','false') = 'true'
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
