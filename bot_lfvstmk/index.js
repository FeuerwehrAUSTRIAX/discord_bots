const fetch = require("node-fetch");

const WEBHOOK_URL = process.env.DISCORD_WEBHOOK;
const CSV_URL = "https://einsatzuebersicht.lfv.steiermark.at/lfvasp/einsatzkarte/Public.aspx?view=24";

async function fetchEinsaetze() {
  const res = await fetch(CSV_URL);
  const text = await res.text();

  const lines = text.trim().split("\n");
  const headers = lines[0].split(";");
  const einsaetze = lines.slice(1).slice(0, 5).map(line => {
    const parts = line.split(";");
    const eintrag = {};
    headers.forEach((h, i) => eintrag[h] = parts[i]);
    return eintrag;
  });

  return einsaetze;
}

async function postToDiscord(einsaetze) {
  if (!WEBHOOK_URL) {
    console.error("❌ Kein Webhook gesetzt! DISCORD_WEBHOOK fehlt.");
    return;
  }

  if (!einsaetze.length) {
    console.log("⚠️ Keine Einsätze gefunden.");
    return;
  }

  const content = "**🚨 Aktuelle Feuerwehreinsätze (Top 5)**\n\n" + einsaetze.map(e =>
    `📍 **${e.s_name}** – ${e.tycod} (${e.sub_tycod}) am ${e.date}`
  ).join("\n");

  const response = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content })
  });

  if (response.ok) {
    console.log("✅ Erfolgreich an Discord gesendet.");
  } else {
    console.error(`❌ Fehler beim Senden: ${response.status}`);
  }
}

(async () => {
  try {
    const einsaetze = await fetchEinsaetze();
    await postToDiscord(einsaetze);
  } catch (err) {
    console.error("❌ Script-Fehler:", err.message);
  }
})();
