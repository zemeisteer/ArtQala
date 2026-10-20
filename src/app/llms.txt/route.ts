import { buildLlmsTxt, llmsResponse } from '@/lib/llmsTxt';

// Built per request from the DB; the CDN keeps it for an hour (see llmsResponse).
export const dynamic = 'force-dynamic';

export async function GET() {
  return llmsResponse(await buildLlmsTxt(false));
}
