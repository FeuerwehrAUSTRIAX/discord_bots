import pandas as pd
import matplotlib.pyplot as plt
import json
from datetime import datetime, timedelta

df = pd.read_csv("einsaetze.csv", sep=",")
df["Datum"] = pd.to_datetime(df["Datum (Alarmierung)"], dayfirst=True)
letzter_montag = datetime.now() - timedelta(days=datetime.now().weekday() + 7)
letzter_sonntag = letzter_montag + timedelta(days=6)
df = df[(df["Datum"] >= letzter_montag) & (df["Datum"] <= letzter_sonntag)]

# Stichworte
stichworte = df["Einsatzstichwort"].value_counts()
stichworte.plot(kind="bar", figsize=(8, 4), title="Einsätze nach Stichwort")
plt.tight_layout()
plt.savefig("einsatz_stichworte.png")
plt.close()

# Fahrzeuge zählen
fahrzeuge = df["Eingesetze Fahrzeuge"].dropna().str.split(",").explode().str.strip().value_counts().to_dict()

# Hotspots
hotspots = df["Einsatzort Straße"].value_counts().head(5).to_dict()

# Mannschaft
mannschaft_avg = df["Eingesetzte Mannschaft"].dropna().astype(float).mean()

# Stundenverteilung
stunden = pd.to_datetime(df["Uhrzeit (Alarmierung)"], errors="coerce").dt.hour
intensiv = stunden.value_counts().head(3).index.tolist()

# Gesamtstatistik
statistik = {
    "gesamt": len(df),
    "top_stichworte": stichworte.head(5).to_dict(),
    "hotspots": hotspots,
    "intensivste_stunden": intensiv,
    "durchschnitt_mannschaft": round(mannschaft_avg, 1),
    "fahrzeuge": fahrzeuge
}

with open("auswertung.json", "w") as f:
    json.dump(statistik, f)
