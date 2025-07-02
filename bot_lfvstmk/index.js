import fetch from 'node-fetch';
import { config } from 'dotenv';
config(); // Für Zugriff auf DISCORD_WEBHOOK

const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK;
const CSV_URL = "https://einsatzuebersicht.lfv.steiermark.at/lfvasp/einsatzkarte/Public.aspx?view=24";

// 👇 Hilfsfunktion: CSV in JSON umwandeln
function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  const headers = lines.shift().split(';');
  return lines.map(line => {
    const values = line.split(';');
    return headers.reduce((obj, header, i) => {
      obj[header.trim()] = values[i]?.trim();
      return obj;
    }, {});
  });
}

async function main() {
  try {
    console.log("🔄 CSV wird abgerufen...");
    const res = await fetch(CSV_URL);
    if (!res.ok) throw new Error("Download fehlgeschlagen");
    const csv = await res.text();
    const daten = parseCSV(csv);

    // 🔎 Optional: Filter nur aktuelle Einsätze
    const heute = new Date().toISOString().slice(0, 10).split("-").reverse().join(".");
    const aktuelleEinsaetze = daten.filter(e => e.date === heute);

    if (aktuelleEinsaetze.length === 0) {
      console.log("ℹ️ Keine Einsätze für heute.");
      return;
    }

    for (const einsatz of aktuelleEinsaetze.slice(0, 5)) {
      const nachricht = `🚒 **${einsatz.sub_tycod}** in ${einsatz.s_name} (${einsatz.dgroup}) – ${einsatz.tycod}`;
      console.log("📤 Sende an Discord:", nachricht);

      await fetch(DISCORD_WEBHOOK, {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: nachricht })
      });
    }

    console.log("✅ Alles erledigt!");

  } catch (err) {
    console.error("❌ Fehler:", err.message);
  }
}

main();
