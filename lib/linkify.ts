export interface KeywordLink { keyword: string; url: string; }

const MD_LINK_RE = /\[[^\]]*\]\([^)]*\)/g;
const WORDY_RE = /^[\w\s]+$/;

function isWordChar(c: string): boolean {
  return /\w/.test(c);
}

// Scans left to right so a keyword already turned into a link is never re-matched
// by a shorter keyword contained within it (e.g. "Privacy Policy" and "Privacy").
function linkifySegment(segment: string, links: KeywordLink[], used: Set<string>): string {
  let out = '';
  let i = 0;

  while (i < segment.length) {
    let matched = false;

    for (const { keyword, url } of links) {
      const key = keyword.toLowerCase();
      if (used.has(key)) continue;

      const len = keyword.length;
      if (!len || i + len > segment.length) continue;
      if (segment.slice(i, i + len).toLowerCase() !== key) continue;

      if (WORDY_RE.test(keyword)) {
        const before = i > 0 ? segment[i - 1] : '';
        const after = i + len < segment.length ? segment[i + len] : '';
        if ((before && isWordChar(before)) || (after && isWordChar(after))) continue;
      }

      out += `[${segment.slice(i, i + len)}](${url})`;
      used.add(key);
      i += len;
      matched = true;
      break;
    }

    if (!matched) {
      out += segment[i];
      i += 1;
    }
  }

  return out;
}

// Replaces the first occurrence of each keyword in `text` with a markdown link to
// its URL. Longer keywords are matched before shorter ones so overlapping entries
// (e.g. "Privacy Policy" and "Privacy") don't collide, and existing markdown links
// in the text are left untouched.
export function linkifyKeywords(text: string, links: KeywordLink[] | undefined): string {
  if (!text || !links?.length) return text;

  const sorted = links
    .filter(l => l.keyword?.trim() && l.url?.trim())
    .sort((a, b) => b.keyword.length - a.keyword.length);
  if (!sorted.length) return text;

  const used = new Set<string>();
  let result = '';
  let lastIndex = 0;

  for (const m of text.matchAll(MD_LINK_RE)) {
    if (m.index! > lastIndex) result += linkifySegment(text.slice(lastIndex, m.index), sorted, used);
    result += m[0];
    lastIndex = m.index! + m[0].length;
  }
  if (lastIndex < text.length) result += linkifySegment(text.slice(lastIndex), sorted, used);

  return result;
}
