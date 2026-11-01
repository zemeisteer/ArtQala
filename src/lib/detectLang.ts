// Which of the admin's languages (uz / en / ru) a text is written in — for
// forms where the admin may type in any of them and the rest is translated
// (Admin → Hikoyalar). Cyrillic → Russian; otherwise Uzbek vs English by
// telltale words and spellings. Pure, runs in the browser.

export type AdminLang = 'uz' | 'en' | 'ru';

const UZ_WORDS = new Set(
  'va bilan uchun bu ham emas edi kabi yoki lekin uning ular biz siz men sen bir ikki uch har bo\'lib qilib bo\'ladi bo\'lgan haqida yil yili kun qanday nima nega qayerda shu ana mana juda eng yana hamda ammo chunki agar esa dan ga da ni ning'.split(
    ' '
  )
);
const EN_WORDS = new Set(
  'the and of to is in with for this that are was be by on as at from it an or his her their its have has had not but which who what when where how about into more than also our your we you they these those'.split(
    ' '
  )
);

export function detectLang(text: string): AdminLang | null {
  const t = text.toLowerCase();
  const letters = t.match(/\p{L}/gu) || [];
  if (letters.length < 3) return null;
  const cyr = letters.filter((c) => /[Ѐ-ӿ]/.test(c)).length;
  if (cyr / letters.length > 0.3) return 'ru';
  const words = t.match(/[\p{L}'ʻʼ‘’]+/gu) || [];
  let uz = 0;
  let en = 0;
  for (const w0 of words) {
    const w = w0.replace(/[ʻʼ‘’]/g, "'");
    if (UZ_WORDS.has(w)) uz += 1;
    if (EN_WORDS.has(w)) en += 1;
    if (/[og]'/.test(w)) uz += 2; // o', g' — only Uzbek writes these
    if (/(lar|lari|larni|ning|dagi|chi|siz|miz)$/.test(w) && w.length > 4) uz += 0.5;
    if (/(tion|ing|ness|ment|ly)$/.test(w) && w.length > 4) en += 0.5;
  }
  if (uz === en) return uz === 0 ? null : 'uz';
  return uz > en ? 'uz' : 'en';
}
