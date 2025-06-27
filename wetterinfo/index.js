require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const getLiveWeather = require('./getLiveWeather');
const getWarnings = require('./getWarnings');
const createWeatherEmbed = require('./createWeatherEmbed');

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
  setInterval(postWeatherReport, 60 * 60 * 1000); // jede Stunde

  await postNewWarnings();
  setInterval(postNewWarnings, 15 * 60 * 1000); // alle 15 Minuten
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
    const msg = `🚨 **Unwetterwarnung für das Gebiet ${warn.region}**\n` +
                `🔴 **Stufe:** ${warn.level}\n` +
                `🌩️ **${warn.event.toUpperCase()}**\n` +
                `🕒 Gültig: ${warn.start} – ${warn.end}`;
    await channel.send(msg);
  }
}

client.login(process.env.BOT_TOKEN_WETTER);
