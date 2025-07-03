import { Client, GatewayIntentBits } from 'discord.js';
import fetch from 'node-fetch';
import { DateTime } from 'luxon';
import dotenv from 'dotenv';
dotenv.config();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const CHANNEL_ID = process.env.CHANNEL_ID;
const BOT_TOKEN = process.env.BOT_TOKEN;
const TIMEZONE = 'Europe/Vienna';

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQJhQbJMxG8s7oSw__c97Z55koBtE2Dlgc0OYR8idpZtdTq3o9g7LbmyEve3KPNkV5yaRZGIHVjJPkk/pub?gid=1016482411&single=true&output=csv";

client.once('ready', async () => {
  console.log(`✅ Bot eingeloggt als ${client.user.tag}`);
  await sendeStatistik();
  starteWochenplaner();
});

async function sendeStatistik() {
  try {
    const response = await fetch(CSV_URL);
    const csv = await response.text();

    const rows = csv.split('\n').slice(1); // Header entfernen
    const einsaetze = rows.map(r => r.split(',')).filter(r => r.length > 2);

    const jetzt = DateTime.now().setZone(TIMEZONE);
    const letzterMontag = jetzt.minus({ weeks: 1 }).startOf('week');
    const letzterSonntag = letzterMontag.plus({ days: 6 });

    const gefiltert = einsaetze.filter(row => {
      const datum = DateTime.fromFormat(row[1], 'd.M.yyyy', { zone: TIMEZONE });
      return datum.isValid && datum >= letzterMontag && datum <= letzterSonntag;
    });

    const statistikText = `📊 **Einsatzstatistik (${letzterMontag.toFormat('dd.MM.yyyy')} – ${letzterSonntag.toFormat('dd.MM.yyyy')})**\n\n` +
      `📈 **Gesamteinsätze: ${gefiltert.length}**\n` +
      (gefiltert.length === 0
        ? '\n_Keine Einsätze in diesem Zeitraum._'
        : '\n❗ **Einsatzübersicht:**\n\n' +
          gefiltert.map((r, i) => {
            const nummer = r[0]?.trim() || "---";
            const datum = DateTime.fromFormat(r[1], "d.M.yyyy", { zone: TIMEZONE }).toFormat("dd.MM.yyyy");
            const uhrzeit = r[2]?.trim() || "---";
            const objekt = r[5]?.trim() || "---";
            const bezirk = r[6]?.trim() || "---";
            const strasse = r[7]?.trim() || "---";
            const plz = r[9]?.trim() || "---";
            const stichwort = r[10]?.trim() || "---";

            return `#${nummer} | ${datum} – ${uhrzeit} Uhr\n🏢 Objekt: ${objekt}\n📍 Ort: ${strasse}, ${plz} ${bezirk}\n🚨 Stichwort: ${stichwort}`;
          }).join('\n\n'));

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
    setInterval(sendeStatistik, 7 * 24 * 60 * 60 * 1000);
  }, delay);
}

client.login(BOT_TOKEN);
