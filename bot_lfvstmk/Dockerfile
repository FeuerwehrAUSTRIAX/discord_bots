FROM python:3.10-slim

# Chromium installieren
RUN apt-get update && apt-get install -y \
    chromium-driver chromium wget gnupg unzip curl \
    && apt-get clean

ENV CHROME_BIN=/usr/bin/chromium
ENV CHROMEDRIVER=/usr/bin/chromedriver

# Arbeitsverzeichnis
WORKDIR /app

# Dateien kopieren
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY app.py .

CMD ["python", "app.py"]
