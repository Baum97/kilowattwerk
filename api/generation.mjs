import { createClient } from '@supabase/supabase-js';

const MAX_DAYS = 365;

export default async function handler(req, res) {
  // siehe annual.mjs: auf Modulebene wuerde ein fehlender Wert schon den
  // Import sprengen und einen 500 ohne Fehlertext erzeugen
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error('generation: Konfiguration unvollstaendig', { hasUrl: Boolean(url), hasKey: Boolean(key) });
    return res.status(500).json({
      error: 'Supabase ist nicht konfiguriert.',
      missing: [!url && 'SUPABASE_URL', !key && 'SUPABASE_SERVICE_ROLE_KEY'].filter(Boolean),
    });
  }

  const supabase = createClient(url, key);

  const days = Math.min(Number(req.query.days) || 90, MAX_DAYS);
  if (!Number.isFinite(days) || days < 1) {
    return res.status(400).json({ error: 'days must be a positive number' });
  }

  const technologies = req.query.technologies
    ?.split(',')
    .map(t => t.trim())
    .filter(Boolean);

  const since = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);

  let query = supabase
    .from('generation_daily')
    .select('day, technology, energy_mwh, avg_mw, max_mw, min_mw')
    .gte('day', since)
    .order('day');

  if (technologies?.length) query = query.in('technology', technologies);

  const { data, error } = await query;

  if (error) {
    console.error('generation_daily select failed', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return res.status(500).json({ error: error.message, code: error.code });
  }

  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
  return res.status(200).json(data);
}
