require('dotenv').config();
const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Events } = require('discord.js');
const axios = require('axios');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

const SOURCE_CHANNEL_ID = '1388070050061221990';
const TARGET_WEBHOOK_URL = 'https://discord.com/api/webhooks/1388070367268044810/WxsLdR9tsaV4tl7W5RMK5EDKam-jceBBEtHW74pNoQA818LSmKAZfil3wXon1V621HIx';

let lastMessageId = null;
let responses = {
  kommen: [],
  nicht_kommen: [],
  spaeter: []
};

client.once(Events.ClientReady, () => {
  console.log(`✅ Bot ist online als ${client.user.tag}`);
});

client.on(Events.MessageCreate, async (message) => {
  if (message.channel.id !== SOURCE_CHANNEL_ID || message.author.bot) return;

  const embed = new EmbedBuilder()
    .setTitle('📟 Ehrenamt Alarmierung: FF Wiener Neustadt')
    .setDescription(message.content)
    .setColor(0xFF6600)
    .setFooter({ text: 'Antwortmöglichkeiten siehe unten', iconURL: client.user.displayAvatarURL() });

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('kommen')
      .setLabel('✅ Ich komme')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('nicht_kommen')
      .setLabel('❌ Ich komme nicht')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('spaeter')
      .setLabel('🕒 Ich komme später')
      .setStyle(ButtonStyle.Secondary)
  );

  try {
    const res = await axios.post(TARGET_WEBHOOK_URL, {
      username: 'blaulichtSMS',
      avatar_url: 'https://play-lh.googleusercontent.com/4zV9nla3sWNIe1w6egIXucVeqr0KI826kquJpKjb8ZGrzyyzjwqG6vkB5DpBjTrz1Uic',
      embeds: [embed.toJSON()],
      components: [buttons.toJSON()]
    });

    lastMessageId = res.data.id;
    responses = { kommen: [], nicht_kommen: [], spaeter: [] };

  } catch (error) {
    console.error('❌ Fehler beim Senden:', error.response?.data || error.message);
  }
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isButton()) return;

  const displayName = interaction.member?.nickname || interaction.user.username;

  const alreadyResponded = Object.values(responses).some(arr => arr.includes(displayName));
  if (!alreadyResponded) {
    if (interaction.customId === 'kommen') responses.kommen.push(displayName);
    if (interaction.customId === 'nicht_kommen') responses.nicht_kommen.push(displayName);
    if (interaction.customId === 'spaeter') responses.spaeter.push(displayName);
  }

  const newEmbed = EmbedBuilder.from(interaction.message.embeds[0])
    .setFields([
      {
        name: `✅ Ich komme (${responses.kommen.length})`,
        value: responses.kommen.join('\n') || 'Niemand',
        inline: true
      },
      {
        name: `❌ Ich komme nicht (${responses.nicht_kommen.length})`,
        value: responses.nicht_kommen.join('\n') || 'Niemand',
        inline: true
      },
      {
        name: `🕒 Ich komme später (${responses.spaeter.length})`,
        value: responses.spaeter.join('\n') || 'Niemand',
        inline: true
      }
    ]);

  try {
    await interaction.update({ embeds: [newEmbed] });
  } catch (err) {
    console.error('❌ Fehler bei Button-Antwort:', err.message);
  }
});

client.login(process.env.DISCORD_TOKEN);
