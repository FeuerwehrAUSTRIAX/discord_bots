const axios = require('axios');

async function getWarnings() {
  try {
    const lon = 16.3738;  // Koordinaten Wien
    const lat = 48.2082;
    const url = `https://warnungen.zamg.at/wsapp/api/getWarningsForCoords?lon=${lon}&lat=${lat}&lang=de`;

    const res = await axios.get(url, {
      headers: { accept: 'application/json' }
    });

    const data = res.data;

    if (!data.features) return [];

    const results = [];

    for (const feature of data.features) {
      const locationName = feature.properties?.location?.properties?.name || 'Unbekannter Ort';
      const warnings = feature.properties?.warnings || [];

      for (const warn of warnings) {
        const props = warn.properties;
        results.push({
          location: locationName,
          text: props.text,
          begin: props.begin,
          end: props.end,
          auswirkungen: props.auswirkungen,
          empfehlungen: props.empfehlungen,
          warnstufe: props.warnstufeid,
        });
      }
    }

    return results;
  } catch (error) {
    console.error('Fehler beim Abrufen der Warnungen:', error.message);
    return [];
  }
}

module.exports = getWarnings;
