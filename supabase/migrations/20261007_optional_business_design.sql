begin;
set local lock_timeout='3s';
set local statement_timeout='30s';
-- Reuse the normal merchant tools, with a store that remains inactive until admin approval.
create or replace function public.prepare_business_application_store(p_id uuid,p_revision integer)
returns uuid language plpgsql security definer set search_path=public as $$
declare a public.business_applications; sid uuid; owner_mail text; social jsonb:='{}';
begin
 if auth.uid() is null then raise exception 'سجل الدخول أولاً';end if;
 select * into a from public.business_applications where id=p_id and owner_id=auth.uid() for update;
 if not found then raise exception 'الطلب غير موجود';end if;
 if a.status not in ('draft','needs_changes') or a.revision<>p_revision then raise exception 'أعد الطلب إلى المسودة قبل تصميمه';end if;
 if a.store_id is not null then return a.store_id;end if;
 if trim(a.name)='' then raise exception 'اكتب اسم النشاط أولاً';end if;
 select email into owner_mail from auth.users where id=a.owner_id;
 if coalesce(owner_mail,'')='' then raise exception 'حساب صاحب الطلب غير متاح';end if;
 if a.contact_method='whatsapp' then social:=jsonb_build_object('whatsapp','https://wa.me/'||ltrim(a.contact_phone,'+'));end if;
 if a.contact_method='telegram' then social:=jsonb_build_object('telegram','https://t.me/'||case when a.telegram_username<>'' then a.telegram_username else '+'||ltrim(a.contact_phone,'+') end);end if;
 insert into public.stores(name,category,owner_email,description,address,contact_phone,latitude,longitude,active,is_open,online_ordering,delivery_enabled,pickup_enabled,text_only,translations)
 values(a.name,case when a.kind='restaurant' then 'restaurant' else 'shop' end,owner_mail,left(a.description,400),a.address,a.contact_phone,a.latitude,a.longitude,false,false,false,false,false,a.kind not in ('shop','restaurant'),jsonb_build_object('_directory',jsonb_build_object('kind',a.kind,'mode','business'),'_social_links',social)) returning id into sid;
 update public.business_applications set store_id=sid,revision=revision+1,updated_at=now() where id=p_id;
 return sid;
end;$$;
revoke all on function public.prepare_business_application_store(uuid,integer) from public,anon;
grant execute on function public.prepare_business_application_store(uuid,integer) to authenticated;
create or replace function public.submit_business_application(p_id uuid,p_revision integer)
returns jsonb language plpgsql security definer set search_path=public as $$
declare a public.business_applications; s public.stores;
begin
 if auth.uid() is null then raise exception 'سجل الدخول أولاً';end if;
 select * into a from public.business_applications where id=p_id and owner_id=auth.uid() for update;
 if not found then raise exception 'الطلب غير موجود';end if;
 -- Retrying the same successful submission is harmless.
 if a.status='pending' then return to_jsonb(a);end if;
 if a.status not in ('draft','needs_changes') or p_revision is null or a.revision<>p_revision then raise exception 'تغير الطلب. أعد فتحه.';end if;
 if a.store_id is not null then
  select * into s from public.stores where id=a.store_id and deleted_at is null for update;
  if not found or s.active then raise exception 'الصفحة غير متاحة';end if;
  a.name:=s.name;a.address:=s.address;a.contact_phone:=s.contact_phone;a.latitude:=s.latitude;a.longitude:=s.longitude;a.description:=s.description;
 end if;
 if length(trim(a.name))=0 or length(trim(a.address))<3 or a.contact_phone !~ '^\+[1-9][0-9]{7,14}$'
 or a.latitude is null or a.longitude is null or (a.facade_data='' and coalesce(s.image,'')='') then
  raise exception 'قبل طلب المعاينة: أضف الاسم والعنوان وصورة الواجهة وموقع GPS ورقم التواصل.';
 end if;
 update public.business_applications set name=a.name,address=a.address,contact_phone=a.contact_phone,latitude=a.latitude,longitude=a.longitude,description=a.description,status='pending',submitted_at=now(),updated_at=now(),review_note='',revision=revision+1 where id=p_id returning * into a;
 return to_jsonb(a);
end;$$;


create or replace function public.begin_business_application_approval(p_id uuid,p_revision integer)
returns uuid language plpgsql security definer set search_path=public as $$
declare a public.business_applications; sid uuid; owner_mail text; social jsonb:='{}';
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'غير مسموح';end if;
 select * into a from public.business_applications where id=p_id for update;
 if not found then raise exception 'الطلب غير موجود';end if;
 if a.status in ('publishing','approved') then return a.store_id;end if;
 if a.status<>'pending' or p_revision is null or a.revision<>p_revision then raise exception 'تغير الطلب. حدّث الصفحة.';end if;
 select email into owner_mail from auth.users where id=a.owner_id;
 if coalesce(owner_mail,'')='' then raise exception 'حساب صاحب الطلب غير متاح';end if;
 if a.contact_method='whatsapp' then social:=jsonb_build_object('whatsapp','https://wa.me/'||ltrim(a.contact_phone,'+'));end if;
 if a.contact_method='telegram' then social:=jsonb_build_object('telegram','https://t.me/'||case when a.telegram_username<>'' then a.telegram_username else '+'||ltrim(a.contact_phone,'+') end);end if;
 if a.store_id is not null then
  sid:=a.store_id;
  if not exists(select 1 from public.stores where id=sid and not active and deleted_at is null and lower(owner_email)=lower(owner_mail)) then raise exception 'الصفحة غير متاحة. راجع الإدارة.';end if;
 else
 insert into public.stores(name,category,owner_email,description,address,contact_phone,latitude,longitude,active,is_open,online_ordering,delivery_enabled,pickup_enabled,text_only,translations)
 values(a.name,case when a.kind='restaurant' then 'restaurant' else 'shop' end,owner_mail,a.description,a.address,a.contact_phone,a.latitude,a.longitude,false,false,false,false,false,a.kind not in ('shop','restaurant'),jsonb_build_object('_directory',jsonb_build_object('kind',a.kind,'mode','business'),'_social_links',social)) returning id into sid;
 end if;
 update public.business_applications set status='publishing',store_id=sid,updated_at=now(),revision=revision+1 where id=p_id;
 return sid;
end;$$;


commit;
