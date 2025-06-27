// src/index.js (alles in einer Datei)
require('dotenv').config();
const fetch = require('node-fetch');
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

// Konfiguration über .env
const TOKEN                = process.env.BOT_TOKEN_WETTER;
const WEATHER_CHANNEL_ID   = '1388158627768172825'; // Wetter-Warnungen
const THUNDER_CHANNEL_ID   = '1388158584575098900'; // Gewitter-Warnungen
const TIMEZONE             = 'Europe/Vienna';

// Orte und deren API-URLs
const LOCATIONS = [
  { region: 'Wiener Neustadt', url: 'https://warnungen.zamg.at/wsapp/api/getWarningsForCoords?lon=16.2500&lat=47.8000&lang=en' },
  { region: 'Mödling',         url: 'https://warnungen.zamg.at/wsapp/api/getWarningsForCoords?lon=16.28921&lat=48.08605&lang=en' },
  { region: 'Schneeberg',      url: 'https://warnungen.zamg.at/wsapp/api/getWarningsForCoords?lon=15.80447&lat=47.76702&lang=en' },
  { region: 'Wien',            url: 'https://warnungen.zamg.at/wsapp/api/getWarningsForCoords?lon=16.37250&lat=48.20833&lang=en' }
];

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

function createWarningEmbed(w) {
  return new EmbedBuilder()
    .setTitle(`Warnung in ${w.region}`)
    .addFields(
      { name: 'Typ',        value: w.event,                             inline: true },
      { name: 'Stufe',      value: w.level.toString(),                   inline: true },
      { name: 'Gültig von', value: w.start,                              inline: false },
      { name: 'Gültig bis', value: w.end,                                inline: false }
    )
    .setColor('#FF4500')
    .setTimestamp();
}

async function fetchWarnings() {
  const results = [];
  // Heutiges Datum im Format DD.MM.YYYY in Europe/Vienna
  const now  = new Date();
  const dd   = String(now.toLocaleString('de-AT', { day:   '2-digit', timeZone: TIMEZONE }));
  const mm   = String(now.toLocaleString('de-AT', { month: '2-digit', timeZone: TIMEZONE }));
  const yyyy =       now.toLocaleString('de-AT', { year:  'numeric', timeZone: TIMEZONE });
  const today = `${dd}.${mm}.${yyyy}`;

  for (const loc of LOCATIONS) {
    try {
      const res = await fetch(loc.url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const raw = Array.isArray(data.warnings)
                ? data.warnings
                : Array.isArray(data.properties?.warnings)
                  ? data.properties.warnings
                  : [];
      // Filtern: type="Warning" & Beginn = heute
      const filtered = raw
        .filter(w => w.type === 'Warning')
        .filter(w => w.properties.begin.split(' ')[0] === today)
        .map(w => ({
          region: loc.region,
          typeId: w.properties.warntypid,
          event:  w.properties.text,
          level:  w.properties.warnstufeid,
          start:  w.properties.begin,
          end:    w.properties.end
        }));
      results.push(...filtered);
    } catch (err) {
      console.error(`Fehler ${loc.region}:`, err.message);
    }
  }

  return results;
}

client.once('ready', async () => {
  console.log(`Eingeloggt als ${client.user.tag}`);
  const warnings = await fetchWarnings();

  // Kanäle laden
  const weatherChannel = await client.channels.fetch(WEATHER_CHANNEL_ID);
  const thunderChannel = await client.channels.fetch(THUNDER_CHANNEL_ID);
  if (!weatherChannel || !thunderChannel) {
    console.error('Ein oder beide Channels nicht gefunden');
    process.exit(1);
  }

  if (warnings.length === 0) {
    await weatherChannel.send('✅ Keine Warnungen für heute.');
    return;
  }

  for (const w of warnings) {
    const embed = createWarningEmbed(w);
    // Typ 5 = Gewitter, alles andere in Wetter-Kanal
    if (w.typeId === 5) {
      await thunderChannel.send({ embeds: [embed] });
    } else {
      await weatherChannel.send({ embeds: [embed] });
    }
  }
});

client.login(TOKEN).catch(console.error);
