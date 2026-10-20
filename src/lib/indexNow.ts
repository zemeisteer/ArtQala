import crypto from 'crypto';
import { after } from 'next/server';
import { SITE_URL } from './siteUrl';
import { LANGS, localizePath } from './i18n/routing';

// IndexNow: tells Bing (whose index ChatGPT search and Copilot use), Yandex,
// Seznam, Naver… the moment a page changes, instead of waiting for their
// next crawl. The key is derived from NEXTAUTH_SECRET (or INDEXNOW_KEY) and
// published at /indexnow.txt, which proves the site is ours.

export function indexNowKey(): string {
  if (process.env.INDEXNOW_KEY) return process.env.INDEXNOW_KEY;
  return crypto
    .createHash('sha256')
    .update(`indexnow:${process.env.NEXTAUTH_SECRET || 'local'}`)
    .digest('hex')
    .slice(0, 32);
}

// Sends the given site paths (every language version of each, plus the
// listings and /llms-full.txt) after the response is sent. Production only.
export function notifyIndexNow(paths: string[]) {
  const url = new URL(SITE_URL);
  if (url.protocol !== 'https:' || /localhost|127\.0\.0\.1/.test(url.hostname)) return;
  const urlList = Array.from(
    new Set([
      ...[...paths, '/gallery'].flatMap((p) => LANGS.map((l) => `${SITE_URL}${localizePath(p, l)}`)),
      `${SITE_URL}/llms-full.txt`,
    ])
  );
  after(async () => {
    try {
      const res = await fetch('https://api.indexnow.org/indexnow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({
          host: url.hostname,
          key: indexNowKey(),
          keyLocation: `${SITE_URL}/indexnow.txt`,
          urlList,
        }),
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok && res.status !== 202) console.warn('IndexNow:', res.status, await res.text().catch(() => ''));
    } catch (error) {
      console.warn('IndexNow failed:', error);
    }
  });
}
