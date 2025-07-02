// index.js

// Benötigte Pakete: axios, tough-cookie, axios-cookiejar-support, querystring
// Installation:
// npm install axios tough-cookie axios-cookiejar-support querystring

const axios         = require('axios');
const { CookieJar } = require('tough-cookie');
const { wrapper }   = require('axios-cookiejar-support');
const qs            = require('querystring');

// === Konfiguration ===
const WEBHOOK_URL     = 'https://discord.com/api/webhooks/1389898593862811709/ugPbqAqMqvOzJyGkkdPB1jKGcBOEx3OX2Zzd1NKTV8ZSpLc8i1FRvHLSSMEzyhCc2qUo';
const FETCH_INTERVAL  = 5 * 60 * 1000;   // alle 5 Minuten
const REQUEST_TIMEOUT = 15 * 1000;       // 15 Sekunden Timeout

// CookieJar und axios-Client mit Cookie-Unterstützung
const jar = new CookieJar();
const client = wrapper(axios.create({
  jar,
  timeout: REQUEST_TIMEOUT,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Accept': 'application/json'
  }
}));

// Parameter für Einsätze
const PARAMS = {
  Bereich: 'all',
  param:   'D937D5636F31DF4D0F9CD43281AE1DC9F79040E0'
};

// 1) Session initialisieren (Cookies holen)
async function initSession() {
  const urlHtml = 'https://einsatzuebersicht.lfv.steiermark.at/lfvasp/einsatzkarte/Liste_App_Public.html'
                + '?' + qs.stringify(PARAMS);
  console.log('[initSession] Lade HTML, um Session-Cookie zu setzen');
  try {
    await client.get(urlHtml);
    console.log('[initSession] Session initialisiert');
  } catch (err) {
    console.error('[initSession] Fehler beim HTML-Lade:', err.code || err.message);
  }
}

// 2) JSON-Endpoint abfragen
async function fetchEinsaetze() {
  const urlJson = 'https://einsatzuebersicht.lfv.steiermark.at/lfvasp/Einsatzkarte/Einsatzliste_App_PublicJSON'
                + '?' + qs.stringify(PARAMS);
  console.log('[fetchEinsaetze] Lade JSON von:', urlJson);
  try {
    const resp = await client.get(urlJson);
    console.log('[fetchEinsaetze] HTTP-Status:', resp.status, '| Einträge:', Array.isArray(resp.data) ? resp.data.length : 'n/a');
    if (!Array.isArray(resp.data)) {
      console.error('[fetchEinsaetze] Unerwartetes Format:', typeof resp.data);
      return [];
    }
    return resp.data.map(e => `**${e.Datum}** [${e.Art}] – ${e.Feuerwehr}`);
  } catch (err) {
    if (err.code === 'ECONNABORTED') {
      console.error('[fetchEinsaetze] Timeout nach', REQUEST_TIMEOUT, 'ms');
    } else {
      console.error('[fetchEinsaetze] Fehler beim JSON-Fetch:', err.code || err.message);
    }
    return [];
  }
}

// Nachricht an Discord-Webhook schicken
async function postToDiscord(content) {
  console.log('[postToDiscord] Sende Nachricht');
  if (!WEBHOOK_URL) {
    console.warn('[postToDiscord] Kein WEBHOOK_URL gesetzt');
    console.log(content);
    return;
  }
  try {
    const resp = await client.post(WEBHOOK_URL, { content });
    console.log('[postToDiscord] Nachricht gesendet, Status:', resp.status);
  } catch (err) {
    console.error('[postToDiscord] Fehler beim Posten:', err.code || err.message);
  }
}

// Hauptfunktion
async function run() {
  console.log('[run] Neuer Zyklus gestartet');
  await initSession();
  const einsaetze = await fetchEinsaetze();
  if (einsaetze.length === 0) {
    console.log('[run] Keine Einsätze zum Posten');
    return;
  }
  const message = `🚒 **Aktuelle Einsätze** 🚒\n\n${einsaetze.slice(0,5).join('\n')}`;
  await postToDiscord(message);
  console.log('[run] Zyklus abgeschlossen');
}

// Start & Intervall
console.log('[index.js] Starte, Intervall:', FETCH_INTERVAL / 1000, 'Sekunden');
run();
setInterval(run, FETCH_INTERVAL);
