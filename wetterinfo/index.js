require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');
const getLiveWeather = require('./getLiveWeather');
const getWarnings = require('./getWarnings');
const createWeatherEmbed = require('./createWeatherEmbed');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

const weatherChannelId = '1388158627768172825';  // Wetter-Channel
const warningsChannelId = '1388158584575098900'; // Unwetter-Channel

const cities = [
  'Wiener Neustadt',
  'Mödling',
  'Hohe Wand',
  'Schneeberg',
  'Wien',
];

const METEOALARM_FEED_URL = 'https://feeds.meteoalarm.org/feeds/meteoalarm.eu.xml';

client.once('ready', async () => {
  console.log(`✅ Bot eingeloggt als ${client.user.tag}`);

  await postWeatherReport();
  setInterval(postWeatherReport, 60 * 60 * 1000); // jede Stunde

  await postNewWarnings();
  setInterval(postNewWarnings, 15 * 60 * 1000); // alle 15 Minuten

  await postMeteoAlarmWarnings();
  setInterval(postMeteoAlarmWarnings, 15 * 60 * 1000); // alle 15 Minuten
});

async function postWeatherReport() {
  const channel = await client.channels.fetch(weatherChannelId);
  const now = new Date().toLocaleString('de-AT');

  for (const city of cities) {
    const data = await getLiveWeather(city);
    if (!data) continue;

    const embed = createWeatherEmbed(
      data.city,
      data.condition,
      data.temp,
      data.feelsLike,
      data.wind,
      client
    );

    await channel.send({ embeds: [embed] });
  }
}

async function postNewWarnings() {
  const channel = await client.channels.fetch(warningsChannelId);
  const warnings = await getWarnings();

  for (const warn of warnings) {
    const embed = {
      title: `🚨 Unwetterwarnung für ${warn.region}`,
      description: `${warn.event}\n\nGültig von: ${warn.start}\nBis: ${warn.end}`,
      color: warn.level.toLowerCase() === 'rot' ? 0xFF0000 :
             warn.level.toLowerCase() === 'gelb' ? 0xFFFF00 :
             0xFFA500,
      timestamp: new Date(),
      fields: [
        { name: 'Stufe', value: warn.level, inline: true }
      ],
    };

    await channel.send({ embeds: [embed] });
  }
}

async function getMeteoAlarmWarnings() {
  try {
    const response = await axios.get(METEOALARM_FEED_URL);
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });
    const json = parser.parse(response.data);
    const entries = json.feed.entry || [];

    // Filter für Österreich und Waidhofen an der Ybbs
    const relevantEntries = entries.filter(entry => {
      const areaDesc = entry['cap:areaDesc'] || '';
      return areaDesc.includes('Austria') || areaDesc.includes('Waidhofen');
    });

    return relevantEntries;
  } catch (error) {
    console.error('Fehler beim Laden des MeteoAlarm-Feeds:', error.message);
    return [];
  }
}

async function postMeteoAlarmWarnings() {
  const channel = await client.channels.fetch(warningsChannelId);
  const entries = await getMeteoAlarmWarnings();

  for (const entry of entries) {
    const severity = (entry['cap:severity'] || '').toLowerCase();
    let color = 0x808080;
    if (severity === 'red') color = 0xFF0000;
    else if (severity === 'orange') color = 0xFFA500;
    else if (severity === 'yellow') color = 0xFFFF00;
    else if (severity === 'green') color = 0x00FF00;
    else if (severity === 'blue') color = 0x0000FF;

    const embed = {
      title: `🚨 ${entry.title}`,
      description: entry.content || 'Keine Beschreibung verfügbar',
      color,
      fields: [
        { name: 'Region', value: entry['cap:areaDesc'] || 'Unbekannt', inline: true },
        { name: 'Gültig von', value: entry['cap:effective'] || 'Unbekannt', inline: true },
        { name: 'Gültig bis', value: entry['cap:expires'] || 'Unbekannt', inline: true },
        { name: 'Schweregrad', value: entry['cap:severity'] || 'Unbekannt', inline: true },
      ],
      timestamp: new Date(),
    };

    await channel.send({ embeds: [embed] });
  }
}

client.login(process.env.BOT_TOKEN_WETTER);
