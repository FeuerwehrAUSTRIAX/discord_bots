import { Client, GatewayIntentBits, EmbedBuilder } from 'discord.js';
import fetch from 'node-fetch';
import csv from 'csv-parser';
import dotenv from 'dotenv';

dotenv.config();

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// URLs zu den AAO-Tabellen
const AAO_URLS = [
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQTiTQbW09ek6xRFa7YFwFWbm-Sn6WuApvVtdyxv0-FO7xmbT1hMhGw7Qswg1BrSXdVhUdReX6BlpQj/pub?gid=0&single=true&output=csv",
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQTiTQbW09ek6xRFa7YFwFWbm-Sn6WuApvVtdyxv0-FO7xmbT1hMhGw7Qswg1BrSXdVhUdReX6BlpQj/pub?gid=2128438331&single=true&output=csv",
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQTiTQbW09ek6xRFa7YFwFWbm-Sn6WuApvVtdyxv0-FO7xmbT1hMhGw7Qswg1BrSXdVhUdReX6BlpQj/pub?gid=200795303&single=true&output=csv",
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQTiTQbW09ek6xRFa7YFwFWbm-Sn6WuApvVtdyxv0-FO7xmbT1hMhGw7Qswg1BrSXdVhUdReX6BlpQj/pub?gid=1850566762&single=true&output=csv"
];

// URL zu den Fahrzeugbildern
const FAHRZEUGE_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQJhQbJMxG8s7oSw__c97Z55koBtE2Dlgc0OYR8idpZtdTq3o9g7LbmyEve3KPNkV5yaRZGIHVjJPkk/pub?gid=38083317&single=true&output=csv";

let aaoEintraege = [];
let fahrzeugBilder = {};

// Hilfsfunktion: CSV von URL laden
async function loadCSV(url, mapper) {
  const response = await fetch(url);
  const results = [];
  const stream = response.body.pipe(csv());

  for await (const row of stream) {
    const mapped = mapper(row);
    if (mapped) results.push(mapped);
  }

  return results;
}

// AAO-Daten laden
async function loadAAO() {
  const all = [];
  for (const url of AAO_URLS) {
    const eintraege = await loadCSV(url, (row) => {
      if (!row.Stichwort || !row.AAO) return null;
      return {
        stichwort: row.Stichwort.trim(),
        alarmstufe: row.Alarmstufe?.trim() || "-",
        fahrzeuge: row.AAO.split(',').map(fzg => fzg.trim()),
      };
    });
    all.push(...eintraege);
  }
  return all;
}

// Fahrzeugbilder laden
async function loadFahrzeugBilder() {
  const data = await loadCSV(FAHRZEUGE_URL, (row) => {
    const name = row["Taktische Bezeichnung"]?.trim();
    const bild = row["Fahrzeugbild"]?.trim();
    if (name && bild) return { name, bild };
    return null;
  });

  const bilder = {};
  data.forEach(({ name, bild }) => {
    bilder[name] = bild;
  });

  return bilder;
}

// Stichwort aus Nachricht extrahieren
function extractStichwort(text) {
  const match = text.match(/Stichwort:\s*(?:FF\s*-\s*)?[A-Z0-9]+\s*-\s*(.+)/i);
  return match ? match[1].trim() : null;
}

// Bot bereit
client.once('ready', async () => {
  console.log(`✅ Bot online als ${client.user.tag}`);
  aaoEintraege = await loadAAO();
  fahrzeugBilder = await loadFahrzeugBilder();
  console.log(`📦 ${aaoEintraege.length} AAO-Einträge geladen`);
  console.log(`🖼️ ${Object.keys(fahrzeugBilder).length} Fahrzeugbilder geladen`);
});

// Nachricht empfangen
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const stichwort = extractStichwort(message.content);
  if (!stichwort) return;

  const eintrag = aaoEintraege.find(e => e.stichwort.toLowerCase() === stichwort.toLowerCase());
  if (!eintrag) {
    message.reply(`⚠️ Kein AAO-Eintrag gefunden für: **${stichwort}**`);
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle(`🚨 Alarm: ${stichwort}`)
    .setDescription(`**Alarmstufe:** ${eintrag.alarmstufe}`)
    .setColor(0xff0000);

  eintrag.fahrzeuge.forEach(name => {
    embed.addFields({
      name,
      value: fahrzeugBilder[name] ? `[Bild anzeigen](${fahrzeugBilder[name]})` : "Kein Bild vorhanden",
      inline: true
    });
  });

  await message.channel.send({ embeds: [embed] });

  // Optional: Bilder einzeln posten
  // for (const name of eintrag.fahrzeuge) {
  //   if (fahrzeugBilder[name]) {
  //     await message.channel.send({ files: [fahrzeugBilder[name]] });
  //   }
  // }
});

client.login(DISCORD_TOKEN);
