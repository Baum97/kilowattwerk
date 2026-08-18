import { createClient } from '@supabase/supabase-js';
import { toRows, aggregateDaily } from '../lib/generation.mjs';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const RETENTION_DAYS = 365;

export default async function handler(req, res) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).end('Unauthorized');
  }

  // ab Mitternacht (UTC) des Vortags, damit der Vortag vollstaendig aggregierbar ist
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

  const rows = toRows(await upstream.json());

  const { error: rawError } = await supabase
    .from('generation')
    .upsert(rows, { onConflict: 'ts,technology' });

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
