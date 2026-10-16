// Anonymous idea submission gateway. Deploy only after TURNSTILE_SECRET_KEY is set.
// Direct access to community_idea_submit must be revoked by the accompanying migration.
const allowedOrigins = new Set(['https://damascus-shop.com', 'https://www.damascus-shop.com']);
const json = (body: unknown, status = 200, origin = '') => new Response(JSON.stringify(body), {
 status, headers: { 'content-type': 'application/json; charset=utf-8', 'vary': 'Origin',
 ...(allowedOrigins.has(origin) ? { 'access-control-allow-origin': origin } : {}) }
});
Deno.serve(async (req: Request) => {
 const origin = req.headers.get('origin') ?? '';
 if (req.method === 'OPTIONS') {
  if (!allowedOrigins.has(origin)) return json({ error: 'Origin not allowed' }, 403);
  return new Response(null, { status: 204, headers: {
   'access-control-allow-origin': origin, 'access-control-allow-methods': 'POST, OPTIONS',
   'access-control-allow-headers': 'content-type, apikey, authorization', 'vary': 'Origin'
  } });
 }
 if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405, origin);
 if (!allowedOrigins.has(origin)) return json({ error: 'Origin not allowed' }, 403);
 const secret = Deno.env.get('TURNSTILE_SECRET_KEY');
 const url = Deno.env.get('SUPABASE_URL');
 const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if (!secret || !url || !serviceKey) return json({ error: 'Submission service is not configured' }, 503, origin);
 const size = Number(req.headers.get('content-length') || '0');
 if (size > 10000) return json({ error: 'Request too large' }, 413, origin);
 let body: Record<string, unknown>;
 try { body = await req.json(); } catch { return json({ error: 'Invalid request' }, 400, origin); }
 const title = typeof body.title === 'string' ? body.title.trim() : '';
 const details = typeof body.details === 'string' ? body.details.trim() : '';
 const category = typeof body.category === 'string' ? body.category : 'idea';
 const token = typeof body.turnstileToken === 'string' ? body.turnstileToken : '';
 if (title.length < 5 || title.length > 120 || details.length < 10 || details.length > 2000 ||
  !['idea', 'service', 'improvement', 'problem'].includes(category) || !token || token.length > 4096)
  return json({ error: 'تحقق من البيانات وأكمل اختبار الأمان' }, 400, origin);
 try {
  const form = new FormData();
  form.set('secret', secret); form.set('response', token);
  const verify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
   method: 'POST', body: form, signal: AbortSignal.timeout(8000)
  });
  if (!verify.ok) return json({ error: 'تعذر التحقق من الأمان' }, 503, origin);
  const result = await verify.json();
  if (result.success !== true || !allowedOrigins.has('https://' + result.hostname))
   return json({ error: 'فشل التحقق من الأمان، حاول مجددًا' }, 403, origin);
  const response = await fetch(url + '/rest/v1/rpc/community_idea_submit', {
   method: 'POST', headers: { 'apikey': serviceKey, 'authorization': 'Bearer ' + serviceKey,
    'content-type': 'application/json' },
   body: JSON.stringify({ p_title: title, p_details: details, p_category: category }),
   signal: AbortSignal.timeout(8000)
  });
  if (!response.ok) return json({ error: response.status === 400 ? 'تحقق من بيانات الاقتراح أو حاول لاحقًا' : 'تعذر حفظ الاقتراح' }, 429 === response.status ? 429 : 400, origin);
  return json({ ok: true }, 201, origin);
 } catch {
  return json({ error: 'الخدمة غير متاحة مؤقتًا' }, 503, origin);
 }
});
