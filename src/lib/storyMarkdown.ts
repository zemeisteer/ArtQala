// Light Markdown for stories (Admin → Hikoyalar), rendered to safe HTML:
// "## Heading", "### Subheading", "- list item", blank-line paragraphs,
// **bold**, *italic*, [link](url) and ![image](url) on its own line.
// Everything is HTML-escaped first; only http(s) and site-relative URLs
// are allowed, so a story can never inject markup or scripts.

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const safeUrl = (u: string) => (/^(https?:\/\/|\/)[^\s"'<>]*$/i.test(u) ? u : null);

function inline(text: string): string {
  return esc(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*(?!\s)(.+?)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, label: string, url: string) => {
      const u = safeUrl(url.replace(/&amp;/g, '&'));
      if (!u) return label;
      const external = /^https?:\/\//i.test(u);
      return `<a href="${esc(u)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${label}</a>`;
    });
}

export function storyHtml(md: string): string {
  const out: string[] = [];
  const blocks = md.replace(/\r\n/g, '\n').split(/\n{2,}/);
  for (const raw of blocks) {
    const block = raw.trim();
    if (!block) continue;
    const img = block.match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/);
    if (img) {
      const u = safeUrl(img[2]);
      if (u) out.push(`<figure><img src="${esc(u)}" alt="${esc(img[1])}" loading="lazy" />${img[1] ? `<figcaption>${esc(img[1])}</figcaption>` : ''}</figure>`);
      continue;
    }
    if (block.startsWith('### ')) {
      out.push(`<h3>${inline(block.slice(4))}</h3>`);
      continue;
    }
    if (block.startsWith('## ')) {
      out.push(`<h2>${inline(block.slice(3))}</h2>`);
      continue;
    }
    const lines = block.split('\n');
    if (lines.every((l) => /^\s*[-•]\s+/.test(l))) {
      out.push(`<ul>${lines.map((l) => `<li>${inline(l.replace(/^\s*[-•]\s+/, ''))}</li>`).join('')}</ul>`);
      continue;
    }
    out.push(`<p>${lines.map(inline).join('<br />')}</p>`);
  }
  return out.join('\n');
}

// Plain text (for excerpts, meta descriptions, reading time).
export function storyText(md: string): string {
  return md
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[#*_>-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[ʻʼ'‘’`]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'story'
  );
}
