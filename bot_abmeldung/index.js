import {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  Events
} from 'discord.js';
import dotenv from 'dotenv';
import { insertAbmeldung, getAbgelaufeneAbmeldungen, deleteAbmeldung } from './db.js';

dotenv.config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

client.once('ready', () => {
  console.log(`✅ Bot läuft als ${client.user.tag}`);
  postAbmeldeButton();
  checkAbmeldungen(); // direkt beim Start prüfen
  setInterval(checkAbmeldungen, 1000 * 60 * 60 * 24); // alle 24h
});

// 🔘 Abmelde-Button posten
async function postAbmeldeButton() {
  const channel = await client.channels.fetch(process.env.CHANNEL_ID);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('openAbmeldung')
      .setLabel('📋 Abmeldung eintragen')
      .setStyle(ButtonStyle.Primary)
  );

  await channel.send({
    content: 'Möchtest du dich abmelden? Klicke hier:',
    components: [row]
  });
}

// 📝 Wenn Button geklickt → Modal öffnen
client.on(Events.InteractionCreate, async interaction => {
  if (interaction.isButton() && interaction.customId === 'openAbmeldung') {
    const modal = new ModalBuilder()
      .setCustomId('abmeldungModal')
      .setTitle('Abmeldung eintragen');

    const dienstgrad = new TextInputBuilder()
      .setCustomId('dienstgrad')
      .setLabel('Dienstgrad')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const vorname = new TextInputBuilder()
      .setCustomId('vorname')
      .setLabel('Vorname')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const nachname = new TextInputBuilder()
      .setCustomId('nachname')
      .setLabel('Nachname')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const von = new TextInputBuilder()
      .setCustomId('von')
      .setLabel('Von (YYYY-MM-DD)')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const bis = new TextInputBuilder()
      .setCustomId('bis')
      .setLabel('Bis (YYYY-MM-DD)')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const uhrzeit = new TextInputBuilder()
      .setCustomId('uhrzeit')
      .setLabel('Uhrzeit (optional)')
      .setStyle(TextInputStyle.Short)
      .setRequired(false);

    modal.addComponents(
      new ActionRowBuilder().addComponents(dienstgrad),
      new ActionRowBuilder().addComponents(vorname),
      new ActionRowBuilder().addComponents(nachname),
      new ActionRowBuilder().addComponents(von),
      new ActionRowBuilder().addComponents(bis),
      new ActionRowBuilder().addComponents(uhrzeit)
    );

    await interaction.showModal(modal);
  }

  // 📥 Modal wurde abgesendet
  if (interaction.isModalSubmit() && interaction.customId === 'abmeldungModal') {
    const data = {
      dienstgrad: interaction.fields.getTextInputValue('dienstgrad'),
      vorname: interaction.fields.getTextInputValue('vorname'),
      nachname: interaction.fields.getTextInputValue('nachname'),
      von: interaction.fields.getTextInputValue('von'),
      bis: interaction.fields.getTextInputValue('bis'),
      uhrzeit: interaction.fields.getTextInputValue('uhrzeit') || null,
    };

    const channel = await client.channels.fetch(process.env.CHANNEL_ID);

    const content = `📌 **Abmeldung**\n**${data.dienstgrad} ${data.vorname} ${data.nachname}**\n🕒 **Von:** ${data.von}  **Bis:** ${data.bis}${data.uhrzeit ? ` – ${data.uhrzeit}` : ''}`;

    const msg = await channel.send(content);
    await msg.pin();

    await insertAbmeldung(data, msg.id);
    await interaction.reply({ content: '✅ Abmeldung erfolgreich eingetragen.', ephemeral: true });
  }
});

// 🔁 Check für abgelaufene Abmeldungen
async function checkAbmeldungen() {
  const abmeldungen = await getAbgelaufeneAbmeldungen();
  const channel = await client.channels.fetch(process.env.CHANNEL_ID);

  for (const abmeldung of abmeldungen) {
    try {
      const msg = await channel.messages.fetch(abmeldung.message_id);
      await msg.unpin();
      await msg.delete();
    } catch (e) {
      console.warn(`⚠️ Nachricht ${abmeldung.message_id} nicht gefunden oder gelöscht.`);
    }

    await deleteAbmeldung(abmeldung.id);
    console.log(`🗑️ Abmeldung entfernt: ${abmeldung.vorname} ${abmeldung.nachname}`);
  }
}

client.login(process.env.DISCORD_TOKEN);
