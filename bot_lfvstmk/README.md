# bot_lfvstmk

Dieser kleine Proxy-Service holt Einsatz-Daten von der lfv Steiermark API (CSV) und stellt sie unter `/api/einsaetze` bereit.

## Installation

```bash
# Klone das Repo
git clone https://github.com/<dein-user>/bot_lfvstmk.git
cd bot_lfvstmk

# Abhängigkeiten installieren
npm install
```

## Umgebungsvariablen

Kopiere `.env.example` zu `.env` und passe ggf. an:
```
LFV_URL=https://einsatzuebersicht.lfv.steiermark.at/lfvasp/einsatzkarte/Public.aspx?view=24
PORT=3000
```

## Starten

```bash
npm start
```

## Deployment auf Railway
1. GitHub-Repo in Railway connecten
2. Environment-Variablen in Railway-Dashboard setzen
3. Deployment starten (Railway macht npm install & npm start)
```  
