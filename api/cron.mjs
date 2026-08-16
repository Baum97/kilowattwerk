import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const RETENTION_DAYS = 180;

export default async function handler(req, res) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).end('Unauthorized');
  }

<<<<<<< Updated upstream
=======
  // ab Mitternacht (UTC) des Vortags, damit der Vortag vollstaendig aggregierbar ist
>>>>>>> Stashed changes
  const end = new Date();
  const start = new Date(Date.UTC(
    end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate() - 1
  ));

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

  const { error: rawError } = await supabase
    .from('generation')
    .upsert(rows, { onConflict: 'ts,technology' });

<<<<<<< Updated upstream
  if (error) return res.status(500).json({ error: error.message });
=======
  if (rawError) return fail(res, 'generation upsert', rawError, rows[0]);

  const dailyRows = aggregateDaily(rows);

  const { error: dailyError } = await supabase
    .from('generation_daily')
    .upsert(dailyRows, { onConflict: 'day,technology' });

  if (dailyError) return fail(res, 'generation_daily upsert', dailyError, dailyRows[0]);

  const cutoff = new Date(end.getTime() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

  const { error: pruneError } = await supabase
    .from('generation')
    .delete()
    .lt('ts', cutoff.toISOString());

  if (pruneError) return fail(res, 'generation prune', pruneError);

  return res.status(200).json({
    inserted: rows.length,
    days: dailyRows.length,
    prunedBefore: cutoff.toISOString(),
  });
}

function aggregateDaily(rows) {
  const buckets = new Map();

  for (const row of rows) {
    const day = row.ts.slice(0, 10);
    const key = `${day}|${row.technology}`;
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { day, technology: row.technology, sum: 0, n: 0, max: -Infinity, min: Infinity };
      buckets.set(key, bucket);
    }
    bucket.sum += row.value_mw;
    bucket.n += 1;
    if (row.value_mw > bucket.max) bucket.max = row.value_mw;
    if (row.value_mw < bucket.min) bucket.min = row.value_mw;
  }
>>>>>>> Stashed changes

  return [...buckets.values()].map(bucket => {
    const avg = bucket.sum / bucket.n;
    return {
      day: bucket.day,
      technology: bucket.technology,
      avg_mw: avg,
      energy_mwh: avg * 24,
      max_mw: bucket.max,
      min_mw: bucket.min,
    };
  });
}

function fail(res, step, error, sample) {
  console.error(`${step} failed`, {
    code: error.code,
    message: error.message,
    details: error.details,
    hint: error.hint,
    sample,
  });
  return res.status(500).json({ step, error: error.message, code: error.code });
}
