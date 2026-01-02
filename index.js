// Lightweight polyfill: Node < 20 വേർഷനുകളിൽ File undefined ആണെങ്കിൽ ഇത് സഹായിക്കും
if (typeof globalThis.File === 'undefined') {
  globalThis.File = class File extends Uint8Array {
    constructor(parts = [], name = '', options = {}) {
      let total = 0;
      const chunks = parts.map(p => {
        if (typeof p === 'string') {
          const enc = new TextEncoder().encode(p);
          total += enc.length;
          return enc;
        } else if (p instanceof ArrayBuffer) {
          const u = new Uint8Array(p);
          total += u.length;
          return u;
        } else if (p instanceof Uint8Array) {
          total += p.length;
          return p;
        } else {
          return new Uint8Array(0);
        }
      });
      const buffer = new Uint8Array(total);
      let offset = 0;
      for (const c of chunks) {
        buffer.set(c, offset);
        offset += c.length;
      }
      super(buffer);
      this.name = name;
      this.lastModified = options.lastModified || Date.now();
      this.size = total;
      this.type = options.type || '';
    }
    async text() { return new TextDecoder().decode(this); }
    slice(start, end, contentType) {
      const s = start || 0;
      const e = (typeof end === 'number') ? end : this.length;
      const sliced = this.subarray(s, e);
      return new File([sliced], this.name, { lastModified: this.lastModified, type: contentType || this.type });
    }
  };
}

const express = require('express');
const bodyParser = require('body-parser');
const { extractDirectLink } = require('./downloader'); // downloader.js ഇമ്പോർട്ട് ചെയ്യുന്നു

const app = express();
app.use(bodyParser.json());

// API വർക്ക് ചെയ്യുന്നുണ്ടോ എന്ന് നോക്കാൻ (GET)
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Terabox ലിങ്ക് കൺവേർട്ട് ചെയ്യാൻ (POST)
app.post('/convert', async (req, res) => {
  const { url } = req.body || {};
  
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: "Missing 'url' in request body" }); // URL ഇല്ലെങ്കിൽ
  }

  try {
    // downloader.js-ലെ ഫങ്ക്ഷൻ പ്രവർത്തിപ്പിക്കുന്നു
    const direct = await extractDirectLink(url);
    
    if (!direct) {
      return res.status(422).json({ error: 'Direct link not found or requires login' }); // ലിങ്ക് കിട്ടിയില്ലെങ്കിൽ
    }
    
    return res.json({ directUrl: direct }); // വിജയിച്ചാൽ ലിങ്ക് നൽകുന്നു
  } catch (err) {
    console.error('Extraction error:', err);
    return res.status(500).json({ error: 'Internal error', details: String(err) }); // മറ്റെന്തെങ്കിലും എറർ വന്നാൽ
  }
});

// പോർട്ട് സെറ്റിംഗ്സ് (Render 10000 ആണ് സാധാരണ ഉപയോഗിക്കുന്നത്)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
