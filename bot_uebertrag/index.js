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

// Channel IDs
const CHANNELS = {
  STATUSMELDUNGEN: '1294270461256929290',
  ALARME: '1294270540525080626',
  NOTRUFE: '1294270624255971439'
};

// Webhooks (Statusmeldungen bleibt wie bisher)
const WEBHOOKS = {
  [CHANNELS.STATUSMELDUNGEN]: process.env.WEBHOOK_URL,
  [CHANNELS.ALARME]: process.env.WEBHOOK_ALARME,
  [CHANNELS.NOTRUFE]: process.env.WEBHOOK_NOTRUFE
};

client.once(Events.ClientReady, () => {
  console.log(`✅ Bot ist online als ${client.user.tag}`);
});

client.on(Events.MessageCreate, async (message) => {
  const channelId = message.channel.id;

  // Nur konfigurierte Channels
  if (!Object.keys(WEBHOOKS).includes(channelId)) return;

  // Ignoriere echte Bots, aber nicht Webhooks
  if (message.author.bot && !message.webhookId) return;

  // Logging
  console.log(`📥 Neue Nachricht aus Channel ${channelId}:`, {
    author: message.author.username,
    content: message.content,
    embeds: message.embeds.length
  });

  const payload = {
    username: 'EmergencyDispatch',
    content: message.content || null,
    embeds: message.embeds.length > 0 ? message.embeds.map(e => e.toJSON()) : null
  };

  const webhookUrl = WEBHOOKS[channelId];

  if (!webhookUrl) {
    console.warn(`⚠️ Kein Webhook für Channel ${channelId} konfiguriert.`);
    return;
  }

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    console.log(`📨 Nachricht an Webhook für Channel ${channelId} gesendet.`);
  } catch (error) {
    console.error(`❌ Fehler beim Weiterleiten von Channel ${channelId}:`, error);
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
