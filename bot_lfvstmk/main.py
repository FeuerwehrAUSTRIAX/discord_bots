import requests
from bs4 import BeautifulSoup
import os

WEBHOOK_URL = os.getenv("DISCORD_WEBHOOK")

def get_einsatzdaten():
    url = "https://einsatzuebersicht.lfv.steiermark.at/lfvasp/einsatzkarte/Liste_App_Public.html?Bereich=all&param=D937D5636F31DF4D0F9CD43281AE1DC9F79040E0"
    headers = {"User-Agent": "Mozilla/5.0"}
    r = requests.get(url, headers=headers)
    soup = BeautifulSoup(r.text, "html.parser")

    data = []
    rows = soup.find_all("tr")
    for row in rows[1:6]:  # Top 5
        cols = row.find_all("td")
        if len(cols) >= 5:
            zeit, ort, feuerwehr, taetigkeit, status = [c.get_text(strip=True) for c in cols]
            data.append(f"📍 **{ort}** – {taetigkeit} ({status}) um {zeit} – 🚒 {feuerwehr}")
    return data

def post_to_discord(einsaetze):
    if not WEBHOOK_URL:
        print("⚠️ Keine Webhook-URL gefunden.")
        return
    message = "**🚨 Aktuelle Feuerwehreinsätze in der Steiermark (Top 5)**\n\n" + "\n".join(einsaetze)
    payload = {"content": message}
    requests.post(WEBHOOK_URL, json=payload)

if __name__ == "__main__":
    einsaetze = get_einsatzdaten()
    if einsaetze:
        post_to_discord(einsaetze)
