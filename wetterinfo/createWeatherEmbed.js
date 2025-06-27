const { EmbedBuilder } = require('discord.js');

function createWeatherEmbed(cityName, condition, temp, feelsLike, wind, client) {
  return new EmbedBuilder()
    .setTitle(`📍 Wetter für ${cityName}`)
    .setDescription(
      `🌤️ ${condition}, ${temp}°C (gefühlt ${feelsLike}°C)\n` +
      `💨 Wind: ${wind} km/h\n` +
      `❌ Keine aktuellen Warnungen`
    )
    .setColor(0x1D82B6)
    .setFooter({
      text: 'GeoSphere Bot',
      iconURL: client.user.displayAvatarURL(),
    })
    .setTimestamp();
}

module.exports = createWeatherEmbed;

