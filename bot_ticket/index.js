const {
  Client, GatewayIntentBits, Partials,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  StringSelectMenuBuilder, EmbedBuilder,
  ChannelType, PermissionFlagsBits
} = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
  partials: [Partials.Channel],
});

// IDs
const CATEGORY_ID = 'DEINE_KATEGORIE_ID';
const LOG_CHANNEL_ID = '1389272323504472164';
const AUSILDER_ROLE_ID = '1151994850116382883';
const TICKET_CHANNEL_ID = 'DEIN_TICKET_CHANNEL_ID';

const ROLE_MAP = {
  SD10: '1389281729054900254', SD20: '1389281729054900254', SD25: '1389281729054900254', SD35: '1389281729054900254', SD40: '1389281729054900254',
  TBS20: '1389281634821476402', TBS30: '1389281634821476402',
  WD10: '1389281719873704118', WD20: '1389281719873704118',
  FÜ10: '1389281715515691164', FÜ20: '1389281715515691164', ASM10: '1389281715515691164',
  WFBB1: '1389281630715121837', WFBB2: '1389281630715121837',
  NRD10: '1389281712319627304', NRD20: '1389281712319627304',
  AT: '1389281627544485968',
  EMA_B: '1389281637845569637', EMA_C: '1389281637845569637', EMA_C2: '1389281637845569637',
  GFÜ: '1389281641125384313',
  TE10: '1389281624511746158', TE20: '1389281624511746158', TE30: '1389281624511746158', TE40: '1389281624511746158',
  BD10: '1389281618245456074', BD20: '1389281618245456074', BD70: '1389281618245456074', BD80: '1389281618245456074',
  FWBW: '1383058634870882346'
};

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

// READY
client.once('ready', async () => {
  console.log(`✅ Bot ist online als ${client.user.tag}`);
  const channel = await client.channels.fetch(TICKET_CHANNEL_ID);
  const allButtons = Object.keys(moduleGroups).map((key, index) =>
    new ButtonBuilder().setCustomId(`modul_select_${key}`).setLabel(key).setStyle((index % 3) + 1)
  );
  const buttonRows = [];
  for (let i = 0; i < allButtons.length; i += 5)
    buttonRows.push(new ActionRowBuilder().addComponents(allButtons.slice(i, i + 5)));
  const embed = new EmbedBuilder()
    .setTitle('📘 Erstelle hier ein Ticket PRO AUSBILDUNG!')
    .setDescription('Wähle zuerst den Bereich aus, dann das genaue Modul.')
    .setColor(0x2f3136);
  await channel.send({ embeds: [embed], components: buttonRows });
});

// INTERACTIONS
client.on('interactionCreate', async interaction => {
  const id = interaction.customId;

  if (interaction.isButton()) {
    if (id.startsWith('modul_select_')) {
      const key = id.split('_')[2];
      const selectMenu = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`modul_dropdown_${key}`)
          .setPlaceholder('Wähle ein Modul...')
          .addOptions(moduleGroups[key])
      );
      await interaction.reply({ content: `Modulgruppe **${key}** – bitte Modul wählen:`, components: [selectMenu], ephemeral: true });

    } else if (id === 'uebernehmen') {
      await interaction.deferUpdate();
      await interaction.channel.setName(`🟠-${interaction.channel.name.slice(2)}`);
      await interaction.followUp({ content: `📌 Ticket übernommen von: ${interaction.member.displayName}` });
      const actionRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('freigeben').setLabel('🔓 Freigeben').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('schliessen').setLabel('🔒 Schließen').setStyle(ButtonStyle.Danger)
      );
      await interaction.message.edit({ components: [actionRow] });

    } else if (id === 'freigeben') {
      await interaction.deferUpdate();
      await interaction.channel.setName(`🔴-${interaction.channel.name.slice(2)}`);

    } else if (id === 'schliessen') {
      await interaction.deferUpdate();
      await interaction.channel.setName(`✅-${interaction.channel.name.slice(2)}`);
      const logChannel = await interaction.guild.channels.fetch(LOG_CHANNEL_ID);
      await logChannel.send(`📁 Ticket geschlossen: <#${interaction.channel.id}> von ${interaction.user}`);
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('delete_ticket').setLabel('❌ Ticket löschen').setStyle(ButtonStyle.Danger)
      );
      await interaction.message.edit({ components: [row] });

    } else if (id === 'delete_ticket') {
      await interaction.deferUpdate();
      await interaction.channel.delete();
    }

  } else if (interaction.isStringSelectMenu()) {
    const selected = interaction.values[0];
    const user = interaction.user;
    const guild = interaction.guild;
    const member = await guild.members.fetch(user.id);
    const roleId = ROLE_MAP[selected] || AUSILDER_ROLE_ID;

    const channel = await guild.channels.create({
      name: `🔴-${selected.toLowerCase()}--${member.displayName.replace(/\s+/g, '-').toLowerCase()}`,
      type: ChannelType.GuildText,
      parent: CATEGORY_ID,
      permissionOverwrites: [
        { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
        { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
        { id: AUSILDER_ROLE_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
        { id: roleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
      ]
    });

    const embed = new EmbedBuilder()
      .setTitle(`Neue Ausbildungsanfrage – Modul: ${selected}`)
      .setDescription(`Dies ist eine neue Anfrage für das Modul **${selected}**.\nBitte kümmere dich darum.`)
      .setColor(0x00ff00);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('uebernehmen').setLabel('✅ Übernehmen').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('schliessen').setLabel('🔒 Schließen').setStyle(ButtonStyle.Danger)
    );

    await channel.send({ content: `<@&${roleId}>`, embeds: [embed], components: [row] });
    await interaction.reply({ content: `✅ Dein Ticket wurde erstellt: ${channel}`, ephemeral: true });
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
