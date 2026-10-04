import html, json, math, re, shutil, uuid, unicodedata
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.parse import urlencode, urlsplit

BASE = 'https://damascus-shop.com'
def esc(value):
    return html.escape(str(value or ''), quote=True)
def image_url(value):
    value = str(value or '')
    return value if urlsplit(value).scheme == 'https' else ''
def store_id(value):
    return str(uuid.UUID(str(value)))
def page(title, description, path, body, schema=None, image=''):
    data = json.dumps(schema, ensure_ascii=False).replace('<', '\\u003c') if schema else ''
    return f'''<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{esc(title)}</title><meta name="description" content="{esc(description)}"><link rel="canonical" href="{BASE}{path}"><meta property="og:type" content="website"><meta property="og:title" content="{esc(title)}"><meta property="og:description" content="{esc(description)}"><meta property="og:url" content="{BASE}{path}">{'<meta property="og:image" content="'+esc(image)+'">' if image else ''}<link rel="stylesheet" href="/style.css"><style>main{{max-width:900px}}.shop-photo{{max-width:100%;max-height:420px;object-fit:contain;border-radius:18px}}.directory{{display:grid;gap:16px}}.directory a{{display:block}}a.contact{{text-decoration:underline}}.shop-actions{{display:flex;gap:12px;flex-wrap:wrap;margin:24px 0}}</style>{'<script type="application/ld+json">'+data+'</script>' if schema else ''}</head><body><header><a class="brand" href="/">سوق داريا الإلكتروني</a><a href="/shops/">دليل المتاجر</a></header><main>{body}</main><footer><a class="contact" href="mailto:info@damascus-shop.com">تواصل معنا: <bdi>info@damascus-shop.com</bdi></a></footer></body></html>'''


SLUG_LETTERS = {"ا":"a","أ":"a","إ":"i","آ":"a","ب":"b","ت":"t","ث":"th","ج":"j","ح":"h","خ":"kh","د":"d","ذ":"dh","ر":"r","ز":"z","س":"s","ش":"sh","ص":"s","ض":"d","ط":"t","ظ":"z","ع":"a","غ":"gh","ف":"f","ق":"q","ك":"k","ل":"l","م":"m","ن":"n","ه":"h","ة":"a","و":"w","ؤ":"w","ي":"y","ى":"a","ئ":"y","ء":""}
def place_slug(s):
    saved = s.get('translations', {}).get('_directory', {}).get('slug', '')
    if saved and re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', saved): return saved
    if s['id'] == 'a5e8abe7-974a-416c-a570-858d6fd03572': return 'falafel-alsultan'
    value = ''.join(SLUG_LETTERS.get(c,c) for c in unicodedata.normalize('NFKD', str(s.get('name') or ''))).lower()
    value = re.sub(r'[\u0300-\u036f\u064b-\u065f\u0670]', '', value)
    value = re.sub(r'[^a-z0-9]+', '-', value).strip('-')[:60] or 'place'
    return value+'-'+s['id'][:8]

def build_readable_pages(stores, output):
    template = (output/'index.html').read_text(encoding='utf-8')
    template = template.replace('<head>', '<head><base href="/">')
    (output/'404.html').write_text(template, encoding='utf-8')
    target = output/'darayya'
    if target.exists(): shutil.rmtree(target)
    target.mkdir()
    used = set()
    for s in stores:
        if not s.get('active') or s.get('deleted_at'): continue
        slug = place_slug(s)
        if slug in used: raise RuntimeError('Duplicate place slug: '+slug)
        used.add(slug)
        sid = store_id(s['id'])
        name = str(s.get('name') or '')
        path = '/darayya/'+slug+'/'
        title = name+' في داريا | سوق داريا الإلكتروني'
        description = ' — '.join(str(x) for x in [name, s.get('description'), s.get('address')] if x)[:300]
        content = re.sub(r'<title>.*?</title>', '<title>'+esc(title)+'</title>', template)
        content = re.sub(r'<link rel="canonical"[^>]*>', '<link rel="canonical" href="'+BASE+path+'">', content)
        content = re.sub(r'<meta name="description"[^>]*>', '<meta name="description" content="'+esc(description)+'">', content)
        content = re.sub(r'<meta property="og:title"[^>]*>', '<meta property="og:title" content="'+esc(title)+'">', content)
        content = re.sub(r'<meta property="og:description"[^>]*>', '<meta property="og:description" content="'+esc(description)+'">', content)
        content = re.sub(r'<meta property="og:url"[^>]*>', '<meta property="og:url" content="'+BASE+path+'">', content)
        if s.get('is_example'): content = content.replace('</head>', '<meta name="robots" content="noindex,follow"></head>')
        else:
            schema = {'@context':'https://schema.org','@type':'Restaurant' if s.get('category')=='restaurant' else 'LocalBusiness','name':name,'url':BASE+path,'description':description}
            if s.get('image'): schema['image'] = image_url(s['image'])
            if s.get('address'): schema['address'] = {'@type':'PostalAddress','streetAddress':str(s['address']),'addressLocality':'داريا','addressCountry':'SY'}
            data = json.dumps(schema,ensure_ascii=False).replace('<','\\u003c')
            content = content.replace('</head>', '<script type="application/ld+json">'+data+'</script></head>')
        fallback = '<noscript><h1>'+esc(name)+'</h1><p>'+esc(s.get('description'))+'</p><p>'+esc(s.get('address'))+'</p></noscript>'
        content = content.replace('</main>',fallback+'</main>')
        # Resolve directly before application startup without changing the friendly path.
        destination = target/slug
        destination.mkdir()
        (destination/'index.html').write_text(content, encoding='utf-8')

def build(stores, output):
    folder = output / 'shops'
    if folder.exists(): shutil.rmtree(folder)
    folder.mkdir(parents=True)
    public = [s for s in stores if s.get('active') and not s.get('deleted_at') and not s.get('is_example')]
    entries, urls = [], [BASE+'/', BASE+'/shops/']
    for s in public:
        sid = store_id(s['id'])
        name = str(s.get('name') or '').strip()
        if not name: continue
        path = '/darayya/'+place_slug(s)+'/'
        title = name+' في داريا | سوق داريا الإلكتروني'
        description = ' — '.join(x for x in [name+' في داريا', s.get('description'), s.get('address')] if x)[:300]
        image = image_url(s.get('image'))
        schema = {'@context':'https://schema.org', '@type':'Restaurant' if s.get('category')=='restaurant' else 'LocalBusiness', 'name':name, 'url':BASE+path, 'description':description}
        body = f'<a href="/shops/">جميع المتاجر</a><h1>{esc(name)}</h1><p>داريا، ريف دمشق، سوريا</p><p>{esc(s.get("description"))}</p>'
        if image:
            schema['image'] = image
            body += f'<img class="shop-photo" src="{esc(image)}" alt="{esc(name)} في داريا">'
        if s.get('address'):
            schema['address'] = {'@type':'PostalAddress','streetAddress':str(s['address']),'addressLocality':'داريا','addressRegion':'ريف دمشق','addressCountry':'SY'}
            body += '<h2>عنوان المتجر</h2><p>'+esc(s['address'])+'</p>'
        if s.get('contact_phone'):
            phone = str(s['contact_phone'])
            schema['telephone'] = phone
            body += '<p>التواصل: <a class="contact" href="tel:'+esc(re.sub(r'[^+0-9]','',phone))+'"><bdi>'+esc(phone)+'</bdi></a></p>'
        try:
            lat, lon = float(s['latitude']), float(s['longitude'])
            if not (math.isfinite(lat) and math.isfinite(lon) and -90<=lat<=90 and -180<=lon<=180): raise ValueError()
            schema['geo'] = {'@type':'GeoCoordinates','latitude':lat,'longitude':lon}
            body += f'<p><a class="contact" href="https://www.google.com/maps/search/?api=1&amp;query={lat},{lon}" target="_blank" rel="noopener noreferrer">موقع المتجر على الخريطة</a></p>'
        except (KeyError, TypeError, ValueError): pass
        body += f'<div class="shop-actions"><a class="button" href="/#store/{sid}">شاهد المعروضات وخيارات المتجر</a><a class="button outline" href="/">العودة للسوق</a></div>'
        destination = folder/sid
        destination.mkdir()
        (destination/'index.html').write_text(page(title,description,path,body,schema,image), encoding='utf-8')
        entries.append(f'<article class="panel"><a href="{path}"><h2>{esc(name)}</h2><p>{esc(s.get("description"))}</p><p>{esc(s.get("address"))}</p></a></article>')
        urls.append(BASE+path)
    body = '<h1>دليل متاجر داريا</h1><p>اكتشف متاجر ومطاعم داريا، وعناوينها وطرق التواصل معها.</p><section class="directory">'+(''.join(entries) or '<p class="panel">سيظهر هنا دليل المتاجر الحقيقية بعد إضافتها وتفعيلها على المنصة.</p>')+'</section>'
    (folder/'index.html').write_text(page('دليل متاجر ومطاعم داريا | سوق داريا الإلكتروني','متاجر ومطاعم داريا: العناوين والصور وطرق التواصل.','/shops/',body),encoding='utf-8')
    (output/'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+''.join('<url><loc>'+esc(u)+'</loc></url>' for u in urls)+'</urlset>',encoding='utf-8')
    (output/'robots.txt').write_text('User-agent: *\nAllow: /\nSitemap: '+BASE+'/sitemap.xml\n',encoding='utf-8')
    build_readable_pages(stores, output)
    return len(entries)

def fetch_stores(config):
    endpoint = re.search(r"supabaseUrl:\s*'([^']+)'",config)[1]
    key = re.search(r"supabaseAnonKey:\s*'([^']+)'",config)[1]
    fields = 'id,name,category,description,image,address,contact_phone,latitude,longitude,active,deleted_at,is_example,translations'
    rows, offset = [], 0
    while True:
        query = urlencode({'select':fields,'active':'eq.true','deleted_at':'is.null','order':'id','limit':1000,'offset':offset})
        request = Request(endpoint+'/rest/v1/stores?'+query,headers={'apikey':key})
        with urlopen(request,timeout=60) as response: batch=json.load(response)
        if not isinstance(batch,list): raise RuntimeError('Invalid public stores response')
        rows.extend(batch)
        if len(batch)<1000: break
        offset += len(batch)
    def public_rows(table):
        request = Request(endpoint+'/rest/v1/'+table+'?select=*',headers={'apikey':key})
        with urlopen(request,timeout=60) as response: return json.load(response)
    try:
        settings = public_rows('platform_settings')
        if settings and settings[0].get('subscriptions_enabled') is False: return rows
    except Exception as error:
        if getattr(error, 'code', None) != 404: raise
    plans = {p['id']:p['features'] for p in public_rows('subscription_plans')}
    subscriptions = {p['store_id']:p for p in public_rows('store_subscriptions')}
    for store in rows:
        sub = subscriptions.get(store['id'])
        if not sub: continue
        features = dict(plans.get(sub['plan_id'] if sub['active'] else 'free', {}))
        if sub['active']: features.update(sub.get('overrides') or {})
        if not features.get('phone'): store['contact_phone'] = ''
        if not features.get('gps'): store['latitude'] = store['longitude'] = None
    return rows

if __name__ == '__main__':
    source = Path('.')
    output = Path('_site')
    output.mkdir(exist_ok=True)
    # Publish only website assets; never publish source, tests, database scripts or APK sources.
    for item in source.iterdir():
        if item.is_file() and (item.suffix in {'.html','.js','.css','.webmanifest','.png','.ico','.svg','.webp'} or item.name in {'CNAME','.nojekyll'}):
            shutil.copy2(item,output/item.name)
        elif item.name in {'images','thumbnails','fonts'} and item.is_dir():
            shutil.copytree(item,output/item.name,dirs_exist_ok=True)
    count = build(fetch_stores((source/'config.js').read_text()),output)
    print(f'Generated {count} public shop pages and sitemap')
