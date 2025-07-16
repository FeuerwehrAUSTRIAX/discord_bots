const { Client, GatewayIntentBits, Events } = require('discord.js');
const fetch = require('node-fetch');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Channel-ID, aus dem die Nachrichten abgefangen werden sollen
const SOURCE_CHANNEL_ID = '1294270461256929290';

// Webhook-Ziel
const WEBHOOK_URL = 'https://discord.com/api/webhooks/1065019837119746159/3pJD_fMnhlVpAqwM1YGMzVOg3yVazpcGH_N7pF4rvNyPWrG6tbChNhOvWfgVAfGjJyR6';

client.once(Events.ClientReady, () => {
  console.log(`✅ Bot ist online als ${client.user.tag}`);
});

client.on(Events.MessageCreate, async (message) => {
  if (message.channel.id !== SOURCE_CHANNEL_ID) return;
  if (message.author.bot) return;

  const payload = {
    username: 'EmergencyDispatch',
    content: message.content || null,
    embeds: message.embeds.length > 0 ? message.embeds.map(e => e.toJSON()) : null,
  };

  try {
    await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    console.log('📨 Nachricht weitergeleitet');
  } catch (error) {
    console.error('❌ Fehler beim Weiterleiten:', error);
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
