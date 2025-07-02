import puppeteer from 'puppeteer';
import fs from 'fs';
import https from 'https';

// Optional: Wenn du später an Discord posten willst
// import fetch from 'node-fetch'; a

(async () => {
  console.log('🚀 Starte Headless-Browser...');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'] // wichtig für Railway!
  });

  const page = await browser.newPage();

  console.log('🌐 Lade Einsatzübersichtsseite...');
  await page.goto(
    'https://einsatzuebersicht.lfv.steiermark.at/lfvasp/einsatzkarte/Liste_App_Public.html?Bereich=all',
    { waitUntil: 'networkidle0', timeout: 0 }
  );

  console.log('📥 Lade CSV-Daten...');
  const csvUrl =
    'https://einsatzuebersicht.lfv.steiermark.at/lfvasp/einsatzkarte/Public.aspx?view=24';

  const csvResponse = await page.goto(csvUrl, { timeout: 0 });
  const csvBuffer = await csvResponse.buffer();

  const filename = 'einsaetze.csv';
  fs.writeFileSync(filename, csvBuffer);
  console.log(`✅ CSV gespeichert als "${filename}"`);

  await browser.close();

  // OPTIONAL: An Discord schicken (wenn du willst)
  /*
  const webhookUrl = process.env.DISCORD_WEBHOOK;
  if (webhookUrl) {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `Neue Einsatzdaten heruntergeladen (${new Date().toLocaleString()})`
      })
    });
    console.log('📤 An Discord gesendet!');
  }
  */

})();
