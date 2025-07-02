const axios = require("axios");
const cheerio = require("cheerio");

const WEBHOOK_URL = "https://discord.com/api/webhooks/1389898593862811709/ugPbqAqMqvOzJyGkkdPB1jKGcBOEx3OX2Zzd1NKTV8ZSpLc8i1FRvHLSSMEzyhCc2qUo";

// In-memory gespeichert – bei Railway-Restarts gehen sie verloren. Für dauerhaft: Datenbank oder Datei.
let lastPosted = [];

async function fetchAndPost() {
  try {
    const url = "https://einsatzuebersicht.lfv.steiermark.at/lfvasp/einsatzkarte/Liste.html?Bereich=all&param=D937D5636F31DF4D0F9CD43281AE1DC9F79040E0";
    const { data } = await axios.get(url);

    const $ = cheerio.load(data);

    $(".table.table-hover tbody tr").each(async (i, el) => {
      const tds = $(el).find("td");

      const time = $(tds[0]).text().trim();
      const district = $(tds[1]).text().trim();
      const community = $(tds[2]).text().trim();
      const type = $(tds[3]).text().trim();
      const address = $(tds[4]).text().trim();

      const id = `${time}-${district}-${community}-${type}`; // primitive ID

      if (!lastPosted.includes(id)) {
        lastPosted.push(id);

        const message = {
          content: `🚨 **${type}** in **${community}** (${district})\n🕒 ${time}\n📍 ${address}`,
        };

        await axios.post(WEBHOOK_URL, message);
        console.log(`Gepostet: ${message.content}`);
      }
    });

  } catch (err) {
    console.error("Fehler beim Abrufen oder Senden:", err.message);
  }
}

// alle 5 Minuten ausführen
fetchAndPost();
setInterval(fetchAndPost, 5 * 60 * 1000);
