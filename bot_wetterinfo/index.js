// index.js
require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');

// Deine vier Orte und ihre ZAMG-API-URLs
const locations = [
  { name: 'Wiener Neustadt', url: 'https://warnungen.zamg.at/wsapp/api/getWarningsForCoords?lon=16.2500&lat=47.8000&lang=en' },
  { name: 'Mödling',         url: 'https://warnungen.zamg.at/wsapp/api/getWarningsForCoords?lon=16.28921&lat=48.08605&lang=en' },
  { name: 'Schneeberg',      url: 'https://warnungen.zamg.at/wsapp/api/getWarningsForCoords?lon=15.80447&lat=47.76702&lang=en' },
  { name: 'Wien',            url: 'https://warnungen.zamg.at/wsapp/api/getWarningsForCoords?lon=16.37250&lat=48.20833&lang=en' }
];

const client = new Client({ intents: [ GatewayIntentBits.Guilds ] });
const CHANNEL_ID = process.env.CHANNEL_ID;

// 1. WARNUNGEN ABFRAGEN
async function fetchWarnings() {
  const out = [];
  for (const loc of locations) {
    try {
      const res  = await fetch(loc.url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const raw = Array.isArray(data.warnings)
                ? data.warnings
                : Array.isArray(data.properties?.warnings)
                  ? data.properties.warnings
                  : [];

      const warns = raw
        .filter(w => w.type === 'Warning')
        .map(w => w.properties);

      out.push({ location: loc.name, warns });
    } catch (err) {
      out.push({ location: loc.name, error: err.message });
    }
  }
  return out;
}

// 2. EMBED ERSTELLEN (mit Farbe & deutschem Datum für Wien)
function makeEmbed(location, warns) {
  // höchste Warnstufe ermitteln (als Zahl)
  const maxStufe = Math.max(...warns.map(w => Number(w.warnstufeid)));

  // Farbzuweisung: 1=Gelb, 2=Orange, 3=Rot, 4=Violett, sonst Grau
  const colorMap = {
    1: 0xFFFF00,
    2: 0xFFA500,
    3: 0xFF0000,
    4: 0x8A2BE2
  };

  // aktuelles Datum in Deutsch, Zeitzone Wien
  const heute = new Date().toLocaleDateString('de-AT', {
    timeZone: 'Europe/Vienna',
    weekday: 'long',
    year:    'numeric',
    month:   'long',
    day:     'numeric'
  });

  const embed = new EmbedBuilder()
    .setTitle(`⚠️ Warnungen für ${location}`)
    .setColor(colorMap[maxStufe] ?? 0x808080)
    .setFooter({ text: `Stand: ${heute}` });

  for (const w of warns) {
    embed.addFields({
      name:  `Warn-ID: ${w.warnid} | Warnstufe: ${w.warnstufeid}`,
      value: `Beginn: **${w.begin}**\nEnde:   **${w.end}**\n${w.text}`,
      inline: false
    });
  }
  return embed;
}

// 3. NUR BEI VORHANDENEN WARNUNGEN POSTEN
async function postWarnings() {
  const ch   = await client.channels.fetch(CHANNEL_ID);
  const data = await fetchWarnings();

  for (const e of data) {
    if (e.error) {
      console.error(`⚠️ ${e.location} Fehler:`, e.error);
      continue;
    }
    if (e.warns.length === 0) continue;
    const embed = makeEmbed(e.location, e.warns);
    await ch.send({ embeds: [embed] });
  }
}

// 4. BOT START & INTERVALL
client.once('ready', () => {
  console.log(`🚀 Eingeloggt als ${client.user.tag}`);
  postWarnings();
  setInterval(postWarnings, 15 * 60 * 1000); // alle 15 Minuten
});

client.login(process.env.DISCORD_TOKEN);
