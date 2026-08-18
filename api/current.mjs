/**
 * Aktuelle Leistung je Technologie - live von energy-charts.
 * Bewusst ohne Supabase: `generation_daily` sind Tagesaggregate und der
 * Ingest-Cron laeuft 1x/Tag, kann also keinen aktuellen Wert liefern.
 */

const WINDOW_HOURS = 6;
const REFRESH_SECONDS = 60;

export default async function handler(req, res) {
  const end = new Date();
  const start = new Date(end.getTime() - WINDOW_HOURS * 60 * 60 * 1000);

  const url = new URL('https://api.energy-charts.info/public_power');
  url.searchParams.set('country', 'de');
  url.searchParams.set('start', start.toISOString());
  url.searchParams.set('end', end.toISOString());

  const upstream = await fetch(url);
  if (!upstream.ok) {
    return res.status(502).json({ error: `energy-charts ${upstream.status}` });
  }

  const { unix_seconds, production_types } = await upstream.json();

  // je Technologie der letzte nicht-leere Messwert
  const values = {};
  let latestIndex = -1;

  for (const type of production_types) {
    for (let i = type.data.length - 1; i >= 0; i--) {
      if (type.data[i] != null) {
        values[type.name] = type.data[i];
        if (i > latestIndex) latestIndex = i;
        break;
      }
    }
  }

  res.setHeader(
    'Cache-Control',
    `s-maxage=${REFRESH_SECONDS * 15}, stale-while-revalidate=${REFRESH_SECONDS}`
  );

  return res.status(200).json({
    ts: latestIndex >= 0 ? new Date(unix_seconds[latestIndex] * 1000).toISOString() : null,
    values,
  });
}
