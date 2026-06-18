import os
import sys
import json
from dotenv import load_dotenv
import gspread
from google.oauth2.service_account import Credentials

def add_link(url, city, year, season):
    load_dotenv(dotenv_path=".env.local")
    
    client_email = os.environ.get("GOOGLE_CLIENT_EMAIL")
    private_key = os.environ.get("GOOGLE_PRIVATE_KEY")
    sheet_id = os.environ.get("GOOGLE_SHEET_ID")
    
    if not client_email or not private_key or not sheet_id:
        print("Error: Missing credentials in .env.local")
        sys.exit(1)
        
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
    
    try:
        sheet = client.open_by_key(sheet_id)
        target_sheet = sheet.worksheet("Target_Links")
    except Exception as e:
        print(f"Failed to open sheet: {e}")
        sys.exit(1)
        
    target_sheet.append_row([url, city, year, season, ""])
    print(f"Successfully added {url} for {city} {year} {season}")

if __name__ == "__main__":
    url = sys.argv[1]
    city = sys.argv[2]
    year = sys.argv[3]
    season = sys.argv[4]
    add_link(url, city, year, season)
