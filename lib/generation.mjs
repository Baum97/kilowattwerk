/**
 * Gemeinsame Transformationen fuer die Energy-Charts-Rohdaten.
 * Genutzt von api/cron.mjs (taeglicher Ingest) und scripts/backfill-daily.mjs.
 */

/** Energy-Charts-Antwort → Zeilen fuer die Tabelle `generation`. */
export function toRows({ unix_seconds, production_types }) {
  return production_types.flatMap(type =>
    unix_seconds
      .map((sec, i) => ({
        ts: new Date(sec * 1000).toISOString(),
        technology: type.name,
        value_mw: type.data[i],
      }))
      .filter(row => row.value_mw != null)
  );
}

/** Zeilen aus toRows() → Tageswerte fuer die Tabelle `generation_daily`. */
export function aggregateDaily(rows) {
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

  return [...buckets.values()].map(bucket => {
    const avg = bucket.sum / bucket.n;
    return {
      day: bucket.day,
      technology: bucket.technology,
      avg_mw: avg,
      // value_mw ist Leistung: Tagesenergie = Mittelwert * 24 h
      energy_mwh: avg * 24,
      max_mw: bucket.max,
      min_mw: bucket.min,
    };
  });
}
