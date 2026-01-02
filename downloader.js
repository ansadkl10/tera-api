const puppeteer = require('puppeteer');

async function extractDirectLink(shareUrl) {
  let browser;
  try {
    // ബ്രൗസർ സ്റ്റാർട്ട് ചെയ്യുന്നു
    browser = await puppeteer.launch({
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    
    // Terabox പേജിലേക്ക് പോകുന്നു
    await page.goto(shareUrl, { waitUntil: 'networkidle2', timeout: 30000 });

    // പേജിലെ ഡൗൺലോഡ് ലിങ്കുകൾ തപ്പുന്നു
    const directUrl = await page.evaluate(() => {
      // സാധാരണയായി കാണുന്ന ഡൗൺലോഡ് ബട്ടണുകളുടെ ലിങ്ക് എടുക്കുന്നു
      const links = Array.from(document.querySelectorAll('a, iframe, video, source'));
      for (let item of links) {
        const url = item.href || item.src;
        if (url && (url.includes('d.pcs.baidu.com') || url.includes('terabox') || url.includes('download'))) {
          return url;
        }
      }
      return null;
    });

    return directUrl;
  } catch (e) {
    console.error("Puppeteer Error:", e);
    return null;
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = { extractDirectLink };
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
