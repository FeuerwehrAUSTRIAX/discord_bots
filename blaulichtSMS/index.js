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

client.on('messageCreate', async (message) => {
  if (message.channel.id !== SOURCE_CHANNEL_ID) return;
  if (message.author.bot && !message.webhookId) return;

  // Entfernt Titel und unnötige Zeichen
  const removePrefix = (text) =>
    text
      .replace(/Ehrenamt Alarmierung: FF Wiener Neustadt\s*-*\s*/gi, '')
      .replace(/^(\*{1,2}\s*[-–]*\s*)+/g, '') // entfernt führende ** oder –
      .trim();

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

  const timestamp = new Date().toLocaleString('de-AT', {
    dateStyle: 'short',
    timeStyle: 'short'
  });

  const embed = new EmbedBuilder()
    .setColor(0xE67E22)
    .setTitle('Ehrenamt Alarmierung: FF Wiener Neustadt')
    .setDescription(descriptionText)
    .addFields(
      { name: '📅 Alarmierungszeitpunkt:', value: timestamp, inline: false },
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
      .setStyle(ButtonStyle.Primary)
  );

  try {
    const targetChannel = await client.channels.fetch(TARGET_CHANNEL_ID);
    const sentMessage = await targetChannel.send({ embeds: [embed], components: [buttons] });

    responseTracker.set(sentMessage.id, {
      message: sentMessage,
      coming: [],
      notComing: [],
      late: []
    });

    console.log('📢 Alarmierung mit Buttons gesendet.');
  } catch (err) {
    console.error('❌ Fehler beim Senden:', err.message);
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  const entry = responseTracker.get(interaction.message.id);
  if (!entry) return;

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

  const existingFields = interaction.message.embeds[0].fields;
  const timestampField = existingFields.find(f => f.name.includes('Alarmierungszeitpunkt'));

  const newEmbed = EmbedBuilder.from(interaction.message.embeds[0])
    .setFields(
      { name: timestampField.name, value: timestampField.value, inline: false },
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
