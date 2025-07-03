import { Client, GatewayIntentBits, EmbedBuilder } from 'discord.js';
import fetch from 'node-fetch';
import { DateTime } from 'luxon';
import { exec } from 'child_process';
import fs from 'fs/promises';
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

    // Speichere die CSV lokal für Python
    await fs.writeFile("einsaetze.csv", csv, "utf-8");

    // Starte das Python-Analyse-Skript
    await new Promise((resolve, reject) => {
      exec("python3 analyse.py", (err, stdout, stderr) => {
        if (err) return reject(stderr);
        resolve(stdout);
      });
    });

    // Lade die Statistikdaten
    const statistik = JSON.parse(await fs.readFile("auswertung.json", "utf-8"));

    const jetzt = DateTime.now().setZone(TIMEZONE);
    const letzterMontag = jetzt.minus({ weeks: 1 }).startOf('week');
    const letzterSonntag = letzterMontag.plus({ days: 6 });

    const channel = await client.channels.fetch(CHANNEL_ID);
    if (!channel) return console.error("❌ Channel nicht gefunden");

    const bericht = [
      `📊 **Einsatzstatistik (${letzterMontag.toFormat('dd.MM.yyyy')} – ${letzterSonntag.toFormat('dd.MM.yyyy')})**`,
      `📈 **Gesamteinsätze:** ${statistik.gesamt}`,
      ``,
      `🚨 **Top-Stichworte:**`,
      ...Object.entries(statistik.top_stichworte).map(([k, v]) => `• ${k}: ${v}`),
      ``,
      `📍 **Hotspots:**`,
      ...Object.entries(statistik.hotspots).map(([k, v]) => `• ${k}: ${v}`),
      ``,
      `⏱️ **Intensivste Einsatzstunden:** ${statistik.intensivste_stunden.join(", ")} Uhr`,
      `👥 **Ø Mannschaft:** ${statistik.durchschnitt_mannschaft}`,
      ``,
      `🚒 **Fahrzeugeinsätze:**`,
      ...Object.entries(statistik.fahrzeuge).map(([k, v]) => `• ${k}: ${v}×`)
    ].join("\n");

    await channel.send({
      content: bericht,
      files: ["einsatz_stichworte.png"]
    });

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
    setInterval(sendeStatistik, 7 * 24 * 60 * 60 * 1000); // alle 7 Tage
  }, delay);
}

client.login(BOT_TOKEN);
