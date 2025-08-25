import 'dotenv/config';
import fetch from 'node-fetch';
import { parse } from 'csv-parse/sync';
import { Client, GatewayIntentBits, Partials, REST, Routes } from 'discord.js';

/* =========================
   ENV (Railway → Variables)
   - DISCORD_TOKEN
   - GUILD_ID
   - CSV_URL   (Google Sheets CSV Publish-Link)
   - SYNC_INTERVAL_MIN (optional, Minuten)
   ========================= */

const CSV_URL   = process.env.CSV_URL;
const GUILD_ID  = process.env.GUILD_ID;
const TOKEN     = process.env.DISCORD_TOKEN;

/* ===== Pflichtspalten (genau wie im Sheet) ===== */
const COL_USER_ID = 'Discord_UserID';
const COL_GRADE   = 'Aktueller Dienstgrad';
const COL_FIRST   = 'Namen';
const COL_LAST    = 'Nachnamen';

/* ===== Nickname-Format ===== */
const nicknameOf = (rec) =>
  `${(rec[COL_GRADE] || '').toString().trim()} | ${(rec[COL_FIRST] || '').toString().trim()} ${(rec[COL_LAST] || '').toString().trim()}`
    .replace(/\s+/g, ' ')
    .trim();

/* ===== „JA“-Prüfung ===== */
const isYes = (val) => String(val || '').trim().toUpperCase() === 'JA';

/* ===== ROLE MAP – direkt im Code (deine Liste) ===== */
const ROLE_MAP = {
  "FWBW - Absolviert": "1378763949591232645",
  "TE10 - Absolviert": "1378764207247331381",
  "TE20 - Absolviert": "1378764208786636910",
  "TE30 - Absolviert": "1378764209625628742",
  "TE40 - Absolviert": "1378764210292523050",
  "BD10 - Absolviert": "1378764211038978149",
  "BD20 - Absolviert": "1378764211705876561",
  "BD70 - Absolviert": "1378764212360318976",
  "BD80 - Absolviert": "1378764679005999155",
  "AT - Absolviert":  "1378764686819987536",
  "EMA B - Absolviert": "1378763935464820787",
  "EMA C - Absolviert": "1378763943329267862",
  "EMA C2 - Absolviert": "1378763946596630650",
  "GFÜ - Absolviert":  "1378764690574016512",
  "FÜ10 - Absolviert": "1378764693404909719",
  "ASM10 - Absolviert":"1378764847466156092",
  "FÜ20 - Absolviert": "1378764850104111206",
  "NRD10 - Absolviert":"1378764851941216256",
  "NRD20 - Absolviert":"1378764853593903236",
  "SD10 - Absolviert": "1378764855737192498",
  "SD20 - Absolviert": "1378765084066709637",
  "SD25 - Absolviert": "1378765085815603341",
  "SD35 - Absolviert": "1378765087275487375",
  "SD40 - Absolviert": "1378765256431636541",
  "WD10 - Absolviert": "1378765258725920870",
  "WD20 - Absolviert": "1378765259845931008",
  "T1 - Absolviert":   "1378765260416225411",
  "WFBB1 - Absolviert":"1378765415534170202",
  "WFBB2 - Absolviert":"1378765424421900428",
  "TBS20 - Absolviert":"1378765524485275761",
  "TBS30 - Absolviert":"1378765525014024332"
};

/* ===== Checks ===== */
function assertEnv() {
  const missing = [];
  if (!TOKEN) missing.push('DISCORD_TOKEN');
  if (!GUILD_ID) missing.push('GUILD_ID');
  if (!CSV_URL) missing.push('CSV_URL');
  if (!Object.keys(ROLE_MAP).length) missing.push('ROLE_MAP (im Code)');
  if (missing.length) throw new Error('Fehlende ENV Variablen: ' + missing.join(', '));
}
assertEnv();

/* ===== CSV laden (nur Zeilen mit gültiger Discord_UserID) ===== */
async function loadCsv() {
  const res = await fetch(CSV_URL);
  if (!res.ok) throw new Error(`CSV Download failed: ${res.status} ${res.statusText}`);
  const text = await res.text();
  const rows = parse(text, { columns: true, skip_empty_lines: true, bom: true });
  return rows.filter(r => /^\d{17,20}$/.test(String(r[COL_USER_ID] || '').trim()));
}

/* ===== Zielrollen aus ROLE_MAP nach "JA" bestimmen ===== */
function desiredRoleIdsFor(rec) {
  const ids = [];
  for (const [colName, roleId] of Object.entries(ROLE_MAP)) {
    if (isYes(rec[colName])) ids.push(roleId);
  }
  return ids;
}

/* ===== Einen Member syncen (Rollen & Nickname) ===== */
async function syncMember(guild, rec) {
  const userId = String(rec[COL_USER_ID]).trim();
  const member = await guild.members.fetch(userId).catch(() => null);
  if (!member) return { userId, ok: false, reason: 'Member nicht gefunden' };

  const want = new Set(desiredRoleIdsFor(rec));
  const current = new Set(member.roles.cache.map(r => r.id));
  const managedSet = new Set(Object.values(ROLE_MAP)); // wir fassen nur Rollen aus unserer Map an

  const toAdd = [...want].filter(id => !current.has(id));
  const toRemove = [...current].filter(id => managedSet.has(id) && !want.has(id));

  const changes = [];
  if (toAdd.length)   await member.roles.add(toAdd).catch(e => changes.push(`add: ${e.message}`));
  if (toRemove.length)await member.roles.remove(toRemove).catch(e => changes.push(`remove: ${e.message}`));

  const nick = nicknameOf(rec);
  if (nick && member.manageable) {
    await member.setNickname(nick).catch(e => changes.push(`nick: ${e.message}`));
  }

  return { userId, ok: changes.length === 0, details: { added: toAdd, removed: toRemove, nickname: nick }, changes };
}

/* ===== Alle syncen (Autosync & /sync_all) ===== */
async function syncAll(client) {
  const guild = await client.guilds.fetch(GUILD_ID);
  await guild.members.fetch(); // Cache laden
  const data = await loadCsv();
  let ok = 0, fail = 0;

  for (const rec of data) {
    const res = await syncMember(guild, rec).catch(e => ({ ok: false, reason: e.message }));
    res.ok ? ok++ : fail++;
    await new Promise(r => setTimeout(r, 500)); // gentle rate limit
  }
  console.log(`Sync done: ok=${ok} fail=${fail}`);
  return { ok, fail };
}

/* ===== Discord Client + Slash Commands ===== */
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  partials: [Partials.GuildMember]
});

async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(TOKEN);
  const commands = [
    { name: 'sync_all', description: 'Alle Mitglieder aus dem Sheet synchronisieren' },
    {
      name: 'sync_member',
      description: 'Ein Mitglied per Discord User ID synchronisieren',
      options: [{ name: 'user_id', description: 'Discord User ID', type: 3, required: true }]
    }
  ];
  const app = await client.application.fetch();
  await rest.put(Routes.applicationGuildCommands(app.id, GUILD_ID), { body: commands });
  console.log('Slash-Commands registriert');
}

client.once('ready', async () => {
  console.log(`✅ Eingeloggt als ${client.user.tag}`);
  await registerCommands();

  // Initialer Auto-Sync
  try { await syncAll(client); } catch (e) { console.error('Autosync Fehler:', e); }

  // Periodischer Auto-Sync (optional)
  const min = Number(process.env.SYNC_INTERVAL_MIN || 0);
  if (min > 0) {
    setInterval(() => { syncAll(client).catch(e => console.error('Autosync Fehler:', e)); }, min * 60 * 1000);
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
    const guild = await client.guilds.fetch(GUILD_ID);
    await guild.members.fetch(userId).catch(() => null); // warmup
    const data = await loadCsv();
    const rec = data.find(r => String(r[COL_USER_ID]).trim() === userId);
    if (!rec) return i.editReply(`Kein Datensatz für **${userId}** gefunden (nur Zeilen mit ${COL_USER_ID}).`);
    const res = await syncMember(guild, rec);
    return i.editReply(res.ok
      ? `OK. Nick: **${res.details.nickname}** | added: ${res.details.added.length} | removed: ${res.details.removed.length}`
      : `Fehler: ${res.reason || res.changes?.join(', ') || 'siehe Logs'}`);
  }
});

client.login(TOKEN);
