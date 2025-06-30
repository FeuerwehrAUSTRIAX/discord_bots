// index.js
const { Client, GatewayIntentBits, Partials, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  partials: [Partials.Channel]
});

const CATEGORY_ID = '1377635882403889182';
const TICKET_CHANNEL_ID = '1378069063963512876';
const LOG_CHANNEL_ID = 'DEINE_LOG_CHANNEL_ID'; // <-- hier die Logchannel-ID eintragen

const moduleGroups = { /* ... unverändert ... */ };

const createControlRow = (status = 'initial') => {
  const buttons = [];
  if (status === 'initial') {
    buttons.push(new ButtonBuilder().setCustomId('übernehmen').setLabel('✅ Übernehmen').setStyle(ButtonStyle.Success));
  }
  if (status === 'übernommen') {
    buttons.push(new ButtonBuilder().setCustomId('freigeben').setLabel('🔁 Freigeben').setStyle(ButtonStyle.Primary));
    buttons.push(new ButtonBuilder().setCustomId('schliessen').setLabel('🔒 Schließen').setStyle(ButtonStyle.Danger));
  }
  if (status === 'geschlossen') {
    buttons.push(new ButtonBuilder().setCustomId('oeffnen').setLabel('🔓 Wieder öffnen').setStyle(ButtonStyle.Secondary));
    buttons.push(new ButtonBuilder().setCustomId('loeschen').setLabel('🗑️ Löschen').setStyle(ButtonStyle.Secondary));
  }
  return new ActionRowBuilder().addComponents(buttons);
};

const logAction = async (guild, title, description) => {
  const logChannel = await guild.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
  if (!logChannel) return;
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(0x999999)
    .setTimestamp();
  await logChannel.send({ embeds: [embed] });
};

client.once('ready', async () => { /* ... unverändert ... */ });

client.on('interactionCreate', async interaction => {
  if (interaction.isStringSelectMenu()) { /* ... unverändert bis zur Ticketerstellung ... */

      await ticketChannel.send({
        content: `@rolle`,
        embeds: [embed],
        components: [createControlRow('initial')]
      });

      await logAction(guild, '📥 Neues Ticket erstellt', `Modul: **${selected}**\nErstellt von: <@${member.id}>`);
    }
  } else if (interaction.isButton()) {
    const channel = interaction.channel;
    const member = interaction.member;
    const guild = interaction.guild;

    if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return interaction.reply({ content: '🚫 Du hast keine Berechtigung für diese Aktion.', ephemeral: true });
    }

    const updateButtons = async (status) => {
      await channel.messages.fetch({ limit: 10 }).then(async msgs => {
        const botMsg = msgs.find(m => m.author.id === client.user.id && m.components.length);
        if (botMsg) await botMsg.edit({ components: [createControlRow(status)] });
      });
    };

    if (interaction.customId === 'übernehmen') {
      await channel.send(`✅ Ticket übernommen von: ${member.displayName}`);
      await updateButtons('übernommen');
      await logAction(guild, '✅ Ticket übernommen', `${channel} von ${member}`);
    } else if (interaction.customId === 'freigeben') {
      await channel.send(`🔁 Ticket wurde wieder freigegeben.`);
      await updateButtons('initial');
      await logAction(guild, '🔁 Ticket freigegeben', `${channel} von ${member}`);
    } else if (interaction.customId === 'schliessen') {
      await channel.send('🔒 Ticket wurde geschlossen.');
      await channel.permissionOverwrites.set([]);
      await updateButtons('geschlossen');
      await logAction(guild, '🔒 Ticket geschlossen', `${channel} von ${member}`);
    } else if (interaction.customId === 'oeffnen') {
      await channel.permissionOverwrites.set([]);
      await channel.send('🔓 Ticket wurde wieder geöffnet.');
      await updateButtons('übernommen');
      await logAction(guild, '🔓 Ticket wieder geöffnet', `${channel} von ${member}`);
    } else if (interaction.customId === 'loeschen') {
      await interaction.reply({ content: '🗑️ Ticket wird gelöscht...', ephemeral: true });
      await logAction(guild, '🗑️ Ticket gelöscht', `${channel} von ${member}`);
      setTimeout(() => channel.delete().catch(() => {}), 2000);
    }
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
