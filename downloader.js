const axios = require('axios');
const cheerio = require('cheerio');

[span_1](start_span)// ലളിതമായ രീതിയിൽ ലിങ്ക് ഡയറക്ട് ആണോ എന്ന് നോക്കുന്നു[span_1](end_span)
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
  } catch (e) { /* ignore */ }
  return null;
}

[span_2](start_span)// പ്രധാനപ്പെട്ട ഫങ്ക്ഷൻ[span_2](end_span)
async function extractDirectLink(shareUrl, timeoutMs = 15000) {
  if (isDirectFileLike(shareUrl)) return shareUrl;

  let resp;
  try {
    [span_3](start_span)// ഇവിടെ 'async' ഫങ്ക്ഷനുള്ളിൽ ആയതിനാൽ 'await' ഉപയോഗിക്കാം[span_3](end_span)
    resp = await axios.get(shareUrl, {
      maxRedirects: 5,
      timeout: timeoutMs,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
  } catch (e) {
    return null;
  }

  const html = resp.data;
  const $ = cheerio.load(html);
  const candidates = new Set();

  [span_4](start_span)// സ്‌ക്രിപ്റ്റുകളിൽ നിന്നും മറ്റും ലിങ്കുകൾ തപ്പുന്നു[span_4](end_span)
  $('script').each((i, el) => {
    const script = $(el).html() || '';
    const jsonRe = /["']?(downloadUrl|file_url|url)["']?\s*[:=]\s*["'](https?:\/\/[^"']+)["']/ig;
    let jj;
    while ((jj = jsonRe.exec(script)) !== null) {
      candidates.add(jj[2]);
    }
  });

  [span_5](start_span)// ലിങ്കുകൾ പരിശോധിച്ച് ഉറപ്പുവരുത്തുന്നു[span_5](end_span)
  for (const c of candidates) {
    const validated = await tryHead(c);
    if (validated) return validated;
  }

  return null;
}

module.exports = { extractDirectLink };
