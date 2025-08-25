import 'dotenv/config';
import fetch from 'node-fetch';
import { parse } from 'csv-parse/sync';
import { Client, GatewayIntentBits, Partials, REST, Routes } from 'discord.js';

/**
 * === KONFIG ===
 * Mapping: Spaltenname (genau wie im Sheet) => Discord Rollen-ID
 * Beispiel: Vor dem '=' steht in deiner Liste der Spalten-/ROW-Name,
 * nach dem '=' die Rollen-ID. Trage sie hier ein:
 */
const ROLE_MAP = {
  // "ROW-Name aus dem Sheet": "123456789012345000",
  // z.B.:
  // "Atemschutz": "123...",
  // "Sanität": "124...",
  // "Maschinist": "125..."
};

/**
 * Pflichtfelder (genau wie Sheet-Header):
 */
const COL_USER_ID = 'Discord_UserID';
const COL_GRADE   = 'Aktueller Dienstgrad';
const COL_FIRST   = 'Namen';
const COL_LAST    = 'Nachnamen';

/**
 * Nickname-Format:
 */
const nicknameOf = (rec) =>
  `${(rec[COL_GRADE] || '').toString().trim()} | ${(rec[COL_FIRST] || '').toString().trim()} ${(rec[COL_LAST] || '').toString().trim()}`
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Zelle gilt als "JA"?
 */
const isYes = (val) => String(val || '').trim().toUpperCase() === 'JA';

/**
 * CSV laden & zu Objekten mappen
 */
async function loadCsv() {
  const res = await fetch(process.env.CSV_URL);
  if (!res.ok) throw new Error(`CSV Download failed: ${res.status} ${res.statusText}`);
  const text = await res.text();

  const rows = parse(text, { columns: true, skip_empty_lines: true, bom: true });
  // Nur Zeilen mit valider Discord ID (17-20 Ziffern)
  return rows.filter(r => /^\d{17,20}$/.test(String(r[COL_USER_ID] || '').trim()));
}

/**
 * Zielrollen aus ROLE_MAP anhand "JA" im Sheet bestimmen
 */
function desiredRoleIdsFor(rec) {
  const ids = [];
  for (const [colName, roleId] of Object.entries(ROLE_MAP)) {
    if (isYes(rec[colName])) ids.push(roleId);
  }
  return ids;
}

/**
 * Sync für EIN Mitglied
 */
async function syncMember(guild, rec) {
  const userId = String(rec[COL_USER_ID]).trim();
  const member = await guild.members.fetch(userId).catch(() => null);
  if (!member) return { userId, ok: false, reason: 'Member nicht gefunden' };

  const want = new Set(desiredRoleIdsFor(rec));
  const current = new Set(member.roles.cache.map(r => r.id));
  const managedSet = new Set(Object.values(ROLE_MAP)); // nur Rollen aus unserer Map anfassen

  const toAdd = [...want].filter(id => !current.has(id));
  const toRemove = [...current].filter(id => managedSet.has(id) && !want.has(id));

  const changes = [];

  if (toAdd.length) {
    await member.roles.add(toAdd).catch(e => changes.push(`add: ${e.message}`));
  }
  if (toRemove.length) {
    await member.roles.remove(toRemove).catch(e => changes.push(`remove: ${e.message}`));
  }

  const nick = nicknameOf(rec);
  if (nick && member.manageable) {
    await member.setNickname(nick).catch(e => changes.push(`nick: ${e.message}`));
  }

  return {
    userId,
    ok: changes.length === 0,
    details: { added: toAdd, removed: toRemove, nickname: nick },
    changes
  };
}

/**
 * Alle synchronisieren
 */
async function syncAll(client) {
  const guild = await client.guilds.fetch(process.env.GUILD_ID);
  await guild.members.fetch(); // Cache füllen (wichtiger für größere Server)

  const data = await loadCsv();
  let ok = 0, fail = 0;

  for (const rec of data) {
    const res = await syncMember(guild, rec).catch(e => ({ ok: false, reason: e.message }));
    res.ok ? ok++ : fail++;
    // sanftes Rate-Limit
    await new Promise(r => setTimeout(r, 500));
  }
  console.log(`Sync done: ok=${ok} fail=${fail}`);
  return { ok, fail };
}

/**
 * Discord Client
 */
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  partials: [Partials.GuildMember]
});

/**
 * Slash Commands: /sync_all und /sync_member
 */
async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  const commands = [
    { name: 'sync_all', description: 'Alle Mitglieder aus dem Sheet synchronisieren' },
    {
      name: 'sync_member',
      description: 'Ein Mitglied per Discord User ID synchronisieren',
      options: [{ name: 'user_id', description: 'Discord User ID', type: 3, required: true }]
    }
  ];
  const app = await client.application.fetch();
  await rest.put(Routes.applicationGuildCommands(app.id, process.env.GUILD_ID), { body: commands });
  console.log('Slash-Commands registriert');
}

client.once('ready', async () => {
  console.log(`✅ Eingeloggt als ${client.user.tag}`);
  await registerCommands();

  // erster Auto-Sync
  try { await syncAll(client); } catch (e) { console.error('Autosync Fehler:', e); }

  // periodischer Auto-Sync (optional)
  const min = Number(process.env.SYNC_INTERVAL_MIN || 0);
  if (min > 0) {
    setInterval(() => {
      syncAll(client).catch(e => console.error('Autosync Fehler:', e));
    }, min * 60 * 1000);
    console.log(`Autosync alle ${min} Minuten aktiviert`);
  }
});

client.on('interactionCreate', async (i) => {
  if (!i.isChatInputCommand()) return;

  if (i.commandName === 'sync_all') {
    await i.deferReply({ ephemeral: true });
    const res = await syncAll(client);
    return i.editReply(`Fertig: ✅ ${res.ok} · ❌ ${res.fail}`);
  }

  if (i.commandName === 'sync_member') {
    const userId = i.options.getString('user_id', true);
    await i.deferReply({ ephemeral: true });
    const guild = await client.guilds.fetch(process.env.GUILD_ID);
    await guild.members.fetch(userId).catch(() => null); // warmup
    const data = await loadCsv();
    const rec = data.find(r => String(r[COL_USER_ID]).trim() === userId);
    if (!rec) return i.editReply(`Kein Datensatz für **${userId}** gefunden (nur Zeilen mit Discord_UserID werden verarbeitet).`);
    const res = await syncMember(guild, rec);
    return i.editReply(res.ok
      ? `OK. Nick: **${res.details.nickname}** | added: ${res.details.added.length} | removed: ${res.details.removed.length}`
      : `Fehler: ${res.reason || res.changes?.join(', ') || 'siehe Logs'}`);
  }
});

client.login(process.env.DISCORD_TOKEN);
