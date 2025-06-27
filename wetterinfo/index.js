require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const getLiveWeather = require('./getLiveWeather');
const getWarnings = require('./getWarnings');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

const weatherChannelId = '1388158627768172825';
const warningsChannelId = '1388158584575098900';

const cities = [
  'Wiener Neustadt',
  'Mödling',
  'Hohe Wand',
  'Schneeberg',
  'Wien',
];

client.once('ready', async () => {
  console.log(`✅ Bot eingeloggt als ${client.user.tag}`);

  await postWeatherReport();
  setInterval(postWeatherReport, 60 * 60 * 1000); // stündlich

  await postNewWarnings();
  setInterval(postNewWarnings, 15 * 60 * 1000); // alle 15 Minuten
});

async function postWeatherReport() {
  const channel = await client.channels.fetch(weatherChannelId);
  const now = new Date().toLocaleString('de-AT');

  for (const city of cities) {
    const data = await getLiveWeather(city);
    if (!data) continue;

    const message = `📆 **Wetterbericht – ${now}**\n\n` +
                    `📍 **${city}**\n` +
                    `🌤️ ${data.condition}, ${data.temp}°C (gefühlt ${data.feelsLike}°C)\n` +
                    `💨 Wind: ${data.wind} km/h\n` +
                    `❌ Keine aktuellen Warnungen`;

    await channel.send(message);
  }
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
