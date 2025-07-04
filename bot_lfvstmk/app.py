from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from bs4 import BeautifulSoup
import pandas as pd
import time

def scrape_and_save():
    options = Options()
    options.headless = True
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--disable-gpu')
    driver = webdriver.Chrome(options=options)

    driver.get("https://www.lfv.steiermark.at/Home/Landesleitzentrale/LLZ-Einsatzuebersicht.aspx")
    time.sleep(5)

    soup = BeautifulSoup(driver.page_source, "html.parser")
    driver.quit()

    table = soup.find("table")
    rows = table.find_all("tr")
    data = [ [td.get_text(strip=True) for td in row.find_all("td")] for row in rows[1:] ]
    df = pd.DataFrame(data, columns=["Type", "Date", "Fire Department", "Status"])
    df.to_csv("einsatzliste.csv", sep=";", index=False)
    print("✅ CSV gespeichert: einsatzliste.csv")

if __name__ == "__main__":
    scrape_and_save()
