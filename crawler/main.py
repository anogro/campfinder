import argparse
import os
import json
import time
import urllib.parse
import gspread
import io
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload
from bs4 import BeautifulSoup
import google.generativeai as genai
from playwright.sync_api import sync_playwright
import datetime

def parse_args():
    parser = argparse.ArgumentParser(description="Overseas Camp Crawler")
    parser.add_argument("--city", required=False, default="cebu", help="City (e.g., cebu)")
    parser.add_argument("--year", required=False, default="2026", help="Year (e.g., 2026)")
    parser.add_argument("--season", required=False, default="여름방학", help="Season (e.g., 여름방학)")
    return parser.parse_args()

def extract_text_with_bs4(html_content):
    soup = BeautifulSoup(html_content, "html.parser")
    text_blocks = []
    for tag in soup.find_all(['p', 'div', 'span', 'h1', 'h2', 'h3']):
        text = tag.get_text(separator=' ', strip=True)
        if len(text) > 20:
            text_blocks.append(text)
    return " ".join(text_blocks)

def check_image_only(html_content):
    soup = BeautifulSoup(html_content, "html.parser")
    text_len = len(soup.get_text(strip=True))
    imgs = soup.find_all('img')
    img_urls = [img.get('src') for img in imgs if img.get('src')]
    return text_len < 200 and len(img_urls) > 0, img_urls

def analyze_with_llm(text_content):
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable not set")
    
    genai.configure(api_key=api_key)
    
    prompt = """
    당신은 해외 캠프 정보 수집 에이전트다.
    목표: 도시, 연도, 기간에 해당하는 해외 캠프 정보를 최대한 수집하고 구조화한다.

    중요 규칙:
    1. URL을 발견하면 반드시 상태를 기록한다.
    2. 정보 추출 실패 시 이유를 남긴다.
    3. 절대로 실패한 URL을 버리지 않는다.
    4. 캠프 정보가 없더라도 URL 자체는 저장한다.
    5. 추측하지 않는다.
    6. 페이지에 명시된 내용만 사용한다.

    성공 시 아래 10가지 정보를 추출하라. (정보가 없으면 빈 문자열 "")
    camp_name, city, country, year, season, age_range, duration, accommodation, tuition, source_url
    
    출력 형식은 반드시 아래 JSON을 따를 것:
    {
      "status": "SUCCESS",
      "camp_name": "",
      "city": "",
      "country": "",
      "year": "",
      "season": "",
      "age_range": "",
      "duration": "",
      "accommodation": "",
      "tuition": ""
    }
    """
    
    model = genai.GenerativeModel('gemini-1.5-flash', generation_config={"response_mime_type": "application/json"})
    full_prompt = prompt + "\n\n[웹페이지 텍스트]\n" + text_content[:15000]
    
    response = model.generate_content(full_prompt)
    
    res_text = response.text.strip()
    return json.loads(res_text)

def get_google_creds():
    scopes = [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive.file"
    ]
    
    client_email = os.environ.get("GOOGLE_CLIENT_EMAIL")
    private_key = os.environ.get("GOOGLE_PRIVATE_KEY")
    
    if client_email and private_key:
        private_key = private_key.replace('\\n', '\n')
        creds_dict = {
            "type": "service_account",
            "project_id": "campfinder",
            "private_key_id": "temp",
            "private_key": private_key,
            "client_email": client_email,
            "client_id": "temp",
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
            "client_x509_cert_url": f"https://www.googleapis.com/robot/v1/metadata/x509/{urllib.parse.quote(client_email)}"
        }
    else:
        # Fallback to json (for local test)
        creds_json = os.environ.get("GOOGLE_CREDENTIALS_JSON")
        if not creds_json:
            raise ValueError("No valid Google credentials found in environment variables.")
        creds_dict = json.loads(creds_json)
        
    return Credentials.from_service_account_info(creds_dict, scopes=scopes)

def upload_to_drive(creds, folder_id, file_name, file_bytes):
    try:
        drive_service = build('drive', 'v3', credentials=creds)
        file_metadata = {
            'name': file_name,
            'parents': [folder_id]
        }
        media = MediaIoBaseUpload(io.BytesIO(file_bytes), mimetype='image/png', resumable=True)
        file = drive_service.files().create(body=file_metadata, media_body=media, fields='id, webViewLink').execute()
        return file.get('webViewLink')
    except Exception as e:
        print(f"Drive upload failed: {e}")
        return ""

def main():
    args = parse_args()
    print("Starting crawler with new architecture...")
    
    creds = get_google_creds()
    client = gspread.authorize(creds)
    
    sheet_id = os.environ.get("GOOGLE_SHEET_ID")
    if not sheet_id:
        raise ValueError("GOOGLE_SHEET_ID environment variable not set")
        
    # Drive Folder ID
    folder_id = "134owBld4vMhsK1T_GQ0CgrWly4VT6MWg"
        
    sheet = client.open_by_key(sheet_id)
    main_worksheet = sheet.worksheet("Camps")
    log_worksheet = sheet.worksheet("Crawl_Log")
    target_sheet = sheet.worksheet("Target_Links")
    
    target_data = target_sheet.get_all_values()
    existing_camps_data = main_worksheet.get_all_values()
    existing_urls = [row[11] for row in existing_camps_data[1:]] if len(existing_camps_data) > 1 else []
    
    target_jobs = []
    
    for idx, row in enumerate(target_data[1:]):
        url = row[0].strip() if len(row) > 0 else ""
        city = row[1].strip() if len(row) > 1 else args.city
        year = row[2].strip() if len(row) > 2 else args.year
        season = row[3].strip() if len(row) > 3 else args.season
        status = row[4].strip() if len(row) > 4 else ""
            
        if url.startswith("http") and status not in ["Done", "완료", "실패", "Failed", "SUCCESS", "IMAGE_ONLY", "FETCH_FAILED"]:
            if url in existing_urls:
                target_sheet.update_cell(idx + 2, 5, "Done (Duplicated)")
                continue
            target_jobs.append({
                "url": url, "city": city, "year": year, "season": season, "row_idx": idx + 2
            })
            
    print(f"Found {len(target_jobs)} pending URLs.")
    if len(target_jobs) == 0:
        print("No URLs to process.")
        return
        
    camps_data = []
    url_results = {}
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        
        for job in target_jobs:
            url = job["url"]
            page = context.new_page()
            
            result = {
                "status": "UNKNOWN_ERROR",
                "camp_name": "", "city": job["city"], "country": "", "year": job["year"],
                "season": job["season"], "age_range": "", "duration": "", "accommodation": "", "tuition": "",
                "source_url": url, "image_url": "", "page_title": "", "failure_reason": "", "screenshot_url": ""
            }
            
            try:
                print(f"Visiting {url}...")
                response = page.goto(url, timeout=30000, wait_until="domcontentloaded")
                time.sleep(3)
                
                result["page_title"] = page.title()
                
                if not response or not response.ok:
                    result["status"] = "ACCESS_DENIED" if response and response.status in [401, 403] else "FETCH_FAILED"
                    result["failure_reason"] = f"HTTP {response.status}" if response else "No response"
                else:
                    html_content = page.content()
                    cleaned_text = extract_text_with_bs4(html_content)
                    is_img_only, img_urls = check_image_only(html_content)
                    
                    if is_img_only:
                        result["status"] = "IMAGE_ONLY"
                        result["failure_reason"] = "Content stored as image"
                        result["image_url"] = img_urls[0] if img_urls else ""
                    elif len(cleaned_text) < 100:
                        result["status"] = "EMPTY_CONTENT"
                        result["failure_reason"] = "Text length < 100"
                    else:
                        print("Analyzing text...")
                        llm_res = analyze_with_llm(cleaned_text)
                        result.update({
                            "status": "SUCCESS",
                            "camp_name": llm_res.get("camp_name", ""),
                            "city": llm_res.get("city", job["city"]),
                            "country": llm_res.get("country", ""),
                            "year": llm_res.get("year", job["year"]),
                            "season": llm_res.get("season", job["season"]),
                            "age_range": llm_res.get("age_range", ""),
                            "duration": llm_res.get("duration", ""),
                            "accommodation": llm_res.get("accommodation", ""),
                            "tuition": llm_res.get("tuition", "")
                        })
                        
            except Exception as e:
                result["status"] = "FETCH_FAILED"
                result["failure_reason"] = str(e)[:100]
            
            # Take screenshot if failed or image only
            if result["status"] != "SUCCESS":
                try:
                    screenshot_bytes = page.screenshot(full_page=False)
                    file_name = f"error_{int(time.time())}.png"
                    print(f"Uploading screenshot {file_name} to Drive...")
                    drive_url = upload_to_drive(creds, folder_id, file_name, screenshot_bytes)
                    result["screenshot_url"] = drive_url
                except Exception as ex:
                    print(f"Screenshot failed: {ex}")
            
            camps_data.append(result)
            url_results[url] = result["status"]
            page.close()
            
        browser.close()

    try:
        new_rows = []
        for i, camp in enumerate(camps_data):
            next_idx = len(existing_camps_data) + i
            prog_id = f"PROG-{camp['year']}-{camp['city']}-{str(next_idx).zfill(3)}"
            
            new_rows.append([
                prog_id,
                camp["status"],
                camp["camp_name"],
                camp["country"],
                camp["city"],
                camp["year"],
                camp["season"],
                camp["age_range"],
                camp["duration"],
                camp["accommodation"],
                camp["tuition"],
                camp["source_url"],
                camp["image_url"],
                camp["page_title"],
                camp["failure_reason"],
                camp["screenshot_url"],
                "대기"
            ])
            
        if new_rows:
            main_worksheet.append_rows(new_rows)
            
        for job in target_jobs:
            url = job["url"]
            row_idx = job["row_idx"]
            status = url_results.get(url, "UNKNOWN_ERROR")
            target_sheet.update_cell(row_idx, 5, status)
            
        print(f"Successfully processed {len(new_rows)} rows.")
        
    except Exception as e:
        print(f"Failed to save data: {e}")

if __name__ == "__main__":
    main()
