import argparse
import os
import json
import time
import gspread
from google.oauth2.service_account import Credentials
from bs4 import BeautifulSoup
import google.generativeai as genai
from playwright.sync_api import sync_playwright
import datetime
from duckduckgo_search import DDGS

def parse_args():
    parser = argparse.ArgumentParser(description="Overseas Camp Crawler")
    parser.add_argument("--city", required=True, help="City ID (e.g., KL-01)")
    parser.add_argument("--year", required=True, help="Year (e.g., 2026)")
    parser.add_argument("--season", required=True, help="Season (e.g., 여름방학)")
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
    
    return main_worksheet, log_worksheet

def main():
    args = parse_args()
    print(f"Starting crawl for {args.city}, {args.year}, {args.season}...")
    
    search_query_kr = f"{args.year} {args.season} {args.city} 영어 캠프"
    search_query_en = f"{args.year} {args.season} {args.city} english camp"
    
    print(f"Searching Google and YouTube for:\n1. {search_query_kr}\n2. {search_query_en}")
    
    target_urls = set()
    global_status = "성공"
    
    # DuckDuckGo Search
    try:
        with DDGS() as ddgs:
            print("Searching DuckDuckGo (Korean)...")
            results_kr = list(ddgs.text(search_query_kr, max_results=5))
            for r in results_kr:
                target_urls.add(r['href'])
                
            print("Searching DuckDuckGo (English)...")
            results_en = list(ddgs.text(search_query_en, max_results=5))
            for r in results_en:
                target_urls.add(r['href'])
    except Exception as e:
        print(f"DuckDuckGo search failed: {e}")
        global_status = f"검색 오류: {str(e)[:50]}"
        
    target_urls = list(target_urls)
    print(f"Found {len(target_urls)} unique URLs: {target_urls}")
    
    camps_data = []
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        for url in target_urls:
            try:
                page.goto(url, timeout=30000)
                # Wait for page to load
                time.sleep(3)
                html_content = page.content()
                cleaned_text = extract_text_with_bs4(html_content)
                
                if len(cleaned_text) < 100:
                    print(f"Skipping {url}: Not enough text content.")
                    continue
                    
                print(f"Analyzing content from {url}...")
                llm_result = analyze_with_llm(cleaned_text)
                llm_result["sourceUrl"] = url
                llm_result["imageUrl"] = "default_camp.png"
                
                camps_data.append(llm_result)
            except Exception as e:
                print(f"Failed to process {url}: {e}")
                global_status = f"분석 오류 발생 (일부 누락)"
        browser.close()

    try:
        main_sheet, log_sheet = connect_to_sheets()
        
        existing_data = main_sheet.get_all_values()
        existing_urls = [row[16] for row in existing_data[1:]] if len(existing_data) > 1 else []
        
        added_count = 0
        new_rows = []
        
        for camp in camps_data:
            if camp.get("sourceUrl") in existing_urls:
                continue
                
            next_index = (len(existing_data) - 1 if len(existing_data) > 0 else 0) + added_count
            program_id = f"PROG-{args.year}-{args.city}-{str(next_index).zfill(3)}"
            
            new_rows.append([
                program_id,
                args.city,
                f"{args.year}_{args.season}",
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
            
        # Update status if 0 items added but no errors
        if added_count == 0 and global_status == "성공":
            if len(camps_data) > 0:
                global_status = "성공 (모두 중복된 데이터)"
            else:
                global_status = "성공 (검색된 캠프 없음)"

        # Add log
        log_sheet.append_row([
            str(datetime.datetime.now()),
            f"{args.city}, {args.year}, {args.season}",
            added_count,
            global_status
        ])
        
        print(f"Successfully added {added_count} rows to Google Sheets.")
        
    except Exception as e:
        print(f"Failed to save data to Google Sheets: {e}")

if __name__ == "__main__":
    main()
