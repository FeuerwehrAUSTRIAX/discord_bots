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

// Marker, damit der Bot "seine" Panel-Nachricht sicher wiederfindet
const PANEL_TEXT =
  `${PANEL_MARKER}\n` +
  "Klick den Button, um *deine* Discord User-ID zu sehen:";

if (!TOKEN || !CHANNEL_ID) {
  console.error("Missing env vars. Need TOKEN and CHANNEL_ID.");
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

async function cleanupOldPanels(channel) {
  // Holt alle angepinnten Nachrichten und entfernt alte Panels vom Bot
  const pinned = await channel.messages.fetchPinned();

  const oldPanels = pinned.filter(
    (m) =>
      m.author?.id === client.user.id &&
      typeof m.content === "string" &&
      m.content.includes(PANEL_MARKER)
  );

  for (const msg of oldPanels.values()) {
    try {
      // erst entpinnen, dann löschen
      await msg.unpin();
    } catch (e) {
      console.warn("Could not unpin old panel (missing perms?)", e?.message || e);
    }

    try {
      await msg.delete();
    } catch (e) {
      console.warn("Could not delete old panel (missing perms?)", e?.message || e);
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

  const newMsg = await channel.send({
    content: PANEL_TEXT,
    components: [row],
  });

  try {
    await newMsg.pin();
  } catch (e) {
    console.warn("Could not pin new panel (missing perms?)", e?.message || e);
  }

  return newMsg;
}

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  try {
    const channel = await client.channels.fetch(CHANNEL_ID);

    if (!channel || !channel.isTextBased()) {
      console.error("CHANNEL_ID is not a valid text channel.");
      return;
    }

    // 1) Alte Panel(s) entfernen (entpinnen + löschen)
    await cleanupOldPanels(channel);

    // 2) Neues Panel posten + anpinnen
    await postNewPanel(channel);

    console.log("Panel posted & pinned.");
  } catch (err) {
    console.error("Startup failed:", err);
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
