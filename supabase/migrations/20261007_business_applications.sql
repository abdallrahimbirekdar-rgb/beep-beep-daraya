begin;
set local lock_timeout = '3s';
set local statement_timeout = '30s';
-- Private drafts. Creating an application never publishes a store.
create table if not exists public.business_applications (
 id uuid primary key,
 owner_id uuid not null references auth.users(id),
 kind text not null default 'shop' check(kind in ('shop','services','restaurant','doctor','pharmacy','lawyer')),
 name text not null default '' check(length(name)<=100),
 address text not null default '' check(length(address)<=400),
 contact_phone text not null default '' check(length(contact_phone)<=30),
 contact_method text not null default 'whatsapp' check(contact_method in ('whatsapp','telegram','phone')),
 telegram_username text not null default '' check(telegram_username='' or telegram_username ~ '^[A-Za-z][A-Za-z0-9_]{4,31}$'),
 latitude double precision check(latitude between -90 and 90),
 longitude double precision check(longitude between -180 and 180),
 description text not null default '' check(length(description)<=1000),
 facade_data text not null default '' check(facade_data='' or (length(facade_data)<=550000 and facade_data ~ '^data:image/webp;base64,[A-Za-z0-9+/]+={0,2}$')),
 status text not null default 'draft' check(status in ('draft','pending','needs_changes','publishing','approved')),
 review_note text not null default '' check(length(review_note)<=1000),
 store_id uuid references public.stores(id),
 revision integer not null default 1,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 submitted_at timestamptz,
 reviewed_at timestamptz
);
create index if not exists business_applications_owner on public.business_applications(owner_id,updated_at desc);
create index if not exists business_applications_status on public.business_applications(status,submitted_at);
alter table public.business_applications enable row level security;
revoke all on public.business_applications from anon,authenticated;
grant select on public.business_applications to authenticated;
drop policy if exists business_applications_read on public.business_applications;
create policy business_applications_read on public.business_applications for select to authenticated using(owner_id=auth.uid() or public.is_admin());

create or replace function public.save_business_application(p_id uuid,p_revision integer,p_data jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare a public.business_applications; uid uuid:=auth.uid();
begin
 if uid is null or p_id is null or p_data is null or jsonb_typeof(p_data)<>'object' then raise exception 'سجل الدخول أولاً'; end if;
 perform pg_advisory_xact_lock(hashtext('business-application:'||uid::text));
 select * into a from public.business_applications where id=p_id for update;
 if found then
  if a.owner_id<>uid then raise exception 'غير مسموح';end if;
  if a.status not in ('draft','needs_changes') then raise exception 'الطلب قيد المعاينة. يمكنك تعديله بعد إعادته إلى المسودة.';end if;
  if p_revision is null or p_revision<>a.revision then raise exception 'تغيرت المسودة. أعد فتحها قبل الحفظ.';end if;
 else
  if p_revision is distinct from 0 then raise exception 'المسودة غير موجودة';end if;
  if (select count(*) from public.business_applications where owner_id=uid and status<>'approved')>=3 then raise exception 'لديك ثلاثة طلبات مفتوحة. أكملها قبل إنشاء طلب آخر.';end if;
  insert into public.business_applications(id,owner_id) values(p_id,uid) returning * into a;
 end if;
 update public.business_applications set
  kind=coalesce(p_data->>'kind','shop'),name=trim(coalesce(p_data->>'name','')),
  address=trim(coalesce(p_data->>'address','')),contact_phone=trim(coalesce(p_data->>'contact_phone','')),
  contact_method=coalesce(p_data->>'contact_method','whatsapp'),telegram_username=trim(coalesce(p_data->>'telegram_username','')),
  latitude=nullif(p_data->>'latitude','')::double precision,longitude=nullif(p_data->>'longitude','')::double precision,
  description=trim(coalesce(p_data->>'description','')),facade_data=coalesce(p_data->>'facade_data',a.facade_data),
  revision=a.revision+1,updated_at=now()
 where id=p_id returning * into a;
 return to_jsonb(a);
end;$$;

create or replace function public.submit_business_application(p_id uuid,p_revision integer)
returns jsonb language plpgsql security definer set search_path=public as $$
declare a public.business_applications;
begin
 if auth.uid() is null then raise exception 'سجل الدخول أولاً';end if;
 select * into a from public.business_applications where id=p_id and owner_id=auth.uid() for update;
 if not found then raise exception 'الطلب غير موجود';end if;
 -- Retrying the same successful submission is harmless.
 if a.status='pending' then return to_jsonb(a);end if;
 if a.status not in ('draft','needs_changes') or p_revision is null or a.revision<>p_revision then raise exception 'تغير الطلب. أعد فتحه.';end if;
 if length(trim(a.name))=0 or length(trim(a.address))<3 or a.contact_phone !~ '^\+[1-9][0-9]{7,14}$'
 or a.latitude is null or a.longitude is null or a.facade_data='' then
  raise exception 'قبل طلب المعاينة: أضف الاسم والعنوان وصورة الواجهة وموقع GPS ورقم التواصل.';
 end if;
 update public.business_applications set status='pending',submitted_at=now(),updated_at=now(),review_note='',revision=revision+1 where id=p_id returning * into a;
 return to_jsonb(a);
end;$$;

create or replace function public.withdraw_business_application(p_id uuid,p_revision integer)
returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'سجل الدخول أولاً';end if;
 update public.business_applications set status='draft',updated_at=now(),revision=revision+1
 where id=p_id and owner_id=auth.uid() and status='pending' and revision=p_revision;
 if not found then raise exception 'بدأت الإدارة معاينة الطلب أو تغيرت بياناته. حدّث الصفحة.';end if;
end;$$;

create or replace function public.review_business_application(p_id uuid,p_revision integer,p_note text)
returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'غير مسموح';end if;
 if p_note is null or length(trim(p_note)) not between 1 and 1000 then raise exception 'اكتب المعلومات المطلوب تصحيحها';end if;
 update public.business_applications set status='needs_changes',review_note=trim(p_note),updated_at=now(),reviewed_at=now(),revision=revision+1
 where id=p_id and status='pending' and revision=p_revision;
 if not found then raise exception 'تغير الطلب. حدّث الصفحة.';end if;
end;$$;

-- Stage approval so a failed image upload cannot publish a page without a photo.
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
 insert into public.stores(name,category,owner_email,description,address,contact_phone,latitude,longitude,active,is_open,online_ordering,delivery_enabled,pickup_enabled,text_only,translations)
 values(a.name,case when a.kind='restaurant' then 'restaurant' else 'shop' end,owner_mail,a.description,a.address,a.contact_phone,a.latitude,a.longitude,false,false,false,false,false,a.kind not in ('shop','restaurant'),jsonb_build_object('_directory',jsonb_build_object('kind',a.kind,'mode','business'),'_social_links',social)) returning id into sid;
 update public.business_applications set status='publishing',store_id=sid,updated_at=now(),revision=revision+1 where id=p_id;
 return sid;
end;$$;

create or replace function public.finish_business_application_approval(p_id uuid,p_image text)
returns uuid language plpgsql security definer set search_path=public as $$
declare a public.business_applications;
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'غير مسموح';end if;
 select * into a from public.business_applications where id=p_id for update;
 if not found then raise exception 'الطلب غير موجود';end if;
 if a.status='approved' then return a.store_id;end if;
 if a.status<>'publishing' or p_image is null or length(p_image)>2000 or p_image !~ '^https://[^[:space:]]+$' then raise exception 'ارفع صورة الصفحة قبل الموافقة';end if;
 update public.stores set image=p_image,active=true,name=a.name,address=a.address,contact_phone=a.contact_phone,latitude=a.latitude,longitude=a.longitude where id=a.store_id and deleted_at is null;
 if not found then raise exception 'الصفحة غير متاحة. راجع الإدارة.';end if;
 update public.business_applications set status='approved',reviewed_at=now(),updated_at=now(),revision=revision+1 where id=p_id;
 return a.store_id;
end;$$;
revoke all on function public.save_business_application(uuid,integer,jsonb),public.submit_business_application(uuid,integer),public.withdraw_business_application(uuid,integer),public.review_business_application(uuid,integer,text),public.begin_business_application_approval(uuid,integer),public.finish_business_application_approval(uuid,text) from public,anon;
grant execute on function public.save_business_application(uuid,integer,jsonb),public.submit_business_application(uuid,integer),public.withdraw_business_application(uuid,integer),public.review_business_application(uuid,integer,text),public.begin_business_application_approval(uuid,integer),public.finish_business_application_approval(uuid,text) to authenticated;
commit;
