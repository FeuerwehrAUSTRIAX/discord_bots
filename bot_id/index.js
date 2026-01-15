const {
  Client,
  GatewayIntentBits,
  Events,
  REST,
  Routes,
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

require("dotenv").config();

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

if (!token || !clientId || !guildId) {
  console.error("❌ Missing env vars: DISCORD_TOKEN, CLIENT_ID, GUILD_ID");
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

async function registerCommands() {
  const commands = [
    new SlashCommandBuilder()
      .setName("id")
      .setDescription("Zeigt die Discord-ID von dir oder einem User")
      .addUserOption((opt) =>
        opt.setName("user").setDescription("Optional: anderer User")
      )
      .toJSON(),
  ];

  const rest = new REST({ version: "10" }).setToken(token);

  await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
    body: commands,
  });

  console.log("✅ Slash command registered (guild)");
}

client.once(Events.ClientReady, async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  try {
    await registerCommands();
  } catch (e) {
    console.error("❌ Command registration failed:", e);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isChatInputCommand() && interaction.commandName === "id") {
    const user = interaction.options.getUser("user") ?? interaction.user;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`showid:${user.id}`)
        .setLabel("ID anzeigen")
        .setStyle(ButtonStyle.Primary)
    );

    return interaction.reply({
      content: `Klicke den Button, um die ID von **${user.username}** zu sehen.`,
      components: [row],
      ephemeral: true,
    });
  }

  if (interaction.isButton() && interaction.customId.startsWith("showid:")) {
    const id = interaction.customId.split(":")[1];
    return interaction.reply({
      content: `Discord-ID:\n\`\`\`\n${id}\n\`\`\``,
      ephemeral: true,
    });
  }
});

client.login(token);
