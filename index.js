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