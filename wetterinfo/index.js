const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const getWarnings = require('./getWarnings');

const TOKEN = process.env.BOT_TOKEN; // Dein Bot-Token aus .env
const UNWETTER_CHANNEL_ID = '1388158584575098900';

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

function createWarningEmbed(warning) {
  return new EmbedBuilder()
    .setTitle(`Warnung in ${warning.region}`)
    .addFields(
      { name: 'Typ', value: warning.event, inline: true },
      { name: 'Stufe', value: warning.level.toString(), inline: true },
      { name: 'Gültig von', value: warning.start, inline: false },
      { name: 'Gültig bis', value: warning.end, inline: false },
    )
    .setColor('#FF0000')
    .setTimestamp(new Date());
}

client.once('ready', async () => {
  console.log(`Bot eingeloggt als ${client.user.tag}`);

  try {
    const warnings = await getWarnings();

    if (warnings.length === 0) {
      console.log('Keine Warnungen gefunden.');
      return;
    }

    const channel = await client.channels.fetch(UNWETTER_CHANNEL_ID);
    if (!channel) {
      console.error('Unwetter-Kanal nicht gefunden!');
      return;
    }

    for (const warnung of warnings) {
      if (warnung.level >= 1) {
        const embed = createWarningEmbed(warnung);
        await channel.send({ embeds: [embed] });
      }
    }
  } catch (error) {
    console.error('Fehler beim Verarbeiten der Warnungen:', error);
  }
});

client.login(TOKEN);
