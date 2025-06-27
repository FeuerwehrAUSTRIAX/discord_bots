const { EmbedBuilder } = require('discord.js');

function createWarningEmbed(region, event, level, start, end) {
  let color = 0xFFA500; // default Orange

  if (level.toLowerCase() === 'rot') {
    color = 0xFF0000; // Rot
  } else if (level.toLowerCase() === 'gelb') {
    color = 0xFFFF00; // Gelb
  }

  return new EmbedBuilder()
    .setTitle(`🚨 Unwetterwarnung für ${region}`)
    .addFields(
      { name: 'Warnung', value: event, inline: true },
      { name: 'Stufe', value: level, inline: true },
      { name: 'Gültig von', value: start, inline: false },
      { name: 'Gültig bis', value: end, inline: false }
    )
    .setColor(color)
    .setTimestamp();
}

module.exports = createWarningEmbed;
