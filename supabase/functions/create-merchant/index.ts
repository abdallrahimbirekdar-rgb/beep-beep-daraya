import { createClient } from 'npm:@supabase/supabase-js@2';

const origin = 'https://abdallrahimbirekdar-rgb.github.io';
const headers = {
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json',
};
const reply = (status, body) => new Response(JSON.stringify(body), { status, headers });

// Secrets are injected by Supabase, never supplied by the website.
export function createHandler(client) {
  return async (req) => {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (req.method !== 'POST') return reply(405, { error: 'الطريقة غير مسموحة' });
    const token = req.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
    if (!token) return reply(401, { error: 'سجل الدخول أولاً' });
    try {
      const { data: auth, error: authError } = await client.auth.getUser(token);
      if (authError || !auth?.user) return reply(401, { error: 'انتهت الجلسة. سجل الدخول مجدداً' });
      const { data: permission, error: permissionError } = await client.from('platform_admins').select('user_id').eq('user_id', auth.user.id).maybeSingle();
      if (permissionError) return reply(503, { error: 'تعذر التحقق من الصلاحيات' });
      if (!permission) return reply(403, { error: 'إنشاء الحسابات متاح لمدير المنصة فقط' });
      if (Number(req.headers.get('content-length') || 0) > 4096) return reply(413, { error: 'البيانات أكبر من المسموح' });
      let body;
      try { body = await req.json(); } catch { return reply(400, { error: 'بيانات غير صالحة' }); }
      const storeId = body?.store_id;
      const password = body?.password;
      if (typeof storeId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(storeId)) return reply(400, { error: 'اختر محلاً صالحاً' });
      if (typeof password !== 'string' || password.length < 12 || password.length > 128) return reply(400, { error: 'كلمة المرور يجب أن تكون بين 12 و128 حرفاً' });
      const { data: store, error: storeError } = await client.from('stores').select('id,name,owner_email').eq('id', storeId).maybeSingle();
      if (storeError) return reply(503, { error: 'تعذر قراءة بيانات المحل' });
      if (!store) return reply(404, { error: 'المحل غير موجود' });
      const email = store.owner_email?.trim().toLowerCase();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return reply(400, { error: 'أدخل بريداً صالحاً في إعدادات المحل أولاً' });
      // Existing users are never overwritten; no admin role is granted.
      const { data: created, error } = await client.auth.admin.createUser({ email, password, email_confirm: true });
      if (error) {
        if (error.code === 'email_exists' || error.code === 'user_already_exists' || /already.*(registered|exists)/i.test(error.message)) return reply(409, { error: 'هذا البريد لديه حساب بالفعل. يستطيع الدخول بكلمة مروره الحالية؛ لم يتم تغييرها' });
        if (error.code === 'weak_password') return reply(400, { error: 'كلمة المرور ضعيفة. اختر كلمة أقوى' });
        return reply(502, { error: 'تعذر إنشاء الحساب. تحقق من البريد وكلمة المرور ثم حاول مجدداً' });
      }
      if (!created?.user) return reply(502, { error: 'تعذر تأكيد إنشاء الحساب' });
      return reply(201, { email, store_name: store.name });
    } catch {
      // Never log request bodies, passwords or tokens.
      return reply(500, { error: 'تعذر إكمال العملية. حاول مجدداً' });
    }
  };
}

const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}');
const key = keys.default || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const client = createClient(Deno.env.get('SUPABASE_URL'), key, { auth: { persistSession: false, autoRefreshToken: false } });
Deno.serve(createHandler(client));
