begin;
create temporary table cc_qa_ids as select gen_random_uuid() person_id,gen_random_uuid() other_id,gen_random_uuid() business_id,gen_random_uuid() admin_id,gen_random_uuid() job_id;
grant select on cc_qa_ids to authenticated,anon;
insert into private.admins(email) values('cc-qa-admin@example.invalid');
insert into auth.users(id,aud,role,email,email_confirmed_at,raw_user_meta_data,raw_app_meta_data,created_at,updated_at)
select id,'authenticated','authenticated',email,now(),meta,'{"provider":"email","providers":["email"]}'::jsonb,now(),now()
from cc_qa_ids cross join lateral (values
(person_id,'cc-qa-person@example.invalid','{"account_type":"person","display_name":"Persona de prueba","province":"La Habana","municipality":"Cerro","address":"DIRECCION PRIVADA"}'::jsonb),
(other_id,'cc-qa-other@example.invalid','{"account_type":"person","display_name":"Otra persona","province":"La Habana","municipality":"Playa"}'::jsonb),
(business_id,'cc-qa-business@example.invalid','{"account_type":"business","display_name":"Responsable prueba","province":"La Habana","municipality":"Cerro","business_name":"Negocio de prueba","contact_person":"Responsable prueba","business_activity":"Tecnología","description":"Descripción de prueba del negocio","proof_url":"https://example.invalid/evidencia","business_address":"DIRECCION NEGOCIO PRIVADA","show_address":false}'::jsonb),
(admin_id,'cc-qa-admin@example.invalid','{"account_type":"person","display_name":"Admin prueba","province":"La Habana","municipality":"Cerro"}'::jsonb)) fixture(id,email,meta);

set local role authenticated;
do $$begin perform set_config('request.jwt.claims',jsonb_build_object('sub',(select business_id from cc_qa_ids),'role','authenticated')::text,true);end$$;
do $$begin
  begin update public.business_applications set review_status='approved' where user_id=(select business_id from cc_qa_ids);raise exception 'TEST FAIL: self approval allowed';
  exception when raise_exception then if sqlerrm='TEST FAIL: self approval allowed' then raise;end if;end;
end$$;
do $$begin perform set_config('request.jwt.claims',jsonb_build_object('sub',(select admin_id from cc_qa_ids),'role','authenticated')::text,true);end$$;
update public.business_applications set review_status='approved' where user_id=(select business_id from cc_qa_ids);
do $$begin if not public.cc_is_admin() then raise exception 'TEST FAIL: admin RPC';end if;end$$;
do $$begin perform set_config('request.jwt.claims',jsonb_build_object('sub',(select business_id from cc_qa_ids),'role','authenticated')::text,true);end$$;
insert into public.job_posts(id,business_user_id,title,category,description,province,municipality)
select job_id,business_id,'Vacante de prueba','Tecnología','Descripción suficiente para la prueba','La Habana','Cerro' from cc_qa_ids;
do $$begin
 if (select total from public.cc_job_application_counts() where job_id=(select job_id from cc_qa_ids))<>0 then raise exception 'TEST FAIL: empty vacancy count';end if;
 begin insert into public.job_posts(business_user_id,title,category,description,province,municipality,salary_min) select business_id,'Salario inválido','Tecnología','Descripción suficiente para la prueba','La Habana','Cerro',-1 from cc_qa_ids;
 raise exception 'TEST FAIL: negative salary allowed';exception when check_violation then null;end;
end$$;
do $$begin perform set_config('request.jwt.claims',jsonb_build_object('sub',(select person_id from cc_qa_ids),'role','authenticated')::text,true);end$$;
insert into public.resumes(user_id,intro) select person_id,'Currículum privado de prueba' from cc_qa_ids;
insert into public.job_applications(job_id,applicant_id,cv_snapshot,contact,consent)
select job_id,person_id,'{"intro":"Presentación de prueba"}','cc-qa-person@example.invalid',true from cc_qa_ids;
do $$begin
 if (select job_snapshot->>'title' from public.job_applications where applicant_id=(select person_id from cc_qa_ids))<>'Vacante de prueba' then raise exception 'TEST FAIL: missing job snapshot';end if;
 if exists(select 1 from public.cc_job_application_counts()) then raise exception 'TEST FAIL: applicant sees employer counts';end if;
 if (select count(*) from public.profiles where id=(select other_id from cc_qa_ids))<>0 then raise exception 'TEST FAIL: another profile visible';end if;
 if (select count(*) from public.job_applications where applicant_id=(select person_id from cc_qa_ids))<>1 then raise exception 'TEST FAIL: application not saved';end if;
 begin insert into public.job_applications(job_id,applicant_id,cv_snapshot,contact,consent) select job_id,person_id,'{}','cc-qa-person@example.invalid',true from cc_qa_ids;
 raise exception 'TEST FAIL: duplicate application allowed';exception when unique_violation then null;end;
 begin update public.job_applications set status='contacted' where applicant_id=(select person_id from cc_qa_ids);raise exception 'TEST FAIL: applicant can change employer status';
 exception when raise_exception then if sqlerrm='TEST FAIL: applicant can change employer status' then raise;end if;end;
end$$;
do $$begin perform set_config('request.jwt.claims',jsonb_build_object('sub',(select other_id from cc_qa_ids),'role','authenticated')::text,true);end$$;
do $$begin if (select count(*) from public.job_applications where job_id=(select job_id from cc_qa_ids))<>0 then raise exception 'TEST FAIL: unrelated user can read application';end if;end$$;
do $$begin perform set_config('request.jwt.claims',jsonb_build_object('sub',(select business_id from cc_qa_ids),'role','authenticated')::text,true);end$$;
do $$begin
 if not exists(select 1 from public.cc_job_application_counts() where job_id=(select job_id from cc_qa_ids) and total=1 and new_count=1) then raise exception 'TEST FAIL: job application counts';end if;
 if (select count(*) from public.job_applications where business_user_id=(select business_id from cc_qa_ids))<>1 then raise exception 'TEST FAIL: employer cannot read application';end if;
 if (select count(*) from public.resumes where user_id=(select person_id from cc_qa_ids))<>0 then raise exception 'TEST FAIL: employer sees private CV';end if;
end$$;
update public.job_applications set status='contacted' where business_user_id=(select business_id from cc_qa_ids);
do $$begin if not exists(select 1 from public.cc_job_application_counts() where job_id=(select job_id from cc_qa_ids) and contacted_count=1 and new_count=0) then raise exception 'TEST FAIL: counters not updated after contact';end if;end$$;
update public.job_applications set status='accepted' where business_user_id=(select business_id from cc_qa_ids);
do $$begin if not exists(select 1 from public.cc_job_application_counts() where job_id=(select job_id from cc_qa_ids) and accepted_count=1) then raise exception 'TEST FAIL: accepted outcome not counted';end if;end$$;
do $$begin perform set_config('request.jwt.claims',jsonb_build_object('sub',(select person_id from cc_qa_ids),'role','authenticated')::text,true);end$$;
update public.job_applications set status='withdrawn' where applicant_id=(select person_id from cc_qa_ids);
do $$begin perform set_config('request.jwt.claims',jsonb_build_object('sub',(select business_id from cc_qa_ids),'role','authenticated')::text,true);end$$;
do $$begin
 if not exists(select 1 from public.cc_job_application_counts() where job_id=(select job_id from cc_qa_ids) and withdrawn_count=1) then raise exception 'TEST FAIL: withdrawn counter';end if;
 if exists(select 1 from public.job_applications where business_user_id=(select business_id from cc_qa_ids) and (cv_snapshot<>'{}'::jsonb or contact<>'Retirada')) then raise exception 'TEST FAIL: withdrawal kept shared data';end if;
 begin update public.job_applications set status='reviewing' where business_user_id=(select business_id from cc_qa_ids);
 raise exception 'TEST FAIL: withdrawn application changed';exception when raise_exception then if sqlerrm='TEST FAIL: withdrawn application changed' then raise;end if;end;
end$$;

-- Private review submissions and anonymous, moderated publications.
set local role authenticated;
do $$begin perform set_config('request.jwt.claims',jsonb_build_object('sub',(select person_id from cc_qa_ids),'role','authenticated')::text,true);end$$;
insert into public.business_reviews(business_user_id,author_id,rating,job_role,employment_status,body,evidence,confirms_work)
select business_id,person_id,4,'Técnico de prueba','former','Experiencia laboral de prueba suficientemente detallada.','Evidencia privada solo para administración.',true from cc_qa_ids;
do $$begin
 if exists(select 1 from public.business_review_public where business_user_id=(select business_id from cc_qa_ids)) then raise exception 'TEST FAIL: unmoderated review became public';end if;
 if (select business_name from public.business_reviews where author_id=(select person_id from cc_qa_ids))<>'Negocio de prueba' then raise exception 'TEST FAIL: review business snapshot missing';end if;
 begin update public.business_reviews set business_name='Nombre falsificado' where author_id=(select person_id from cc_qa_ids);raise exception 'TEST FAIL: author changed business name';exception when insufficient_privilege then null;end;
 begin update public.business_reviews set review_status='approved' where author_id=(select person_id from cc_qa_ids);raise exception 'TEST FAIL: author self-approved review';
 exception when raise_exception then if sqlerrm='TEST FAIL: author self-approved review' then raise;end if;end;
 begin insert into public.business_reviews(business_user_id,author_id,rating,job_role,employment_status,body,evidence,confirms_work)
 select business_id,person_id,5,'Otro puesto','former','Otra experiencia de prueba suficientemente detallada.','Otra evidencia privada para administración.',true from cc_qa_ids;
 raise exception 'TEST FAIL: duplicate review allowed';exception when unique_violation then null;end;
end$$;
do $$begin perform set_config('request.jwt.claims',jsonb_build_object('sub',(select business_id from cc_qa_ids),'role','authenticated')::text,true);end$$;
do $$begin
 if exists(select 1 from public.business_reviews where business_user_id=(select business_id from cc_qa_ids)) then raise exception 'TEST FAIL: employer sees private review authorship/evidence';end if;
 begin insert into public.business_reviews(business_user_id,author_id,rating,job_role,employment_status,body,evidence,confirms_work)
 select business_id,business_id,5,'Titular del negocio','current','Reseña propia que no debería poder publicarse.','Evidencia que no permite una reseña propia.',true from cc_qa_ids;
 raise exception 'TEST FAIL: business reviewed itself';exception when raise_exception then if sqlerrm='TEST FAIL: business reviewed itself' then raise;end if;end;
end$$;
do $$begin perform set_config('request.jwt.claims',jsonb_build_object('sub',(select other_id from cc_qa_ids),'role','authenticated')::text,true);end$$;
do $$begin if exists(select 1 from public.business_reviews where business_user_id=(select business_id from cc_qa_ids)) then raise exception 'TEST FAIL: unrelated person sees private review';end if;end$$;
do $$begin perform set_config('request.jwt.claims',jsonb_build_object('sub',(select admin_id from cc_qa_ids),'role','authenticated')::text,true);end$$;
update public.business_reviews set review_status='approved' where business_user_id=(select business_id from cc_qa_ids);
set local role anon;
do $$begin perform set_config('request.jwt.claims','{"role":"anon"}',true);end$$;
do $$begin
 if not exists(select 1 from public.business_rating_stats where business_user_id=(select business_id from cc_qa_ids) and review_count=1 and average_rating=4) then raise exception 'TEST FAIL: rating aggregate';end if;
 if exists(select 1 from public.business_review_public r where business_user_id=(select business_id from cc_qa_ids) and (to_jsonb(r)?'author_id' or to_jsonb(r)?'evidence')) then raise exception 'TEST FAIL: public review includes private fields';end if;
 begin perform 1 from public.business_reviews;raise exception 'TEST FAIL: anonymous private review access';exception when insufficient_privilege then null;end;
end$$;
set local role authenticated;
do $$begin perform set_config('request.jwt.claims',jsonb_build_object('sub',(select person_id from cc_qa_ids),'role','authenticated')::text,true);end$$;
update public.business_reviews set body='Experiencia modificada que necesita una nueva revisión manual.' where author_id=(select person_id from cc_qa_ids);
do $$begin
 if exists(select 1 from public.business_review_public where business_user_id=(select business_id from cc_qa_ids)) then raise exception 'TEST FAIL: edited review stayed published';end if;
 if not exists(select 1 from public.business_reviews where author_id=(select person_id from cc_qa_ids) and review_status='pending') then raise exception 'TEST FAIL: edited review not pending';end if;
end$$;
do $$begin perform set_config('request.jwt.claims',jsonb_build_object('sub',(select admin_id from cc_qa_ids),'role','authenticated')::text,true);end$$;
update public.business_reviews set review_status='approved' where business_user_id=(select business_id from cc_qa_ids);
do $$begin perform set_config('request.jwt.claims',jsonb_build_object('sub',(select person_id from cc_qa_ids),'role','authenticated')::text,true);end$$;
update public.business_reviews set review_status='withdrawn' where author_id=(select person_id from cc_qa_ids);
do $$begin if exists(select 1 from public.business_review_public where business_user_id=(select business_id from cc_qa_ids)) then raise exception 'TEST FAIL: withdrawn review still public';end if;end$$;
update public.business_reviews set review_status='pending' where author_id=(select person_id from cc_qa_ids);
do $$begin perform set_config('request.jwt.claims',jsonb_build_object('sub',(select admin_id from cc_qa_ids),'role','authenticated')::text,true);end$$;
update public.business_reviews set review_status='approved' where business_user_id=(select business_id from cc_qa_ids);

-- An administrator writing a review cannot approve their own opinion.
insert into public.business_reviews(business_user_id,author_id,rating,job_role,employment_status,body,evidence,confirms_work)
select business_id,admin_id,5,'Puesto de prueba','former','Opinión propia de prueba que también necesita revisión independiente.','Evidencia privada de la relación laboral de prueba.',true from cc_qa_ids;
do $$begin
 begin update public.business_reviews set review_status='approved' where author_id=(select admin_id from cc_qa_ids);raise exception 'TEST FAIL: admin self-approved own opinion';
 exception when raise_exception then if sqlerrm='TEST FAIL: admin self-approved own opinion' then raise;end if;end;
end$$;
update public.business_reviews set body='Opinión propia modificada que sigue pendiente de revisión independiente.' where author_id=(select admin_id from cc_qa_ids);

set local role anon;
do $$begin perform set_config('request.jwt.claims','{"role":"anon"}',true);end$$;
do $$begin
 begin perform public.cc_job_application_counts();raise exception 'TEST FAIL: anonymous counters allowed';exception when insufficient_privilege then null;end;
 if (select count(*) from public.job_posts where id=(select job_id from cc_qa_ids))<>1 then raise exception 'TEST FAIL: published job not public';end if;
 if (select public_address from public.business_directory where user_id=(select business_id from cc_qa_ids))<>'' then raise exception 'TEST FAIL: private address in directory';end if;
end$$;

set local role authenticated;
do $$begin perform set_config('request.jwt.claims',jsonb_build_object('sub',(select business_id from cc_qa_ids),'role','authenticated')::text,true);end$$;
update public.business_applications set description='Descripción modificada por el titular' where user_id=(select business_id from cc_qa_ids);
do $$begin
 if (select review_status from public.business_applications where user_id=(select business_id from cc_qa_ids))<>'pending' then raise exception 'TEST FAIL: changes not reviewed';end if;
 if (select status from public.job_posts where id=(select job_id from cc_qa_ids))<>'closed' then raise exception 'TEST FAIL: job not closed on review';end if;
end$$;
set local role anon;
do $$begin perform set_config('request.jwt.claims','{"role":"anon"}',true);end$$;
do $$begin
 if exists(select 1 from public.business_directory where user_id=(select business_id from cc_qa_ids)) then raise exception 'TEST FAIL: pending business publicly visible';end if;
 if exists(select 1 from public.job_posts where id=(select job_id from cc_qa_ids)) then raise exception 'TEST FAIL: closed job publicly visible';end if;
 if exists(select 1 from public.business_review_public where business_user_id=(select business_id from cc_qa_ids)) then raise exception 'TEST FAIL: pending business reviews still public';end if;
end$$;
reset role;
select 'PASS: approvals, owner edits, applications, duplicate blocking, CV privacy, withdrawal, accepted outcomes, job snapshots, review moderation/privacy and vacancy counters' as result;
rollback;

