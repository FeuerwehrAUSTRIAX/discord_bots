// ticketbot-ausbildung/index.js

const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ChannelType, PermissionsBitField, AttachmentBuilder } = require('discord.js');
const fs = require('fs');
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

const TOKEN = 'DISCORD_BOT_TOKEN';
const TICKET_CATEGORY_ID = '123456789012345678';
const AUSILDER_ROLE_ID = '1151994850116382883';
const SETUP_CHANNEL_ID = '1378069063963512876';
const LOG_CHANNEL_ID = '123456789012345679'; // Log-Channel ID hier eintragen

const ROLE_MAP = {
  SD10: '1389281729054900254', SD20: '1389281729054900254', SD25: '1389281729054900254', SD35: '1389281729054900254', SD40: '1389281729054900254',
  TBS20: '1389281634821476402', TBS30: '1389281634821476402', WD10: '1389281719873704118', WD20: '1389281719873704118',
  FÜ10: '1389281715515691164', ASM10: '1389281715515691164', FÜ20: '1389281715515691164',
  WFBB1: '1389281630715121837', WFBB2: '1389281630715121837', NRD10: '1389281712319627304', NRD20: '1389281712319627304',
  AT: '1389281627544485968', EMA_B: '1389281637845569637', EMA_C: '1389281637845569637', EMA_C2: '1389281637845569637',
  GFÜ: '1389281641125384313', TE10: '1389281624511746158', TE20: '1389281624511746158', TE30: '1389281624511746158', TE40: '1389281624511746158',
  BD10: '1389281618245456074', BD20: '1389281618245456074', BD70: '1389281618245456074', BD80: '1389281618245456074',
  FWBW: '1383058634870882346'
};

client.once('ready', async () => {
    console.log(`✅ Bot ist online als ${client.user.tag}`);

    const embed = new EmbedBuilder()
        .setTitle('🎓 Erstelle hier ein Ticket PRO AUSBILDUNG!')
        .setDescription('Hier kannst du ein Ausbildungsticket erstellen.\n\nWähle bitte die passende Kategorie aus, damit dein Anliegen beim richtigen Ausbilder landet.\n\n⚠️ Pro Ausbildung ein eigenes Ticket!')
        .setColor(0x2B2D31);

    const menu = new StringSelectMenuBuilder()
        .setCustomId('ausbildungs_ticket_menu')
        .setPlaceholder('Wähle eine Kategorie...')
        .addOptions(Object.keys(ROLE_MAP).map(key => ({ label: key, value: key })));

    const row = new ActionRowBuilder().addComponents(menu);
    const channel = await client.channels.fetch(SETUP_CHANNEL_ID);
    await channel.send({ embeds: [embed], components: [row] });
});

client.on('interactionCreate', async interaction => {
    if (interaction.isStringSelectMenu() && interaction.customId === 'ausbildungs_ticket_menu') {
        const category = interaction.values[0];
        const roleToPing = ROLE_MAP[category] || AUSILDER_ROLE_ID;
        const ticketName = `ausbildung-${category.toLowerCase()}-${interaction.user.username.toLowerCase()}`;

        const closeButton = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('close_ticket')
                .setLabel('Ticket schließen')
                .setStyle(ButtonStyle.Danger)
        );

        const channel = await interaction.guild.channels.create({
            name: ticketName,
            type: ChannelType.GuildText,
            parent: TICKET_CATEGORY_ID,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
                { id: roleToPing, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] }
            ]
        });

        await channel.send({
            content: `👋 Hallo <@${interaction.user.id}>, dein Ticket für **${category}** wurde erstellt. <@&${roleToPing}> wird sich darum kümmern.`,
            components: [closeButton]
        });

        await interaction.reply({ content: `✅ Dein Ticket wurde erstellt: ${channel}`, ephemeral: true });
    }

    if (interaction.isButton() && interaction.customId === 'close_ticket') {
        const channel = interaction.channel;
        const messages = await channel.messages.fetch({ limit: 100 });
        const log = messages
            .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
            .map(m => `${m.author.tag}: ${m.content}`)
            .join('\n');

        const fileName = `transkript-${channel.name}.txt`;
        fs.writeFileSync(fileName, log);
        const file = new AttachmentBuilder(fileName);

        const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);
        await logChannel.send({ content: `📁 Transkript von ${channel.name}`, files: [file] });

        await channel.send('📁 Das Ticket wird geschlossen...');
        setTimeout(() => channel.delete(), 5000);
    }
});

client.login(TOKEN);
