/**
 * Aktueller Strommix - nur Erzeugung, mit Anteilen.
 *
 * Unterschied zu /api/current: dort kommen die Rohdaten von energy-charts
 * unveraendert durch, inklusive Reihen, die keine Erzeugung sind (Last,
 * Residuallast, Anteilswerte in Prozent, Speicherbezug mit negativem
 * Vorzeichen). Fuer eine Mix-Darstellung muessen die raus, sonst summiert
 * man Aepfel mit Birnen.
 */

import { CATEGORY, CHART_SLOT, NOT_GENERATION } from '../lib/technologies.mjs';

const WINDOW_HOURS = 6;
const REFRESH_SECONDS = 15 * 60;

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

  // je Reihe der letzte nicht-leere Messwert; die Reihen laufen
  // unterschiedlich weit, deshalb pro Reihe eigenstaendig suchen
  const latest = new Map();
  let latestIndex = -1;

  for (const type of production_types) {
    for (let i = type.data.length - 1; i >= 0; i--) {
      if (type.data[i] != null) {
        latest.set(type.name, type.data[i]);
        if (i > latestIndex) latestIndex = i;
        break;
      }
    }
  }

  const technologies = [...latest]
    .filter(([name, mw]) => !NOT_GENERATION.has(name) && mw > 0)
    .map(([name, mw]) => ({
      name,
      mw,
      category: CATEGORY[name] ?? 'other',
      // null = im Verlaufsgraphen nicht einzeln darstellbar
      slot: CHART_SLOT[name] ?? null,
    }))
    .sort((a, b) => b.mw - a.mw);

  const totalMw = technologies.reduce((sum, tech) => sum + tech.mw, 0);

  for (const tech of technologies) {
    tech.share = totalMw > 0 ? (tech.mw / totalMw) * 100 : 0;
  }

  // max-age=0 zwingt den Browser, jedes Mal beim CDN nachzufragen. Ohne diese
  // Angabe schaetzt er die Haltbarkeit selbst - je URL unterschiedlich, wodurch
  // Karten und Strommix verschiedene Zeitstaende anzeigen.
  res.setHeader(
    'Cache-Control',
    `public, max-age=0, s-maxage=${REFRESH_SECONDS}, stale-while-revalidate=60`
  );

  return res.status(200).json({
    ts: latestIndex >= 0 ? new Date(unix_seconds[latestIndex] * 1000).toISOString() : null,
    totalMw,
    // Anteil laut energy-charts selbst - nicht nachgerechnet, damit die
    // offizielle Definition gilt (bezogen auf Erzeugung, nicht auf Last)
    renewableSharePercent: latest.get('Renewable share of generation') ?? null,
    technologies,
  });
}
