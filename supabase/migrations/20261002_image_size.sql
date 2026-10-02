begin;
update storage.buckets set file_size_limit=1572864 where id='store-images';
commit;
