require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const getLiveWeather = require('./getLiveWeather');
const getWarnings = require('./getWarnings');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

// Textchannel-IDs für Wetter und Warnungen
const weatherChannelId = '1388158627768172825';
const warningsChannelId = '1388158584575098900';

// Orte
const cities = [
  'Wiener Neustadt',
  'Mödling',
  'Hohe Wand',
  'Schneeberg',
  'Wien',
];

client.once('ready', async () => {
  console.log(`✅ Bot eingeloggt als ${client.user.tag}`);

  // Starte sofort & dann jede Stunde Wetterbericht
  await postWeatherReport();
  setInterval(postWeatherReport, 60 * 60 * 1000);

  // Starte sofort & dann alle 15 Minuten auf Warnungen prüfen
  await postNewWarnings();
  setInterval(postNewWarnings, 15 * 60 * 1000);
});

async function postWeatherReport() {
  const channel = await client.channels.fetch(weatherChannelId);
  const now = new Date().toLocaleString('de-AT');
  let message = `📆 **Wetterbericht – ${now}**\n\n`;

  for (const city of cities) {
    const data = await getLiveWeather(city);
    if (!data) continue;

    message += `📍 **${city}**\n`;
    message += `🌤️ ${data.condition}, ${data.temp}°C (gefühlt ${data.feelsLike}°C)\n`;
    message += `💨 Wind: ${data.wind} km/h\n`;
    message += `❌ Keine aktuellen Warnungen\n\n`;
  }

  await channel.send(message.trim());
}

async function postNewWarnings() {
  const channel = await client.channels.fetch(warningsChannelId);
  const warnings = await getWarnings();

  for (const warn of warnings) {
    const msg = `🚨 **Unwetterwarnung für das Gebiet ${warn.region}**\n` +
                `🔴 **Stufe:** ${warn.level}\n` +
                `🌩️ **${warn.event.toUpperCase()}**\n` +
                `🕒 Gültig: ${warn.start} – ${warn.end}`;
    await channel.send(msg);
  }
}

client.login(process.env.BOT_TOKEN_WETTER);
