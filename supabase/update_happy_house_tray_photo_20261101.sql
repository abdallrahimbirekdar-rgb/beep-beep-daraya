-- Improve the existing tray product photo without creating a duplicate.
update public.products
set image='https://damascus-shop.com/images/happy-house/20261101/30021.jpg',
    gallery=case when 'https://damascus-shop.com/images/happy-house/20261101/30003.jpg'=any(coalesce(gallery,'{}'::text[])) then gallery else array_append(coalesce(gallery,'{}'::text[]),'https://damascus-shop.com/images/happy-house/20261101/30003.jpg') end
where id='ab03d678-e4d9-52c8-9a7c-e68a9c9413d8'
  and store_id='c0a627c1-229d-4da9-957c-4aff3ff48a8f'
  and image='https://damascus-shop.com/images/happy-house/20261101/30003.jpg';
