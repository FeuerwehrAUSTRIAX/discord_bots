import { Client, GatewayIntentBits, Partials } from 'discord.js';
import dotenv from 'dotenv';
import { insertAbmeldung, getAbgelaufeneAbmeldungen, deleteAbmeldung } from './db.js';

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

client.once('ready', () => {
  console.log(`✅ Bot läuft als ${client.user.tag}`);
  checkAbmeldungen(); // sofort prüfen beim Start
  setInterval(checkAbmeldungen, 1000 * 60 * 60 * 24); // alle 24h
});

// ➕ Befehl: !abmelden Dienstgrad Vorname Nachname 2025-07-08 2025-07-14 [Uhrzeit optional]
client.on('messageCreate', async message => {
  if (!message.content.startsWith('!abmelden') || message.author.bot) return;

  const args = message.content.split(' ').slice(1);
  const [dienstgrad, vorname, nachname, von, bis, uhrzeit] = args;

  if (!dienstgrad || !vorname || !nachname || !von || !bis) {
    return message.reply("⚠️ Format: `!abmelden Dienstgrad Vorname Nachname von bis [Uhrzeit]`");
  }

  const channel = await client.channels.fetch(process.env.CHANNEL_ID);
  const embedMsg = `📌 **Abmeldung**\n**${dienstgrad} ${vorname} ${nachname}**\n🕒 **Von:** ${von}  **Bis:** ${bis}${uhrzeit ? ` – ${uhrzeit}` : ''}`;
  const sent = await channel.send(embedMsg);
  await sent.pin();

  await insertAbmeldung({ dienstgrad, vorname, nachname, von, bis, uhrzeit: uhrzeit || null }, sent.id);
  message.react('✅');
});

async function checkAbmeldungen() {
  const abmeldungen = await getAbgelaufeneAbmeldungen();
  const channel = await client.channels.fetch(process.env.CHANNEL_ID);

  for (const abmeldung of abmeldungen) {
    try {
      const msg = await channel.messages.fetch(abmeldung.message_id);
      await msg.unpin();
      await msg.delete();
    } catch (e) {
      console.warn(`❗️Nachricht ${abmeldung.message_id} konnte nicht entfernt werden.`);
    }

    await deleteAbmeldung(abmeldung.id);
    console.log(`🗑️ Abmeldung gelöscht: ${abmeldung.vorname} ${abmeldung.nachname}`);
  }
}

client.login(process.env.DISCORD_TOKEN);
