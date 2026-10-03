# Public shop directory

`build_seo.py` reads only publicly accessible store fields using the site's publishable Supabase key. Active, non-deleted, non-example shops receive static HTML pages under `/shops/<store-id>/`, with canonical URLs, description, image, contact details and LocalBusiness/Restaurant JSON-LD. Missing details are omitted rather than invented.

The Pages workflow builds on pushes and runs hourly at minute 17 (GitHub schedules may be delayed). Store edits in Supabase appear on the next successful build. Removed or disabled shops disappear from the generated directory and sitemap. A failed fetch aborts deployment, preserving the previous published site. No service-role key is needed.

GitHub Pages publishing source must be GitHub Actions. The domain and HTTPS remain configured in Pages settings. The directory is linked from the homepage; ordering continues in the existing application.

Google discovery and indexing are separate from successful publishing and are not guaranteed. Submit `/sitemap.xml` in Search Console after verifying domain ownership.
