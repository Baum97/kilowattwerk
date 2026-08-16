import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).end('Unauthorized');
  }

  const end = new Date();
  const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);

  const url = new URL('https://api.energy-charts.info/public_power');
  url.searchParams.set('country', 'de');
  url.searchParams.set('start', start.toISOString());
  url.searchParams.set('end', end.toISOString());

  const upstream = await fetch(url);
  if (!upstream.ok) {
    return res.status(502).json({ error: `energy-charts ${upstream.status}` });
  }

  const { unix_seconds, production_types } = await upstream.json();

  const rows = production_types.flatMap(type =>
    unix_seconds
      .map((sec, i) => ({
        ts: new Date(sec * 1000).toISOString(),
        technology: type.name,
        value_mw: type.data[i],
      }))
      .filter(row => row.value_mw != null)
  );

  const { error } = await supabase
    .from('generation')
    .upsert(rows, { onConflict: 'ts,technology' });

  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json({ inserted: rows.length });
}
