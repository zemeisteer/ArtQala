import { buildLlmsTxt, llmsResponse } from '@/lib/llmsTxt';

export const dynamic = 'force-dynamic';

// /llms.txt plus every work with its price, size and status.
export async function GET() {
  return llmsResponse(await buildLlmsTxt(true));
}
