require('dotenv').config();
const { Client, GatewayIntentBits, Events } = require('discord.js');
const fetch = require('node-fetch');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const SOURCE_CHANNEL_ID = '1294270461256929290';
const WEBHOOK_URL = process.env.WEBHOOK_URL;

client.once(Events.ClientReady, () => {
  console.log(`✅ Bot ist online als ${client.user.tag}`);
});

client.on(Events.MessageCreate, async (message) => {
  // Nur bestimmte Channel verarbeiten
  if (message.channel.id !== SOURCE_CHANNEL_ID) return;

  // Ignoriere nur echte Bots – aber NICHT Webhook-Nachrichten
  if (message.author.bot && !message.webhookId) return;

  // Logge die eingehende Nachricht
  console.log('📥 Neue Nachricht empfangen:', {
    author: message.author.username,
    content: message.content,
    embeds: message.embeds.length
  });

  // Bereite den Payload für die Webhook-Weiterleitung vor
  const payload = {
    username: 'EmergencyDispatch',
    content: message.content || null,
    embeds: message.embeds.length > 0 ? message.embeds.map(e => e.toJSON()) : null
  };

  // Sende an Webhook
  try {
    if (!WEBHOOK_URL) {
      console.warn('⚠️ WEBHOOK_URL ist nicht gesetzt – Nachricht nicht weitergeleitet.');
      return;
    }

    await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    console.log('📨 Nachricht erfolgreich weitergeleitet.');
  } catch (error) {
    console.error('❌ Fehler beim Weiterleiten:', error);
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
