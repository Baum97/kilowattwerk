export default async function handler(req, res) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).end('Unauthorized');
  }

  const end = new Date();
  const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);

  const url = new URL('https://api.energy-charts.info/public_power');
  url.searchParams.set('country', 'de');
  url.searchParams.set('start', start.toISOString());
  url.searchParams.set('end', end.toISOString());

  const upstream = await fetch(url);
  if (!upstream.ok) {
    return res.status(502).json({ error: `energy-charts ${upstream.status}` });
  }

  const { unix_seconds, production_types } = await upstream.json();

  return res.status(200).json({
    points: unix_seconds.length,
    types: production_types.map(t => t.name),
  });
}
