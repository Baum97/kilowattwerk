import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const MAX_DAYS = 365;

export default async function handler(req, res) {
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
