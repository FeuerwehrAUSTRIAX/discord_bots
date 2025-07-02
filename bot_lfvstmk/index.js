const axios = require("axios");
const cheerio = require("cheerio");

const WEBHOOK_URL = "https://discord.com/api/webhooks/1389898593862811709/ugPbqAqMqvOzJyGkkdPB1jKGcBOEx3OX2Zzd1NKTV8ZSpLc8i1FRvHLSSMEzyhCc2qUo";

let lastPosted = [];

async function fetchAndPost() {
  const url = "https://einsatzuebersicht.lfv.steiermark.at/lfvasp/einsatzkarte/karte_app_public.html";

  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    $("#datagrid table tbody tr").each(async (_, row) => {
      const tds = $(row).find("td");
      if (tds.length < 5) return; // nur vollständige Datensätze

      const einsatzart = $(tds[0]).text().trim();
      const datum = $(tds[1]).text().trim();
      const ort = $(tds[2]).text().trim();
      const statusImg = $(tds[3]).find("img").attr("src") || "❓";
      const status = statusImg.split("/").pop().replace(".png", "").toUpperCase();

      const id = `${datum}-${einsatzart}-${ort}`; // eindeutige ID

      if (lastPosted.includes(id)) return;
      lastPosted.push(id);

      const message = {
        content: `🚨 **${einsatzart}** in **${ort}**\n📅 ${datum}\n🟡 Status: \`${status}\``,
      };

      await axios.post(WEBHOOK_URL, message);
      console.log("📤 Gesendet:", message.content);
    });

  } catch (err) {
    console.error("❌ Fehler beim Abrufen oder Posten:", err.message);
  }
}

// Sofort ausführen und dann alle 5 Minuten
fetchAndPost();
setInterval(fetchAndPost, 5 * 60 * 1000);
