// index.js
require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { DateTime } = require('luxon');
const fetch = require('node-fetch');

// Deine vier Orte mit API-URLs
const locations = [
  { name: 'Wiener Neustadt', url: 'https://warnungen.zamg.at/wsapp/api/getWarningsForCoords?lon=16.2500&lat=47.8000&lang=en' },
  { name: 'Mödling',         url: 'https://warnungen.zamg.at/wsapp/api/getWarningsForCoords?lon=16.28921&lat=48.08605&lang=en' },
  { name: 'Schneeberg',      url: 'https://warnungen.zamg.at/wsapp/api/getWarningsForCoords?lon=15.80447&lat=47.76702&lang=en' },
  { name: 'Wien',            url: 'https://warnungen.zamg.at/wsapp/api/getWarningsForCoords?lon=16.37250&lat=48.20833&lang=en' }
];

const client = new Client({ intents: [ GatewayIntentBits.Guilds ] });
const CHANNEL_ID = process.env.CHANNEL_ID; // z.B. "1388158584575098900"

// 1) Warnungen holen
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

// 2) Embed bauen
function makeEmbed(location, warns, now) {
  // höchste Warnstufe der aktuellen Warnungen
  const maxStufe = Math.max(...warns.map(w => Number(w.warnstufeid)));

  // Farbzuordnung
  const colorMap = {
    1: 0xFFFF00,  // Gelb
    2: 0xFFA500,  // Orange
    3: 0xFF0000,  // Rot
    4: 0x8A2BE2   // Violett
  };

  const embed = new EmbedBuilder()
    .setTitle(`⚠️ Warnungen für ${location}`)
    .setColor(colorMap[maxStufe] ?? 0x808080)
    .setFooter({ text: `Stand: ${now.toLocaleString(DateTime.DATE_FULL)}` });

  for (const w of warns) {
    embed.addFields({
      name:  `Warn-ID: ${w.warnid} | Warnstufe: ${w.warnstufeid}`,
      value: `Beginn: **${w.begin}**  \n` +
             `Ende:   **${w.end}**  \n\n` +
             `${w.text.replace(/ can be expected\.$/, ' ist zu erwarten.')}`,
      inline: false
    });
  }

  return embed;
}

// 3) Nur aktuelle Warnungen posten
async function postWarnings() {
  const channel = await client.channels.fetch(CHANNEL_ID);
  const data    = await fetchWarnings();
  const now     = DateTime.now().setZone('Europe/Vienna');

  for (const entry of data) {
    if (entry.error) {
      console.error(`⚠️ ${entry.location} Fehler:`, entry.error);
      continue;
    }

    // filter nur die Warnungen, die gerade aktiv sind
    const active = entry.warns.filter(w => {
      const begin = DateTime.fromFormat(w.begin, 'dd.LL.yyyy HH:mm', { zone: 'Europe/Vienna' });
      const end   = DateTime.fromFormat(w.end,   'dd.LL.yyyy HH:mm', { zone: 'Europe/Vienna' });
      return begin <= now && now <= end;
    });

    if (active.length === 0) continue;
    const embed = makeEmbed(entry.location, active, now);
    await channel.send({ embeds: [embed] });
  }
}

// 4) Bot starten & Intervall setzen
client.once('ready', () => {
  console.log(`🚀 Eingeloggt als ${client.user.tag}`);
  postWarnings();
  setInterval(postWarnings, 15 * 60 * 1000); // alle 15 Minuten
});

client.login(process.env.DISCORD_TOKEN);
