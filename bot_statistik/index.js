require('dotenv').config();

const { Client, GatewayIntentBits, ChannelType } = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

client.once('ready', async () => {
  console.log(`✅ Bot gestartet als ${client.user.tag}`);

  const guild = await client.guilds.fetch('1151964334977712141');
  await guild.members.fetch();

  const rolesOrdered = [
    { name: 'Kommando', id: '1151993518722654269' },
    { name: 'Verwaltung', id: '1340302450795741265' },
    { name: 'Chargen', id: '1151968107984859156' },
    { name: 'Mannschaft', id: '1151993527111254168' },
    { name: 'FFWN', id: '1293999568991555667' },
  ];

  const categoryId = '1384578209722404884'; // Deine Sprachkanal-Kategorie
  const voiceChannels = {
    updateInfo: null, // Sprachkanal für Zeitstempel
  };

  const ensureChannels = async () => {
    for (const role of rolesOrdered) {
      let existing = guild.channels.cache.find(
        (ch) =>
          ch.type === ChannelType.GuildVoice &&
          ch.parentId === categoryId &&
          ch.name.startsWith(role.name)
      );

      if (!existing) {
        existing = await guild.channels.create({
          name: `${role.name}: wird geladen...`,
          type: ChannelType.GuildVoice,
          parent: categoryId,
          position: 0,
        });
        console.log(`🆕 Erstellt: ${existing.name}`);
      }

      voiceChannels[role.name] = existing;
    }

    // Zusatz-Sprachkanal für Datum & Uhrzeit
    let updateInfoChannel = guild.channels.cache.find(
      (ch) =>
        ch.type === ChannelType.GuildVoice &&
        ch.parentId === categoryId &&
        ch.name.startsWith('📅')
    );

    if (!updateInfoChannel) {
      updateInfoChannel = await guild.channels.create({
        name: '📅 Initialisierung...',
        type: ChannelType.GuildVoice,
        parent: categoryId,
        position: rolesOrdered.length + 1,
      });
      console.log(`🆕 Erstellt: ${updateInfoChannel.name}`);
    }

    voiceChannels.updateInfo = updateInfoChannel;
  };

  const updateCounts = async () => {
    try {
      await guild.members.fetch();
      console.log(`🔄 Update – ${new Date().toLocaleString()}`);

      for (const role of rolesOrdered) {
        const r = guild.roles.cache.get(role.id);
        const count = r?.members?.size || 0;
        const channel = voiceChannels[role.name];

        if (channel) {
          await channel.setName(`${role.name}: ${count}`);
          console.log(`➡️ ${role.name}: ${count}`);
        }
      }

      // Zeitstempel setzen
      const timestamp = new Date().toLocaleString('de-DE', {
        dateStyle: 'short',
        timeStyle: 'short',
      });

      const infoChannel = voiceChannels.updateInfo;
      if (infoChannel) {
        await infoChannel.setName(`📅 ${timestamp}`);
        console.log(`⏰ Zeitstempel aktualisiert: ${timestamp}`);
      }

    } catch (err) {
      console.error('❌ Fehler beim Aktualisieren:', err);
    }
  };

  await ensureChannels();
  await updateCounts();
  setInterval(updateCounts, 5 * 60 * 1000); // alle 5 Minuten
});

client.login(process.env.BOT_TOKEN);
