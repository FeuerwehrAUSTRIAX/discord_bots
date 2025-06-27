const axios = require('axios');

async function getLiveWeather(city = 'Wien') {
  try {
    const url = `https://wttr.in/${encodeURIComponent(city)}?format=j1`;
    const res = await axios.get(url);
    const data = res.data;

    const current = data.current_condition[0];
    const condition = current.weatherDesc[0].value;
    const temp = current.temp_C;
    const feelsLike = current.FeelsLikeC;
    const wind = current.windspeedKmph;

    return {
      city,
      condition,
      temp,
      feelsLike,
      wind,
    };
  } catch (err) {
    console.error(`❌ Fehler beim Wetter für ${city}:`, err.message);
    return null;
  }
}

module.exports = getLiveWeather;
