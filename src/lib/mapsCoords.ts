// Finds the "latitude, longitude" of a place from its Google Maps link, so
// the admin only has to paste the link (Settings → addresses). Short links
// (maps.app.goo.gl/...) redirect to a long URL that carries the pin as
// "!3d<lat>!4d<lng>" (the place itself) or "@<lat>,<lng>" (the map centre).

const MAPS_HOSTS = [/^maps\.app\.goo\.gl$/, /^goo\.gl$/, /^(www\.|maps\.)?google\.[a-z.]+$/];

function isMapsUrl(raw: string): URL | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:') return null;
    return MAPS_HOSTS.some((re) => re.test(url.hostname)) ? url : null;
  } catch {
    return null;
  }
}

function coordsIn(text: string): string | null {
  const pin = text.match(/!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)/);
  if (pin) return `${pin[1]}, ${pin[2]}`;
  const centre = text.match(/@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/);
  if (centre) return `${centre[1]}, ${centre[2]}`;
  const query = text.match(/[?&](?:q|ll|query)=(-?\d{1,2}\.\d+)(?:,|%2C)(-?\d{1,3}\.\d+)/i);
  return query ? `${query[1]}, ${query[2]}` : null;
}

// Only ever requests Google Maps hosts (each redirect hop is re-checked), so
// an admin-supplied link can't be used to make the server fetch other sites.
export async function coordsFromMapsLink(link: string): Promise<string | null> {
  let url = isMapsUrl(link);
  for (let hop = 0; url && hop < 5; hop++) {
    const found = coordsIn(decodeURIComponent(url.href));
    if (found) return found;
    try {
      const res = await fetch(url, {
        method: 'GET',
        redirect: 'manual',
        headers: { 'user-agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(5000),
      });
      const next = res.headers.get('location');
      url = next ? isMapsUrl(new URL(next, url).href) : null;
    } catch {
      return null;
    }
  }
  return null;
}
