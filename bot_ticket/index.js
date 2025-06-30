// index.js
const { Client, GatewayIntentBits, Partials, ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  partials: [Partials.Channel]
});

const CATEGORY_ID = '1377635882403889182';
const ROLE_ID = '1151994850116382883'; // Testrolle, später austauschbar
const TICKET_CHANNEL_ID = '1378069063963512876';

const moduleOptions = [
  { label: 'Modul - Feuerwehrbasiswissen (FWBW)', value: 'FWBW' },
  { label: 'Modul - Grundlagen der Technik (TE10)', value: 'TE10' },
  { label: 'Modul - Menschenrettung aus KFZ (TE20)', value: 'TE20' },
  { label: 'Modul - Menschenrettung mit Zug- und Hebemittel (TE30)', value: 'TE30' },
  { label: 'Modul - Menschenrettung aus Höhen und Tiefen (TE40)', value: 'TE40' },
  { label: 'Modul - Löschmittelbedarf (BD10)', value: 'BD10' },
  { label: 'Modul - Löschwasserförderung (BD20)', value: 'BD20' },
  { label: 'Modul - Druckbelüftung (BD70)', value: 'BD70' },
  { label: 'Modul - Wärmebildkamera (BD80)', value: 'BD80' },
  { label: 'Modul - Atemschutzgeräteträger (AT)', value: 'AT' },
  { label: 'Modul - Einsatzmaschinist B (EMA_B)', value: 'EMA_B' },
  { label: 'Modul - Einsatzmaschinist C (EMA_C)', value: 'EMA_C' },
  { label: 'Modul - Hubrettungsfahrzeug (EMA_C2)', value: 'EMA_C2' },
  { label: 'Modul - Grundlagen Führung (GFÜ)', value: 'GFÜ' },
  { label: 'Modul - Führungsstufe 1 (FÜ10)', value: 'FÜ10' },
  { label: 'Modul - Abschluss Führungsstufe 1 (ASM10)', value: 'ASM10' },
  { label: 'Modul - Abschluss Führungsstufe 2 (FÜ20)', value: 'FÜ20' },
  { label: 'Modul - Grundlagen Feuerwehrfunk (NRD10)', value: 'NRD10' },
  { label: 'Modul - Arbeiten in der Einsatzleitung (NRD20)', value: 'NRD20' },
  { label: 'Modul - Gefahrenerkennung und Selbstschutz (SD10)', value: 'SD10' },
  { label: 'Modul - Gefahrenabwehr 1 (SD20)', value: 'SD20' },
  { label: 'Modul - Schutzanzug praktisch (SD25)', value: 'SD25' },
  { label: 'Modul - Messdienst (SD35)', value: 'SD35' },
  { label: 'Modul - Verhalten bei Einsätzen mit Gasen (SD40)', value: 'SD40' },
  { label: 'Modul - Grundlagen Wasserdienst (WD10)', value: 'WD10' },
  { label: 'Modul - Fahren mit dem Feuerwehrboot (WD20)', value: 'WD20' },
  { label: 'Modul - Taucher (T1)', value: 'T1' },
  { label: 'Modul - Wald- und Flurbrandbekämpfung – Basis (WFBB1)', value: 'WFBB1' },
  { label: 'Modul - Wald- und Flurbrandbekämpfung – Praxis (WFBB2)', value: 'WFBB2' },
  { label: 'Modul - Tunnelbrandbekämpfung Straße (TBS20)', value: 'TBS20' },
  { label: 'Modul - Tunnelbrandbekämpfung Straße - Praxis (TBS30)', value: 'TBS30' },
];

client.once('ready', async () => {
  console.log(`✅ Bot ist online als ${client.user.tag}`);
  const channel = await client.channels.fetch(TICKET_CHANNEL_ID);

  const row = new ActionRowBuilder()
    .addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('ausbildungsmodul_waehlen')
        .setPlaceholder('Wähle eine Ausbildungskategorie...')
        .addOptions(moduleOptions.slice(0, 25)) // Discord limitiert auf 25 Optionen
    );

  const embed = new EmbedBuilder()
    .setTitle('📘 Erstelle hier ein Ticket PRO AUSBILDUNG!')
    .setDescription('Hier kannst du ein Ausbildungsticket erstellen.\n\nDamit dein Anliegen beim richtigen Ausbilder landet, wähle bitte das passende **Modul** aus.\n\n⚠️ **Erstelle pro Ausbildung ein separates Ticket!**\n\nVielen Dank!')
    .setColor(0x2f3136)
    .setImage('https://cdn.discordapp.com/attachments/1140996573619208283/1243967633416093746/ticketbanner.png');

  await channel.send({ embeds: [embed], components: [row] });
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isStringSelectMenu()) return;
  if (interaction.customId !== 'ausbildungsmodul_waehlen') return;

  const guild = interaction.guild;
  const user = interaction.user;
  const serverName = guild.name;
  const selected = interaction.values[0];

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

  await interaction.reply({ content: `✅ Dein Ticket wurde erstellt: ${ticketChannel}`, ephemeral: true });
});

client.login(process.env.DISCORD_BOT_TOKEN);
