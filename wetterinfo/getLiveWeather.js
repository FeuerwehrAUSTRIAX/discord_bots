const axios = require('axios');

async function getLiveWeather(city = 'Wien') {
  try {
    const url = `https://wttr.in/${encodeURIComponent(city)}?format=j1`;
    const res = await axios.get(url);
    const data = res.data;

    const current = data.current_condition[0];
    const conditionEN = current.weatherDesc[0].value;

    // Optional: deutsche Übersetzung (einfach erweitern)
    const conditionsMap = {
      "Partly cloudy": "Teilweise bewölkt",
      "Sunny": "Sonnig",
      "Cloudy": "Bewölkt",
      "Overcast": "Stark bewölkt",
      "Patchy rain possible": "Leichter Regen möglich",
      "Moderate rain": "Mäßiger Regen",
      "Heavy rain": "Starker Regen",
      "Thunderstorm": "Gewitter",
    };
    const condition = conditionsMap[conditionEN] || conditionEN;

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
