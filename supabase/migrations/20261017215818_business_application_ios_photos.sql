-- Safari can encode canvas photos as JPEG when WebP encoding is unavailable.
-- Keep the existing size limit, ownership, review workflow and MIME restrictions.
alter table public.business_applications drop constraint business_applications_facade_data_check;
alter table public.business_applications add constraint business_applications_facade_data_check
check(facade_data='' or (length(facade_data)<=550000 and facade_data ~ '^data:image/(webp|jpeg);base64,[A-Za-z0-9+/]+={0,2}$'));
