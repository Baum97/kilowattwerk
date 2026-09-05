const REFRESH_SECONDS = 60;

export default async function handler(req, res) {
    
    const year = new Date().getFullYear();
    const country_code = 'de';

    const time_step = 'yearly';
    const url = new URL('https://api.energy-charts.info/installed_power');
    url.searchParams.set('country', country_code);
    url.searchParams.set('time_step', time_step);
    url.searchParams.set('installation_decommission', false);

    const upstream = await fetch(url);
    if (!upstream.ok) {
        return res.status(502).json({ error: `energy-charts ${upstream.status}` });
    }

    const { time, production_types } = await upstream.json();
    
    const maxPowerCapacity = {};
    for (const type of production_types) {
        // rueckwaerts bis zum letzten belegten Jahr - mit unterer Grenze,
        // sonst laeuft die Schleife bei einer leeren Reihe endlos
        let i = type.data.length - 1;
        while (i >= 0 && type.data[i] == null) {
            i -= 1;
        }
        if (i < 0) continue;

        maxPowerCapacity[type.name] = { year: time[i], gw: type.data[i] };
    }

    res.setHeader(
    'Cache-Control',
    `s-maxage=${REFRESH_SECONDS * 15}, stale-while-revalidate=${REFRESH_SECONDS}`
  );

  return res.status(200).json({
    maxPowerCapacity
  });
}