-- Allow only platform admins to remove unused Falafel Sultan image objects.
drop policy if exists migrated_sultan_images_delete on storage.objects;
create policy migrated_sultan_images_delete on storage.objects
for delete to authenticated using (
 bucket_id='store-images'
 and public.is_admin()
 and (storage.foldername(name))[1]='a5e8abe7-974a-416c-a570-858d6fd03572'
 and not exists(select 1 from public.stores s where position(storage.objects.name in to_jsonb(s)::text)>0)
 and not exists(select 1 from public.products p where position(storage.objects.name in to_jsonb(p)::text)>0)
 and not exists(select 1 from public.store_page_photos p where position(storage.objects.name in to_jsonb(p)::text)>0)
);
