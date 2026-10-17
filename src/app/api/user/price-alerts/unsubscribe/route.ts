import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isValidUnsubscribe } from '@/lib/priceAlerts';
import { SITE_URL } from '@/lib/siteUrl';

export const dynamic = 'force-dynamic';

async function unsubscribe(request: Request): Promise<boolean> {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('u') || '';
  const signature = searchParams.get('s') || '';
  if (!isValidUnsubscribe(userId, signature)) return false;
  await prisma.user.updateMany({ where: { id: userId }, data: { price_alerts: false } });
  return true;
}

const page = (ok: boolean) =>
  `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Art Qala</title></head>
<body style="margin:0;background:#FAF4EC;font-family:Georgia,serif;color:#281C18;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px">
<div style="max-width:440px;background:#FDFBF9;border:1px solid #E7E0D8;border-radius:4px;padding:32px;text-align:center">
<h1 style="color:#BA4E25;margin:0 0 12px;font-size:24px">Art Qala</h1>
<p style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;font-size:14px;line-height:1.6;color:#554740;margin:0 0 18px">${
    ok
      ? "You won't receive price alerts any more. You can turn them back on in your account, on the Saved Artworks tab."
      : 'This link is not valid. You can manage price alerts in your account.'
  }</p>
<a href="${SITE_URL}/account" style="color:#BA4E25;font-family:-apple-system,Segoe UI,Roboto,sans-serif;font-size:13px">My account &rarr;</a>
</div></body></html>`;

// The link in the email (opens in a browser).
export async function GET(request: Request) {
  const ok = await unsubscribe(request);
  return new NextResponse(page(ok), {
    status: ok ? 200 : 400,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

// One-click unsubscribe (List-Unsubscribe-Post) from the mail client.
export async function POST(request: Request) {
  const ok = await unsubscribe(request);
  return NextResponse.json({ success: ok }, { status: ok ? 200 : 400 });
}
