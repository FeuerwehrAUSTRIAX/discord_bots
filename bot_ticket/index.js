const {
  Client,
  GatewayIntentBits,
  Partials,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  EmbedBuilder,
  ChannelType,
  PermissionFlagsBits,
  InteractionResponseFlags
} = require('discord.js');
require('dotenv').config();

// IDs
const CATEGORY_ID = '1377635882403889182';
const TICKET_CHANNEL_ID = '1378069063963512876';
const LOG_CHANNEL_ID = '1389272323504472164';
const AUSILDER_ROLE_ID = '1151994850116382883';

// Modulgruppen
const moduleGroups = {
  FWBW: [{ label: 'Modul - Feuerwehrbasiswissen (FWBW)', value: 'FWBW' }],
  TE: [
    { label: 'Modul - Grundlagen der Technik (TE10)', value: 'TE10' },
    { label: 'Modul - Menschenrettung aus KFZ (TE20)', value: 'TE20' },
    { label: 'Modul - Menschenrettung mit Zug- und Hebemittel (TE30)', value: 'TE30' },
    { label: 'Modul - Menschenrettung aus Höhen und Tiefen (TE40)', value: 'TE40' },
  ],
  BD: [
    { label: 'Modul - Löschmittelbedarf (BD10)', value: 'BD10' },
    { label: 'Modul - Löschwasserförderung (BD20)', value: 'BD20' },
    { label: 'Modul - Druckbelüftung (BD70)', value: 'BD70' },
    { label: 'Modul - Wärmebildkamera (BD80)', value: 'BD80' },
  ],
  AT: [{ label: 'Modul - Atemschutzgeräteträger (AT)', value: 'AT' }],
  EMA: [
    { label: 'Modul - Einsatzmaschinist B (EMA_B)', value: 'EMA_B' },
    { label: 'Modul - Einsatzmaschinist C (EMA_C)', value: 'EMA_C' },
    { label: 'Modul - Hubrettungsfahrzeug (EMA_C2)', value: 'EMA_C2' },
  ],
  GFÜ: [{ label: 'Modul - Grundlagen Führung (GFÜ)', value: 'GFÜ' }],
  FÜ: [
    { label: 'Modul - Führungsstufe 1 (FÜ10)', value: 'FÜ10' },
    { label: 'Modul - Abschluss Führungsstufe 1 (ASM10)', value: 'ASM10' },
    { label: 'Modul - Abschluss Führungsstufe 2 (FÜ20)', value: 'FÜ20' },
  ],
  NRD: [
    { label: 'Modul - Grundlagen Feuerwehrfunk (NRD10)', value: 'NRD10' },
    { label: 'Modul - Arbeiten in der Einsatzleitung (NRD20)', value: 'NRD20' },
  ],
  SD: [
    { label: 'Modul - Gefahrenerkennung und Selbstschutz (SD10)', value: 'SD10' },
    { label: 'Modul - Gefahrenabwehr 1 (SD20)', value: 'SD20' },
    { label: 'Modul - Schutzanzug praktisch (SD25)', value: 'SD25' },
    { label: 'Modul - Messdienst (SD35)', value: 'SD35' },
    { label: 'Modul - Verhalten bei Einsätzen mit Gasen (SD40)', value: 'SD40' },
  ],
  WD: [
    { label: 'Modul - Grundlagen Wasserdienst (WD10)', value: 'WD10' },
    { label: 'Modul - Fahren mit dem Feuerwehrboot (WD20)', value: 'WD20' },
  ],
  WFBB: [
    { label: 'Modul - Wald- und Flurbrandbekämpfung – Basis (WFBB1)', value: 'WFBB1' },
    { label: 'Modul - Wald- und Flurbrandbekämpfung – Praxis (WFBB2)', value: 'WFBB2' },
  ],
  TBS: [
    { label: 'Modul - Tunnelbrandbekämpfung Straße (TBS20)', value: 'TBS20' },
    { label: 'Modul - Tunnelbrandbekämpfung Straße - Praxis (TBS30)', value: 'TBS30' },
  ],
};

// Rollenzuweisung
const ROLE_MAP = {
  SD: '1389281729054900254',
  TBS: '1389281634821476402',
  WD: '1389281719873704118',
  FÜ: '1389281715515691164',
  WFBB: '1389281630715121837',
  NRD: '1389281712319627304',
  AT: '1389281627544485968',
  EMA: '1389281637845569637',
  GFÜ: '1389281641125384313',
  TE: '1389281624511746158',
  BD: '1389281618245456074',
  FWBW: '1383058634870882346',
};

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

client.once('ready', async () => {
  console.log(`✅ Bot ist online als ${client.user.tag}`);

  const channel = await client.channels.fetch(TICKET_CHANNEL_ID);

  // Erstelle Buttons für die Modulgruppen
  const allButtons = Object.keys(moduleGroups).map((key, idx) =>
    new ButtonBuilder()
      .setCustomId(`modul_select_${key}`)
      .setLabel(key)
      .setStyle((idx % 3) + 1)
  );

  // Packe maximal 5 Buttons in eine Reihe
  const buttonRows = [];
  for (let i = 0; i < allButtons.length; i += 5) {
    buttonRows.push(new ActionRowBuilder().addComponents(allButtons.slice(i, i + 5)));
  }

  const embed = new EmbedBuilder()
    .setTitle('📘 Erstelle hier ein Ticket PRO AUSBILDUNG!')
    .setDescription(
      'Wähle zuerst den Bereich aus, für den du ein Ticket erstellen möchtest. Danach kannst du das genaue Modul auswählen.'
    )
    .setColor(0x2f3136);

  await channel.send({ embeds: [embed], components: buttonRows });
});

client.on('interactionCreate', async interaction => {
  // === Button-Handler ===
  if (interaction.isButton()) {
    const id = interaction.customId;
    const ch = interaction.channel;

    // 1) Übernehmen
    if (id === 'uebernehmen') {
      if (ch.name.startsWith('🔴-')) {
        await ch.setName(`🟠-${ch.name.slice(2)}`);
      }
      const takenEmbed = new EmbedBuilder()
        .setColor(0xfaa61a)
        .setDescription(`📌 Ticket übernommen von: ${interaction.member.displayName}`);
      const takenRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('freigeben')
          .setLabel('🔓 Freigeben')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('schliessen')
          .setLabel('🔒 Schließen')
          .setStyle(ButtonStyle.Danger)
      );
      return interaction.update({ embeds: [takenEmbed], components: [takenRow] });
    }

    // 2) Zurückgeben
    if (id === 'freigeben') {
      if (ch.name.startsWith('🟠-')) {
        await ch.setName(`🔴-${ch.name.slice(2)}`);
      }
      const originalRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('uebernehmen')
          .setLabel('✅ Übernehmen')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('schliessen')
          .setLabel('🔒 Schließen')
          .setStyle(ButtonStyle.Danger)
      );
      return interaction.update({ components: [originalRow] });
    }

    // 3) Schließen
    if (id === 'schliessen') {
      if (ch.name.startsWith('🟠-') || ch.name.startsWith('🔴-')) {
        await ch.setName(`✅-${ch.name.slice(2)}`);
      }
      const logChannel = await interaction.guild.channels.fetch(LOG_CHANNEL_ID);
      await logChannel.send(`📁 Ticket geschlossen: <#${ch.id}> von ${interaction.user}`);

      const deleteRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('delete_ticket')
          .setLabel('❌ Ticket löschen')
          .setStyle(ButtonStyle.Danger)
      );
      return interaction.update({ components: [deleteRow] });
    }

    // 4) Löschen
    if (id === 'delete_ticket') {
      await interaction.deferUpdate();
      return ch.delete();
    }
  }

  // === Select-Menu-Handler ===
  if (interaction.isStringSelectMenu()) {
    const key = interaction.customId.replace('modul_dropdown_', '');
    const selected = interaction.values[0];
    const guild = interaction.guild;
    const user = interaction.user;
    const member = await guild.members.fetch(user.id);
    const pingRoleId = ROLE_MAP[key] || AUSILDER_ROLE_ID;

    // Erstelle das Ticket-Channel
    const ticketChannel = await guild.channels.create({
      name: `🔴-${selected.toLowerCase()}--${member.displayName.replace(/\s+/g, '-').toLowerCase()}`,
      type: ChannelType.GuildText,
      parent: CATEGORY_ID,
      permissionOverwrites: [
        { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
        { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
        { id: AUSILDER_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
        { id: pingRoleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
      ]
    });

    // Nachricht im Ticket-Channel
    const embed = new EmbedBuilder()
      .setTitle(`Neue Ausbildungsanfrage – Modul: ${selected}`)
      .setDescription(`Dies ist eine neue Anfrage für das Modul **${selected}**.\nBitte kümmere dich darum.`)
      .setColor(0x00ff00);

    const actionRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('uebernehmen').setLabel('✅ Übernehmen').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('schliessen').setLabel('🔒 Schließen').setStyle(ButtonStyle.Danger)
    );

    await ticketChannel.send({
      content: `<@&${pingRoleId}>`,
      embeds: [embed],
      components: [actionRow]
    });

    // Ephemeral Reply an den User
    return interaction.reply({
      content: `✅ Dein Ticket wurde erstellt: ${ticketChannel}`,
      flags: InteractionResponseFlags.Ephemeral
    });
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
