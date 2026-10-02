// The public site's canonical origin, used for everything search engines
// read: metadataBase, canonical/hreflang tags, sitemap, robots and JSON-LD.
// NEXT_PUBLIC_SITE_URL is the dedicated setting; NEXTAUTH_URL is kept as a
// fallback so existing deployments keep working until it's added.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXTAUTH_URL ||
  'https://artqala.com'
).replace(/\/+$/, '');
