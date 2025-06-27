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

const SOURCE_CHANNEL_ID = '1388070050061221990'; // Dein Eingangs-Channel
const TARGET_CHANNEL_ID = '1294003170116239431'; // Zielkanal mit Buttons

// Antwort-Speicher pro Nachricht
const responseTracker = new Collection();

client.once('ready', () => {
  console.log(`✅ Bot ist online als ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot || message.channel.id !== SOURCE_CHANNEL_ID) return;

  const embed = new EmbedBuilder()
    .setColor(0xE67E22)
    .setTitle('Ehrenamt Alarmierung: FF Wiener Neustadt')
    .setDescription(message.content)
    .addFields(
      { name: '✅ Zusagen', value: 'Niemand bisher', inline: true },
      { name: '❌ Absagen', value: 'Niemand bisher', inline: true },
      { name: '🟠 Komme später', value: 'Niemand bisher', inline: true }
    )
    .setFooter({ text: new Date().toLocaleString('de-AT') });

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

  const username = interaction.user.username;

  // Entferne alle vorherigen Antworten
  entry.coming = entry.coming.filter(name => name !== username);
  entry.notComing = entry.notComing.filter(name => name !== username);
  entry.late = entry.late.filter(name => name !== username);

  if (interaction.customId === 'come_yes') {
    entry.coming.push(username);
  } else if (interaction.customId === 'come_no') {
    entry.notComing.push(username);
  } else if (interaction.customId === 'come_late') {
    entry.late.push(username);
  }

  const newEmbed = EmbedBuilder.from(interaction.message.embeds[0])
    .setFields(
      {
        name: '✅ Zusagen',
        value: entry.coming.length > 0 ? entry.coming.map(n => `• ${n}`).join('\n') : 'Niemand bisher',
        inline: true
      },
      {
        name: '❌ Absagen',
        value: entry.notComing.length > 0 ? entry.notComing.map(n => `• ${n}`).join('\n') : 'Niemand bisher',
        inline: true
      },
      {
        name: '🟠 Komme später',
        value: entry.late.length > 0 ? entry.late.map(n => `• ${n}`).join('\n') : 'Niemand bisher',
        inline: true
      }
    );

  await entry.message.edit({ embeds: [newEmbed] });
  await interaction.reply({ content: 'Antwort gespeichert 🙌', ephemeral: true });
});

client.login(process.env.DISCORD_BOT_TOKEN);
