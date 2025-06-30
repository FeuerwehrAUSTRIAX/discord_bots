// index.js 
const { Client, GatewayIntentBits, Partials, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
require('dotenv').config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  partials: [Partials.Channel]
});

const CATEGORY_ID = '1377635882403889182';
const ROLE_ID = '1151994850116382883';
const TICKET_CHANNEL_ID = '1378069063963512876';

client.once('ready', async () => {
  console.log(`✅ Bot ist online als ${client.user.tag}`);

  const channel = await client.channels.fetch(TICKET_CHANNEL_ID);

  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('create_fwbw_ticket')
        .setLabel('🎟️ FWBW Ticket erstellen')
        .setStyle(ButtonStyle.Success)
    );

  const embed = new EmbedBuilder()
    .setTitle('📘 Erstelle hier ein Ticket PRO AUSBILDUNG!')
    .setDescription('Hier kannst du ein Ausbildungsticket erstellen.\n\nDamit dein Anliegen beim richtigen Ausbilder landet, wähle bitte die passende Kategorie aus.\n\n⚠️ **Erstelle pro Ausbildung ein separates Ticket!**\n\nVielen Dank!')
    .setColor(0x2f3136)
    .setImage('https://cdn.discordapp.com/attachments/1140996573619208283/1243967633416093746/ticketbanner.png'); // Beispielbild

  await channel.send({ embeds: [embed], components: [row] });
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isButton()) return;

  if (interaction.customId === 'create_fwbw_ticket') {
    const guild = interaction.guild;
    const user = interaction.user;
    const serverName = guild.name;

    const ticketChannel = await guild.channels.create({
      name: `%%Ausbildung%% - Anfrage von ${serverName}`,
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
      .setTitle('Neue Ausbildungsanfrage: FWBW')
      .setDescription(`Dies ist eine neue Anfrage für das **Feuerwehrbasiswissen (FWBW)**.\nBitte kümmere dich darum.`)
      .setColor(0x00ff00);

    await ticketChannel.send({
      content: `<@&${ROLE_ID}>`,
      embeds: [embed],
    });

    await interaction.reply({ content: `✅ Dein Ticket wurde erstellt: ${ticketChannel}`, ephemeral: true });
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
