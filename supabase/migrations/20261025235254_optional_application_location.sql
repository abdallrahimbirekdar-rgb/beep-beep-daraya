-- GPS is optional for every shop/service request. Keep the current ownership,
-- revision, review and linked draft checks unchanged.
create or replace function public.submit_business_application(p_id uuid,p_revision integer)
returns jsonb language plpgsql security definer set search_path=public as $$
declare a public.business_applications; s public.stores;
begin
 if auth.uid() is null then raise exception 'سجل الدخول أولاً';end if;
 select * into a from public.business_applications where id=p_id and owner_id=auth.uid() for update;
 if not found then raise exception 'الطلب غير موجود';end if;
 if a.status='pending' then return to_jsonb(a);end if;
 if a.status not in ('draft','needs_changes') or p_revision is null or a.revision<>p_revision then raise exception 'تغير الطلب. أعد فتحه.';end if;
 if a.store_id is not null then
  select * into s from public.stores where id=a.store_id and deleted_at is null for update;
  if not found or s.active then raise exception 'الصفحة غير متاحة';end if;
  a.name:=s.name;a.address:=s.address;a.contact_phone:=s.contact_phone;a.latitude:=s.latitude;a.longitude:=s.longitude;a.description:=s.description;
 end if;
 a.contact_phone:=regexp_replace(a.contact_phone,'[ ().-]','','g');
 if a.contact_phone ~ '^09[0-9]{8}$' then a.contact_phone:='+963'||substring(a.contact_phone from 2);end if;
 if a.contact_phone ~ '^9639[0-9]{8}$' then a.contact_phone:='+'||a.contact_phone;end if;
 if length(trim(a.name))=0 or length(trim(a.address))<3 or a.contact_phone !~ '^[+][1-9][0-9]{7,14}$'
 or (a.facade_data='' and coalesce(s.image,'')='') then
  raise exception 'قبل طلب المعاينة: أضف الاسم والعنوان وصورة الواجهة ورقم التواصل. موقع الخريطة اختياري.';
 end if;
 update public.business_applications set name=a.name,address=a.address,contact_phone=a.contact_phone,latitude=a.latitude,longitude=a.longitude,description=a.description,status='pending',submitted_at=now(),updated_at=now(),review_note='',revision=revision+1 where id=p_id returning * into a;
 return to_jsonb(a);
end;$$;
-- CREATE OR REPLACE preserves the existing authenticated-only EXECUTE grant.
