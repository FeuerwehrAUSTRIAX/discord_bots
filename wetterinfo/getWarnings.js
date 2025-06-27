const axios = require('axios');

let lastPostedWarnings = new Set();

async function getWarnings() {
  try {
    const res = await axios.get('https://www.warnungen.zamg.at/html/ogd/ogd_wetterwarnungen.json'); // FIXED URL ✅
    const data = res.data;

    const relevantRegions = ['Wien', 'Wiener Neustadt', 'Mödling', 'Schneeberg', 'Hohe Wand'];
    const results = [];

    for (const entry of data) {
      // Region passt zu deiner Liste?
      if (relevantRegions.some(r =>
        entry.regionName.toLowerCase().includes(r.toLowerCase())
      )) {
        // Doppelte Einträge verhindern
        const key = `${entry.regionName}-${entry.event}-${entry.start}`;
        if (!lastPostedWarnings.has(key)) {
          lastPostedWarnings.add(key);

          // Formatieren
          results.push({
            region: entry.regionName,
            event: entry.event,
            level: entry.level,
            start: new Date(entry.start).toLocaleString('de-AT'),
            end: new Date(entry.end).toLocaleString('de-AT'),
          });
        }
      }
    }

    return results;
  } catch (err) {
    console.error('❌ Fehler beim Abrufen der Warnungen:', err.message);
    return [];
  }
}

module.exports = getWarnings;
