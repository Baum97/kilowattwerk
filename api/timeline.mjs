/**
 * Zeitverlauf der Erzeugung im 15-Minuten-Raster, live von energy-charts.
 *
 * Bewusst nicht aus Supabase: die Rohtabelle `generation` wird vom Cron nur
 * einmal taeglich gefuellt und endet daher am Vortag - der laufende Tag fehlte.
 */
import { CATEGORY, CHARTABLE, CHART_SLOT, NOT_GENERATION } from '../lib/technologies.mjs';

const DEFAULT_HOURS = 24;
const MAX_HOURS = 72;

/** 15-Minuten-Raster */
const POINTS_PER_HOUR = 4;

/**
 * Zusatzfenster gegen den Verzug der Quelle. energy-charts faellt zeitweise um
 * mehr als 20 Stunden zurueck; ohne Puffer lieferte eine 24-Stunden-Anfrage
 * dann nur eine Handvoll Punkte am Anfang des Zeitraums.
 */
const LAG_BUFFER_HOURS = 24;
const REFRESH_SECONDS = 15 * 60;

export default async function handler(req, res) {
  const hours = clampHours(req.query.hours);
  if (hours === null) {
    return res.status(400).json({ error: 'hours muss eine Zahl zwischen 1 und 72 sein.' });
  }

  const requested = req.query.technologies
    ?.split(',')
    .map(name => name.trim())
    .filter(Boolean);

  const end = new Date();
  const start = new Date(end.getTime() - (hours + LAG_BUFFER_HOURS) * 60 * 60 * 1000);

  const url = new URL('https://api.energy-charts.info/public_power');
  url.searchParams.set('country', 'de');
  url.searchParams.set('start', start.toISOString());
  url.searchParams.set('end', end.toISOString());

  const upstream = await fetch(url);
  if (!upstream.ok) {
    return res.status(502).json({ error: `energy-charts ${upstream.status}` });
  }

  const { unix_seconds, production_types } = await upstream.json();

  const wanted = new Set(requested?.length ? requested : CHARTABLE);

  const series = production_types
    .filter(type => wanted.has(type.name) && !NOT_GENERATION.has(type.name))
    .map(type => ({
      name: type.name,
      category: CATEGORY[type.name] ?? 'other',
      slot: CHART_SLOT[type.name] ?? null,
      values: type.data,
    }))
    .sort((a, b) => (a.slot ?? 99) - (b.slot ?? 99));

  // Fenster am letzten vorhandenen Messwert ausrichten, nicht an "jetzt".
  // Die Reihen laufen unterschiedlich weit, und die Quelle kann Stunden
  // zurueckliegen - ohne diese Verschiebung endete der Graph in einer
  // Lueckenzone, die wie ein Einbruch aussieht.
  let last = -1;
  let firstWithData = -1;

  for (const s of series) {
    for (let i = s.values.length - 1; i >= 0; i--) {
      if (s.values[i] != null) {
        if (i > last) last = i;
        break;
      }
    }
    for (let i = 0; i < s.values.length; i++) {
      if (s.values[i] != null) {
        if (firstWithData < 0 || i < firstWithData) firstWithData = i;
        break;
      }
    }
  }

  // die letzten `hours` Stunden *vorhandener* Daten, nicht der Uhr
  const windowPoints = hours * POINTS_PER_HOUR;
  const from = last < 0 ? 0 : Math.max(Math.max(firstWithData, 0), last - windowPoints + 1);
  const to = last + 1;

  res.setHeader(
    'Cache-Control',
    `public, max-age=0, s-maxage=${REFRESH_SECONDS}, stale-while-revalidate=60`
  );

  return res.status(200).json({
    hours,
    timestamps: unix_seconds.slice(from, to).map(sec => new Date(sec * 1000).toISOString()),
    series: series.map(s => ({ ...s, values: s.values.slice(from, to) })),
  });
}

function clampHours(raw) {
  if (raw == null || raw === '') return DEFAULT_HOURS;
  const hours = Number(raw);
  if (!Number.isFinite(hours) || hours < 1) return null;
  return Math.min(Math.round(hours), MAX_HOURS);
}
