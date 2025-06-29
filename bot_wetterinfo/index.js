require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { DateTime } = require('luxon');
const fetch = require('node-fetch');

// Orte mit ZAMG-API-URLs (Deutsch: lang=de)
const locations = [
  { name: 'Wiener Neustadt', url: 'https://warnungen.zamg.at/wsapp/api/getWarningsForCoords?lon=16.2500&lat=47.8000&lang=de' },
  { name: 'Mödling',         url: 'https://warnungen.zamg.at/wsapp/api/getWarningsForCoords?lon=16.28921&lat=48.08605&lang=de' },
  { name: 'Schneeberg',      url: 'https://warnungen.zamg.at/wsapp/api/getWarningsForCoords?lon=15.80447&lat=47.76702&lang=de' },
  { name: 'Wien',            url: 'https://warnungen.zamg.at/wsapp/api/getWarningsForCoords?lon=16.37250&lat=48.20833&lang=de' }
];

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const CHANNEL_ID = process.env.CHANNEL_ID;

// Aktuelle Warnungen abfragen
async function fetchWarnings() {
  const result = [];
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
      result.push({ location: loc.name, warns });
    } catch (e) {
      result.push({ location: loc.name, error: e.message });
    }
  }
  return result;
}

// Embed mit deutscher Beschriftung, Datum in Wien-Zeitzone
function makeEmbed(location, warns, now) {
  const maxStufe = Math.max(...warns.map(w => Number(w.warnstufeid)));
  const colors = { 1: 0xFFFF00, 2: 0xFFA500, 3: 0xFF0000, 4: 0x8A2BE2 };

  const embed = new EmbedBuilder()
    .setTitle(`⚠️ Warnungen für ${location}`)
    .setColor(colors[maxStufe] ?? 0x808080)
    .setFooter({ text: `Stand: ${now.toLocaleString(DateTime.DATE_FULL)}` });

  for (const w of warns) {
    const beg = DateTime.fromFormat(w.begin, 'dd.LL.yyyy HH:mm', { zone: 'Europe/Vienna' })
                    .toLocaleString(DateTime.DATETIME_SHORT);
    const end = DateTime.fromFormat(w.end,   'dd.LL.yyyy HH:mm', { zone: 'Europe/Vienna' })
                    .toLocaleString(DateTime.DATETIME_SHORT);

    embed.addFields({
      name:  `Warnstufe ${w.warnstufeid}`,
      value: `• **Beginn**: ${beg} Uhr\n` +
             `• **Ende**: ${end} Uhr\n` +
             `• **Beschreibung**: ${w.text}`
    });

    if (w.auswirkungen) {
      embed.addFields({
        name: 'Auswirkungen',
        value: w.auswirkungen
      });
    }
    if (w.empfehlungen) {
      embed.addFields({
        name: 'Empfehlungen',
        value: w.empfehlungen
      });
    }
  }
  return embed;
}

// Post-Funktion: nur aktive Warnungen
async function postWarnings() {
  const channel = await client.channels.fetch(CHANNEL_ID);
  const now     = DateTime.now().setZone('Europe/Vienna');
  const data    = await fetchWarnings();

  for (const e of data) {
    if (e.error) continue;
    const active = e.warns.filter(w => {
      const b = DateTime.fromFormat(w.begin, 'dd.LL.yyyy HH:mm', { zone: 'Europe/Vienna' });
      const eD= DateTime.fromFormat(w.end,   'dd.LL.yyyy HH:mm', { zone: 'Europe/Vienna' });
      return b <= now && now <= eD;
    });
    if (active.length === 0) continue;
    const embed = makeEmbed(e.location, active, now);
    await channel.send({ embeds: [embed] });
  }
}

client.once('ready', () => {
  console.log(`🚀 Eingeloggt als ${client.user.tag}`);
  postWarnings();
  setInterval(postWarnings, 15 * 60 * 1000);
});

client.login(process.env.DISCORD_TOKEN);
