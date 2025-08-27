import 'dotenv/config';
import fetch from 'node-fetch';
import { parse } from 'csv-parse/sync';
import {
  Client,
  GatewayIntentBits,
  Partials,
  REST,
  Routes,
  PermissionFlagsBits
} from 'discord.js';

/* =========================
   ENV (Railway → Variables)
   - DISCORD_TOKEN
   - GUILD_ID
   - CSV_URL             (Google Sheets CSV Publish-Link)
   - SYNC_INTERVAL_MIN   (optional, Minuten)
   - NICK_SUFFIX         (optional, z.B. " 🔥")
   ========================= */

const CSV_URL     = process.env.CSV_URL;
const GUILD_ID    = process.env.GUILD_ID;
const TOKEN       = process.env.DISCORD_TOKEN;
const NICK_SUFFIX = (process.env.NICK_SUFFIX || '').toString();

/* ===== Pflichtspalten (genau wie im Sheet) ===== */
const COL_USER_ID    = 'Discord_UserID';
const COL_GRADE      = 'Aktueller Dienstgrad';
const COL_FIRST      = 'Namen';
const COL_LAST       = 'Nachnamen';
const COL_FUNCTION   = 'Funktion';          // Mannschaft / Kommando / Verwaltung / Charge
const COL_ACTIVE     = 'Aktives Mitglied';  // JA / NEIN
const COL_ASSIGNMENT = 'Dienstzuteilung';   // z.B. "Feuerwehr Wiener Neustadt"

/* ===== „JA“-Prüfung ===== */
const isYes = (val) => String(val || '').trim().toUpperCase() === 'JA';

/* ===== Nickname-Formate ===== */
// Aktiv: "Dienstgrad | Vorname Nachname"
const activeNicknameOf = (rec) => {
  const grade = (rec[COL_GRADE] || '').toString().trim();
  const first = (rec[COL_FIRST] || '').toString().trim();
  const last  = (rec[COL_LAST]  || '').toString().trim();
  const base  = `${grade} | ${first} ${last}`.replace(/\s+/g, ' ').trim();
  return (base + (NICK_SUFFIX ? ` ${NICK_SUFFIX}` : '')).trim();
};
// Inaktiv: "Vorname Nachname"
const inactiveNicknameOf = (rec) => {
  const first = (rec[COL_FIRST] || '').toString().trim();
  const last  = (rec[COL_LAST]  || '').toString().trim();
  return `${first} ${last}`.replace(/\s+/g, ' ').trim();
};

/* ===== Kurs-/Lehrgangsrollen ===== */
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

/* ===== Dienstgrad-Rollen ===== */
const RANK_ROLE_MAP = {
  "Feuerwehrpräsident": "1383059679034474617",
  "Landesbranddirektor": "1383068555838230699",
  "Landesbranddirektorstellvertreter": "1383068465413361684",
  "Landesfeuerwehrkurat": "1383069852151058514",
  "Landesfeuerwehrjurist": "1383069749440806922",
  "Landesfeuerwehrarzt": "1383069646965706752",
  "Landesfeuerwehrrat": "1383068317740175401",
  "Oberbrandrat BFK": "1304852341593215086",
  "Brandrat BFK Stv.": "1383067441562652723",
  "Verwaltungsrat": "1383068730598232124",
  "Verwaltungsinspektor": "1383068662256107550",
  "Bezirkssachbearbeiter": "1383068970982182952",
  "Bezirksfeuerwehrkurat": "1383069559853944964",
  "Bezirksfeuerwehrjurist": "1383069458318233650",
  "Bezirksfeuerwehrarzt": "1383069334670413935",
  "Brandrat AFK": "1383067231801311292",
  "Abschnittsbrandinspektor AFK Stv.": "1304852140501500014",
  "Abschnittssachbearbeiter": "1383068907308453939",
  "Hauptbrandinspektor": "1151966652724936806",
  "Oberbrandinspektor": "1151966758975053874",
  "Brandinspektor": "1151966949711032341",
  "Hauptverwalter": "1294314452124045333",
  "Oberverwalter": "1151966882539257968",
  "Verwalter": "1294314603555192832",
  "Feuerwehrtechniker": "1383069272049451028",
  "Feuerwehrkurat": "1383069199156379799",
  "Feuerwehrjurist": "1383069126620352612",
  "Feuerwehrarzt": "1383069055753130104",
  "Sachbearbeiter": "1383068809300152331",
  "Hauptverwaltungsmeister": "1294315446866149487",
  "Oberverwaltungsmeister": "1294315364104011861",
  "Verwaltungsmeister": "1294314875782303754",
  "Hauptbrandmeister": "1151967127264309289",
  "Oberbrandmeister": "1151967548657635358",
  "Brandmeister": "1151967887028932658",
  "Hauptlöschmeister": "1151968204302860358",
  "Oberlöschmeister": "1151968450726600815",
  "Löschmeister": "1294228852423397377",
  "Hauptfeuerwehrmann": "1151969003280015360",
  "Oberfeuerwehrmann": "1151969315319459930",
  "Feuerwehrmann": "1151969557058162759",
  "Probefeuerwehrmann": "1151970098408595456"
};

/* ===== Funktions-Rollen (deine IDs) ===== */
const FUNCTION_ROLE_MAP = {
  "Mannschaft": "1151993527111254168",
  "Kommando":   "1151993518722654269",
  "Verwaltung": "1151964828806692946",
  "Charge":     "1151968107984859156"
};

/* ===== Dienstzuteilung → Rollen (deine IDs) ===== */
const ASSIGNMENT_ROLE_MAP = {
  "Feuerwehr Wiener Neustadt": "1293999568991555667"
  // weitere Zuteilungen hier ergänzen …
};

/* ===== Abkürzungs-/Alias-Mapping -> Schlüssel von RANK_ROLE_MAP ===== */
const RANK_ALIASES = {
  "LBD": "Landesbranddirektor",
  "LBDSTV": "Landesbranddirektorstellvertreter",
  "LFR": "Landesfeuerwehrrat",

  "ABI": "Abschnittsbrandinspektor AFK Stv.",
  "BR AFK": "Brandrat AFK",
  "BR BFK STV": "Brandrat BFK Stv.",

  "HBI": "Hauptbrandinspektor",
  "OBI": "Oberbrandinspektor",
  "BI":  "Brandinspektor",
  "HBM": "Hauptbrandmeister",
  "OBM": "Oberbrandmeister",
  "BM":  "Brandmeister",
  "HLM": "Hauptlöschmeister",
  "OLM": "Oberlöschmeister",
  "LM":  "Löschmeister",
  "HFM": "Hauptfeuerwehrmann",
  "OFM": "Oberfeuerwehrmann",
  "FM":  "Feuerwehrmann",
  "PFM": "Probefeuerwehrmann",

  "HVM": "Hauptverwaltungsmeister",
  "OVM": "Oberverwaltungsmeister",
  "VM":  "Verwaltungsmeister",
  "HV":  "Hauptverwalter",
  "OV":  "Oberverwalter",
  "V":   "Verwalter",

  "SAB": "Sachbearbeiter",
  "FT":  "Feuerwehrtechniker",
  "FK":  "Feuerwehrkurat",
  "FJ":  "Feuerwehrjurist",
  "FA":  "Feuerwehrarzt"
};

/* ===== Checks ===== */
function assertEnv() {
  const missing = [];
  if (!TOKEN) missing.push('DISCORD_TOKEN');
  if (!GUILD_ID) missing.push('GUILD_ID');
  if (!CSV_URL) missing.push('CSV_URL');
  if (!Object.keys(ROLE_MAP).length) missing.push('ROLE_MAP (Kurse)');
  if (!Object.keys(RANK_ROLE_MAP).length) missing.push('RANK_ROLE_MAP (Dienstgrade)');
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

/* ===== Grade normalisieren (Abkürzungen/Varianten) ===== */
function normalizeGrade(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  const key = s.toUpperCase().replace(/\s+/g, ' ');
  const aliasTarget = RANK_ALIASES[key];
  return aliasTarget || s;
}

/* ===== Einzelne Zielrollen ===== */
function rankRoleIdFor(rec) {
  const raw = rec[COL_GRADE];
  const normalized = normalizeGrade(raw);
  const roleId = RANK_ROLE_MAP[normalized];
  if (!roleId && normalized) {
    console.warn(`[RANK] Kein Mapping für "${raw}" → normalisiert "${normalized}". Bitte in RANK_ROLE_MAP/RANK_ALIASES ergänzen.`);
  }
  return roleId || null;
}
function functionRoleIdFor(rec) {
  const func = String(rec[COL_FUNCTION] || '').trim();
  return FUNCTION_ROLE_MAP[func] || null;
}
function assignmentRoleIdFor(rec) {
  const assign = String(rec[COL_ASSIGNMENT] || '').trim();
  return ASSIGNMENT_ROLE_MAP[assign] || null;
}

/* ===== Gesamte Zielrollen (Kurse + Dienstgrad + Funktion + Zuteilung) ===== */
function desiredRoleIdsFor(rec) {
  const ids = [];
  for (const [colName, roleId] of Object.entries(ROLE_MAP)) {
    if (isYes(rec[colName])) ids.push(roleId);
  }
  const rankId = rankRoleIdFor(rec);
  if (rankId) ids.push(rankId);

  const funcId = functionRoleIdFor(rec);
  if (funcId) ids.push(funcId);

  const assignId = assignmentRoleIdFor(rec);
  if (assignId) ids.push(assignId);

  return ids;
}

/* ===== Nickname setzen mit Diagnose ===== */
function capNick(s) {
  const MAX = 32;
  return s.length > MAX ? s.slice(0, MAX) : s;
}
function rolePath(member) {
  const list = [...member.roles.cache.values()]
    .sort((a,b) => b.position - a.position)
    .slice(0, 5)
    .map(r => `${r.name} #${r.position}`);
  return list.join(' > ');
}
async function setNickWithDiagnostics(guild, member, desiredNick, changes) {
  const me = guild.members.me;
  if (!me) return changes.push('nick: guild.members.me nicht verfügbar');

  if (!me.permissions.has(PermissionFlagsBits.ManageNicknames)) {
    changes.push('nick: Bot hat keine Permission "Nicknames verwalten"');
    return;
  }
  if (member.id === guild.ownerId) {
    changes.push('nick: Server-Owner kann nicht umbenannt werden');
    return;
  }
  if (member.roles.highest.comparePositionTo(me.roles.highest) >= 0) {
    changes.push(`nick: Rollen-Hierarchie blockiert (Member ≥ Bot)`);
    console.warn(`[NICK DIAG]
Member highest : ${member.roles.highest.name} #${member.roles.highest.position}
Bot highest    : ${me.roles.highest.name} #${me.roles.highest.position}
Member roles   : ${rolePath(member)}
Bot roles      : ${rolePath(me)}`.trim());
    return;
  }

  const nick32 = capNick(desiredNick);
  await member.setNickname(nick32).catch(e => changes.push(`nick: ${e.message || String(e)}`));
}

/* ===== Einen Member syncen (Rollen & Nickname) ===== */
async function syncMember(guild, rec) {
  const userId = String(rec[COL_USER_ID]).trim();
  const member = await guild.members.fetch(userId).catch(() => null);
  if (!member) return { userId, ok: false, reason: 'Member nicht gefunden' };

  const changes = [];

  // Alle Rollen, die wir verwalten
  const managedSet = new Set([
    ...Object.values(ROLE_MAP),
    ...Object.values(RANK_ROLE_MAP),
    ...Object.values(FUNCTION_ROLE_MAP),
    ...Object.values(ASSIGNMENT_ROLE_MAP)
  ]);

  // INAKTIV → alle gemanagten Rollen entfernen + Nick = Vorname Nachname
  if (!isYes(rec[COL_ACTIVE])) {
    const toRemove = [...member.roles.cache.keys()].filter(id => managedSet.has(id));
    if (toRemove.length) await member.roles.remove(toRemove).catch(e => changes.push(`remove: ${e.message}`));
    const nick = inactiveNicknameOf(rec);
    if (nick) await setNickWithDiagnostics(guild, member, nick, changes);
    return { userId, ok: changes.length === 0, reason: 'inaktiv', changes };
  }

  // AKTIV → Rollen synchronisieren
  const want = new Set(desiredRoleIdsFor(rec));
  const current = new Set(member.roles.cache.map(r => r.id));

  const toAdd    = [...want].filter(id => !current.has(id));
  const toRemove = [...current].filter(id => managedSet.has(id) && !want.has(id));

  if (toAdd.length)    await member.roles.add(toAdd).catch(e => changes.push(`add: ${e.message}`));
  if (toRemove.length) await member.roles.remove(toRemove).catch(e => changes.push(`remove: ${e.message}`));

  // Nick setzen (aktiv-Format)
  const nick = activeNicknameOf(rec);
  if (nick) await setNickWithDiagnostics(guild, member, nick, changes);

  const ok = changes.length === 0;
  if (!ok) console.warn(`[SYNC ${userId}] Änderungen/Fehler:`, changes);
  return { userId, ok, details: { added: toAdd, removed: toRemove, nickname: nick }, changes };
}

/* ===== Alle syncen (Autosync & /sync_all) ===== */
async function syncAll(client) {
  const guild = await client.guilds.fetch(GUILD_ID);
  await guild.members.fetch();
  const data = await loadCsv();
  let ok = 0, fail = 0;

  for (const rec of data) {
    const res = await syncMember(guild, rec).catch(e => ({ ok: false, reason: e.message }));
    if (res.ok) ok++; else {
      fail++;
      console.warn(`[SYNC FAIL] ${res.userId || ''} – ${res.reason || res.changes?.join(', ') || 'unbekannt'}`);
    }
    await new Promise(r => setTimeout(r, 500));
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
    },
    {
      name: 'nick_test',
      description: 'Diagnose: Nickname für User setzen',
      options: [
        { name: 'user_id', description: 'Discord User ID', type: 3, required: true },
        { name: 'nick', description: 'Wunsch-Nick', type: 3, required: true }
      ]
    }
  ];
  const app = await client.application.fetch();
  await rest.put(Routes.applicationGuildCommands(app.id, GUILD_ID), { body: commands });
  console.log('Slash-Commands registriert');
}

/* v14 Hinweis: "ready" ist deprecated -> "clientReady" */
client.on('clientReady', async () => {
  console.log(`✅ Eingeloggt als ${client.user.tag}`);
  await registerCommands();

  try { await syncAll(client); } catch (e) { console.error('Autosync Fehler:', e); }

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
    await guild.members.fetch(userId).catch(() => null);
    const data = await loadCsv();
    const rec = data.find(r => String(r[COL_USER_ID]).trim() === userId);
    if (!rec) return i.editReply(`Kein Datensatz für **${userId}** gefunden (nur Zeilen mit ${COL_USER_ID}).`);
    const res = await syncMember(guild, rec);
    return i.editReply(res.ok
      ? `OK. Nick: **${res.details.nickname}** | added: ${res.details.added.length} | removed: ${res.details.removed.length}`
      : `Fehler/Info: ${res.reason || res.changes?.join(', ') || 'siehe Logs'}`);
  }

  if (i.commandName === 'nick_test') {
    const userId = i.options.getString('user_id', true);
    const nick   = i.options.getString('nick', true);
    await i.deferReply({ ephemeral: true });
    const guild = await client.guilds.fetch(GUILD_ID);
    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) return i.editReply('Member nicht gefunden.');
    const changes = [];
    await setNickWithDiagnostics(guild, member, nick, changes);
    return i.editReply(changes.length ? `Ergebnis: ${changes.join(' | ')}` : `OK – Nick gesetzt: **${capNick(nick)}**`);
  }
});

client.login(TOKEN);
