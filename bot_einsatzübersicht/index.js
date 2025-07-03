import { Client, GatewayIntentBits, EmbedBuilder } from 'discord.js';
import fetch from 'node-fetch';
import { DateTime } from 'luxon';
import dotenv from 'dotenv';
dotenv.config();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const CHANNEL_ID = process.env.CHANNEL_ID;
const BOT_TOKEN = process.env.BOT_TOKEN;
const TIMEZONE = 'Europe/Vienna';

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQJhQbJMxG8s7oSw__c97Z55koBtE2Dlgc0OYR8idpZtdTq3o9g7LbmyEve3KPNkV5yaRZGIHVjJPkk/pub?gid=1016482411&single=true&output=csv";

// 🔤 Farbe abhängig vom Stichwort
function getEmbedColor(stichwort) {
  const code = stichwort?.toUpperCase().trim() || "";
  if (code.startsWith("B")) return 0xe74c3c; // Rot
  if (code.startsWith("T")) return 0x3498db; // Blau
  if (code.startsWith("S")) return 0xf1c40f; // Gelb
  if (["SD", "SOF", "Z", "D"].some(prefix => code.startsWith(prefix))) return 0x2ecc71; // Grün
  return 0x95a5a6; // Grau
}

client.once('ready', async () => {
  console.log(`✅ Bot eingeloggt als ${client.user.tag}`);
  await sendeStatistik();
  starteWochenplaner();
});

async function sendeStatistik() {
  try {
    const response = await fetch(CSV_URL);
    const csv = await response.text();

    const rows = csv.split('\n').slice(1);
    const einsaetze = rows.map(r => r.split(',')).filter(r => r.length > 2);

    const jetzt = DateTime.now().setZone(TIMEZONE);
    const letzterMontag = jetzt.minus({ weeks: 1 }).startOf('week');
    const letzterSonntag = letzterMontag.plus({ days: 6 });

    const gefiltert = einsaetze.filter(row => {
      const datum = DateTime.fromFormat(row[1], 'd.M.yyyy', { zone: TIMEZONE });
      return datum.isValid && datum >= letzterMontag && datum <= letzterSonntag;
    });

    const channel = await client.channels.fetch(CHANNEL_ID);
    if (!channel) return console.error("❌ Channel nicht gefunden");

    if (gefiltert.length === 0) {
      await channel.send(`📊 **Einsatzstatistik (${letzterMontag.toFormat('dd.MM.yyyy')} – ${letzterSonntag.toFormat('dd.MM.yyyy')})**\n\n_Keine Einsätze in diesem Zeitraum._`);
      return;
    }

    await channel.send(`📊 **Einsatzstatistik (${letzterMontag.toFormat('dd.MM.yyyy')} – ${letzterSonntag.toFormat('dd.MM.yyyy')})**\n📈 **Gesamteinsätze: ${gefiltert.length}**\n`);

    for (const r of gefiltert) {
      const nummer = r[0]?.trim() || "k.a.";
      const datumObj = DateTime.fromFormat(r[1], "d.M.yyyy", { zone: TIMEZONE });
      const datum = datumObj.isValid ? datumObj.toFormat("dd.MM.yyyy") : "k.a.";
      const uhrzeit = r[2]?.trim() || "k.a.";
      const objekt = r[5]?.trim() || "k.a.";
      const bezirk = r[6]?.trim() || "k.a.";
      const strasse = r[7]?.trim() || "k.a.";
      const plz = r[9]?.trim() || "k.a.";
      const stichwort = r[11]?.trim() || "k.a.";

      const embed = new EmbedBuilder()
        .setColor(getEmbedColor(stichwort))
        .setTitle(`#${nummer} – ${stichwort}`)
        .setDescription(
          `📅 **Datum:** ${datum} – ${uhrzeit} Uhr\n` +
          `📍 **Ort:** ${strasse}, ${plz} ${bezirk}\n` +
          `🏢 **Objekt:** ${objekt}`
        )
        .setTimestamp();

      await channel.send({ embeds: [embed] });
    }
  } catch (err) {
    console.error('❌ Fehler beim Senden der Statistik:', err);
  }
}

function starteWochenplaner() {
  const jetzt = DateTime.now().setZone(TIMEZONE);
  const naechsterMontag = jetzt.plus({ days: (8 - jetzt.weekday) % 7 }).set({ hour: 8, minute: 0, second: 0 });
  const delay = naechsterMontag.diff(jetzt).as('milliseconds');

  setTimeout(() => {
    sendeStatistik();
    setInterval(sendeStatistik, 7 * 24 * 60 * 60 * 1000); // wöchentlich
  }, delay);
}

client.login(BOT_TOKEN);
