const axios = require('axios');
const cheerio = require('cheerio');

function isDirectFileLike(url) {
  return /^https?:\/\/.*\.(zip|rar|7z|tar|mp4|mkv|pdf|exe|iso|jpg|png)(\?.*)?$/i.test(url);
}

async function tryHead(url) {
  try {
    const head = await axios.head(url, { maxRedirects: 10, timeout: 10000, validateStatus: null });
    const ct = (head.headers['content-type'] || '').toLowerCase();
    const cd = (head.headers['content-disposition'] || '').toLowerCase();
    if (cd.includes('attachment') || /application\/octet-stream|application\/zip|video\/|audio\/|image\//.test(ct)) {
      return head.request && head.request.res && head.request.res.responseUrl ? head.request.res.responseUrl : url;
    }
    if (head.status >= 200 && head.status < 300 && !/text\/html/.test(ct)) {
      return head.request && head.request.res && head.request.res.responseUrl ? head.request.res.responseUrl : url;
    }
  } catch (e) {
    // ignore
  }
  return null;
}

/**
 * Try multiple heuristics without a headless browser:
 * 1) If URL already looks like direct file link -> return
 * 2) GET share page HTML -> parse <a> tags for hrefs, search scripts for long https links
 * 3) Try common JSON keys like downloadUrl in the HTML
 * 4) Validate candidates with HEAD requests (follow redirects)
 */
async function extractDirectLink(shareUrl, timeoutMs = 15000) {
  if (isDirectFileLike(shareUrl)) return shareUrl;

  // quick GET of share page
  let resp;
  try {
    resp = await axios.get(shareUrl, {
      maxRedirects: 5,
      timeout: timeoutMs,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; lightweight-extractor/1.0)' }
    });
  } catch (e) {
    // If the GET fails, give up early
    return null;
  }

  const html = resp.data;
  const $ = cheerio.load(html);

  const candidates = new Set();

  // 1) anchors with href
  $('a').each((i, el) => {
    const href = $(el).attr('href');
    if (href && href.startsWith('http')) candidates.add(href);
  });

  // 2) look for buttons/data-url attributes
  $('button').each((i, el) => {
    const dataUrl = $(el).attr('data-url') || $(el).attr('data-href');
    if (dataUrl && dataUrl.startsWith('http')) candidates.add(dataUrl);
  });

  // 3) search inline scripts for https links or JSON fields
  $('script').each((i, el) => {
    const script = $(el).html() || '';
    const re = /https?:\/\/[^\s"'<>]{30,}/g;
    const m = script.match(re);
    if (m) m.forEach(u => candidates.add(u));
    const jsonRe = /["']?(downloadUrl|download_url|file_url|url|src|download_link)["']?\s*[:=]\s*["'](https?:\/\/[^"']+)["']/ig;
    let jj;
    while ((jj = jsonRe.exec(script)) !== null) {
      candidates.add(jj[2]);
    }
  });

  // 4) global HTML scan for long https links
  const reAny = /https?:\/\/[^\s"'<>]{30,}/g;
  const allMatches = Array.from(new Set((html.match(reAny) || [])));
  allMatches.forEach(u => {
    if (/terabox|pan|file|download|storage|d.do|d.pcs|downloadlink/i.test(u)) candidates.add(u);
  });

  // Validate candidates with HEAD
  for (const c of candidates) {
    const validated = await tryHead(c);
    if (validated) return validated;
  }

  // As last resort: try following any redirects from GET response (resp.request.res.responseUrl)
  try {
    if (resp.request && resp.request.res && resp.request.res.responseUrl) {
      const final = resp.request.res.responseUrl;
      const validated = await tryHead(final);
      if (validated) return validated;
    }
  } catch (e) {}

  return null;
}

module.exports = { extractDirectLink };