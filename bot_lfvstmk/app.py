import requests
from apscheduler.schedulers.blocking import BlockingScheduler
import os
import logging

# === Logging-Konfiguration ===
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)

logging.info("🚀 Bot wurde gestartet!")

# === Ziel-URL mit Einsatzdaten ===
URL = "https://einsatzuebersicht.lfv.steiermark.at/lfvasp/einsatzkarte/Liste_App_Public.html?Bereich=all&param=D937D5636F31DF4D0F9CD43281AE1DC9F79040E0"

# === Optional: Discord-Webhook (in Railway unter "Variables" setzen) ===
DISCORD_WEBHOOK = os.getenv("DISCORD_WEBHOOK")

# === Echte Browser-Headers ===
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
    "Referer": "https://einsatzuebersicht.lfv.steiermark.at/"
}

# === Hauptfunktion: Seite abrufen und ggf. an Discord schicken ===
def scrape_and_notify():
    try:
        logging.info("📥 Versuche, Einsatzdaten abzurufen...")
        response = requests.get(URL, headers=HEADERS)

        if response.status_code == 200:
            html = response.text
            snippet = html[:500]

            logging.info("✅ Seite erfolgreich geladen (200 OK)")

            if DISCORD_WEBHOOK:
                logging.info("📤 Sende Daten an Discord-Webhook...")
                requests.post(DISCORD_WEBHOOK, json={
                    "content": f"🚨 Neue Einsatzdaten:\n```html\n{snippet}```"
                })
                logging.info("✅ Erfolgreich an Discord gesendet.")
            else:
                logging.warning("⚠️ Kein DISCORD_WEBHOOK gesetzt. Daten werden nur geloggt.")
        else:
            logging.error(f"❌ Fehler beim Abruf: Statuscode {response.status_code}")

    except Exception as e:
        logging.exception("💥 Ausnahme beim Abrufen der Daten:")

# === Scheduler: Alle 5 Minuten ===
sched = BlockingScheduler()
sched.add_job(scrape_and_notify, "interval", minutes=5)

# === Starte den Scheduler ===
if __name__ == "__main__":
    scrape_and_notify()  # einmal sofort starten
    logging.info("⏰ Starte Scheduler (alle 5 Minuten)")
    sched.start()
