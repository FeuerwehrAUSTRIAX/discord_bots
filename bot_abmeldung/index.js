require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  Events,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require('discord.js');

const { insertAbmeldung, removeExpiredAbmeldungen } = require('./db');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const CHANNEL_ID = '1294002165152481432';

function convertToISO(dateStr) {
  const match = /^\d{2}\.\d{2}\.\d{4}$/.exec(dateStr);
  if (!match) throw new Error('Ungültiges Datumsformat. Bitte TT.MM.JJJJ verwenden.');
  const [day, month, year] = dateStr.split('.');
  return `${year}-${month}-${day}`;
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('de-AT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

client.once('ready', async () => {
  console.log(`✅ Bot läuft als ${client.user.tag}`);

  await removeExpiredAbmeldungen();

  const channel = await client.channels.fetch(CHANNEL_ID);
  const pinned = await channel.messages.fetchPinned();
  for (const msg of pinned.values()) {
    await msg.unpin();
  }

  const abmeldenButton = new ButtonBuilder()
    .setCustomId('abmelden')
    .setLabel('📌 Abmeldung eintragen')
    .setStyle(ButtonStyle.Primary);

  const row = new ActionRowBuilder().addComponents(abmeldenButton);

  const message = await channel.send({
    content: 'Hier kannst du deine Abmeldung eintragen:',
    components: [row]
  });

  await message.pin();
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isButton() && interaction.customId === 'abmelden') {
    const modal = new ModalBuilder()
      .setCustomId('abmeldungModal')
      .setTitle('Abmeldung eintragen');

    const dienstgrad = new TextInputBuilder()
      .setCustomId('dienstgrad')
      .setLabel('Dienstgrad')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const name = new TextInputBuilder()
      .setCustomId('name')
      .setLabel('Vor- und Nachname')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const von = new TextInputBuilder()
      .setCustomId('von')
      .setLabel('Abmeldung von (TT.MM.JJJJ)')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const bis = new TextInputBuilder()
      .setCustomId('bis')
      .setLabel('Abmeldung bis (TT.MM.JJJJ)')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const uhrzeit = new TextInputBuilder()
      .setCustomId('uhrzeit')
      .setLabel('Uhrzeit (optional)')
      .setStyle(TextInputStyle.Short)
      .setRequired(false);

    modal.addComponents(
      new ActionRowBuilder().addComponents(dienstgrad),
      new ActionRowBuilder().addComponents(name),
      new ActionRowBuilder().addComponents(von),
      new ActionRowBuilder().addComponents(bis),
      new ActionRowBuilder().addComponents(uhrzeit)
    );

    await interaction.showModal(modal);
  }

  if (interaction.isModalSubmit() && interaction.customId === 'abmeldungModal') {
    try {
      const data = {
        dienstgrad: interaction.fields.getTextInputValue('dienstgrad'),
        name: interaction.fields.getTextInputValue('name'),
        von: convertToISO(interaction.fields.getTextInputValue('von')),
        bis: convertToISO(interaction.fields.getTextInputValue('bis')),
        uhrzeit: interaction.fields.getTextInputValue('uhrzeit') || null
      };

      const embed = new EmbedBuilder()
        .setColor(0xff9900)
        .setAuthor({ name: '📌 Abmeldung eingetragen' })
        .setDescription(`**👤 ${data.dienstgrad} ${data.name.toUpperCase()}**`)
        .addFields(
          { name: '📅 Zeitraum', value: `**Von:** ${formatDate(data.von)}\n**Bis:** ${formatDate(data.bis)}${data.uhrzeit ? ` – ${data.uhrzeit}` : ''}` }
        )
        .setFooter({ text: 'Automatische Löschung erfolgt bei Ablauf ⏳' });

      const message = await interaction.channel.send({ embeds: [embed] });

      await message.pin();
      await insertAbmeldung({ ...data, message_id: message.id });
      await interaction.reply({ content: '✅ Abmeldung erfolgreich eingetragen.', ephemeral: true });
    } catch (err) {
      console.error('❌ Fehler beim Eintragen:', err);
      await interaction.reply({ content: '❌ Fehler beim Eintragen der Abmeldung. Bitte TT.MM.JJJJ verwenden.', ephemeral: true });
    }
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
