const axios = require('axios');

// Gemeinden als Codes (oder Namen, je nach Datenquelle)
const relevantGemeinden = [
  "10101", // Beispiel: Wien
  "10201", // Wiener Neustadt
  "10301", // Mödling
  "10401", // Waidhofen an der Ybbs
  // Füge hier weitere Codes hinzu
];

// Hilfsfunktion, um Unix-Timestamp in lesbares Datum zu wandeln
function formatTimestamp(unixTimestamp) {
  return new Date(unixTimestamp * 1000).toLocaleString('de-AT');
}

async function getWarnings() {
  try {
    const url = 'https://warnungen.zamg.at/wsapp/api/getWarnstatus';
    const res = await axios.get(url);
    const data = res.data;

    if (!data || data.type !== 'FeatureCollection' || !Array.isArray(data.features)) {
      console.error('Unerwartetes Datenformat bei Warnungen');
      return [];
    }

    const results = [];

    for (const feature of data.features) {
      const props = feature.properties;
      if (!props || !props.gemeinden || !Array.isArray(props.gemeinden)) continue;

      // Prüfe, ob eine der Gemeinden relevant ist
      const isRelevant = props.gemeinden.some(g => relevantGemeinden.includes(g));
      if (!isRelevant) continue;

      results.push({
        warnid: props.warnid,
        type: props.wtype,       // Warnungstyp (z.B. 5 = Gewitter)
        level: props.wlevel,     // Warnstufe
        start: formatTimestamp(props.start),
        end: formatTimestamp(props.end),
        gemeinden: props.gemeinden,
      });
    }

    return results;

  } catch (error) {
    console.error('Fehler beim Abrufen der Warnungen:', error.message);
    return [];
  }
}

module.exports = getWarnings;
