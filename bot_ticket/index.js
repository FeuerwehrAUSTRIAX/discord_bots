// Fortsetzung von index.js (Teil 2)

client.once('ready', async () => {
  console.log(`✅ Bot ist online als ${client.user.tag}`);
  const channel = await client.channels.fetch(TICKET_CHANNEL_ID);

  const allButtons = Object.keys(moduleGroups).map((key, index) =>
    new ButtonBuilder()
      .setCustomId(`modul_select_${key}`)
      .setLabel(key)
      .setStyle((index % 3) + 1)
  );

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
    const id = interaction.customId;

    if (id.startsWith('modul_select_')) {
      const key = id.replace('modul_select_', '');
      const selectMenu = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`modul_dropdown_${key}`)
          .setPlaceholder('Wähle ein Modul...')
          .addOptions(moduleGroups[key])
      );
      await interaction.update({ content: `Bitte wähle ein Modul aus dem Bereich **${key}**:`, components: [selectMenu] });

    } else if (id === 'uebernehmen') {
      await interaction.deferUpdate();
      if (interaction.channel && interaction.channel.name.startsWith('🔴')) {
        await interaction.channel.setName(`🟠-${interaction.channel.name.slice(2)}`);
      }
      const embed = new EmbedBuilder().setColor(0xfaa61a).setDescription(`📌 Ticket übernommen von: ${interaction.member.displayName}`);
      await interaction.followUp({ embeds: [embed], ephemeral: false });
      const actionRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('freigeben').setLabel('🔓 Freigeben').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('schliessen').setLabel('🔒 Schließen').setStyle(ButtonStyle.Danger)
      );
      if (interaction.message && interaction.message.editable) {
        await interaction.message.edit({ components: [actionRow] });
      }

    } else if (id === 'freigeben') {
      await interaction.deferUpdate();
      if (interaction.channel && interaction.channel.name.startsWith('🟠')) {
        await interaction.channel.setName(`🔴-${interaction.channel.name.slice(2)}`);
      }

    } else if (id === 'schliessen') {
      await interaction.deferUpdate();
      if (interaction.channel && interaction.channel.name.startsWith('🟠') || interaction.channel.name.startsWith('🔴')) {
        await interaction.channel.setName(`✅-${interaction.channel.name.slice(2)}`);
      }
      const logChannel = await interaction.guild.channels.fetch(LOG_CHANNEL_ID);
      await logChannel.send(`📁 Ticket geschlossen: <#${interaction.channel.id}> von ${interaction.user}`);
      const actionRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('delete_ticket').setLabel('❌ Ticket löschen').setStyle(ButtonStyle.Danger)
      );
      if (interaction.message && interaction.message.editable) {
        await interaction.message.edit({ components: [actionRow] });
      }

    } else if (id === 'delete_ticket') {
      await interaction.deferUpdate();
      if (interaction.channel) {
        await interaction.channel.delete();
      }
    }
  } else if (interaction.isStringSelectMenu()) {
    const key = interaction.customId.replace('modul_dropdown_', '');
    const selected = interaction.values[0];
    const guild = interaction.guild;
    const user = interaction.user;
    const member = await guild.members.fetch(user.id);
    const pingRoleId = ROLE_MAP[key] || AUSILDER_ROLE_ID;

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

    const embed = new EmbedBuilder()
      .setTitle(`Neue Ausbildungsanfrage – Modul: ${selected}`)
      .setDescription(`Dies ist eine neue Anfrage für das Modul **${selected}**.\nBitte kümmere dich darum.`)
      .setColor(0x00ff00);

    const actionRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('uebernehmen').setLabel('✅ Übernehmen').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('schliessen').setLabel('🔒 Schließen').setStyle(ButtonStyle.Danger)
    );

    await ticketChannel.send({ content: `<@&${pingRoleId}>`, embeds: [embed], components: [actionRow] });
    await interaction.reply({ content: `✅ Dein Ticket wurde erstellt: ${ticketChannel}`, ephemeral: true });
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
