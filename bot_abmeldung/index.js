// index.js
require('dotenv').config();
const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, Events } = require('discord.js');
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
  partials: [Partials.Channel]
});

const abmeldungen = [];

client.once('ready', async () => {
  console.log(`Bot ist bereit als ${client.user.tag}`);

  const channel = await client.channels.fetch('1294002165152481432');
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('abmelden')
      .setLabel('📝 Abmelden')
      .setStyle(ButtonStyle.Primary)
  );

  const message = await channel.send({ content: '📋 **Abmeldung vom Dienst**\nKlicke unten, um dich abzumelden:', components: [row] });
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

    const message = await interaction.channel.send(
      `📋 Abmeldung von ${interaction.member.displayName} eingegangen!\n\n` +
      `🔹 Dienstgrad: ${dienstgrad}\n` +
      `🔹 Zeitraum: ${start} - ${ende}\n\n` +
      `✅ Die Abmeldung wurde erfolgreich registriert.`
    );

    abmeldungen.push({
      messageId: message.id,
      channelId: message.channel.id,
      endDate: endDate
    });

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
      } catch (err) {
        console.error('Fehler beim Löschen:', err);
      }
    }
  }
}

client.login(process.env.DISCORD_BOT_TOKEN);


// .env.example
DISCORD_BOT_TOKEN=dein-bot-token-hier
CHANNEL_ID=1294002165152481432


// package.json
{
  "name": "discord-abmeldebot-js",
  "version": "1.0.0",
  "main": "index.js",
  "type": "module",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "discord.js": "^14.13.0",
    "dotenv": "^16.3.1"
  }
}


// README.md
# Discord Abmelde-Bot (JavaScript Version)

Ein einfacher Discord-Bot in Node.js zur Verwaltung von Abmeldungen mit Button + automatischer Löschung nach Zeitraumende.

## ✅ Features
- UI via Button + Modal (Eingabeformular)
- Automatisch Name des Users
- Nachricht wird gepinnt
- Automatisches Löschen nach Ablauf

## 🚀 Deployment auf Railway
1. Repository auf GitHub erstellen und Code pushen
2. Projekt bei [Railway](https://railway.app) anlegen und mit Repo verknüpfen
3. Unter "Variables" setzen:
   - `DISCORD_BOT_TOKEN`
   - `CHANNEL_ID` = `1294002165152481432`
4. Startbefehl:
```bash
npm start
```

## 📌 Hinweis
- Stelle sicher, dass der Bot die richtigen Berechtigungen hat: `Nachrichten lesen/schreiben`, `Nachrichten verwalten`, `Nachrichten pinnen`
- Datumseingabeformat: `TT.MM.JJJJ`
- Zeitzone: Serverzeit (UTC)
