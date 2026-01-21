require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const TOKEN = process.env.TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;

if (!TOKEN || !CHANNEL_ID) {
  console.error("Missing env vars. Need TOKEN and CHANNEL_ID.");
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  try {
    const channel = await client.channels.fetch(CHANNEL_ID);

    if (!channel || !channel.isTextBased()) {
      console.error("CHANNEL_ID is not a valid text channel.");
      return;
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("show_my_id")
        .setLabel("Meine ID anzeigen")
        .setStyle(ButtonStyle.Primary)
    );

    await channel.send({
      content: "Klick den Button, um *deine* Discord User-ID zu sehen:",
      components: [row],
    });

    console.log("Button panel posted.");
  } catch (err) {
    console.error("Failed to post panel:", err);
  }
});

client.on("interactionCreate", async (interaction) => {
  if (interaction.isButton() && interaction.customId === "show_my_id") {
    await interaction.reply({
      content: `Deine User-ID ist: \`${interaction.user.id}\``,
      ephemeral: true,
    });
  }
});

client.login(TOKEN);
