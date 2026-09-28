import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { requireAdmin } from '@/lib/auth';
import { checkRateLimit, recordFailedAttempt } from '@/lib/rateLimit';
import { loadImageAsBase64 } from '@/lib/adminImage';

export const dynamic = 'force-dynamic';

const DEFAULT_PROMPT =
  "Place this exact artwork into a tastefully lit, elegant art-gallery or upscale interior setting suited to a fine-art website. " +
  'Do NOT alter, redraw, crop, or recolor the artwork itself in any way — keep the painting, its frame, colors, and composition completely unchanged. ' +
  'Only add a realistic, high-quality staged background/environment around and behind it, with natural shadows and lighting that make the piece look showcased.';

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.errorResponse) return auth.errorResponse;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { success: false, error: 'GEMINI_API_KEY is not configured on the server.' },
      { status: 500 }
    );
  }

  // AI generation costs money per call — throttle per-admin regardless of IP.
  const rateLimitKey = `ai-bg:${auth.user.id}`;
  const rateCheck = await checkRateLimit(rateLimitKey, 20, 15 * 60 * 1000);
  if (!rateCheck.allowed) {
    const minutesLeft = Math.ceil(rateCheck.retryAfterSeconds / 60);
    return NextResponse.json(
      { success: false, error: `Juda ko'p so'rov. ${minutesLeft} daqiqadan so'ng qayta urinib ko'ring.` },
      { status: 429 }
    );
  }
  await recordFailedAttempt(rateLimitKey);

  try {
    const body = await request.json();
    const { imageUrl, prompt } = body as { imageUrl?: string; prompt?: string };

    if (!imageUrl) {
      return NextResponse.json({ success: false, error: 'imageUrl is required' }, { status: 400 });
    }

    const { data: base64Data, mimeType } = await loadImageAsBase64(imageUrl);

    const ai = new GoogleGenAI({ apiKey });
    const model = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';

    const response = await ai.models.generateContent({
      model,
      contents: [
        {
          role: 'user',
          parts: [
            { text: (prompt?.trim() ? `${DEFAULT_PROMPT}\n\nAdditional style guidance from the gallery curator: ${prompt.trim()}` : DEFAULT_PROMPT) },
            { inlineData: { mimeType, data: base64Data } },
          ],
        },
      ],
    });

    const parts = response.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((p) => p.inlineData?.data);

    if (!imagePart?.inlineData?.data) {
      const textPart = parts.find((p) => p.text)?.text;
      return NextResponse.json(
        {
          success: false,
          error: textPart || 'AI model did not return an image. Try a different prompt.',
        },
        { status: 502 }
      );
    }

    const outMimeType = imagePart.inlineData.mimeType || 'image/png';
    const dataUrl = `data:${outMimeType};base64,${imagePart.inlineData.data}`;

    return NextResponse.json({ success: true, imageDataUrl: dataUrl });
  } catch (error) {
    console.error('AI background generation error:', error);
    const message = error instanceof Error ? error.message : 'AI generation failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
