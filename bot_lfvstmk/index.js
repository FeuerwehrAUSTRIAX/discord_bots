// index.js

// Benötigte Pakete: axios, cheerio, querystring
const axios     = require('axios');
const cheerio   = require('cheerio');
const qs        = require('querystring');

// === Konfiguration ===
const WEBHOOK_URL     = 'https://discord.com/api/webhooks/1389898593862811709/ugPbqAqMqvOzJyGkkdPB1jKGcBOEx3OX2Zzd1NKTV8ZSpLc8i1FRvHLSSMEzyhCc2qUo';
const FETCH_INTERVAL  = 5 * 60 * 1000;    // 5 Minuten
const REQUEST_TIMEOUT = 15 * 1000;        // 15 Sekunden

// Axios-Instanz mit Timeout + Browser-User-Agent
const http = axios.create({
  timeout: REQUEST_TIMEOUT,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Accept': 'text/html,application/xhtml+xml'
  }
});

// Ziel-URL + Parameter
const BASE_URL = 'https://einsatzuebersicht.lfv.steiermark.at/lfvasp/einsatzkarte/Liste_App_Public.html';
const PARAMS   = {
  Bereich: 'all',
  param:   'D937D5636F31DF4D0F9CD43281AE1DC9F79040E0'
};

// === Daten abrufen & parsen ===
async function fetchEinsaetze() {
  const url = `${BASE_URL}?${qs.stringify(PARAMS)}`;
  console.log('[fetchEinsaetze] Start:', url);

  try {
    const resp = await http.get(url);
    console.log('[fetchEinsaetze] HTTP-Status:', resp.status);
    console.log('[fetchEinsaetze] Body-Length:', resp.data.length);

    const $ = cheerio.load(resp.data);
    const einsaetze = [];

    // gezielt auf die gerenderte Tabelle im div#datagrid zugreifen
    $('#datagrid table tbody tr').each((_, row) => {
      const cells = $(row).find('td');
      if (cells.length < 3) return;
      const art   = $(cells[0]).text().trim();
      const datum = $(cells[1]).text().trim();
      const fw    = $(cells[2]).text().trim();
      einsaetze.push(`**${datum}** [${art}] – ${fw}`);
    });

    console.log(`[fetchEinsaetze] Gefundene Einträge: ${einsaetze.length}`);
    if (einsaetze.length === 0) {
      console.warn('[fetchEinsaetze] Keine Einträge – HTML-Preview:', resp.data.slice(0, 200));
    }
    return einsaetze;

  } catch (err) {
    if (err.code === 'ECONNABORTED') {
      console.error('[fetchEinsaetze] Timeout nach', REQUEST_TIMEOUT, 'ms');
    } else {
      console.error('[fetchEinsaetze] Fehler:', err.code || err.message);
    }
    return [];
  }
}

// === Discord-Webhook posten ===
async function postToDiscord(content) {
  console.log('[postToDiscord] Sende an Webhook');
  if (!WEBHOOK_URL) {
    console.warn('[postToDiscord] Kein Webhook-URL – gebe lokal aus:');
    return console.log(content);
  }

  try {
    console.log('[postToDiscord] Payload Preview:', content.replace(/\n/g, ' | '));
    const resp = await http.post(WEBHOOK_URL, { content });
    console.log('[postToDiscord] Gesendet, HTTP-Status:', resp.status);
  } catch (err) {
    console.error('[postToDiscord] Fehler beim Posten:', err.code || err.message);
  }
}

// === Hauptloop ===
async function run() {
  console.log('[run] Neuer Zyklus gestartet');
  const einsaetze = await fetchEinsaetze();

  if (einsaetze.length === 0) {
    console.log('[run] Keine Einsätze – überspringe posten');
    return;
  }

  const top5    = einsaetze.slice(0, 5).join('\n');
  const message = `🚒 **Aktuelle Einsätze** 🚒\n\n${top5}`;
  console.log('[run] Bereite Nachricht vor');
  await postToDiscord(message);
  console.log('[run] Zyklus abgeschlossen');
}

// === Skriptstart & Intervall ===
console.log('[index.js] Starte, Laufzeit-Intervall:', FETCH_INTERVAL / 1000, 'Sekunden');
run();
setInterval(run, FETCH_INTERVAL);
