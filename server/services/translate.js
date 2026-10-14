// MedPobeda — server-side text translation proxy.
// Primary: Google Translate public gtx endpoint (keyless). Fallback: MyMemory.
// Kept server-side so the browser never hits cross-origin API restrictions.

const GOOGLE_ENDPOINT = 'https://translate.googleapis.com/translate_a/single';
const MYMEMORY_ENDPOINT = 'https://api.mymemory.translated.net/get';
const MAX_TEXTS = 60;
const MAX_TEXT_LEN = 5000;

function decodeEntities(s) {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;|&#x27;/gi, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, '&');
}

async function googleTranslate(text, source, target) {
  const url = GOOGLE_ENDPOINT +
    '?client=gtx&sl=' + encodeURIComponent(source) +
    '&tl=' + encodeURIComponent(target) +
    '&dt=t&q=' + encodeURIComponent(text);
  const res = await fetch(url, { signal: AbortSignal.timeout(20000), headers: { 'User-Agent': 'Mozilla/5.0 (MedPobeda admin)' } });
  if (!res.ok) throw new Error('google ' + res.status);
  const data = await res.json();
  // data[0] is an array of segments; each segment [translated, original, ...].
  if (!Array.isArray(data) || !Array.isArray(data[0])) throw new Error('google bad shape');
  return decodeEntities(data[0].map((seg) => (Array.isArray(seg) ? seg[0] : '')).join(''));
}

async function myMemoryTranslate(text, source, target) {
  const url = MYMEMORY_ENDPOINT + '?q=' + encodeURIComponent(text) +
    '&langpair=' + encodeURIComponent(source + '|' + target);
  const res = await fetch(url, {signal: AbortSignal.timeout(20000)});
  if (!res.ok) throw new Error('mymemory ' + res.status);
  const data = await res.json();
  const t = data?.responseData?.translatedText;
  if (typeof t !== 'string' || !t) throw new Error('mymemory bad shape');
  // MyMemory sometimes echoes warnings; detect obvious failures.
  if (/MYMEMORY WARNING/i.test(t)) throw new Error('mymemory quota');
  return t;
}

export async function translateTexts(texts, source, target) {
  const list = (Array.isArray(texts) ? texts : []).slice(0, MAX_TEXTS);
  const results = [];
  for (const raw of list) {
    const text = String(raw ?? '');
    if (!text.trim() || text.length > MAX_TEXT_LEN) {
      results.push(text); // pass through empty/oversized unchanged
      continue;
    }
    try {
      results.push(await googleTranslate(text, source, target));
    } catch {
      try {
        results.push(await myMemoryTranslate(text, source, target));
      } catch {
        results.push(null); // signal failure for this text
      }
    }
  }
  return results;
}