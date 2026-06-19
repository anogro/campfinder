import os
import time
import urllib.request
import urllib.parse
from bs4 import BeautifulSoup
from dotenv import load_dotenv
import gspread
from google.oauth2.service_account import Credentials

def search_duckduckgo(query, num_results=20):
    url = f"https://html.duckduckgo.com/html/?q={urllib.parse.quote(query)}"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
    try:
        html = urllib.request.urlopen(req).read()
        soup = BeautifulSoup(html, 'html.parser')
        links = []
        for a in soup.find_all('a', class_='result__url'):
            href = a.get('href')
            if href and 'http' in href:
                links.append(href)
                if len(links) >= num_results:
                    break
        return links
    except Exception as e:
        print(f"Search failed: {e}")
        return []

def main():
    load_dotenv(".env.local")
    client_email = os.environ.get("GOOGLE_CLIENT_EMAIL")
    private_key = os.environ.get("GOOGLE_PRIVATE_KEY")
    sheet_id = os.environ.get("GOOGLE_SHEET_ID")
    
    if not client_email or not private_key or not sheet_id:
        print("Error: Missing credentials")
        return
        
    private_key = private_key.replace('\\n', '\n')
    credentials_dict = {
        "type": "service_account",
        "project_id": "campfinder",
        "private_key_id": "temp",
        "private_key": private_key,
        "client_email": client_email,
        "client_id": "temp",
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
        "client_x509_cert_url": f"https://www.googleapis.com/robot/v1/metadata/x509/{client_email.replace('@', '%40')}"
    }

    scopes = ["https://www.googleapis.com/auth/spreadsheets"]
    creds = Credentials.from_service_account_info(credentials_dict, scopes=scopes)
    client = gspread.authorize(creds)
    sheet = client.open_by_key(sheet_id)
    target_sheet = sheet.worksheet("Target_Links")
    
    print("Searching for Cebu camps...")
    links = search_duckduckgo("세부 영어캠프 여름방학 2026", 20)
    
    if not links:
        print("Failed to find links")
        return
        
    print(f"Found {len(links)} links. Appending to sheet...")
    rows = []
    for link in links:
        # url, city, year, season, status
        rows.append([link, "cebu", "2026", "여름방학", ""])
        
    target_sheet.append_rows(rows)
    print("Done! Added to Target_Links.")

if __name__ == "__main__":
    main()
