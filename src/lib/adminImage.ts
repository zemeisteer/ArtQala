// Loads an admin-uploaded artwork image as base64 for Gemini.

// This only ever needs to fetch a URL the /api/upload endpoint itself
// handed back (Cloudinary, Vercel Blob, or a same-origin /uploads/ path) —
// never an arbitrary client-supplied URL. Restricting it to those hosts
// closes an SSRF hole: without this, an admin-gated endpoint would fetch
// and forward the bytes of *any* URL a caller provided, including internal
// network addresses.
const ALLOWED_IMAGE_HOSTS = [/\.cloudinary\.com$/, /\.public\.blob\.vercel-storage\.com$/];

function assertAllowedImageUrl(absoluteUrl: string, siteUrl: string) {
  const url = new URL(absoluteUrl);
  const site = new URL(siteUrl);
  if (url.origin === site.origin) return; // same-origin /uploads/* path
  if (ALLOWED_IMAGE_HOSTS.some((re) => re.test(url.hostname))) return;
  throw new Error('imageUrl must be a previously uploaded image (Cloudinary, Vercel Blob, or same-origin)');
}

export async function loadImageAsBase64(imageUrl: string): Promise<{ data: string; mimeType: string }> {
  if (imageUrl.startsWith('data:')) {
    const match = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) throw new Error('Invalid data URL');
    return { mimeType: match[1], data: match[2] };
  }

  const siteUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const absoluteUrl = imageUrl.startsWith('http')
    ? imageUrl
    : new URL(imageUrl, siteUrl).toString();

  assertAllowedImageUrl(absoluteUrl, siteUrl);

  const res = await fetch(absoluteUrl);
  if (!res.ok) throw new Error(`Failed to fetch source image (${res.status})`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const mimeType = res.headers.get('content-type') || 'image/jpeg';
  return { mimeType, data: buffer.toString('base64') };
}
