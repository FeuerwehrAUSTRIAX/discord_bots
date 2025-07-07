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

client.once('ready', async () => {
  console.log(`✅ Bot läuft als ${client.user.tag}`);

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
      .setLabel('Abmeldung von (JJJJ-MM-TT)')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const bis = new TextInputBuilder()
      .setCustomId('bis')
      .setLabel('Abmeldung bis (JJJJ-MM-TT)')
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
    const data = {
      dienstgrad: interaction.fields.getTextInputValue('dienstgrad'),
      name: interaction.fields.getTextInputValue('name'),
      von: interaction.fields.getTextInputValue('von'),
      bis: interaction.fields.getTextInputValue('bis'),
      uhrzeit: interaction.fields.getTextInputValue('uhrzeit') || null
    };

    try {
      const message = await interaction.channel.send({
        content: `📌 **Abmeldung**\n**${data.dienstgrad} ${data.name}**\n🕒 **Von:** ${data.von}  **Bis:** ${data.bis}${data.uhrzeit ? ` – ${data.uhrzeit}` : ''}`
      });

      await message.pin();
      await insertAbmeldung({ ...data, message_id: message.id });
      await interaction.reply({ content: '✅ Abmeldung erfolgreich eingetragen.', ephemeral: true });
    } catch (err) {
      console.error('❌ Fehler beim Eintragen:', err);
      await interaction.reply({ content: '❌ Fehler beim Eintragen der Abmeldung.', ephemeral: true });
    }
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
