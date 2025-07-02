// index.js

// Benötigte Pakete: axios, tough-cookie, axios-cookiejar-support, querystring
// npm install axios tough-cookie axios-cookiejar-support querystring

const axios         = require('axios');
const { CookieJar } = require('tough-cookie');
const { wrapper }   = require('axios-cookiejar-support');
const qs            = require('querystring');

// === Konfiguration ===
const WEBHOOK_URL     = 'https://discord.com/api/webhooks/1389898593862811709/ugPbqAqMqvOzJyGkkdPB1jKGcBOEx3OX2Zzd1NKTV8ZSpLc8i1FRvHLSSMEzyhCc2qUo';
const FETCH_INTERVAL  = 5 * 60 * 1000;   // 5 Minuten
const REQUEST_TIMEOUT = 15 * 1000;       // 15 Sekunden

// Axios-Client mit Cookie-Jar und Timeout
const jar = new CookieJar();
const client = wrapper(axios.create({
  jar,
  timeout: REQUEST_TIMEOUT,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Accept': 'application/json'
  }
}));

// Parameter wie in der App
const PARAMS = {
  Bereich: 'all',
  param:   'D937D5636F31DF4D0F9CD43281AE1DC9F79040E0'
};

// 1) HTML aufrufen, um die Session-Cookies (JSESSIONID) zu setzen
async function initSession() {
  const urlHtml = 'https://einsatzuebersicht.lfv.steiermark.at/lfvasp/einsatzkarte/Liste_App_Public.html'
                + '?' + qs.stringify(PARAMS);
  console.log('[initSession] Hole HTML für Session-Cookie');
  await client.get(urlHtml);
}

// 2) JSON-Endpoint abfragen
async function fetchEinsaetze() {
  const urlJson = 'https://einsatzuebersicht.lfv.steiermark.at/lfvasp/Einsatzkarte/Einsatzliste_App_PublicJSON'
                + '?' + qs.stringify(PARAMS);

  console.log('[fetchEinsaetze] Lade JSON von:', urlJson);
  try {
    const resp = await client.get(urlJson);
    console.log('[fetchEinsaetze] HTTP-Status:', resp.status, '| Einträge:', resp.data.length);
    return resp.data.map(e => `**${e.Datum}** [${e.Art}] – ${e.Feuerwehr}`);
  } catch (err) {
    if (err.code === 'ECONNABORTED') {
      console.error('[fetchEinsaetze] Timeout nach', REQUEST_TIMEOUT, 'ms');
    } else {
      console.error('[fetchEinsaetze] Fehler:', err.code || err.message);
    }
    return [];
  }
}

// Sendet Nachricht an Discord-Webhook
async function postToDiscord(content) {
  console.log('[postToDiscord] Sende Nachricht');
  if (!WEBHOOK_URL) return console.warn('[postToDiscord] Kein WEBHOOK_URL gesetzt');
  try {
    await client.post(WEBHOOK_URL, { content });
    console.log('[postToDiscord] Erfolgreich gesendet');
  } catch (err) {
    console.error('[postToDiscord] Fehler beim Post:', err.code || err.message);
  }
}

// Hauptloop
async function run() {
  console.log('[run] Starte Zyklus');
  await initSession();
  const einsaetze = await fetchEinsaetze();
  if (!einsaetze.length) {
    console.log('[run] Keine Einsätze zum Posten');
    return;
  }
  const message = `🚒 **Aktuelle Einsätze** 🚒\n\n${einsaetze.slice(0,5).join('\n')}`;
  await postToDiscord(message);
  console.log('[run] Zyklus abgeschlossen');
}

// Startup & Interval
console.log('[index.js] Starte, Intervall:', FETCH_INTERVAL/1000, 'Sekunden');
run();
setInterval(run, FETCH_INTERVAL);
