// bot.js
require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Collection,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder
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
const NACHALARM_ROLE_ID = '1293999568991555667';

const responseTracker = new Collection();

client.once('ready', () => {
  console.log(`✅ Bot ist online als ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.channel.id !== SOURCE_CHANNEL_ID) return;
  if (message.author.bot && !message.webhookId) return;

  const removePrefix = (text) =>
    text
      .replace(/Ehrenamt Alarmierung: FF Wiener Neustadt\s*-*\s*/gi, '')
      .replace(/^(\*{1,2}\s*[-–]*\s*)+/g, '')
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
    .setDescription(`${descriptionText}\n\n${timestamp}`)
    .addFields(
      { name: '✅ Zusagen', value: 'Niemand bisher', inline: true },
      { name: '❌ Absagen', value: 'Niemand bisher', inline: true },
      { name: '🟠 Komme später', value: 'Niemand bisher', inline: true }
    );

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('come_yes').setLabel('✅ Ich komme').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('come_no').setLabel('❌ Ich komme nicht').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('come_late').setLabel('🟠 Ich komme später').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('come_repeat').setLabel('🔁 Nachalarmieren').setStyle(ButtonStyle.Secondary)
  );

  try {
    const targetChannel = await client.channels.fetch(TARGET_CHANNEL_ID);
    const sentMessage = await targetChannel.send({ embeds: [embed], components: [buttons] });

    responseTracker.set(sentMessage.id, {
      message: sentMessage,
      coming: [],
      notComing: [],
      late: [],
      nachalarmiert: false
    });

    console.log('📢 Alarmierung mit Buttons gesendet.');
  } catch (err) {
    console.error('❌ Fehler beim Senden:', err.message);
  }
});

client.on('interactionCreate', async (interaction) => {
  if (interaction.isButton()) {
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
    } else if (interaction.customId === 'come_repeat') {
      if (entry.nachalarmiert) {
        return interaction.reply({ content: '⚠️ Es wurde bereits nachalarmiert.', ephemeral: true });
      }

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`select_alarmtype_${interaction.message.id}`)
        .setPlaceholder('Alarmtyp auswählen...')
        .addOptions(
          new StringSelectMenuOptionBuilder().setLabel('Stiller Alarm').setValue('Stiller Alarm'),
          new StringSelectMenuOptionBuilder().setLabel('Sirenenalarm').setValue('Sirenenalarm')
        );

      const row = new ActionRowBuilder().addComponents(selectMenu);

      return interaction.reply({
        content: 'Bitte wähle den Alarmtyp:',
        components: [row],
        ephemeral: true
      });
    }

    const originalEmbed = interaction.message.embeds[0];
    const newEmbed = EmbedBuilder.from(originalEmbed).setFields(
      {
        name: '✅ Zusagen',
        value: entry.coming.length > 0 ? entry.coming.map(id => `• <@${id}>`).join('\n') : 'Niemand bisher',
        inline: true
      },
      {
        name: '❌ Absagen',
        value: entry.notComing.length > 0 ? entry.notComing.map(id => `• <@${id}>`).join('\n') : 'Niemand bisher',
        inline: true
      },
      {
        name: '🟠 Komme später',
        value: entry.late.length > 0 ? entry.late.map(id => `• <@${id}>`).join('\n') : 'Niemand bisher',
        inline: true
      }
    );

    await entry.message.edit({ embeds: [newEmbed] });
    await interaction.reply({ content: 'Antwort gespeichert 🙌', ephemeral: true });
  }

  if (interaction.isStringSelectMenu() && interaction.customId.startsWith('select_alarmtype_')) {
    const selectedAlarmtype = interaction.values[0];
    const messageId = interaction.customId.split('select_alarmtype_')[1];
    const entry = responseTracker.get(messageId);
    if (!entry) return;

    entry.selectedAlarmtype = selectedAlarmtype;

    const modal = new ModalBuilder()
      .setCustomId(`nachalarmieren_modal_${messageId}`)
      .setTitle('Nachalarmieren');

    const stichwortInput = new TextInputBuilder().setCustomId('stichwort').setLabel('Stichwort').setStyle(TextInputStyle.Short).setRequired(true);
    const adresseInput = new TextInputBuilder().setCustomId('adresse').setLabel('Adresse').setStyle(TextInputStyle.Short).setRequired(true);
    const infoInput = new TextInputBuilder().setCustomId('info').setLabel('Weitere Infos').setStyle(TextInputStyle.Paragraph).setRequired(false);

    modal.addComponents(
      new ActionRowBuilder().addComponents(stichwortInput),
      new ActionRowBuilder().addComponents(adresseInput),
      new ActionRowBuilder().addComponents(infoInput)
    );

    await interaction.showModal(modal);
  }

  if (interaction.isModalSubmit() && interaction.customId.startsWith('nachalarmieren_modal_')) {
    const messageId = interaction.customId.replace('nachalarmieren_modal_', '');
    const entry = responseTracker.get(messageId);
    if (!entry || !entry.selectedAlarmtype) {
      return interaction.reply({ content: '⚠️ Fehler beim Nachalarmieren (kein Alarmtyp)', ephemeral: true });
    }

    const alarmtype = entry.selectedAlarmtype;
    const stichwort = interaction.fields.getTextInputValue('stichwort');
    const adresse = interaction.fields.getTextInputValue('adresse');
    const info = interaction.fields.getTextInputValue('info');

    const embed = new EmbedBuilder()
      .setColor(0xff9900)
      .setTitle('📣 Nachalarmierung: FF Wiener Neustadt')
      .setDescription(`**${alarmtype}** für FF Wiener Neustadt: ${stichwort} WIENER NEUSTADT-OT // ${adresse} // ${info}`)
      .addFields(
        { name: '✅ Zusagen', value: 'Niemand bisher', inline: true },
        { name: '❌ Absagen', value: 'Niemand bisher', inline: true },
        { name: '🟠 Komme später', value: 'Niemand bisher', inline: true }
      );

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('come_yes').setLabel('✅ Ich komme').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('come_no').setLabel('❌ Ich komme nicht').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('come_late').setLabel('🟠 Ich komme später').setStyle(ButtonStyle.Primary)
    );

    const targetChannel = await client.channels.fetch(TARGET_CHANNEL_ID);
    const sentMessage = await targetChannel.send({
      content: `<@&${NACHALARM_ROLE_ID}>`,
      embeds: [embed],
      components: [buttons],
      allowedMentions: { parse: ['roles'] }
    });

    responseTracker.set(sentMessage.id, {
      message: sentMessage,
      coming: [],
      notComing: [],
      late: [],
      nachalarmiert: true
    });

    const updatedButtons = ActionRowBuilder.from(entry.message.components[0]);
    const repeatButton = updatedButtons.components.find(btn => btn.data.custom_id === 'come_repeat');
    if (repeatButton) repeatButton.setDisabled(true);
    await entry.message.edit({ components: [updatedButtons] });
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
