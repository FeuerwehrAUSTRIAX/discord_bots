require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { DateTime } = require('luxon');
const fetch = require('node-fetch');

// Kanal & Orte
const CHANNEL_ID = process.env.CHANNEL_ID;
const locations = [
  { name: 'Wiener Neustadt', url: 'https://warnungen.zamg.at/wsapp/api/getWarningsForCoords?lon=16.2500&lat=47.8000&lang=de' },
  { name: 'Mödling',         url: 'https://warnungen.zamg.at/wsapp/api/getWarningsForCoords?lon=16.28921&lat=48.08605&lang=de' },
  { name: 'Schneeberg',      url: 'https://warnungen.zamg.at/wsapp/api/getWarningsForCoords?lon=15.80447&lat=47.76702&lang=de' },
  { name: 'Wien',            url: 'https://warnungen.zamg.at/wsapp/api/getWarningsForCoords?lon=16.37250&lat=48.20833&lang=de' }
];

// Hilfsfunktion: in Zeilen aufsplitten
function splitLines(text) {
  return text.split('\n').map(l => l.trim()).filter(Boolean);
}

// 1) Warnungen abfragen
async function fetchWarnings() {
  const out = [];
  for (const loc of locations) {
    try {
      const res  = await fetch(loc.url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const raw  = Array.isArray(data.warnings)
                 ? data.warnings
                 : Array.isArray(data.properties?.warnings)
                   ? data.properties.warnings
                   : [];
      const warns = raw.filter(w => w.type === 'Warning').map(w => w.properties);
      out.push({ location: loc.name, warns });
    } catch (err) {
      out.push({ location: loc.name, error: err.message });
    }
  }
  return out;
}

// 2) Embed bauen
function makeEmbed(location, warns, now) {
  const maxStufe = Math.max(...warns.map(w => Number(w.warnstufeid)));
  const colors   = { 1: 0xFFFF00, 2: 0xFFA500, 3: 0xFF0000, 4: 0x8A2BE2 };
  const embed = new EmbedBuilder()
    .setTitle(`⚠️ Warnungen für ${location}`)
    .setColor(colors[maxStufe] ?? 0x808080)
    .setFooter({ text: `Stand: ${now.toFormat('dd.MM.yyyy')}` });

  for (const w of warns) {
    // Zeiten formatieren
    const begin = DateTime.fromFormat(w.begin, 'dd.LL.yyyy HH:mm', { zone: 'Europe/Vienna' })
                          .toFormat('dd.MM.yyyy HH:mm');
    const end = DateTime.fromFormat(w.end, 'dd.LL.yyyy HH:mm', { zone: 'Europe/Vienna' })
                        .toFormat('dd.MM.yyyy HH:mm');

    // Inline-Übersicht
    embed.addFields(
      { name: 'Warnstufe', value: `${w.warnstufeid}`, inline: true },
      { name: 'Beginn',    value: `${begin} Uhr`,       inline: true },
      { name: 'Ende',      value: `${end} Uhr`,         inline: true }
    );

    // Beschreibung
    embed.addFields({
      name: 'Beschreibung',
      value: w.text
    });

    // Auswirkungen zweispaltig
    if (w.auswirkungen) {
      const lines = splitLines(w.auswirkungen);
      const half  = Math.ceil(lines.length / 2);
      const col1  = lines.slice(0, half).map(l => `• ${l}`).join('\n');
      const col2  = lines.slice(half).map(l => `• ${l}`).join('\n') || '\u200B';
      embed.addFields(
        { name: '⚠️ Auswirkungen', value: col1, inline: true },
        { name: '\u200B',           value: col2, inline: true }
      );
    }
  }

  return embed;
}

// 3) Nur aktive Warnungen posten
async function postWarnings() {
  const channel = await client.channels.fetch(CHANNEL_ID);
  const now     = DateTime.now().setZone('Europe/Vienna');
  const data    = await fetchWarnings();

  for (const entry of data) {
    if (entry.error) continue;
    const active = entry.warns.filter(w => {
      const b = DateTime.fromFormat(w.begin, 'dd.LL.yyyy HH:mm', { zone: 'Europe/Vienna' });
      const e = DateTime.fromFormat(w.end,   'dd.LL.yyyy HH:mm', { zone: 'Europe/Vienna' });
      return b <= now && now <= e;
    });
    if (!active.length) continue;
    const embed = makeEmbed(entry.location, active, now);
    await channel.send({ embeds: [embed] });
  }
}

// 4) Bot starten
const client = new Client({ intents: [ GatewayIntentBits.Guilds ] });
client.once('ready', () => {
  console.log(`🚀 Eingeloggt als ${client.user.tag}`);
  postWarnings();
  setInterval(postWarnings, 15 * 60 * 1000);
});
client.login(process.env.DISCORD_TOKEN);
