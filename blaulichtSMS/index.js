require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');

// Bot initialisieren mit den nötigen Intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Channel-IDs & Webhook-URL aus .env / Konfiguration
const SOURCE_CHANNEL_ID = '1388070050061221990'; // Wo der Bot zuhört
const WEBHOOK_URL = process.env.WEBHOOK_URL;     // Ziel-Webhook für Weiterleitung

client.once('ready', () => {
  console.log(`✅ Bot ist online als ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  // Ignoriere Bots & falsche Channels
  if (message.author.bot || message.channel.id !== SOURCE_CHANNEL_ID) return;

  try {
    await axios.post(WEBHOOK_URL, {
      content: message.content,
      username: "Blaulicht Relay",
      avatar_url: "https://play-lh.googleusercontent.com/d4rj0bIba7RRA6JvKhazNBz5aHOUaQQTGcZ3Udnbs6NcI2hUD7Nihdr4tT2Xz16B3Q"
    });
    console.log("🔁 Nachricht erfolgreich weitergeleitet.");
  } catch (error) {
    console.error("❌ Fehler beim Webhook:", error.message);
  }
});

// Bot starten
client.login(process.env.DISCORD_BOT_TOKEN);
