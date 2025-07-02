require('dotenv').config();
const express = require('express');
const axios   = require('axios');
const cors    = require('cors');

const app = express();
app.use(cors());

const LFV_URL = process.env.LFV_URL;
const PORT    = process.env.PORT || 3000;

app.get('/api/einsaetze', async (req, res) => {
  try {
    const response = await axios.get(LFV_URL, {
      headers: {
        'Referer':    LFV_URL,
        'User-Agent': 'Mozilla/5.0'
      },
      responseType: 'stream'
    });
    res.setHeader('Content-Type', 'text/csv');
    response.data.pipe(res);
  } catch (err) {
    console.error('Fehler beim Abruf:', err.message);
    res.status(502).send('Fehler beim Abruf der Einsätze');
  }
});

app.listen(PORT, () => console.log(`Proxy läuft auf Port ${PORT}`));
