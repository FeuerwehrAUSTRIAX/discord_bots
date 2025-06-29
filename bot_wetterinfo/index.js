require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { DateTime } = require('luxon');
const fetch = require('node-fetch');


// ─────────────── Konfiguration ───────────────
const WARN_CHANNEL_ID    = process.env.CHANNEL_ID;
const WEATHER_CHANNEL_ID= '1388158627768172825';  // fest codiert
const OWM_KEY            = process.env.OPENWEATHER_API_KEY;

const warnLocations = [
  { name: 'Wiener Neustadt', url: 'https://warnungen.zamg.at/wsapp/api/getWarningsForCoords?lon=16.2500&lat=47.8000&lang=de' },
  { name: 'Mödling',         url: 'https://warnungen.zamg.at/wsapp/api/getWarningsForCoords?lon=16.28921&lat=48.08605&lang=de' },
  { name: 'Schneeberg',      url: 'https://warnungen.zamg.at/wsapp/api/getWarningsForCoords?lon=15.80447&lat=47.76702&lang=de' },
  { name: 'Wien',            url: 'https://warnungen.zamg.at/wsapp/api/getWarningsForCoords?lon=16.37250&lat=48.20833&lang=de' }
];

const weatherLocations = [
  { name: 'Wiener Neustadt', lat: 47.8000, lon: 16.2500 },
  { name: 'Mödling',         lat: 48.08605, lon: 16.28921 },
  { name: 'Schneeberg',      lat: 47.76702, lon: 15.80447 },
  { name: 'Wien',            lat: 48.20833, lon: 16.37250 }
];


// ─────────────── Hilfsfunktionen ───────────────
// entfernt führende Sternchen/Punkte und splittet
function splitLines(text) {
  return text
    .split('\n')
    .map(l => l.replace(/^[\*\-\•\s]+/, '').trim())
    .filter(Boolean);
}

// splittet lange Texte (>1024) in mehrere Felder
function splitField(name, text) {
  const max = 1024, parts = [];
  let i = 0;
  while (i < text.length) {
    let end = i + max;
    if (end < text.length) {
      const lb = text.lastIndexOf('\n', end);
      if (lb > i) end = lb;
    } else end = text.length;
    parts.push({ name, value: text.slice(i, end) });
    i = end;
  }
  return parts;
}


// ─────────────── Warnungen ───────────────
async function fetchWarnings() {
  const out = [];
  for (const loc of warnLocations) {
    try {
      const res  = await fetch(loc.url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const raw  = Array.isArray(data.warnings)
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

function makeWarningEmbed(location, warns, now) {
  const maxStufe = Math.max(...warns.map(w => Number(w.warnstufeid)));
  const colors   = {1:0xFFFF00,2:0xFFA500,3:0xFF0000,4:0x8A2BE2};
  const embed = new EmbedBuilder()
    .setTitle(`⚠️ Warnungen für ${location}`)
    .setColor(colors[maxStufe] ?? 0x808080)
    .setFooter({ text: `Stand: ${now.toFormat('dd.MM.yyyy')}` });

  for (const w of warns) {
    // Zeiten formatieren
    const begin = DateTime.fromFormat(w.begin,'dd.LL.yyyy HH:mm',{zone:'Europe/Vienna'}).toFormat('dd.MM.yyyy HH:mm');
    const end   = DateTime.fromFormat(w.end,  'dd.LL.yyyy HH:mm',{zone:'Europe/Vienna'}).toFormat('dd.MM.yyyy HH:mm');

    // Inline-Übersicht
    embed.addFields(
      { name:'Warnstufe', value:`${w.warnstufeid}`, inline:true },
      { name:'Beginn',    value:`${begin} Uhr`,       inline:true },
      { name:'Ende',      value:`${end} Uhr`,         inline:true }
    );
    // Beschreibung
    embed.addFields({ name:'Beschreibung', value:w.text });

    // Auswirkungen zweispaltig
    if (w.auswirkungen) {
      const lines = splitLines(w.auswirkungen);
      const half  = Math.ceil(lines.length/2);
      const col1  = lines.slice(0,half).map(l=>`• ${l}`).join('\n');
      const col2  = lines.slice(half).map(l=>`• ${l}`).join('\n') || '\u200B';
      embed.addFields(
        { name:'⚠️ Auswirkungen', value:col1, inline:true },
        { name:'\u200B',           value:col2, inline:true }
      );
    }
  }
  return embed;
}

async function postWarnings() {
  const channel = await client.channels.fetch(WARN_CHANNEL_ID);
  const now     = DateTime.now().setZone('Europe/Vienna');
  const data    = await fetchWarnings();

  for (const e of data) {
    if (e.error) continue;
    const active = e.warns.filter(w => {
      const b = DateTime.fromFormat(w.begin,'dd.LL.yyyy HH:mm',{zone:'Europe/Vienna'});
      const t = DateTime.fromFormat(w.end,  'dd.LL.yyyy HH:mm',{zone:'Europe/Vienna'});
      return b <= now && now <= t;
    });
    if (!active.length) continue;
    const embed = makeWarningEmbed(e.location, active, now);
    await channel.send({ embeds:[embed] });
  }
}


// ─────────────── Wetter ───────────────
async function fetchWeather() {
  const out = [];
  for (const loc of weatherLocations) {
    try {
      const url = `https://api.openweathermap.org/data/2.5/weather`
                + `?lat=${loc.lat}&lon=${loc.lon}`
                + `&units=metric&lang=de&appid=${OWM_KEY}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const w   = await res.json();
      out.push({ location: loc.name, w });
    } catch (err) {
      out.push({ location: loc.name, error: err.message });
    }
  }
  return out;
}

function makeWeatherEmbed(location, w, now) {
  const embed = new EmbedBuilder()
    .setTitle(`🌤 Wetter in ${location}`)
    .setColor(0x1E90FF)
    .setFooter({ text: `Stand: ${now.toFormat('dd.MM.yyyy HH:mm')}` })
    .addFields(
      { name:'Temperatur',  value:`${w.main.temp.toFixed(1)} °C`,        inline:true },
      { name:'Gefühlt wie', value:`${w.main.feels_like.toFixed(1)} °C`, inline:true },
      { name:'Luftfeuchte', value:`${w.main.humidity}%`,               inline:true },
      { name:'Beschreibung', value:`${w.weather[0].description}`,       inline:false }
    );
  return embed;
}

async function postWeather() {
  const channel = await client.channels.fetch(WEATHER_CHANNEL_ID);
  const now     = DateTime.now().setZone('Europe/Vienna');
  const data    = await fetchWeather();

  for (const e of data) {
    if (e.error) continue;
    const embed = makeWeatherEmbed(e.location, e.w, now);
    await channel.send({ embeds:[embed] });
  }
}


// ─────────────── Bot-Start ───────────────
const client = new Client({ intents:[ GatewayIntentBits.Guilds ] });
client.once('ready', () => {
  console.log(`🚀 Eingeloggt als ${client.user.tag}`);
  postWarnings(); 
  setInterval(postWarnings, 15*60*1000);
  postWeather();
  setInterval(postWeather, 60*60*1000);
});
client.login(process.env.DISCORD_TOKEN);
