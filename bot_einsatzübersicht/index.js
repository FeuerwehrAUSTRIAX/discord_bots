// Erweiterter Feuerwehr Statistik-Bot mit Textauswertungen
import { Client, GatewayIntentBits } from 'discord.js';
import fetch from 'node-fetch';
import { DateTime } from 'luxon';
import dotenv from 'dotenv';
dotenv.config();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const CHANNEL_ID = process.env.CHANNEL_ID;
const BOT_TOKEN = process.env.BOT_TOKEN;
const TIMEZONE = 'Europe/Vienna';

const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQJhQbJMxG8s7oSw__c97Z55koBtE2Dlgc0OYR8idpZtdTq3o9g7LbmyEve3KPNkV5yaRZGIHVjJPkk/pub?gid=1016482411&single=true&output=csv';

client.once('ready', async () => {
  console.log(`✅ Bot eingeloggt als ${client.user.tag}`);
  await sendeStatistik();
  starteWochenplaner();
});

function getZeitraeume(now) {
  const startOfWeek = now.startOf('week');
  const startOfLastWeek = startOfWeek.minus({ weeks: 1 });
  const startOfMonth = now.startOf('month');
  const startOfLastMonth = startOfMonth.minus({ months: 1 });
  const startOfYear = now.startOf('year');
  const startOfLastYear = startOfYear.minus({ years: 1 });

  return [
    { name: 'Aktuelle Woche', start: startOfWeek, end: now },
    { name: 'Letzte Woche', start: startOfLastWeek, end: startOfWeek.minus({ days: 1 }) },
    { name: 'Aktueller Monat', start: startOfMonth, end: now },
    { name: 'Letzter Monat', start: startOfLastMonth, end: startOfMonth.minus({ days: 1 }) },
    { name: 'Aktuelles Jahr', start: startOfYear, end: now },
    { name: 'Letztes Jahr', start: startOfLastYear, end: startOfYear.minus({ days: 1 }) },
  ];
}

async function sendeStatistik() {
  try {
    const response = await fetch(CSV_URL);
    const csv = await response.text();
    const rows = csv.split('\n').slice(1);
    const einsaetze = rows.map(r => r.split(',')).filter(r => r.length > 2);
    const jetzt = DateTime.now().setZone(TIMEZONE);
    const zeitraeume = getZeitraeume(jetzt);

    const channel = await client.channels.fetch(CHANNEL_ID);
    if (!channel) return console.error("❌ Channel nicht gefunden");

    for (const z of zeitraeume) {
      const relevant = einsaetze.filter(row => {
        const datum = DateTime.fromFormat(row[1], 'd.M.yyyy', { zone: TIMEZONE });
        return datum.isValid && datum >= z.start && datum <= z.end;
      });

      const arten = { Brand: 0, Technisch: 0, Schadstoff: 0, Sonstige: 0 };
      const fahrzeuge = {};
      let personenGesamt = 0;
      let personenAnzahl = 0;

      for (const r of relevant) {
        const stichwort = r[11]?.trim().toUpperCase();
        const mannschaft = parseInt(r[33]?.trim()) || 0;
        const fzg = r[32]?.split(',').map(f => f.trim()) || [];

        if (stichwort.startsWith("B")) arten.Brand++;
        else if (stichwort.startsWith("T")) arten.Technisch++;
        else if (stichwort.startsWith("S")) arten.Schadstoff++;
        else arten.Sonstige++;

        for (const f of fzg) {
          if (!f) continue;
          fahrzeuge[f] = (fahrzeuge[f] || 0) + 1;
        }

        if (mannschaft > 0) {
          personenGesamt += mannschaft;
          personenAnzahl++;
        }
      }

      const topFahrzeuge = Object.entries(fahrzeuge)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([f, c]) => `• ${f}: ${c}x`)
        .join('\n');

      const bericht = [
        `📊 **${z.name} (${z.start.toFormat('dd.MM.yyyy')} – ${z.end.toFormat('dd.MM.yyyy')})**`,
        `• Gesamteinsätze: ${relevant.length}`,
        `• 🔥 Brand: ${arten.Brand} | 🔧 Technisch: ${arten.Technisch} | ☣️ Schadstoff: ${arten.Schadstoff} | ➕ Sonstige: ${arten.Sonstige}`,
        topFahrzeuge ? `• 🚒 Top-Fahrzeuge:\n${topFahrzeuge}` : null,
        personenAnzahl > 0 ? `• 👥 Durchschnittlich ${Math.round(personenGesamt / personenAnzahl)} Einsatzkräfte` : null
      ].filter(Boolean).join('\n');

      await channel.send({ content: bericht });
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
    setInterval(sendeStatistik, 7 * 24 * 60 * 60 * 1000);
  }, delay);
}

client.login(BOT_TOKEN);
