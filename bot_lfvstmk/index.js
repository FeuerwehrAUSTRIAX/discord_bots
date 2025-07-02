// index.js

// Benötigte Pakete: axios, cheerio
// Für den Test-Webhook: Hier deine Discord-Webhook-URL eintragen (inkl. ID & Token)
const WEBHOOK_URL = 'https://discord.com/api/webhooks/1389898593862811709/ugPbqAqMqvOzJyGkkdPB1jKGcBOEx3OX2Zzd1NKTV8ZSpLc8i1FRvHLSSMEzyhCc2qUo';
const FETCH_INTERVAL = 5 * 60 * 1000; // alle 5 Minuten

const axios = require('axios');
const cheerio = require('cheerio');

// Ziel-URL und Parameter
const BASE_URL = 'https://einsatzuebersicht.lfv.steiermark.at/lfvasp/einsatzkarte/Liste_App_Public.html';
const PARAMS = {
  Bereich: 'all',
  param: 'D937D5636F31DF4D0F9CD43281AE1DC9F79040E0'
};

// Holt die Einsatz-Liste und gibt ein Array von Strings zurück
async function fetchEinsaetze() {
  try {
    const resp = await axios.get(BASE_URL, { params: PARAMS });
    const $ = cheerio.load(resp.data);
    const einsaetze = [];

    $('table tr').each((i, row) => {
      const cells = $(row).find('td');
      if (cells.length < 3) return;
      const zeit = $(cells[0]).text().trim();
      const stichwort = $(cells[1]).text().trim();
      const ort = $(cells[2]).text().trim();
      einsaetze.push(`**${zeit}** – ${stichwort} in ${ort}`);
    });

    return einsaetze;
  } catch (err) {
    console.error('Fehler beim Abrufen der Einsätze:', err);
    return [];
  }
}

// Sendet eine Nachricht an den Discord-Webhook
async function postToDiscord(content) {
  if (!WEBHOOK_URL) {
    console.warn('Kein gültiger Webhook-URL konfiguriert. Nachricht in die Konsole:');
    console.log(content);
    return;
  }
  try {
    await axios.post(WEBHOOK_URL, { content });
    console.log('Nachricht erfolgreich gesendet.');
  } catch (err) {
    console.error('Fehler beim Senden an Discord:', err);
  }
}

// Hauptfunktion: holt Einsätze und postet die Top 5
async function run() {
  const einsaetze = await fetchEinsaetze();
  if (einsaetze.length === 0) {
    console.log('Keine Einsätze gefunden.');
    return;
  }
  const top5 = einsaetze.slice(0, 5).join('\n');
  const message = `🚒 **Aktuelle Einsätze** 🚒\n\n${top5}`;
  await postToDiscord(message);
}

// Sofortiger Start und Intervall setzen
run();
setInterval(run, FETCH_INTERVAL);
