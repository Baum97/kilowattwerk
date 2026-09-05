/**
 * Gemeinsames Wissen ueber die energy-charts-Reihen.
 * Genutzt von api/mix.mjs und api/timeline.mjs - beide muessen dieselbe
 * Vorstellung davon haben, was Erzeugung ist und wozu sie gehoert.
 */

/** Reihen, die keine Erzeugungsleistung sind (Last, Anteile, Speicherbezug) */
export const NOT_GENERATION = new Set([
  'Load',
  'Residual load',
  'Renewable share of generation',
  'Renewable share of load',
  'Cross border electricity trading',
  'Hydro pumped storage consumption',
]);

/** Kategorie je Technologie - steuert die Gruppierung im Donut */
export const CATEGORY = {
  'Solar': 'renewable',
  'Wind onshore': 'renewable',
  'Wind offshore': 'renewable',
  'Hydro Run-of-River': 'renewable',
  'Hydro water reservoir': 'renewable',
  'Biomass': 'renewable',
  'Geothermal': 'renewable',
  'Fossil gas': 'fossil',
  'Fossil hard coal': 'fossil',
  'Fossil brown coal / lignite': 'fossil',
  'Fossil oil': 'fossil',
  'Fossil coal-derived gas': 'fossil',
  'Nuclear': 'nuclear',
  'Hydro pumped storage': 'storage',
  'Waste': 'other',
  'Others': 'other',
};

/**
 * Feste Farbzuordnung fuer den Verlaufsgraphen: Technologie -> Slot 1..8 der
 * kategorialen Palette. Fest verdrahtet, damit eine Reihe beim Ab- und
 * Wiederauswaehlen nicht die Farbe wechselt.
 *
 * Nur diese acht sind einzeln darstellbar. Die uebrigen Reihen liegen um
 * Groessenordnungen darunter - Geothermie mit 13 MW gegen Wind mit 24.000 MW
 * waere auf gemeinsamer Achse duenner als ein Bildpunkt.
 */
export const CHART_SLOT = {
  'Solar': 1,
  'Wind onshore': 2,
  'Wind offshore': 3,
  'Fossil gas': 4,
  'Fossil brown coal / lignite': 5,
  'Fossil hard coal': 6,
  'Biomass': 7,
  'Hydro Run-of-River': 8,
};

export const CHARTABLE = Object.keys(CHART_SLOT);
