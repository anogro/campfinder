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
from dotenv import load_dotenv

def parse_args():
    parser = argparse.ArgumentParser(description="Overseas Camp Crawler")
    parser.add_argument("--city", required=False, default="cebu", help="City (e.g., cebu)")
    parser.add_argument("--year", required=False, default="2026", help="Year (e.g., 2026)")
    parser.add_argument("--season", required=False, default="여름방학", help="Season (e.g., 여름방학)")
    return parser.parse_args()

def extract_images(html_content, base_url):
    soup = BeautifulSoup(html_content, "html.parser")
    imgs = soup.find_all('img')
    extracted_images = []
    
    for img in imgs:
        url_candidates = [
            img.get('src'),
            img.get('srcset'),
            img.get('data-src'),
            img.get('data-original'),
            img.get('data-lazy-src')
        ]
        valid_url = None
        for candidate in url_candidates:
            if candidate and isinstance(candidate, str) and len(candidate.strip()) > 0:
                # Handle srcset simple split (take first URL)
                if ',' in candidate:
                    candidate = candidate.split(',')[0].strip().split(' ')[0]
                valid_url = candidate
                break
                
        if valid_url:
            abs_url = urllib.parse.urljoin(base_url, valid_url)
            lower_url = abs_url.lower()
            if any(x in lower_url for x in ["logo", "icon", "btn", "bg", "banner", "pixel", "tracker"]):
                continue
            if abs_url.endswith(".gif") or abs_url.endswith(".svg"):
                continue
            
            alt_text = img.get('alt', '')
            extracted_images.append({
                "url": abs_url,
                "alt": alt_text,
                "type": "img"
            })
            
    return extracted_images

def analyze_with_llm(text_content):
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable not set")
    
    genai.configure(api_key=api_key)
    
    prompt = """
    당신은 해외 캠프 정보 수집 에이전트다.
    목표: 제공된 웹페이지 텍스트에서 캠프 정보를 추출하라.
    규칙: 페이지에 명시된 내용만 사용하고, 추측하지 않는다. 정보가 없으면 빈 문자열 ""을 반환한다.
    
    필수 추출 필드: camp_name, city, country, year, season, age_range, duration, accommodation, tuition
    
    출력 형식은 반드시 아래 JSON을 따를 것:
    {
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
    
    models_to_try = [
        ('gemini-1.5-flash', {"response_mime_type": "application/json"}),
        ('gemini-1.5-pro', {"response_mime_type": "application/json"}),
        ('gemini-pro', {}) # gemini-pro는 response_mime_type 미지원
    ]
    
    full_prompt = prompt + "\n\n[웹페이지 텍스트]\n" + text_content[:20000]
    
    last_err = None
    for model_name, gen_config in models_to_try:
        try:
            model = genai.GenerativeModel(model_name, generation_config=gen_config if gen_config else None)
            response = model.generate_content(full_prompt)
            
            res_text = response.text.strip()
            if res_text.startswith("```json"):
                res_text = res_text[7:]
            elif res_text.startswith("```"):
                res_text = res_text[3:]
            if res_text.endswith("```"):
                res_text = res_text[:-3]
            res_text = res_text.strip()
            
            try:
                return json.loads(res_text), None
            except Exception as e:
                return None, f"JSON Parse Error ({model_name}): {e} | Text: {res_text[:50]}"
                
        except Exception as e:
            last_err = str(e)
            print(f"Model {model_name} failed: {e}")
            continue # Try next model
            
    return None, f"All models failed. Last error: {last_err}"

def get_google_creds():
    scopes = [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive.file"
    ]
    
    client_email = os.environ.get("GOOGLE_CLIENT_EMAIL")
    private_key = os.environ.get("GOOGLE_PRIVATE_KEY")
    creds_json_str = os.environ.get("GOOGLE_CREDENTIALS_JSON")
    
    if creds_json_str:
        try:
            creds_dict = json.loads(creds_json_str)
            return Credentials.from_service_account_info(creds_dict, scopes=scopes)
        except Exception as e:
            raise ValueError(f"Failed to parse GOOGLE_CREDENTIALS_JSON: {e}")
            
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
        return Credentials.from_service_account_info(creds_dict, scopes=scopes)
    else:
        raise ValueError("Google credentials are not set in environment variables.")
        
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
    load_dotenv(".env.local")
    args = parse_args()
    print("Starting Playwright crawler with advanced scrolling & diagnostic logs...")
    
    creds = get_google_creds()
    client = gspread.authorize(creds)
    
    sheet_id = os.environ.get("GOOGLE_SHEET_ID")
    if not sheet_id:
        raise ValueError("GOOGLE_SHEET_ID environment variable not set")
        
    folder_id = "134owBld4vMhsK1T_GQ0CgrWly4VT6MWg"
        
    sheet = client.open_by_key(sheet_id)
    camps_ws = sheet.worksheet("Camps")
    logs_ws = sheet.worksheet("CrawlLogs")
    images_ws = sheet.worksheet("Images")
    target_ws = sheet.worksheet("Target_Links")
    
    target_data = target_ws.get_all_values()
    existing_urls = [row[9] for row in camps_ws.get_all_values()[1:]] if len(camps_ws.get_all_values()) > 1 else []
    
    target_jobs = []
    
    for idx, row in enumerate(target_data[1:]):
        url = row[0].strip() if len(row) > 0 else ""
        city = row[1].strip() if len(row) > 1 else args.city
        year = row[2].strip() if len(row) > 2 else args.year
        season = row[3].strip() if len(row) > 3 else args.season
        status = row[4].strip() if len(row) > 4 else ""
            
        if url.startswith("http") and status not in ["Done", "완료", "실패", "Failed", "SUCCESS"]:
            if url in existing_urls:
                target_ws.update_cell(idx + 2, 5, "Done (Duplicated)")
                continue
            target_jobs.append({
                "url": url, "city": city, "year": year, "season": season, "row_idx": idx + 2
            })
            
    if not target_jobs:
        print("No URLs to process.")
        return
        
    success_camps = []
    all_logs = []
    all_images = []
    url_results = {}
    
    # 한국 시간(KST) 적용
    kst = datetime.timezone(datetime.timedelta(hours=9))
    timestamp = datetime.datetime.now(kst).strftime("%Y-%m-%d %H:%M:%S")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        
        for job in target_jobs:
            url = job["url"]
            page = context.new_page()
            
            log = {
                "source_url": url, "status": "UNKNOWN_ERROR", "failure_reason": "",
                "http_status": "", "page_title": "", "html_length": 0, "text_length": 0,
                "image_count": 0, "image_urls": "", "screenshot_path": "", "last_checked": timestamp
            }
            
            camp = {
                "camp_name": "", "city": job["city"], "country": "", "year": job["year"],
                "season": job["season"], "age_range": "", "duration": "", "accommodation": "",
                "tuition": "", "source_url": url
            }
            
            try:
                print(f"Visiting {url}...")
                response = page.goto(url, timeout=60000, wait_until="domcontentloaded")
                time.sleep(3)
                
                log["page_title"] = page.title()
                
                if not response or not response.ok:
                    log["http_status"] = str(response.status) if response else "0"
                    log["status"] = "ACCESS_DENIED" if response and response.status in [401, 403] else "FETCH_FAILED"
                    log["failure_reason"] = f"HTTP {log['http_status']}" if response else "No response"
                else:
                    log["http_status"] = str(response.status)
                    
                    # Scrolling logic (max 8 times, 800px, 1s sleep)
                    for _ in range(8):
                        page.evaluate("window.scrollBy(0, 800)")
                        time.sleep(1)
                        
                    html_content = page.content()
                    try:
                        text_content = page.locator("body").inner_text()
                    except:
                        text_content = ""
                        
                    images = extract_images(html_content, url)
                    img_url_list = [img["url"] for img in images]
                    
                    log["html_length"] = len(html_content)
                    log["text_length"] = len(text_content)
                    log["image_count"] = len(images)
                    log["image_urls"] = ", ".join(img_url_list)[:1000] # truncate string
                    
                    # Save image meta for the separate Images sheet
                    for img in images:
                        all_images.append([url, img["url"], img["alt"], img["type"], timestamp])
                    
                    if log["text_length"] < 100 and log["image_count"] > 3:
                        log["status"] = "IMAGE_ONLY"
                        log["failure_reason"] = "Text length < 100, mostly images"
                    elif log["text_length"] < 100:
                        log["status"] = "EMPTY_CONTENT"
                        log["failure_reason"] = "Text length < 100"
                    else:
                        print("LLM Extraction running...")
                        llm_res, llm_err = analyze_with_llm(text_content)
                        if llm_res:
                            log["status"] = "SUCCESS"
                            camp.update({
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
                        else:
                            log["status"] = "LLM_ERROR"
                            log["failure_reason"] = f"LLM Failed: {llm_err}"
            except Exception as e:
                log["status"] = "TIMEOUT" if "Timeout" in str(e) else "JS_REQUIRED"
                log["failure_reason"] = str(e)[:100]
            
            # Take screenshot if failed or image only
            if log["status"] != "SUCCESS":
                try:
                    screenshot_bytes = page.screenshot(full_page=False)
                    file_name = f"error_{int(time.time())}.png"
                    print(f"Uploading screenshot to Drive...")
                    drive_url = upload_to_drive(creds, folder_id, file_name, screenshot_bytes)
                    log["screenshot_path"] = drive_url
                except Exception as ex:
                    print(f"Screenshot failed: {ex}")
            
            if log["status"] == "SUCCESS":
                success_camps.append(camp)
            
            all_logs.append(log)
            url_results[url] = log["status"]
            page.close()
            
        browser.close()

    try:
        # Push Camps (SUCCESS only)
        if success_camps:
            camps_rows = [[
                c["camp_name"], c["city"], c["country"], c["year"], c["season"],
                c["age_range"], c["duration"], c["accommodation"], c["tuition"], c["source_url"]
            ] for c in success_camps]
            camps_ws.append_rows(camps_rows)
            
        # Push Logs (All)
        if all_logs:
            logs_rows = [[
                l["source_url"], l["status"], l["failure_reason"], l["http_status"], l["page_title"],
                l["html_length"], l["text_length"], l["image_count"], l["image_urls"], l["screenshot_path"], l["last_checked"]
            ] for l in all_logs]
            logs_ws.append_rows(logs_rows)
            
        # Push Images
        if all_images:
            # Batch in 1000 chunks to avoid quota limits
            for i in range(0, len(all_images), 1000):
                images_ws.append_rows(all_images[i:i+1000])
            
        # Update Target_Links status
        for job in target_jobs:
            target_ws.update_cell(job["row_idx"], 5, url_results.get(job["url"], "UNKNOWN"))
            
        print("Crawler finished successfully.")
        
    except Exception as e:
        print(f"Failed to save data: {e}")

if __name__ == "__main__":
    main()
