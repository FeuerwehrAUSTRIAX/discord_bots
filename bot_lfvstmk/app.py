import requests
from apscheduler.schedulers.blocking import BlockingScheduler
import os

# Ziel-URL der Einsatzdaten
URL = "https://einsatzuebersicht.lfv.steiermark.at/lfvasp/einsatzkarte/Liste_App_Public.html?Bereich=all&param=D937D5636F31DF4D0F9CD43281AE1DC9F79040E0"

# Optional: Discord-Webhook (in Railway als Secret setzen)
DISCORD_WEBHOOK = os.getenv("DISCORD_WEBHOOK")

# Realistische Browser-Headers
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
    "Referer": "https://einsatzuebersicht.lfv.steiermark.at/"
}

def scrape_and_notify():
    try:
        print("[INFO] Abrufe Einsatzdaten...")
        response = requests.get(URL, headers=HEADERS)
        
        if response.status_code == 200:
            html = response.text

            # Extrahiere z. B. die ersten 500 Zeichen
            snippet = html[:500]

            # Schick es an Discord
            if DISCORD_WEBHOOK:
                requests.post(DISCORD_WEBHOOK, json={
                    "content": f"🚨 Neue Einsatzdaten:\n```html\n{snippet}```"
                })

            print("[OK] Daten erfolgreich abgerufen und ggf. gesendet.")
        else:
            print(f"[FEHLER] Statuscode: {response.status_code}")
    except Exception as e:
        print(f"[EXCEPTION] {e}")

# Scheduler für alle 5 Minuten
sched = BlockingScheduler()
sched.add_job(scrape_and_notify, "interval", minutes=5)
sched.start()
