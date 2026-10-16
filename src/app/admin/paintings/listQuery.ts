// The Paintings list keeps its page, search and filters in the URL
// (?page=4&q=…&category=…&artist=…), and the edit/new pages get that URL as
// ?back=…, so saving or cancelling returns to the same page of the list
// instead of page 1.

export interface PaintingsListQuery {
  page: number;
  q: string;
  category: string;
  artist: string;
}

type RawParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || '';

export function parseListQuery(params: RawParams): PaintingsListQuery {
  const page = parseInt(first(params.page), 10);
  return {
    page: Number.isFinite(page) && page > 0 ? page : 1,
    q: first(params.q),
    category: first(params.category) || 'ALL',
    artist: first(params.artist) || 'ALL',
  };
}

export function listUrl(query: PaintingsListQuery): string {
  const sp = new URLSearchParams();
  if (query.page > 1) sp.set('page', String(query.page));
  if (query.q.trim()) sp.set('q', query.q);
  if (query.category !== 'ALL') sp.set('category', query.category);
  if (query.artist !== 'ALL') sp.set('artist', query.artist);
  const s = sp.toString();
  return s ? `/admin/paintings?${s}` : '/admin/paintings';
}

// Only ever return to the Paintings list itself (never an outside URL).
export function safeBackHref(back: string | string[] | undefined): string {
  const value = first(back);
  return /^\/admin\/paintings(\?[^#]*)?$/.test(value) && !value.includes('//') ? value : '/admin/paintings';
}
