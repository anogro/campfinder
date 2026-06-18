import argparse
import os
import json
import time
import urllib.parse
import gspread
from google.oauth2.service_account import Credentials
from bs4 import BeautifulSoup
import google.generativeai as genai
from playwright.sync_api import sync_playwright
import datetime
from googleapiclient.discovery import build

def parse_args():
    parser = argparse.ArgumentParser(description="Overseas Camp Crawler")
    parser.add_argument("--city", required=False, default="Unknown", help="City ID (e.g., KL-01)")
    parser.add_argument("--year", required=False, default="2026", help="Year (e.g., 2026)")
    parser.add_argument("--season", required=False, default="여름방학", help="Season (e.g., 여름방학)")
    return parser.parse_args()

def extract_text_with_bs4(html_content):
    soup = BeautifulSoup(html_content, "html.parser")
    text_blocks = []
    for tag in soup.find_all(['p', 'div']):
        text = tag.get_text(separator=' ', strip=True)
        if len(text) > 20:
            text_blocks.append(text)
    return " ".join(text_blocks)

def analyze_with_llm(text_content):
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable not set")
    
    genai.configure(api_key=api_key)
    
    prompt = """
    다음은 해외 영어 캠프 프로그램 웹페이지에서 추출한 텍스트입니다.
    이를 분석하여 다음 16가지 항목의 JSON 형태로 정제해주세요.
    (중요) 원본 텍스트가 영어 등 외국어이더라도, 모든 결과값은 반드시 자연스러운 '한국어'로 번역해서 작성해주세요.
    정보가 없거나 모호하면 반드시 '문의 필요'로 입력하세요. 이미지가 없으면 'default_camp.png'로 입력하세요.
    
    [JSON Output Format Example]
    {
        "programName": "...", "place": "...", "seller": "...", "operationType": "...",
        "koreanSupport": "...", "targetAudience": "...", "participantType": "...",
        "programCategory": "...", "ageGroup": "...", "schedule": "...", "accommodation": "...",
        "cost": "...", "summary": "..."
    }
    """
    
    model = genai.GenerativeModel('gemini-1.5-flash', generation_config={"response_mime_type": "application/json"})
    full_prompt = prompt + "\n\n[웹페이지 텍스트]\n" + text_content[:15000]
    
    response = model.generate_content(full_prompt)
    
    # Strip markdown if present
    res_text = response.text.strip()
    if res_text.startswith("```json"):
        res_text = res_text[7:]
    if res_text.startswith("```"):
        res_text = res_text[3:]
    if res_text.endswith("```"):
        res_text = res_text[:-3]
        
    return json.loads(res_text.strip())

def connect_to_sheets():
    scopes = [
        "https://www.googleapis.com/auth/spreadsheets"
    ]
    
    creds_json = os.environ.get("GOOGLE_CREDENTIALS_JSON")
    if not creds_json:
        raise ValueError("GOOGLE_CREDENTIALS_JSON environment variable not set")
        
    creds_dict = json.loads(creds_json)
    credentials = Credentials.from_service_account_info(creds_dict, scopes=scopes)
    client = gspread.authorize(credentials)
    
    sheet_id = os.environ.get("GOOGLE_SHEET_ID")
    if not sheet_id:
        raise ValueError("GOOGLE_SHEET_ID environment variable not set")
        
    sheet = client.open_by_key(sheet_id)
    main_worksheet = sheet.worksheet("Camps")
    log_worksheet = sheet.worksheet("Crawl_Log")
    
    try:
        target_links_worksheet = sheet.worksheet("Target_Links")
    except gspread.exceptions.WorksheetNotFound:
        target_links_worksheet = sheet.add_worksheet(title="Target_Links", rows="1000", cols="5")
        target_links_worksheet.append_row(["URL", "City", "Year", "Season", "Status"])
    
    return main_worksheet, log_worksheet, target_links_worksheet

def main():
    args = parse_args()
    print("Starting crawl for pending links in Target_Links...")
    
    main_sheet, log_sheet, target_sheet = connect_to_sheets()
    target_data = target_sheet.get_all_values()
    
    existing_camps_data = main_sheet.get_all_values()
    existing_urls = [row[16] for row in existing_camps_data[1:]] if len(existing_camps_data) > 1 else []
    
    target_jobs = [] # list of dict: {url, city, year, season, row_idx}
    
    # Header is row 1. Data starts from row 2
    for idx, row in enumerate(target_data[1:]):
        url = row[0].strip() if len(row) > 0 else ""
        city = row[1].strip() if len(row) > 1 else args.city
        year = row[2].strip() if len(row) > 2 else args.year
        season = row[3].strip() if len(row) > 3 else args.season
        status = row[4].strip() if len(row) > 4 else ""
        
        # Backward compatibility for old 2-column sheets where status was in column B
        if status == "" and len(row) > 1 and row[1] in ["Done", "Failed", "완료", "실패"]:
            status = row[1]
            
        if url.startswith("http") and "Done" not in status and status not in ["완료", "실패", "Failed"]:
            if url in existing_urls:
                target_sheet.update_cell(idx + 2, 5, "Done (Duplicated)")
                print(f"Skipping {url}: Already exists in Camps sheet.")
                continue
            target_jobs.append({
                "url": url, "city": city, "year": year, "season": season, "row_idx": idx + 2
            })
            
    global_status = "성공"
    print(f"Found {len(target_jobs)} pending URLs in Target_Links sheet.")
    
    if len(target_jobs) == 0:
        global_status = "수집할 링크 없음 (Target_Links 시트를 확인하세요)"
        kst = datetime.timezone(datetime.timedelta(hours=9))
        formatted_time = datetime.datetime.now(kst).strftime('%Y-%m-%d %H:%M')
        log_sheet.append_row([
            formatted_time,
            "전체 링크",
            0,
            global_status
        ])
        print(global_status)
        return
        
    # 2. 검색된 URL에서 정보 추출
    camps_data = []
    extracted_count = 0
    url_results = {} # url -> status
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # 봇 탐지 우회를 위한 User-Agent
        page = browser.new_page(user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        for job in target_jobs:
            url = job["url"]
            try:
                page.goto(url, timeout=30000)
                time.sleep(3)
                html_content = page.content()
                cleaned_text = extract_text_with_bs4(html_content)
                
                if len(cleaned_text) < 100:
                    print(f"Skipping {url}: Not enough text content (len: {len(cleaned_text)}).")
                    url_results[url] = "Failed (No text)"
                    continue
                    
                print(f"Analyzing content from {url}...")
                llm_result = analyze_with_llm(cleaned_text)
                llm_result["sourceUrl"] = url
                llm_result["imageUrl"] = "default_camp.png"
                
                # Append job info to the result for saving
                llm_result["_city"] = job["city"]
                llm_result["_year"] = job["year"]
                llm_result["_season"] = job["season"]
                
                camps_data.append(llm_result)
                extracted_count += 1
                url_results[url] = "Done"
            except Exception as e:
                print(f"Failed to process {url}: {e}")
                url_results[url] = "Failed (Error)"
                global_status = "분석 중 일부 오류 발생"
                
        browser.close()

    try:
        added_count = 0
        new_rows = []
        
        for camp in camps_data:
            city = camp.get("_city", args.city)
            year = camp.get("_year", args.year)
            season = camp.get("_season", args.season)
            
            next_index = (len(existing_camps_data) - 1 if len(existing_camps_data) > 0 else 0) + added_count
            program_id = f"PROG-{year}-{city}-{str(next_index).zfill(3)}"
            
            new_rows.append([
                program_id,
                city,
                f"{year}_{season}",
                camp.get("programName", "문의 필요"),
                camp.get("place", "문의 필요"),
                camp.get("seller", "문의 필요"),
                camp.get("operationType", "문의 필요"),
                camp.get("koreanSupport", "문의 필요"),
                camp.get("targetAudience", "문의 필요"),
                camp.get("participantType", "문의 필요"),
                camp.get("programCategory", "문의 필요"),
                camp.get("ageGroup", "문의 필요"),
                camp.get("schedule", "문의 필요"),
                camp.get("accommodation", "문의 필요"),
                camp.get("cost", "문의 필요"),
                camp.get("imageUrl", "default_camp.png"),
                camp.get("sourceUrl", "문의 필요"),
                camp.get("summary", "문의 필요"),
                "대기"
            ])
            added_count += 1
            
        if new_rows:
            main_sheet.append_rows(new_rows)
            
        # Update Target_Links status
        for job in target_jobs:
            url = job["url"]
            row_idx = job["row_idx"]
            status = url_results.get(url, "Failed (Unknown)")
            target_sheet.update_cell(row_idx, 5, status)
            
        # Update status if 0 items added but no errors
        if added_count == 0:
            if len(camps_data) > 0:
                global_status = "성공 (모두 중복된 데이터)"
            elif len(target_jobs) > 0:
                global_status = f"성공 (링크 {len(target_jobs)}개 중 분석 가능한 캠프 없음)"
            elif global_status == "성공":
                global_status = "성공 (처리된 링크 없음)"

        # Add log
        kst = datetime.timezone(datetime.timedelta(hours=9))
        formatted_time = datetime.datetime.now(kst).strftime('%Y-%m-%d %H:%M')
        
        log_sheet.append_row([
            formatted_time,
            f"일괄 수집 ({added_count}건)",
            added_count,
            global_status
        ])
        
        print(f"Successfully added {added_count} rows to Google Sheets.")
        
    except Exception as e:
        print(f"Failed to save data to Google Sheets: {e}")

if __name__ == "__main__":
    main()
