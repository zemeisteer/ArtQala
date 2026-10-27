// Masterclasses / tours (model Workshop), bookable on /experiences. A
// booking is a ServiceRequest with service_type WORKSHOP_SERVICE_TYPE.

export const WORKSHOP_SERVICE_TYPE = 'WORKSHOP';

export interface WorkshopInput {
  title_uz: string;
  title_en: string;
  title_ru: string;
  description_uz: string | null;
  description_en: string | null;
  description_ru: string | null;
  duration_minutes: number;
  price: number;
  max_people: number | null;
  location: string | null;
  image: string | null;
  is_active: boolean;
  sort: number;
}

const text = (v: unknown, max = 4000) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
};

// Admin form body → data, or an error message (Uzbek, shown in the admin).
export function parseWorkshopInput(body: Record<string, unknown>): { data: WorkshopInput } | { error: string } {
  const title_uz = text(body.title_uz, 200);
  const title_en = text(body.title_en, 200) || title_uz;
  const title_ru = text(body.title_ru, 200) || title_uz;
  if (!title_uz && !title_en) return { error: 'Nomini kiriting' };
  const price = num(body.price);
  if (!(price >= 0)) return { error: "Narxni to'g'ri kiriting" };
  const duration = Math.round(num(body.duration_minutes));
  const maxPeople = body.max_people === '' || body.max_people == null ? null : Math.round(num(body.max_people));
  return {
    data: {
      title_uz: title_uz || title_en,
      title_en,
      title_ru,
      description_uz: text(body.description_uz) || null,
      description_en: text(body.description_en) || null,
      description_ru: text(body.description_ru) || null,
      duration_minutes: duration > 0 ? duration : 120,
      price,
      max_people: maxPeople && maxPeople > 0 ? maxPeople : null,
      location: text(body.location, 300) || null,
      image: text(body.image, 1000) || null,
      is_active: body.is_active !== false,
      sort: Math.round(num(body.sort)) || 0,
    },
  };
}
