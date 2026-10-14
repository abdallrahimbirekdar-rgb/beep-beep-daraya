import { createClient } from 'npm:@supabase/supabase-js@2';
import { cleanupExpired } from './cleanup.mjs';
Deno.serve(async (req: Request) => {
  const secret = Deno.env.get('REELS_CLEANUP_SECRET');
  if (!secret) return new Response('Cleanup not configured', { status: 503 });
  if (req.method !== 'POST' || req.headers.get('authorization') !== 'Bearer ' + secret) {
    return new Response('Unauthorized', { status: 401 });
  }
  try {
    const api = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
    const counts = await cleanupExpired(api);
    return Response.json(counts, { status: counts.failed ? 500 : 200 });
  } catch { return new Response('Cleanup failed', { status: 500 }); }
});
