require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');

// vordefinierte Orte und ihre ZAMG-API-URLs
const locations = [
  { name: 'Wiener Neustadt', url: 'https://warnungen.zamg.at/wsapp/api/getWarningsForCoords?lon=16.2500&lat=47.8000&lang=en' },
  { name: 'Mödling',         url: 'https://warnungen.zamg.at/wsapp/api/getWarningsForCoords?lon=16.28921&lat=48.08605&lang=en' },
  { name: 'Schneeberg',      url: 'https://warnungen.zamg.at/wsapp/api/getWarningsForCoords?lon=15.80447&lat=47.76702&lang=en' },
  { name: 'Wien',            url: 'https://warnungen.zamg.at/wsapp/api/getWarningsForCoords?lon=16.37250&lat=48.20833&lang=en' }
];

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const CHANNEL_ID = process.env.CHANNEL_ID;

// Funktion: ZAMG-Warnungen abfragen
async function fetchWarnings() {
  const results = [];
  for (const loc of locations) {
    try {
      const res = await fetch(loc.url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const raw = Array.isArray(data.warnings)
                 ? data.warnings
                 : Array.isArray(data.properties?.warnings)
                   ? data.properties.warnings
                   : [];
      const warnings = raw
        .filter(w => w.type === 'Warning')
        .map(w => w.properties);
      results.push({ location: loc.name, warnings });
    } catch (err) {
      results.push({ location: loc.name, error: err.message });
    }
  }
  return results;
}

// Funktion: Embed aus Warn-Daten erstellen
function createEmbed(loc, warns) {
  const embed = new EmbedBuilder()
    .setTitle(`⚠️ Warnungen für ${loc}`)
    .setTimestamp();

  for (const w of warns) {
    embed.addFields({
      name: `ID ${w.warnid} – Stufe ${w.warnstufeid} (wlevel ${w.rawinfo?.wlevel ?? '–'})`,
      value: `Von **${w.begin}** bis **${w.end}**\n${w.text}`
    });
  }
  return embed;
}

// Post-Funktion: Nur bei echten Warnungen senden
async function postWarnings() {
  const channel = await client.channels.fetch(CHANNEL_ID);
  const data = await fetchWarnings();

  for (const entry of data) {
    if (entry.error) {
      console.error(`Fehler bei ${entry.location}:`, entry.error);
      continue;
    }
    if (entry.warnings.length === 0) continue;
    const embed = createEmbed(entry.location, entry.warnings);
    await channel.send({ embeds: [embed] });
  }
}

client.once('ready', () => {
  console.log(`✔️ Eingeloggt als ${client.user.tag}`);
  postWarnings();
  setInterval(postWarnings, 15 * 60 * 1000); // alle 15 Minuten
});

client.login(process.env.DISCORD_TOKEN);
