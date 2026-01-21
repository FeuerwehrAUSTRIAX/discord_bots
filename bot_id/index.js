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

function isMyIdPanelMessage(message) {
  if (message.author?.id !== client.user.id) return false;
  if (!message.components?.length) return false;

  // Prüfen, ob irgendwo der Button mit unserer customId existiert
  return message.components.some((row) =>
    row.components.some(
      (component) =>
        component.type === 2 && component.customId === "show_my_id"
    )
  );
}

async function cleanupOldPanels(channel) {
  const pinnedMessages = await channel.messages.fetchPinned();

  const oldPanels = pinnedMessages.filter(isMyIdPanelMessage);

  for (const msg of oldPanels.values()) {
    try {
      await msg.unpin();
    } catch (e) {
      console.warn("Could not unpin old panel:", e?.message || e);
    }

    try {
      await msg.delete();
    } catch (e) {
      console.warn("Could not delete old panel:", e?.message || e);
    }
  }
}

async function postNewPanel(channel) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("show_my_id")
      .setLabel("Meine ID anzeigen")
      .setStyle(ButtonStyle.Primary)
  );

  const msg = await channel.send({
    content: "Klick den Button, um *deine* Discord User-ID zu sehen:",
    components: [row],
  });

  try {
    await msg.pin();
  } catch (e) {
    console.warn("Could not pin message:", e?.message || e);
  }
}

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  try {
    const channel = await client.channels.fetch(CHANNEL_ID);

    if (!channel || !channel.isTextBased()) {
      console.error("CHANNEL_ID is not a text channel.");
      return;
    }

    // Alte Panels entfernen
    await cleanupOldPanels(channel);

    // Neues Panel posten + anpinnen
    await postNewPanel(channel);

    console.log("Panel posted, pinned, old ones cleaned up.");
  } catch (err) {
    console.error("Startup error:", err);
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
