// Lightweight polyfill: define global File for environments (Node < 20) where File is undefined.
// This prevents `ReferenceError: File is not defined` when some packages (e.g., undici) expect File.
if (typeof globalThis.File === 'undefined') {
  globalThis.File = class File extends Uint8Array {
    constructor(parts = [], name = '', options = {}) {
      // combine parts into one Uint8Array
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
    // minimal slice implementation (optional)
    slice(start, end, contentType) {
      const s = start || 0;
      const e = (typeof end === 'number') ? end : this.length;
      const sliced = this.subarray(s, e);
      const f = new File([sliced], this.name, { lastModified: this.lastModified, type: contentType || this.type });
      return f;
    }
  };
}

// --- original imports and app start below ---
const express = require('express');
const bodyParser = require('body-parser');
const { extractDirectLink } = require('./downloader');

const app = express();
app.use(bodyParser.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.post('/convert', async (req, res) => {
  const { url } = req.body || {};
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: "Missing 'url' in request body" });
  }

  try {
    const direct = await extractDirectLink(url);
    if (!direct) {
      return res.status(422).json({ error: 'Direct link not found without JS/browser or requires login' });
    }
    return res.json({ directUrl: direct });
  } catch (err) {
    console.error('Extraction error:', err);
    return res.status(500).json({ error: 'Internal error', details: String(err) });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
