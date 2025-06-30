// index.js
const { Client, GatewayIntentBits, Partials, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  partials: [Partials.Channel]
});

const CATEGORY_ID = '1377635882403889182';
const TICKET_CHANNEL_ID = '1378069063963512876';
const LOG_CHANNEL_ID = '1389272323504472164';
const ROLE_ID = '1151994850116382883';

const moduleGroups = {
  FWBW: [{ label: 'Modul - Feuerwehrbasiswissen (FWBW)', value: 'FWBW' }],
  TE: [
    { label: 'Modul - Grundlagen der Technik (TE10)', value: 'TE10' },
    { label: 'Modul - Menschenrettung aus KFZ (TE20)', value: 'TE20' },
    { label: 'Modul - Menschenrettung mit Zug- und Hebemittel (TE30)', value: 'TE30' },
    { label: 'Modul - Menschenrettung aus Höhen und Tiefen (TE40)', value: 'TE40' }
  ],
  BD: [
    { label: 'Modul - Löschmittelbedarf (BD10)', value: 'BD10' },
    { label: 'Modul - Löschwasserförderung (BD20)', value: 'BD20' },
    { label: 'Modul - Druckbelüftung (BD70)', value: 'BD70' },
    { label: 'Modul - Wärmebildkamera (BD80)', value: 'BD80' }
  ],
  AT: [{ label: 'Modul - Atemschutzgeräteträger (AT)', value: 'AT' }],
  EMA: [
    { label: 'Modul - Einsatzmaschinist B (EMA_B)', value: 'EMA_B' },
    { label: 'Modul - Einsatzmaschinist C (EMA_C)', value: 'EMA_C' },
    { label: 'Modul - Hubrettungsfahrzeug (EMA_C2)', value: 'EMA_C2' }
  ],
  GFÜ: [{ label: 'Modul - Grundlagen Führung (GFÜ)', value: 'GFÜ' }],
  FÜ: [
    { label: 'Modul - Führungsstufe 1 (FÜ10)', value: 'FÜ10' },
    { label: 'Modul - Abschluss Führungsstufe 1 (ASM10)', value: 'ASM10' },
    { label: 'Modul - Abschluss Führungsstufe 2 (FÜ20)', value: 'FÜ20' }
  ],
  NRD: [
    { label: 'Modul - Grundlagen Feuerwehrfunk (NRD10)', value: 'NRD10' },
    { label: 'Modul - Arbeiten in der Einsatzleitung (NRD20)', value: 'NRD20' }
  ],
  SD: [
    { label: 'Modul - Gefahrenerkennung und Selbstschutz (SD10)', value: 'SD10' },
    { label: 'Modul - Gefahrenabwehr 1 (SD20)', value: 'SD20' },
    { label: 'Modul - Schutzanzug praktisch (SD25)', value: 'SD25' },
    { label: 'Modul - Messdienst (SD35)', value: 'SD35' },
    { label: 'Modul - Verhalten bei Einsätzen mit Gasen (SD40)', value: 'SD40' }
  ],
  WD: [
    { label: 'Modul - Grundlagen Wasserdienst (WD10)', value: 'WD10' },
    { label: 'Modul - Fahren mit dem Feuerwehrboot (WD20)', value: 'WD20' }
  ],
  WFBB: [
    { label: 'Modul - Wald- und Flurbrandbekämpfung – Basis (WFBB1)', value: 'WFBB1' },
    { label: 'Modul - Wald- und Flurbrandbekämpfung – Praxis (WFBB2)', value: 'WFBB2' }
  ],
  TBS: [
    { label: 'Modul - Tunnelbrandbekämpfung Straße (TBS20)', value: 'TBS20' },
    { label: 'Modul - Tunnelbrandbekämpfung Straße - Praxis (TBS30)', value: 'TBS30' }
  ]
};

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
  const embed = new EmbedBuilder().setTitle(title).setDescription(description).setColor(0x999999).setTimestamp();
  await logChannel.send({ embeds: [embed] });
};

client.once('ready', async () => {
  const channel = await client.channels.fetch(TICKET_CHANNEL_ID);
  const options = Object.keys(moduleGroups).map(key => ({ label: key, value: key }));
  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder().setCustomId('select_category').setPlaceholder('Wähle einen Bereich...').addOptions(options)
  );

  const embed = new EmbedBuilder()
    .setTitle('📘 Erstelle hier ein Ticket PRO AUSBILDUNG!')
    .setDescription('Wähle zuerst den Bereich aus, dann das genaue Modul.')
    .setColor(0x2f3136);

  await channel.send({ embeds: [embed], components: [row] });
});

client.on('interactionCreate', async interaction => {
  if (interaction.isStringSelectMenu()) {
    if (interaction.customId === 'select_category') {
      const key = interaction.values[0];
      const selectMenu = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`modul_dropdown_${key}`)
          .setPlaceholder('Wähle ein Modul...')
          .addOptions(moduleGroups[key])
      );
      await interaction.reply({ content: `Bitte wähle ein Modul aus dem Bereich **${key}**:`, components: [selectMenu], ephemeral: true });
    } else if (interaction.customId.startsWith('modul_dropdown_')) {
      const key = interaction.customId.replace('modul_dropdown_', '');
      const selected = interaction.values[0];
      const guild = interaction.guild;
      const user = interaction.user;
      const member = interaction.member;

      const ticketChannel = await guild.channels.create({
        name: `${selected} - ${member.displayName}`,
        type: ChannelType.GuildText,
        parent: CATEGORY_ID,
        permissionOverwrites: [
          { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
          { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
          { id: ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
        ]
      });

      const embed = new EmbedBuilder()
        .setTitle(`Neue Ausbildungsanfrage – Modul: ${selected}`)
        .setDescription(`Dies ist eine neue Anfrage für das Modul **${selected}**.\nBitte kümmere dich darum.`)
        .setColor(0x00ff00);

      await ticketChannel.send({
        content: `@rolle`,
        embeds: [embed],
        components: [createControlRow('initial')]
      });

      await logAction(guild, '📥 Neues Ticket erstellt', `Modul: **${selected}**\nErstellt von: <@${member.id}>`);
      await interaction.update({ content: `✅ Dein Ticket wurde erstellt: ${ticketChannel}`, components: [] });
    }
  } else if (interaction.isButton()) {
    const channel = interaction.channel;
    const member = interaction.member;
    const guild = interaction.guild;

    if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) {
      return interaction.reply({ content: '🚫 Du hast keine Berechtigung für diese Aktion.', ephemeral: true });
    }

    const updateButtons = async (status) => {
      const msgs = await channel.messages.fetch({ limit: 10 });
      const botMsg = msgs.find(m => m.author.id === client.user.id && m.components.length);
      if (botMsg) await botMsg.edit({ components: [createControlRow(status)] });
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
