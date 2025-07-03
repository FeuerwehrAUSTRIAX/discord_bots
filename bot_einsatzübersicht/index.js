const { Client, GatewayIntentBits } = require('discord.js');
const fetch = require('node-fetch');
const { DateTime } = require('luxon');
require('dotenv').config();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const CHANNEL_ID = process.env.CHANNEL_ID;
const CSV_URL = process.env.CSV_URL;
const TIMEZONE = 'Europe/Vienna';

client.once('ready', async () => {
  console.log(`✅ Bot eingeloggt als ${client.user.tag}`);
  await sendeStatistik();
  starteWochenplaner();
});

async function sendeStatistik() {
  try {
    const response = await fetch(CSV_URL);
    const csv = await response.text();

    const rows = csv.split('\n').slice(1); // skip header
    const einsaetze = rows.map(r => r.split(',')).filter(r => r.length > 2);

    const jetzt = DateTime.now().setZone(TIMEZONE);
    const letzterMontag = jetzt.minus({ weeks: 1 }).startOf('week');
    const letzterSonntag = letzterMontag.plus({ days: 6 });

    const gefiltert = einsaetze.filter(row => {
      const datum = DateTime.fromFormat(row[1], 'd.M.yyyy', { zone: TIMEZONE });
      return datum >= letzterMontag && datum <= letzterSonntag;
    });

    const statistikText = `📊 **Einsatzstatistik (${letzterMontag.toFormat('dd.MM.yyyy')} – ${letzterSonntag.toFormat('dd.MM.yyyy')})**\n\n` +
      `📈 **Gesamteinsätze:** ${gefiltert.length}\n` +
      (gefiltert.length === 0 ? '_Keine Einsätze in diesem Zeitraum._' : '\n🚨 **Einsatzübersicht:**\n' +
        gefiltert.map((r, i) => {
          const datum = DateTime.fromFormat(r[1], 'd.M.yyyy', { zone: TIMEZONE }).toFormat('dd.MM.');
          return `${i + 1}. ${datum} – ${r[10]} – ${r[7]} ${r[8]}`;
        }).join('\n'));

    const channel = await client.channels.fetch(CHANNEL_ID);
    await channel.send(statistikText);
  } catch (err) {
    console.error('Fehler beim Senden der Statistik:', err);
  }
}

function starteWochenplaner() {
  const jetzt = DateTime.now().setZone(TIMEZONE);
  const naechsterMontag = jetzt.plus({ days: (8 - jetzt.weekday) % 7 }).set({ hour: 8, minute: 0, second: 0 });
  const delay = naechsterMontag.diff(jetzt).as('milliseconds');

  setTimeout(() => {
    sendeStatistik();
    setInterval(sendeStatistik, 7 * 24 * 60 * 60 * 1000); // alle 7 Tage
  }, delay);
}

client.login(process.env.BOT_TOKEN);
