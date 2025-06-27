// index.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const {
  Client,
  GatewayIntentBits,
  Partials,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ChannelType,
  Events,
  EmbedBuilder
} = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMembers],
  partials: [Partials.Channel]
});

const abmeldungenFile = path.join(__dirname, 'abmeldungen.json');
let abmeldungen = [];

function loadAbmeldungen() {
  if (fs.existsSync(abmeldungenFile)) {
    try {
      const data = fs.readFileSync(abmeldungenFile, 'utf-8');
      abmeldungen = JSON.parse(data).map(entry => ({
        ...entry,
        endDate: new Date(entry.endDate)
      }));
    } catch (err) {
      console.error('❌ Fehler beim Laden der Abmeldungen:', err);
    }
  }
}

function saveAbmeldungen() {
  fs.writeFileSync(abmeldungenFile, JSON.stringify(abmeldungen, null, 2));
}

loadAbmeldungen();

client.once('ready', async () => {
  console.log(`✅ Bot gestartet als ${client.user.tag}`);

  const guild = await client.guilds.fetch('1151964334977712141');
  await guild.members.fetch();

  const rolesOrdered = [
    { name: 'Kommando', id: '1151993518722654269' },
    { name: 'Verwaltung', id: '1340302450795741265' },
    { name: 'Chargen', id: '1151968107984859156' },
    { name: 'Mannschaft', id: '1151993527111254168' },
    { name: 'FFWN', id: '1293999568991555667' }
  ];

  const categoryId = '1384578209722404884';
  const voiceChannels = {};

  let timestampChannel = guild.channels.cache.find(
    (ch) =>
      ch.type === ChannelType.GuildVoice &&
      ch.parentId === categoryId &&
      ch.name.startsWith('Letztes Update:')
  );

  if (!timestampChannel) {
    timestampChannel = await guild.channels.create({
      name: `Letztes Update: wird geladen...`,
      type: ChannelType.GuildVoice,
      parent: categoryId,
      position: 0
    });
    console.log(`🕒 Erstellt: ${timestampChannel.name}`);
  }

  const ensureChannels = async () => {
    for (const role of rolesOrdered) {
      let existing = guild.channels.cache.find(
        (ch) =>
          ch.type === ChannelType.GuildVoice &&
          ch.parentId === categoryId &&
          ch.name.startsWith(role.name)
      );

      if (!existing) {
        existing = await guild.channels.create({
          name: `${role.name}: wird geladen...`,
          type: ChannelType.GuildVoice,
          parent: categoryId,
          position: 1
        });
        console.log(`🆕 Erstellt: ${existing.name}`);
      }

      voiceChannels[role.name] = existing;
    }
  };

  const updateCounts = async () => {
    try {
      await guild.members.fetch();
      const now = new Date();
      const timestamp = now.toLocaleString('de-DE', { timeZone: 'Europe/Vienna' });
      console.log(`🔄 Update – ${timestamp}`);

      if (timestampChannel) {
        await timestampChannel.setName(`Letztes Update: ${timestamp}`);
      }

      for (const role of rolesOrdered) {
        const r = guild.roles.cache.get(role.id);
        const count = r?.members?.size || 0;
        const channel = voiceChannels[role.name];

        if (channel) {
          await channel.setName(`${role.name}: ${count}`);
          console.log(`➡️ ${role.name}: ${count}`);
        }
      }
    } catch (err) {
      console.error('❌ Fehler beim Aktualisieren:', err);
    }
  };

  await ensureChannels();
  await updateCounts();
  setInterval(updateCounts, 5 * 60 * 1000);

  const abmeldeChannel = await client.channels.fetch('1294002165152481432');
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('abmelden')
      .setLabel('📝 Abmelden')
      .setStyle(ButtonStyle.Primary)
  );

  const abmeldeEmbed = new EmbedBuilder()
    .setTitle('📋 Abmeldung vom Dienst')
    .setDescription('Klicke unten, um dich abzumelden:')
    .setColor(0x5865F2)
    .setFooter({ text: 'Nur autorisierte Mitglieder können sich abmelden.' });

  const message = await abmeldeChannel.send({
    embeds: [abmeldeEmbed],
    components: [row]
  });
  await message.pin();

  setInterval(checkExpiredAbmeldungen, 60 * 1000);
});

client.on(Events.InteractionCreate, async interaction => {
  if (interaction.isButton() && interaction.customId === 'abmelden') {
    const modal = new ModalBuilder()
      .setCustomId('abmeldung_modal')
      .setTitle('Abmeldung einreichen')
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('dienstgrad')
            .setLabel('Dienstgrad')
            .setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('start')
            .setLabel('Startdatum (TT.MM.JJJJ)')
            .setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('ende')
            .setLabel('Enddatum (TT.MM.JJJJ)')
            .setStyle(TextInputStyle.Short)
        )
      );

    await interaction.showModal(modal);
  }

  if (interaction.isModalSubmit() && interaction.customId === 'abmeldung_modal') {
    const dienstgrad = interaction.fields.getTextInputValue('dienstgrad');
    const start = interaction.fields.getTextInputValue('start');
    const ende = interaction.fields.getTextInputValue('ende');

    const startDate = parseDate(start);
    const endDate = parseDate(ende);
    if (!startDate || !endDate) {
      return interaction.reply({ content: '❌ Ungültiges Datum!', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle(`📋 Abmeldung von ${interaction.member.displayName}`)
      .addFields(
        { name: '🔹 Dienstgrad', value: dienstgrad, inline: true },
        { name: '🔹 Zeitraum', value: `${start} - ${ende}`, inline: true }
      )
      .setColor(0x2ecc71)
      .setFooter({ text: '✅ Die Abmeldung wurde erfolgreich registriert.' })
      .setTimestamp();

    const message = await interaction.channel.send({ embeds: [embed] });

    abmeldungen.push({
      messageId: message.id,
      channelId: message.channel.id,
      endDate: endDate
    });

    saveAbmeldungen();

    await interaction.reply({ content: '✅ Deine Abmeldung wurde gespeichert.', ephemeral: true });
  }
});

function parseDate(str) {
  const [day, month, year] = str.split('.').map(Number);
  if (!day || !month || !year) return null;
  return new Date(year, month - 1, day);
}

async function checkExpiredAbmeldungen() {
  const now = new Date();
  for (const abm of [...abmeldungen]) {
    if (now > abm.endDate) {
      try {
        const channel = await client.channels.fetch(abm.channelId);
        const msg = await channel.messages.fetch(abm.messageId);
        await msg.delete();
        abmeldungen.splice(abmeldungen.indexOf(abm), 1);
        saveAbmeldungen();
      } catch (err) {
        console.error('Fehler beim Löschen:', err);
      }
    }
  }
}

client.login(process.env.DISCORD_BOT_TOKEN);
