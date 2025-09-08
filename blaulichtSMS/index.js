require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Collection,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder
} = require('discord.js');

// ===== Node < 18? Undici aktivieren + Paket installieren (siehe README-Hinweis) =====
// const { fetch } = require('undici');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// --- IDs/ENV ---
const SOURCE_CHANNEL_ID = process.env.SOURCE_CHANNEL_ID || 'DEIN_SOURCE_CHANNEL';
const TARGET_CHANNEL_ID = process.env.TARGET_CHANNEL_ID || 'DEIN_TARGET_CHANNEL';
const NACHALARM_ROLE_ID = process.env.NACHALARM_ROLE_ID || 'DEINE_ROLE_ID';
const AAO_CHANNEL_ID = process.env.AAO_CHANNEL_ID || TARGET_CHANNEL_ID; // AAO im selben Kanal ok

// --- CSV-Quellen (bereitgestellt vom User) ---
const CSV_URLS = {
  BRAND: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQTiTQbW09ek6xRFa7YFwFWbm-Sn6WuApvVtdyxv0-FO7xmbT1hMhGw7Qswg1BrSXdVhUdReX6BlpQj/pub?gid=0&single=true&output=csv',
  TECHNISCH: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQTiTQbW09ek6xRFa7YFwFWbm-Sn6WuApvVtdyxv0-FO7xmbT1hMhGw7Qswg1BrSXdVhUdReX6BlpQj/pub?gid=2128438331&single=true&output=csv',
  SCHADSTOFF: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQTiTQbW09ek6xRFa7YFwFWbm-Sn6WuApvVtdyxv0-FO7xmbT1hMhGw7Qswg1BrSXdVhUdReX6BlpQj/pub?gid=200795303&single=true&output=csv',
  OTHER: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQTiTQbW09ek6xRFa7YFwFWbm-Sn6WuApvVtdyxv0-FO7xmbT1hMhGw7Qswg1BrSXdVhUdReX6BlpQj/pub?gid=1850566762&single=true&output=csv'
};

// --- Cache für AAO-Daten (pro Kategorie eine Map) ---
const aaoCache = {
  BRAND: new Map(),
  TECHNISCH: new Map(),
  SCHADSTOFF: new Map(),
  OTHER: new Map()
};

const responseTracker = new Collection();

/* =======================
   Hilfsfunktionen
   ======================= */

// Normalisieren für robuste Keys
const normalize = (s) =>
  (s || '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[–—]/g, '-')       // Gedankenstriche vereinheitlichen
    .replace(/\s*-\s*/g, '-')    // " - " → "-"
    .replace(/[^a-z0-9äöüß\- ]/g, ''); // Sonderz. raus, Umlaute ok

// erkennt Delimiter (Tab vs Komma)
function detectDelimiter(headerLine) {
  if (!headerLine) return ',';
  return headerLine.includes('\t') ? '\t' : ',';
}

// CSV/TSV → Array von Objekten
function parseDelimited(text) {
  const lines = text.replace(/\r/g, '').split('\n').filter(l => l.length > 0);
  if (lines.length === 0) return [];
  const delim = detectDelimiter(lines[0]);
  const headers = lines[0].split(delim).map(h => h.trim());

  return lines.slice(1).map(line => {
    const cols = line.split(delim);
    const obj = {};
    headers.forEach((h, i) => (obj[h] = (cols[i] ?? '').trim()));
    return obj;
  });
}

// lädt eine Kategorie und baut Lookup-Keys:
// Key1: alarmstufe|stichwort (präferiert)
// Key2: stichwort (Fallback)
async function loadCategory(catName, url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fehler beim Laden ${catName}: ${res.status}`);
  const text = await res.text();
  const rows = parseDelimited(text);

  const map = new Map();
  for (const row of rows) {
    const stichwort = normalize(row['Stichwort']);
    const alarmstufe = normalize(row['Alarmstufe']);
    if (!stichwort) continue;

    if (alarmstufe) {
      const key1 = `${alarmstufe}|${stichwort}`;
      map.set(key1, row);
    }
    // Fallback-Key ohne Stufe (nicht überschreiben, falls key1 existiert)
    if (!map.has(stichwort)) map.set(stichwort, row);
  }
  aaoCache[catName] = map;
  return map.size;
}

// Buchstabe der Alarmstufe → Kategorie
function categoryFromStufe(stufeRaw) {
  const s = (stufeRaw || '').toString().trim().toUpperCase();
  if (s.startsWith('B')) return 'BRAND';
  if (s.startsWith('T')) return 'TECHNISCH';
  if (s.startsWith('S')) return 'SCHADSTOFF';
  return 'OTHER';
}

// Kategorie bestimmen (primär via Alarmstufe)
function pickCategory(alarmstufe, stichwort) {
  const byStufe = categoryFromStufe(alarmstufe);
  if (byStufe !== 'OTHER') return byStufe;

  // Heuristik über Stichwort als Fallback
  const sw = (stichwort || '').toLowerCase();
  if (sw.includes('brand')) return 'BRAND';
  if (sw.includes('tech') || sw.includes('unfall') || sw.includes('rett')) return 'TECHNISCH';
  if (sw.includes('schad') || sw.includes('gefahr') || sw.includes('stoff')) return 'SCHADSTOFF';
  return 'OTHER';
}

// Lookup in Cache
function lookupAAO(alarmstufe, stichwort) {
  const cat = pickCategory(alarmstufe, stichwort);
  const map = aaoCache[cat] || new Map();

  const key1 = `${normalize(alarmstufe)}|${normalize(stichwort)}`;
  const key2 = normalize(stichwort);
  return { cat, row: map.get(key1) || map.get(key2) || null };
}

// Extrahiert Alarmstufe & Stichwort aus "FF - B1 - GMA-Brand" etc.
function extractAlarmInfo(text) {
  if (!text) return null;

  // 1) klassische Form "FF - B1 - GMA-Brand"
  const m1 = text.match(/\bFF\s*-\s*([A-Za-z]\d{0,2})\s*-\s*([^\n\r]+)/i);
  if (m1) {
    return { alarmstufe: m1[1].toUpperCase(), stichwort: m1[2].trim() };
  }

  // 2) Alternative: "Stichwort: FF - B1 - GMA-Brand"
  const m2 = text.match(/\b([A-Za-z]\d{0,2})\b.*?-+\s*([A-Za-zÄÖÜäöüß0-9 \-\/]+)/);
  if (m2) {
    return { alarmstufe: m2[1].toUpperCase(), stichwort: m2[2].replace(/^FF\s*-\s*/i, '').trim() };
  }

  // 3) Letzter Versuch: "FF - " entfernen, dann "Xn - rest"
  const stripped = text.replace(/^FF\s*-\s*/i, '');
  const m3 = stripped.match(/\b([A-Za-z]\d{0,2})\s*-\s*([^\n\r]+)/);
  if (m3) {
    return { alarmstufe: m3[1].toUpperCase(), stichwort: m3[2].trim() };
  }

  return null;
}

/* =======================
   Bot Lifecycle
   ======================= */

client.once('ready', async () => {
  console.log(`✅ Bot ist online als ${client.user.tag}`);

  // CSVs vorab laden (Cache)
  try {
    const counts = await Promise.all([
      loadCategory('BRAND', CSV_URLS.BRAND),
      loadCategory('TECHNISCH', CSV_URLS.TECHNISCH),
      loadCategory('SCHADSTOFF', CSV_URLS.SCHADSTOFF),
      loadCategory('OTHER', CSV_URLS.OTHER),
    ]);
    console.log(`📚 AAO geladen: Brand=${counts[0]}, Technisch=${counts[1]}, Schadstoff=${counts[2]}, Other=${counts[3]} Einträge`);
  } catch (e) {
    console.error('❌ AAO-CSV Laden fehlgeschlagen:', e.message);
  }

  // Startup-Pin (wie in deinem Code)
  try {
    const channel = await client.channels.fetch(TARGET_CHANNEL_ID);
    const pinned = await channel.messages.fetchPinned();
    for (const msg of pinned.values()) {
      await msg.unpin();
    }

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('select_startup_alarmtype')
      .setPlaceholder('Nachalarmierung starten...')
      .addOptions(
        new StringSelectMenuOptionBuilder().setLabel('Stiller Alarm').setValue('Stiller Alarm'),
        new StringSelectMenuOptionBuilder().setLabel('Sirenenalarm').setValue('Sirenenalarm')
      );

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const startupMessage = await channel.send({
      content: `Nachalarmierung starten:`,
      components: [row]
    });

    await startupMessage.pin();
    console.log('📌 Startup-Nachalarmierungsnachricht gesendet und gepinnt.');
  } catch (err) {
    console.error('❌ Fehler bei Startup-Nachricht:', err.message);
  }
});

client.on('messageCreate', async (message) => {
  if (message.channel.id !== SOURCE_CHANNEL_ID) return;
  if (message.author.bot && !message.webhookId) return;

  const removePrefix = text =>
    text
      .replace(/Ehrenamt Alarmierung: FF Wiener Neustadt\s*-*\s*/gi, '')
      .replace(/^(\*{1,2}\s*[-–]*\s*)+/g, '')
      .trim();

  let descriptionText = '';
  if (message.content?.trim()) {
    descriptionText = removePrefix(message.content.trim());
  } else if (message.embeds.length > 0) {
    const firstEmbed = message.embeds[0];
    if (firstEmbed.title || firstEmbed.description) {
      descriptionText = [
        firstEmbed.title ? removePrefix(firstEmbed.title) : '',
        firstEmbed.description ? removePrefix(firstEmbed.description) : ''
      ].filter(Boolean).join('\n\n');
    } else {
      descriptionText = '🔗 Nachricht enthält ein eingebettetes Element.';
    }
  } else if (message.attachments.size > 0) {
    const attachment = message.attachments.first();
    descriptionText = `📎 Anhang: ${attachment.name || attachment.url}`;
  } else {
    descriptionText = '⚠️ Kein sichtbarer Nachrichtentext vorhanden.';
  }

  const timestamp = new Date().toLocaleString('de-AT', {
    dateStyle: 'short',
    timeStyle: 'short'
  });

  const embed = new EmbedBuilder()
    .setColor(0xE67E22)
    .setTitle('Ehrenamt Alarmierung: FF Wiener Neustadt')
    .setDescription(`${descriptionText}\n\n${timestamp}`)
    .addFields(
      { name: '✅ Zusagen', value: 'Niemand bisher', inline: true },
      { name: '❌ Absagen', value: 'Niemand bisher', inline: true },
      { name: '🟠 Komme später', value: 'Niemand bisher', inline: true }
    );

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('come_yes').setLabel('✅ Ich komme').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('come_no').setLabel('❌ Ich komme nicht').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('come_late').setLabel('🟠 Ich komme später').setStyle(ButtonStyle.Primary)
  );

  try {
    const targetChannel = await client.channels.fetch(TARGET_CHANNEL_ID);
    const sentMessage = await targetChannel.send({
      embeds: [embed],
      components: [buttons],
      allowedMentions: { parse: [] }
    });

    responseTracker.set(sentMessage.id, {
      message: sentMessage,
      coming: [],
      notComing: [],
      late: []
    });

    console.log('📢 Alarmierung ohne Ping gesendet.');

    // === NEU: Info extrahieren & AAO posten ===
    const info = extractAlarmInfo(descriptionText);
    if (info?.stichwort && info?.alarmstufe) {
      const { cat, row } = lookupAAO(info.alarmstufe, info.stichwort);
      if (row) {
        const aaoEmbed = new EmbedBuilder()
          .setColor(0xFFA500)
          .setTitle('🚒 Alarm- & Ausrückeordnung')
          .setDescription(
            `**Kategorie:** ${cat}\n` +
            `**Stichwort:** ${row['Stichwort'] || info.stichwort}\n` +
            `**Alarmstufe:** ${row['Alarmstufe'] || info.alarmstufe}`
          )
          .addFields(
            { name: 'Alarmierungsart', value: row['Alamierungsart'] || '–', inline: true },
            { name: 'Verrechenbar', value: row['Verrechenbar'] || '–', inline: true },
            { name: 'AAO (Fahrzeuge)', value: row['AAO'] || '–', inline: false },
          );

        if (row['Langtext']) {
          aaoEmbed.addFields({ name: 'Hinweis', value: row['Langtext'], inline: false });
        }

        const aaoChannel = await client.channels.fetch(AAO_CHANNEL_ID);
        await aaoChannel.send({ embeds: [aaoEmbed] });
        console.log(`✅ AAO gepostet für ${info.alarmstufe} / ${info.stichwort} (${cat})`);
      } else {
        console.warn(`⚠️ Keine AAO gefunden für ${info.alarmstufe} / ${info.stichwort}`);
      }
    } else {
      console.warn('ℹ️ Konnte kein Stichwort/Alarmstufe erkennen.');
    }

  } catch (err) {
    console.error('❌ Fehler beim Senden:', err.message);
  }
});

client.on('interactionCreate', async (interaction) => {
  if (interaction.isButton()) {
    const entry = responseTracker.get(interaction.message.id);
    if (!entry) return;

    const userId = interaction.user.id;
    entry.coming = entry.coming.filter(id => id !== userId);
    entry.notComing = entry.notComing.filter(id => id !== userId);
    entry.late = entry.late.filter(id => id !== userId);

    if (interaction.customId === 'come_yes') entry.coming.push(userId);
    else if (interaction.customId === 'come_no') entry.notComing.push(userId);
    else if (interaction.customId === 'come_late') entry.late.push(userId);

    const originalEmbed = interaction.message.embeds[0];
    const newEmbed = EmbedBuilder.from(originalEmbed).setFields(
      { name: '✅ Zusagen', value: entry.coming.length ? entry.coming.map(id => `• <@${id}>`).join('\n') : 'Niemand bisher', inline: true },
      { name: '❌ Absagen', value: entry.notComing.length ? entry.notComing.map(id => `• <@${id}>`).join('\n') : 'Niemand bisher', inline: true },
      { name: '🟠 Komme später', value: entry.late.length ? entry.late.map(id => `• <@${id}>`).join('\n') : 'Niemand bisher', inline: true }
    );

    await entry.message.edit({ embeds: [newEmbed] });
    return interaction.reply({ content: 'Antwort gespeichert 🙌', ephemeral: true });
  }

  if (interaction.isStringSelectMenu() && interaction.customId === 'select_startup_alarmtype') {
    const selectedAlarmtype = interaction.values[0];

    const modal = new ModalBuilder()
      .setCustomId('startup_nachalarmieren_modal')
      .setTitle('Nachalarmieren');

    const stichwortInput = new TextInputBuilder()
      .setCustomId('stichwort')
      .setLabel('Stichwort (z. B. FF - B1 - GMA-Brand)')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const adresseInput = new TextInputBuilder()
      .setCustomId('adresse')
      .setLabel('Adresse')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const infoInput = new TextInputBuilder()
      .setCustomId('info')
      .setLabel('Weitere Infos')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(false);

    modal.addComponents(
      new ActionRowBuilder().addComponents(stichwortInput),
      new ActionRowBuilder().addComponents(adresseInput),
      new ActionRowBuilder().addComponents(infoInput)
    );

    interaction.client.alarmType = selectedAlarmtype;
    return interaction.showModal(modal);
  }

  if (interaction.isModalSubmit() && interaction.customId === 'startup_nachalarmieren_modal') {
    const alarmtype = interaction.client.alarmType || 'Unbekannt';
    const stichwort = interaction.fields.getTextInputValue('stichwort');
    const adresse = interaction.fields.getTextInputValue('adresse');
    const info = interaction.fields.getTextInputValue('info');

    const embed = new EmbedBuilder()
      .setColor(0xff9900)
      .setTitle('📣 Nachalarmierung: FF Wiener Neustadt')
      .setDescription(`**${alarmtype}** für FF Wiener Neustadt: ${stichwort} WIENER NEUSTADT-OT // ${adresse} // ${info}`)
      .addFields(
        { name: '✅ Zusagen', value: 'Niemand bisher', inline: true },
        { name: '❌ Absagen', value: 'Niemand bisher', inline: true },
        { name: '🟠 Komme später', value: 'Niemand bisher', inline: true }
      );

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('come_yes').setLabel('✅ Ich komme').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('come_no').setLabel('❌ Ich komme nicht').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('come_late').setLabel('🟠 Ich komme später').setStyle(ButtonStyle.Primary)
    );

    const channel = await client.channels.fetch(TARGET_CHANNEL_ID);
    const sentMessage = await channel.send({
      content: `<@&${NACHALARM_ROLE_ID}>`,
      embeds: [embed],
      components: [buttons],
      allowedMentions: { parse: ['roles'] }
    });

    responseTracker.set(sentMessage.id, {
      message: sentMessage,
      coming: [],
      notComing: [],
      late: []
    });

    // AAO Lookup auch hier
    const infoParsed = extractAlarmInfo(stichwort);
    if (infoParsed?.stichwort && infoParsed?.alarmstufe) {
      const { cat, row } = lookupAAO(infoParsed.alarmstufe, infoParsed.stichwort);
      if (row) {
        const aaoEmbed = new EmbedBuilder()
          .setColor(0xFFA500)
          .setTitle('🚒 Alarm- & Ausrückeordnung')
          .setDescription(
            `**Kategorie:** ${cat}\n` +
            `**Stichwort:** ${row['Stichwort'] || infoParsed.stichwort}\n` +
            `**Alarmstufe:** ${row['Alarmstufe'] || infoParsed.alarmstufe}`
          )
          .addFields(
            { name: 'Alarmierungsart', value: row['Alamierungsart'] || '–', inline: true },
            { name: 'Verrechenbar', value: row['Verrechenbar'] || '–', inline: true },
            { name: 'AAO (Fahrzeuge)', value: row['AAO'] || '–', inline: false },
          );

        if (row['Langtext']) {
          aaoEmbed.addFields({ name: 'Hinweis', value: row['Langtext'], inline: false });
        }

        const aaoChannel = await client.channels.fetch(AAO_CHANNEL_ID);
        await aaoChannel.send({ embeds: [aaoEmbed] });
      } else {
        console.warn(`⚠️ Keine AAO gefunden für ${infoParsed.alarmstufe} / ${infoParsed.stichwort}`);
      }
    }

    return interaction.reply({ content: '✅ Nachalarmierung erfolgreich gesendet.', ephemeral: true });
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
