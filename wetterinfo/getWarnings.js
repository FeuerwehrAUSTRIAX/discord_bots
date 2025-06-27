const axios = require('axios');

let lastPostedWarnings = new Set();

async function getWarnings() {
  try {
    const lon = 16.3738;
    const lat = 48.2082;
    const url = `https://warnungen.zamg.at/wsapp/api/getWarningsForCoords?lon=${lon}&lat=${lat}&lang=de`;
    const res = await axios.get(url, {
      headers: {
        accept: 'application/json'
      }
    });
    const data = res.data;

    const results = [];

    if (!data || !data.features) return results;

    for (const feature of data.features) {
      const props = feature.properties;

      const key = `${props.warnid}-${props.wtype}-${props.start}`;
      if (!lastPostedWarnings.has(key)) {
        lastPostedWarnings.add(key);

        results.push({
          region: props.region || 'Wien',
          event: props.wtype,
          level: props.wlevel,
          start: new Date(props.start * 1000).toLocaleString('de-AT'),
          end: new Date(props.end * 1000).toLocaleString('de-AT'),
          description: props.description || ''
        });
      }
    }

    return results;
  } catch (err) {
    console.error('Fehler beim Abrufen der Warnungen:', err.message);
    return [];
  }
}

module.exports = getWarnings;
