import { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/siteUrl';

// AI assistants' crawlers, welcomed by name: when someone asks ChatGPT,
// Claude, Gemini, Perplexity or Copilot for "a gallery selling paintings in
// Khiva/Tashkent", these are the bots that fetch the answer. (They obey the
// "*" rule anyway — naming them makes the welcome explicit and survives a
// future stricter "*" rule.) /llms.txt is the summary written for them.
const AI_CRAWLERS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-SearchBot',
  'Claude-User',
  'anthropic-ai',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Googlebot',
  'Bingbot',
  'Applebot',
  'Applebot-Extended',
  'DuckAssistBot',
  'meta-externalagent',
  'MistralAI-User',
  'YandexBot',
];

export default function robots(): MetadataRoute.Robots {
  const disallow = [
    '/admin/',
    '/api/admin/',
    // private pages, in every language (/ru/..., /uz/...)
    ...['', '/ru', '/uz'].flatMap((prefix) => [`${prefix}/account`, `${prefix}/verify-otp`]),
  ];

  return {
    rules: [
      { userAgent: '*', allow: '/', disallow },
      { userAgent: AI_CRAWLERS, allow: ['/', '/llms.txt', '/llms-full.txt'], disallow },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
