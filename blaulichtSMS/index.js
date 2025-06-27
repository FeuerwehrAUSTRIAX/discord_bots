require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Collection
} = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const SOURCE_CHANNEL_ID = '1388070050061221990';
const TARGET_CHANNEL_ID = '1294003170116239431';

const responseTracker = new Collection();

client.once('ready', () => {
  console.log(`✅ Bot ist online als ${client.user.tag}`);
});

const removePrefix = (text) =>
  text
    .replace(/Ehrenamt Alarmierung: FF Wiener Neustadt\s*-*\s*/gi, '')
    .replace(/^(\*{1,2}\s*[-–]*\s*)+/g, '')
    .trim();

async function sendAlarmMessage(client, targetChannelId, contentText) {
  const timestamp = new Date().toLocaleString('de-AT', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Europe/Vienna'
  }).replace(',', ' –');

  const embed = new EmbedBuilder()
    .setColor(0xE67E22)
    .setTitle('Ehrenamt Alarmierung: FF Wiener Neustadt')
    .setDescription(`${contentText}\n\n${timestamp}`)
    .addFields(
      { name: '✅ Zusagen', value: 'Niemand bisher', inline: true },
      { name: '❌ Absagen', value: 'Niemand bisher', inline: true },
      { name: '🟠 Komme später', value: 'Niemand bisher', inline: true }
    );

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('come_yes')
      .setLabel('✅ Ich komme')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('come_no')
      .setLabel('❌ Ich komme nicht')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('come_late')
      .setLabel('🟠 Ich komme später')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('nachalarm')
      .setLabel('📨 Nachalarmieren')
      .setStyle(ButtonStyle.Secondary)
  );

  const targetChannel = await client.channels.fetch(targetChannelId);
  const sentMessage = await targetChannel.send({ embeds: [embed], components: [buttons] });

  responseTracker.set(sentMessage.id, {
    message: sentMessage,
    coming: [],
    notComing: [],
    late: []
  });

  console.log('🚨 Alarmierung gesendet.');
}

client.on('messageCreate', async (message) => {
  if (message.channel.id !== SOURCE_CHANNEL_ID) return;
  if (message.author.bot && !message.webhookId) return;

  let descriptionText = '';
  if (message.content?.trim()) {
    descriptionText = removePrefix(message.content.trim());
  } else if (message.embeds.length > 0) {
    const firstEmbed = message.embeds[0];
    if (firstEmbed.title || firstEmbed.description) {
      descriptionText = [
        firstEmbed.title ? removePrefix(firstEmbed.title) : '',
        firstEmbed.description ? removePrefix(firstEmbed.description) : ''
      ].filter(Boolean).join('\n\n');
    } else {
      descriptionText = '🔗 Nachricht enthält ein eingebettetes Element.';
    }
  } else if (message.attachments.size > 0) {
    const attachment = message.attachments.first();
    descriptionText = `📎 Anhang: ${attachment.name || attachment.url}`;
  } else {
    descriptionText = '⚠️ Kein sichtbarer Nachrichtentext vorhanden.';
  }

  await sendAlarmMessage(client, TARGET_CHANNEL_ID, descriptionText);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  if (interaction.customId === 'nachalarm') {
    const oldContent = interaction.message.embeds[0].description?.split('\n\n')[0] ?? '⚠️ Kein Text gefunden';
    await sendAlarmMessage(client, TARGET_CHANNEL_ID, oldContent);
    await interaction.reply({ content: 'Nachalarmierung gesendet 🚨', ephemeral: true });
    return;
  }

  let entry = responseTracker.get(interaction.message.id);

  // Dynamisch nachladen, falls nicht vorhanden
  if (!entry) {
    responseTracker.set(interaction.message.id, {
      message: interaction.message,
      coming: [],
      notComing: [],
      late: []
    });
    entry = responseTracker.get(interaction.message.id);
  }

  const userId = interaction.user.id;

  entry.coming = entry.coming.filter(id => id !== userId);
  entry.notComing = entry.notComing.filter(id => id !== userId);
  entry.late = entry.late.filter(id => id !== userId);

  if (interaction.customId === 'come_yes') {
    entry.coming.push(userId);
  } else if (interaction.customId === 'come_no') {
    entry.notComing.push(userId);
  } else if (interaction.customId === 'come_late') {
    entry.late.push(userId);
  }

  const originalEmbed = interaction.message.embeds[0];

  const newEmbed = EmbedBuilder.from(originalEmbed)
    .setFields(
      {
        name: '✅ Zusagen',
        value: entry.coming.length > 0
          ? entry.coming.map(id => `• <@${id}>`).join('\n')
          : 'Niemand bisher',
        inline: true
      },
      {
        name: '❌ Absagen',
        value: entry.notComing.length > 0
          ? entry.notComing.map(id => `• <@${id}>`).join('\n')
          : 'Niemand bisher',
        inline: true
      },
      {
        name: '🟠 Komme später',
        value: entry.late.length > 0
          ? entry.late.map(id => `• <@${id}>`).join('\n')
          : 'Niemand bisher',
        inline: true
      }
    );

  await entry.message.edit({ embeds: [newEmbed] });
  await interaction.reply({ content: 'Antwort gespeichert 🙌', ephemeral: true });
});

client.login(process.env.DISCORD_BOT_TOKEN);
