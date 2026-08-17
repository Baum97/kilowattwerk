/**
 * Einmal-Backfill: fuellt generation_daily von START_YEAR bis heute.
 * Laeuft lokal, nicht auf Vercel (Laufzeit weit ueber dem Function-Timeout).
 *
 *   node --env-file=.env.local scripts/backfill-daily.mjs
 *   node --env-file=.env.local scripts/backfill-daily.mjs 2020-01
 *
 * Idempotent: Upsert auf (day, technology). Abbruch jederzeit moeglich,
 * einfach mit dem zuletzt gemeldeten Monat als Argument neu starten.
 */
import { createClient } from '@supabase/supabase-js';
import { toRows, aggregateDaily } from '../lib/generation.mjs';

const START_MONTH = process.argv[2] ?? '2015-01';
const COUNTRY = 'de';
const DELAY_MS = 1500;
const MAX_RETRIES = 5;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWindow(start, end) {
  const url = new URL('https://api.energy-charts.info/public_power');
  url.searchParams.set('country', COUNTRY);
  url.searchParams.set('start', start.toISOString());
  url.searchParams.set('end', end.toISOString());

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(url);
    if (res.ok) return res.json();

    if (res.status === 429 || res.status >= 500) {
      const wait = DELAY_MS * 2 ** attempt;
      console.warn(`  ${res.status}, retry ${attempt}/${MAX_RETRIES} in ${wait}ms`);
      await sleep(wait);
      continue;
    }
    throw new Error(`energy-charts ${res.status}: ${await res.text()}`);
  }
  throw new Error('rate limited, aufgegeben');
}

function* months(from, until) {
  const cursor = new Date(from);
  while (cursor < until) {
    const start = new Date(cursor);
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    yield [start, new Date(Math.min(cursor.getTime(), until.getTime()))];
  }
}

async function main() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY fehlen');
  }

  const [year, month] = START_MONTH.split('-').map(Number);
  const from = new Date(Date.UTC(year, month - 1, 1));
  const until = new Date();

  let totalDays = 0;

  for (const [start, end] of months(from, until)) {
    const label = start.toISOString().slice(0, 7);
    process.stdout.write(`${label} … `);

    const rows = aggregateDaily(toRows(await fetchWindow(start, end)));

    if (rows.length === 0) {
      console.log('keine Daten');
      await sleep(DELAY_MS);
      continue;
    }

    const { error } = await supabase
      .from('generation_daily')
      .upsert(rows, { onConflict: 'day,technology' });

    if (error) throw new Error(`${label} upsert: ${error.message} (${error.code})`);

    const days = new Set(rows.map(row => row.day)).size;
    totalDays += days;
    console.log(`${rows.length} Zeilen / ${days} Tage`);

    await sleep(DELAY_MS);
  }

  console.log(`\nfertig: ${totalDays} Tage geschrieben`);
}

main().catch(err => {
  console.error('\nbackfill abgebrochen:', err.message);
  process.exit(1);
});
