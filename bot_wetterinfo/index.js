require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { DateTime } = require('luxon');
const fetch = require('node-fetch');

// ─────────── Konfiguration ───────────
const WARN_CHANNEL_ID = process.env.CHANNEL_ID;
const WEATHER_CHANNEL_ID = process.env.WEATHER_CHANNEL_ID;

const warnLocations = [
  { name: 'Wiener Neustadt', url: 'https://warnungen.zamg.at/wsapp/api/getWarningsForCoords?lon=16.2500&lat=47.8000&lang=de' },
  { name: 'Mödling',         url: 'https://warnungen.zamg.at/wsapp/api/getWarningsForCoords?lon=16.28921&lat=48.08605&lang=de' },
  { name: 'Schneeberg',      url: 'https://warnungen.zamg.at/wsapp/api/getWarningsForCoords?lon=15.80447&lat=47.76702&lang=de' },
  { name: 'Wien',            url: 'https://warnungen.zamg.at/wsapp/api/getWarningsForCoords?lon=16.37250&lat=48.20833&lang=de' }
];

const weatherLocations = warnLocations.map(l => l.name);

const weatherTranslations = {
  'Sunny':               'Sonnig',
  'Clear':               'Klar',
  'Partly cloudy':       'Teilweise bewölkt',
  'Cloudy':              'Bewölkt',
  'Light rain':          'Leichter Regen',
  'Patchy rain possible':'Vereinzelte Schauer',
  'Moderate rain':       'Mäßiger Regen',
  'Heavy rain':          'Starker Regen',
  'Overcast':            'Stark bewölkt',
  'Mist':                'Nebel',
};

// ─────────── Helfer ───────────
function splitLines(text) {
  return text
    .split('\n')
    .map(line => line.replace(/^[\*\-\•\s]+/, '').trim())
    .filter(Boolean);
}

// ─────────── WARNUNGEN ───────────
async function fetchWarnings() {
  const out = [];
  for (const loc of warnLocations) {
    try {
      const res = await fetch(loc.url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const raw = Array.isArray(data.warnings)
        ? data.warnings
        : Array.isArray(data.properties?.warnings)
          ? data.properties.warnings
          : [];

      const warns = raw.filter(w => w.type === 'Warning').map(w => w.properties);
      out.push({ location: loc.name, warns });
    } catch (err) {
      console.error(`[Warn] Fehler bei ${loc.name}:`, err.message);
      out.push({ location: loc.name, error: err.message });
    }
  }
  return out;
}

function makeWarningEmbed(location, warns, now) {
  const warnstufen = warns
    .map(w => Number(w.rawinfo?.wlevel))
    .filter(n => !isNaN(n));
  const maxStufe = warnstufen.length ? Math.max(...warnstufen) : 0;
  const colors = { 1: 0xFFFF00, 2: 0xFFA500, 3: 0xFF0000, 4: 0x8A2BE2 };

  const embed = new EmbedBuilder()
    .setTitle(`⚠️ Warnungen für ${location}`)
    .setColor(colors[maxStufe] ?? 0x808080)
    .setFooter({ text: `Stand: ${now.toFormat('dd.MM.yyyy HH:mm')}` });

  for (const w of warns) {
    const stufe = w.rawinfo?.wlevel ?? 'Unbekannt';
    const begin = DateTime.fromSeconds(Number(w.rawinfo?.start || 0)).setZone('Europe/Vienna').toFormat('dd.MM.yyyy HH:mm');
    const end   = DateTime.fromSeconds(Number(w.rawinfo?.end || 0)).setZone('Europe/Vienna').toFormat('dd.MM.yyyy HH:mm');

    embed.addFields(
      { name: 'Warnstufe', value: `${stufe}`, inline: true },
      { name: 'Beginn',    value: `${begin} Uhr`, inline: true },
      { name: 'Ende',      value: `${end} Uhr`,   inline: true }
    );
    embed.addFields({ name: 'Beschreibung', value: w.text });

    if (w.auswirkungen) {
      const lines = splitLines(w.auswirkungen);
      const half = Math.ceil(lines.length / 2);
      const col1 = lines.slice(0, half).map(l => `• ${l}`).join('\n');
      const col2 = lines.slice(half).map(l => `• ${l}`).join('\n') || '\u200B';
      embed.addFields(
        { name: '⚠️ Auswirkungen', value: col1, inline: true },
        { name: '\u200B',          value: col2, inline: true }
      );
    }
  }

  return embed;
}

async function postTestWarnstufen(channel) {
  const now = DateTime.now().setZone('Europe/Vienna');
  const colors = { 1: 0xFFFF00, 2: 0xFFA500, 3: 0xFF0000, 4: 0x8A2BE2 };

  for (let level = 1; level <= 4; level++) {
    const embed = new EmbedBuilder()
      .setTitle(`🔧 Testwarnung – Stufe ${level}`)
      .setDescription(`Dies ist eine **Testwarnung** mit Warnstufe ${level}.`)
      .setColor(colors[level])
      .setFooter({ text: `Test um ${now.toFormat('dd.MM.yyyy HH:mm')}` });

    await channel.send({ embeds: [embed] });
  }
}

async function postWarnings() {
  const channel = await client.channels.fetch(WARN_CHANNEL_ID);
  const now = DateTime.now().setZone('Europe/Vienna');
  const heute = now.startOf('day');

  try {
    const messages = await channel.messages.fetch({ limit: 100 });
    const botMessages = messages.filter(m => m.author.id === client.user.id);
    await channel.bulkDelete(botMessages, true);
  } catch (err) {
    console.error(`[Warn] Fehler beim Löschen alter Nachrichten: ${err.message}`);
  }

  if (!postWarnings.hasRunOnce) {
    await postTestWarnstufen(channel);
    postWarnings.hasRunOnce = true;
  }

  const data = await fetchWarnings();
  for (const entry of data) {
    if (entry.error) continue;

    const active = entry.warns.filter(w => {
      const start = DateTime.fromSeconds(Number(w.rawinfo?.start || 0)).setZone('Europe/Vienna');
      const end   = DateTime.fromSeconds(Number(w.rawinfo?.end || 0)).setZone('Europe/Vienna');
      return start <= heute.endOf('day') && end >= heute;
    });

    if (!active.length) continue;
    await channel.send({ embeds: [makeWarningEmbed(entry.location, active, now)] });
  }
}

// ─────────── WETTER ───────────
async function fetchWeather() {
  const out = [];
  for (const loc of weatherLocations) {
    try {
      const url = `https://wttr.in/${encodeURIComponent(loc)}?format=j1&lang=de`;
      const res = await fetch(url, { headers: { 'User-Agent': 'curl' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const cur = data.current_condition?.[0];
      if (!cur) throw new Error('Keine aktuellen Wetterdaten');
      out.push({
        location: loc,
        temp: Number(cur.temp_C),
        feels: Number(cur.FeelsLikeC),
        desc: cur.weatherDesc?.[0]?.value ?? '',
        humidity: Number(cur.humidity)
      });
    } catch (err) {
      console.error(`[Weather] Fehler bei ${loc}:`, err.message);
      out.push({ location: loc, error: err.message });
    }
  }
  return out;
}

function makeWeatherEmbed(location, w, now) {
  const descDE = weatherTranslations[w.desc] || w.desc;
  return new EmbedBuilder()
    .setTitle(`🌤 Wetter in ${location}`)
    .setColor(0x1E90FF)
    .setFooter({ text: `Stand: ${now.toFormat('dd.MM.yyyy HH:mm')}` })
    .addFields(
      { name: 'Temperatur',  value: `${w.temp.toFixed(1)} °C`,  inline: true },
      { name: 'Gefühlt wie', value: `${w.feels.toFixed(1)} °C`, inline: true },
      { name: 'Luftfeuchte', value: `${w.humidity}%`,           inline: true },
      { name: 'Beschreibung', value: `${descDE}`,               inline: false }
    );
}

async function postWeather() {
  const channel = await client.channels.fetch(WEATHER_CHANNEL_ID);
  const now = DateTime.now().setZone('Europe/Vienna');

  try {
    const messages = await channel.messages.fetch({ limit: 100 });
    const botMessages = messages.filter(m => m.author.id === client.user.id);
    await channel.bulkDelete(botMessages, true);
  } catch (err) {
    console.error(`[Weather] Fehler beim Löschen alter Nachrichten: ${err.message}`);
  }

  const data = await fetchWeather();

  for (const e of data) {
    if (e.error) continue;
    await channel.send({ embeds: [makeWeatherEmbed(e.location, e, now)] });
  }
}

// ─────────── Bot-Start ───────────
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', () => {
  console.log(`🚀 Eingeloggt als ${client.user.tag}`);
  postWarnings();
  postWeather();
  setInterval(postWarnings, 15 * 60 * 1000); // alle 15 Minuten
  setInterval(postWeather, 60 * 60 * 1000);  // jede Stunde
});

client.login(process.env.DISCORD_TOKEN);
