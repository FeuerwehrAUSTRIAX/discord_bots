// index.js
const { Client, GatewayIntentBits, Partials, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, EmbedBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  partials: [Partials.Channel]
});

const CATEGORY_ID = '1377635882403889182';
const ROLE_ID = '1151994850116382883'; // Testrolle
const TICKET_CHANNEL_ID = '1378069063963512876';

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

client.once('ready', async () => {
  console.log(`✅ Bot ist online als ${client.user.tag}`);
  const channel = await client.channels.fetch(TICKET_CHANNEL_ID);

  const allButtons = Object.keys(moduleGroups).map(key =>
    new ButtonBuilder()
      .setCustomId(`modul_select_${key}`)
      .setLabel(key)
      .setStyle(ButtonStyle.Primary)
  );

  // Aufteilen in mehrere ActionRows (max 5 Buttons pro Row)
  const buttonRows = [];
  for (let i = 0; i < allButtons.length; i += 5) {
    buttonRows.push(new ActionRowBuilder().addComponents(allButtons.slice(i, i + 5)));
  }

  const embed = new EmbedBuilder()
    .setTitle('📘 Erstelle hier ein Ticket PRO AUSBILDUNG!')
    .setDescription('Wähle zuerst den Bereich aus, für den du ein Ticket erstellen möchtest. Danach kannst du das genaue Modul auswählen.')
    .setColor(0x2f3136);

  await channel.send({ embeds: [embed], components: buttonRows });
});

client.on('interactionCreate', async interaction => {
  if (interaction.isButton()) {
    const prefix = 'modul_select_';
    if (interaction.customId.startsWith(prefix)) {
      const key = interaction.customId.replace(prefix, '');
      const selectMenu = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`modul_dropdown_${key}`)
          .setPlaceholder('Wähle ein Modul...')
          .addOptions(moduleGroups[key])
      );

      await interaction.reply({ content: `Bitte wähle das Modul aus dem Bereich **${key}**:`, components: [selectMenu], ephemeral: true });
    }
  } else if (interaction.isStringSelectMenu()) {
    const key = interaction.customId.replace('modul_dropdown_', '');
    const selected = interaction.values[0];
    const guild = interaction.guild;
    const user = interaction.user;
    const serverName = guild.name;

    const ticketChannel = await guild.channels.create({
      name: `Angefragte Ausbildung - ${serverName}`,
      type: ChannelType.GuildText,
      parent: CATEGORY_ID,
      permissionOverwrites: [
        {
          id: guild.roles.everyone,
          deny: [PermissionFlagsBits.ViewChannel],
        },
        {
          id: user.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
        },
        {
          id: ROLE_ID,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
        },
      ],
    });

    const embed = new EmbedBuilder()
      .setTitle(`Neue Ausbildungsanfrage – Modul: ${selected}`)
      .setDescription(`Dies ist eine neue Anfrage für das Modul **${selected}**.\nBitte kümmere dich darum.`)
      .setColor(0x00ff00);

    await ticketChannel.send({
      content: `<@&${ROLE_ID}>`,
      embeds: [embed],
    });

    await interaction.update({ content: `✅ Dein Ticket wurde erstellt: ${ticketChannel}`, components: [] });
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
