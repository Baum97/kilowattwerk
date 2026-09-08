/**
 * Jahresenergie je Technologie aus `generation_daily` - zeigt den Ausbau der
 * Erneuerbaren ueber die volle Historie.
 *
 * Aggregiert wird hier in der Function, nicht in der Datenbank: PostgREST
 * lehnt Aggregatfunktionen auf dieser Instanz ab ("Use of aggregate functions
 * is not allowed") und deckelt jede Antwort bei 1000 Zeilen. Deshalb wird
 * geblaettert und summiert - vertretbar, weil sich Jahreswerte taeglich
 * hoechstens einmal aendern und die Antwort entsprechend lange gecacht wird.
 */
import { createClient } from '@supabase/supabase-js';
import { CATEGORY, CHART_SLOT } from '../lib/technologies.mjs';

/** Erneuerbare mit fester Farbzuordnung - die Reihen, die den Ausbau tragen */
const SERIES = [
  'Solar',
  'Wind onshore',
  'Wind offshore',
  'Biomass',
  'Hydro Run-of-River',
];

const PAGE = 1000;
const MAX_PAGES = 60;

/** unter so vielen Tagen gilt ein Jahr als unvollstaendig */
const FULL_YEAR_DAYS = 360;

const CACHE_SECONDS = 24 * 60 * 60;

export default async function handler(req, res) {
  // createClient bewusst *im* Handler: auf Modulebene wirft es bei fehlender
  // Variable schon beim Import ("supabaseUrl is required") - der Aufrufer sieht
  // dann einen nackten 500 ohne Hinweis, was fehlt.
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error('annual: Konfiguration unvollstaendig', { hasUrl: Boolean(url), hasKey: Boolean(key) });
    return res.status(500).json({
      error: 'Supabase ist nicht konfiguriert.',
      missing: [!url && 'SUPABASE_URL', !key && 'SUPABASE_SERVICE_ROLE_KEY'].filter(Boolean),
    });
  }

  const supabase = createClient(url, key);

  const totals = new Map();   // technology -> year -> MWh
  const dayCount = new Map(); // year -> Set<day>

  for (let page = 0; page < MAX_PAGES; page++) {
    const from = page * PAGE;

    const { data, error } = await supabase
      .from('generation_daily')
      .select('day, technology, energy_mwh')
      .in('technology', SERIES)
      .order('day')
      .range(from, from + PAGE - 1);

    if (error) {
      console.error('annual: select fehlgeschlagen', {
        code: error.code, message: error.message, details: error.details, page,
      });
      return res.status(500).json({ error: error.message, code: error.code });
    }

    for (const row of data) {
      const year = Number(row.day.slice(0, 4));

      let perYear = totals.get(row.technology);
      if (!perYear) {
        perYear = new Map();
        totals.set(row.technology, perYear);
      }
      perYear.set(year, (perYear.get(year) ?? 0) + (row.energy_mwh ?? 0));

      let days = dayCount.get(year);
      if (!days) {
        days = new Set();
        dayCount.set(year, days);
      }
      days.add(row.day);
    }

    if (data.length < PAGE) break;
  }

  const years = [...dayCount.keys()].sort((a, b) => a - b);

  const series = SERIES
    .filter(name => totals.has(name))
    .map(name => ({
      name,
      category: CATEGORY[name] ?? 'other',
      slot: CHART_SLOT[name] ?? null,
      // Terawattstunden: Jahreswerte in MWh sind sechsstellig und unlesbar
      twh: years.map(year => (totals.get(name).get(year) ?? 0) / 1e6),
    }))
    .sort((a, b) => (a.slot ?? 99) - (b.slot ?? 99));

  const partialYears = years.filter(year => dayCount.get(year).size < FULL_YEAR_DAYS);

  res.setHeader(
    'Cache-Control',
    `public, max-age=0, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=${CACHE_SECONDS}`
  );

  return res.status(200).json({ years, partialYears, series });
}
