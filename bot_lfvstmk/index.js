const axios = require("axios");
const cheerio = require("cheerio");

require("dotenv").config();

const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

let lastPosted = [];

async function fetchAndPost() {
  const url = "https://einsatzuebersicht.lfv.steiermark.at/lfvasp/einsatzkarte/karte_app_public.html";

  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    $("#datagrid table tbody tr").each(async (_, row) => {
      const tds = $(row).find("td");
      if (tds.length < 5) return;

      const einsatzart = $(tds[0]).text().trim();
      const datum = $(tds[1]).text().trim();
      const ort = $(tds[2]).text().trim();
      const statusImg = $(tds[3]).find("img").attr("src") || "❓";
      const status = statusImg.split("/").pop().replace(".png", "").toUpperCase();

      const id = `${datum}-${einsatzart}-${ort}`;
      if (lastPosted.includes(id)) return;
      lastPosted.push(id);

      const content = `🚨 **${einsatzart}** in **${ort}**\n📅 ${datum}\n🟡 Status: \`${status}\``;

      await axios.post(WEBHOOK_URL, { content });
      console.log("📤 Gesendet:", content);
    });

  } catch (err) {
    console.error("❌ Fehler beim Abrufen oder Posten:", err.message);
  }
}

// Starte sofort, dann alle 5 Minuten erneut
fetchAndPost();
setInterval(fetchAndPost, 5 * 60 * 1000);
