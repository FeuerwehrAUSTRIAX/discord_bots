// index.js

// Benötigte Pakete: axios, querystring
const axios   = require('axios');
const qs      = require('querystring');

// === Konfiguration ===
const WEBHOOK_URL     = 'https://discord.com/api/webhooks/1389898593862811709/ugPbqAqMqvOzJyGkkdPB1jKGcBOEx3OX2Zzd1NKTV8ZSpLc8i1FRvHLSSMEzyhCc2qUo';
const FETCH_INTERVAL  = 5 * 60 * 1000;    // 5 Minuten
const REQUEST_TIMEOUT = 15 * 1000;        // 15 Sekunden

// Axios-Instanz mit Timeout + Browser-UA
const http = axios.create({
  timeout: REQUEST_TIMEOUT,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Accept': 'application/json'
  }
});

// Parameter (wie in der App)
const PARAMS = {
  Bereich: 'all',
  param:   'D937D5636F31DF4D0F9CD43281AE1DC9F79040E0'
};

// === Variante A: JSON-Endpoint ===
async function fetchEinsaetzeJSON() {
  const url = 'https://einsatzuebersicht.lfv.steiermark.at/lfvasp/Einsatzkarte/Einsatzliste_App_PublicJSON'
            + '?' + qs.stringify(PARAMS);
  console.log('[fetchJSON] Lade Daten von:', url);

  try {
    const resp = await http.get(url);
    console.log('[fetchJSON] HTTP-Status:', resp.status, '| Einträge im Array:', resp.data.length);

    // resp.data ist ein Array von Objekten mit Feldern z.B. Art, Datum, Feuerwehr
    return resp.data.map(e => {
      return `**${e.Datum}** [${e.Art}] – ${e.Feuerwehr}`;
    });
  } catch (err) {
    if (err.code === 'ECONNABORTED') {
      console.error('[fetchJSON] Timeout nach', REQUEST_TIMEOUT, 'ms');
    } else {
      console.error('[fetchJSON] Fehler:', err.code || err.message);
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
    console.error('[postToDiscord] Fehler:', err.code || err.message);
  }
}

// === Hauptloop ===
async function run() {
  console.log('[run] Neuer Zyklus gestartet');

  // hier nutzen wir das JSON-Fetch
  const einsaetze = await fetchEinsaetzeJSON();

  if (einsaetze.length === 0) {
    console.log('[run] Keine Einsätze zum Posten');
    return;
  }

  const top5    = einsaetze.slice(0, 5).join('\n');
  const message = `🚒 **Aktuelle Einsätze** 🚒\n\n${top5}`;
  console.log('[run] Bereite Nachricht vor');
  await postToDiscord(message);
  console.log('[run] Zyklus abgeschlossen');
}

// === Skriptstart & Intervall ===
console.log('[index.js] Starte, Laufzeit-Intervall:', FETCH_INTERVAL/1000, 'Sekunden');
run();
setInterval(run, FETCH_INTERVAL);
