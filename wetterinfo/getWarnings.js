const axios = require('axios');

let lastPostedWarnings = new Set();

const relevantMunicipalities = [
  'Wien',
  'Wiener Neustadt',
  'Mödling',
  'Schneeberg',
  'Hohe Wand',
  'Waidhofen an der Ybbs'
];

async function getWarnings() {
  try {
    const url = 'https://warnungen.zamg.at/wsapp/api/getWarnstatus';
    const res = await axios.get(url);
    const data = res.data;

    console.log('ROHE WARNUNGSDATEN:', JSON.stringify(data, null, 2));  // Zum Debuggen

    const results = [];

    if (!data.features) return results;

    for (const feature of data.features) {
      const props = feature.properties;

      if (
        props.municipalityName &&
        relevantMunicipalities.some(m =>
          props.municipalityName.toLowerCase().includes(m.toLowerCase())
        )
      ) {
        const key = `${props.municipalityName}-${props.type}-${props.validFrom}`;
        if (!lastPostedWarnings.has(key)) {
          lastPostedWarnings.add(key);

          results.push({
            region: props.municipalityName,
            event: props.type,
            level: props.severity,
            start: new Date(props.validFrom).toLocaleString('de-AT'),
            end: new Date(props.validTo).toLocaleString('de-AT'),
          });
        }
      }
    }

    return results;
  } catch (err) {
    console.error('Fehler beim Abrufen der GeoSphere Warnungen:', err.message);
    return [];
  }
}

module.exports = getWarnings;
