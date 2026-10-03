import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import { coordsFromMapsLink } from '@/lib/mapsCoords';
import { parseCoords } from '@/lib/settingsUtils';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let settings = await prisma.siteSettings.findUnique({
      where: { id: 'default' },
    });

    if (!settings) {
      settings = await prisma.siteSettings.create({
        data: {
          id: 'default',
          gallery_name: 'Art Qala',
          phone: '+998 66 233 44 55',
          email: '',
          address: 'Barakhon Madrasah, Tashkent, Uzbekistan',
          location_map: 'https://maps.app.goo.gl/FvSvu2kJ3Mqdwhzg8',
          working_hours: 'Mon - Sun: 09:00 - 19:00',
          telegram: 'https://t.me/artqala',
          instagram: 'https://instagram.com/artqala',
          about_en: 'Art Qala is a premier art gallery and studio located in the historic heart of Tashkent, Uzbekistan, celebrating Central Asian heritage.',
          about_ru: 'Art Qala — ведущая художественная галерея и студия в историческом центре Ташкента.',
          about_uz: "Art Qala — Toshkent shahrining tarixiy markazida joylashgan yetakchi san'at galereyasi va studiyasi.",
          rate_usd: 12850,
          rate_eur: 13900,
          rate_rub: 140,
          manual_rates: false,
        },
      });
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Settings fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const user = await getServerSession();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const body = await req.json();

    // Each address gets its map point from its Google Maps link, so the
    // admin doesn't have to look up coordinates (used in the JSON-LD geo).
    // Coordinates typed by hand are kept; a link that can't be read just
    // leaves the address without a point.
    let locations: unknown = body.locations;
    try {
      const list = typeof locations === 'string' ? JSON.parse(locations) : locations;
      if (Array.isArray(list)) {
        locations = JSON.stringify(
          await Promise.all(
            list.map(async (l) => {
              if (!l || typeof l !== 'object') return l;
              const rest = { ...(l as Record<string, unknown>) };
              delete rest.auto_coords;
              if (parseCoords(String(rest.coords || '')) || !rest.url) return rest;
              const auto = await coordsFromMapsLink(String(rest.url));
              return auto ? { ...rest, auto_coords: auto } : rest;
            })
          )
        );
      }
    } catch {
      // Keep whatever was sent
    }

    const updated = await prisma.siteSettings.upsert({
      where: { id: 'default' },
      update: {
        gallery_name: body.gallery_name,
        phone: typeof body.phone === 'string' ? body.phone : JSON.stringify(body.phone || []),
        email: body.email,
        address: body.address,
        location_map: body.location_map,
        locations: typeof locations === 'string' ? locations : JSON.stringify(locations || []),
        working_hours: typeof body.working_hours === 'string' ? body.working_hours : JSON.stringify(body.working_hours || ''),
        telegram: body.telegram,
        instagram: body.instagram,
        social_links: typeof body.social_links === 'string' ? body.social_links : JSON.stringify(body.social_links || []),
        about_en: body.about_en,
        about_ru: body.about_ru,
        about_uz: body.about_uz,
        rate_usd: parseFloat(body.rate_usd) || 12850,
        rate_eur: parseFloat(body.rate_eur) || 13900,
        rate_rub: parseFloat(body.rate_rub) || 140,
        manual_rates: Boolean(body.manual_rates),
      },
      create: {
        id: 'default',
        gallery_name: body.gallery_name || 'Art Qala',
        phone: body.phone || '+998 66 233 44 55',
        email: body.email || '',
        address: body.address || 'Barakhon Madrasah, Tashkent, Uzbekistan',
        location_map: body.location_map || 'https://maps.app.goo.gl/FvSvu2kJ3Mqdwhzg8',
        working_hours: body.working_hours || 'Mon - Sun: 09:00 - 19:00',
        telegram: body.telegram || 'https://t.me/artqala',
        instagram: body.instagram || 'https://instagram.com/artqala',
        social_links: typeof body.social_links === 'string' ? body.social_links : JSON.stringify(body.social_links || []),
        about_en: body.about_en || '',
        about_ru: body.about_ru || '',
        about_uz: body.about_uz || '',
        rate_usd: parseFloat(body.rate_usd) || 12850,
        rate_eur: parseFloat(body.rate_eur) || 13900,
        rate_rub: parseFloat(body.rate_rub) || 140,
        manual_rates: Boolean(body.manual_rates),
      },
    });

    return NextResponse.json({ settings: updated });
  } catch (error) {
    console.error('Settings update error:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
