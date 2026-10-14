export async function cleanupExpired(api) {
  const result = await api.rpc('shop_reel_cleanup_candidates', { p_limit: 100 });
  if (result.error) throw result.error;
  let files = 0, offers = 0, failed = 0;
  for (const row of result.data || []) {
    try {
      if (row.path) {
        if (!/^[0-9a-f-]{36}\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(mp4|webm)$/.test(row.path)) throw Error('Invalid path');
        const removed = await api.storage.from('shop-reels').remove([row.path]);
        if (removed.error) throw removed.error;
        files++;
      }
      if (row.offer_id) {
        const deleted = await api.from('daily_offers').delete().eq('id', row.offer_id).or('ends_at.lte.' + row.cutoff + ',status.eq.rejected').select('id');
        if (deleted.error) throw deleted.error;
        offers += deleted.data?.length || 0;
      }
    } catch { failed++; }
  }
  return { files, offers, failed };
}
