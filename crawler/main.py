import argparse
import os
import json
import requests
from bs4 import BeautifulSoup
from openai import OpenAI
from playwright.sync_api import sync_playwright

def parse_args():
    parser = argparse.ArgumentParser(description="Overseas Camp Crawler")
    parser.add_argument("--city", required=True, help="City ID (e.g., KL-01)")
    parser.add_argument("--year", required=True, help="Year (e.g., 2026)")
    parser.add_argument("--season", required=True, help="Season (e.g., 여름방학)")
    return parser.parse_args()

def extract_text_with_bs4(html_content):
    soup = BeautifulSoup(html_content, "html.parser")
    # Extract only text from p and div tags to minimize token usage
    text_blocks = []
    for tag in soup.find_all(['p', 'div']):
        text = tag.get_text(separator=' ', strip=True)
        if len(text) > 20: # Filter out very short UI strings
            text_blocks.append(text)
    return " ".join(text_blocks)

def analyze_with_llm(text_content):
    client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
    
    prompt = """
    다음은 해외 영어 캠프 프로그램 웹페이지에서 추출한 텍스트입니다.
    이를 분석하여 다음 16가지 항목의 JSON 형태로 정제해주세요.
    정보가 없거나 모호하면 반드시 '문의 필요'로 입력하세요. 이미지가 없으면 'default_camp.png'로 입력하세요.
    
    [추출 항목 규칙]
    1. programName: 영문명인 경우 자연스러운 한국어로 번역 및 정제
    2. place: 캠프가 실제로 열리고 수업을 진행하는 현지 학교/어학원명 (원어 및 한글 병기)
    3. seller: 국내 홍보 및 상담/예약을 받는 주체 (유학원/플랫폼명, 자체 모집 시 '자체 모집')
    4. operationType: 학교 자체 운영 / 유학원 독점 대행 / 유학원 단순 중개 중 분류
    5. koreanSupport: 상(한국인 상주, 카톡 소통) / 중(한국어 안내문) / 하(100% 영어) 중 분류
    6. targetAudience: 현지 학제(Grade) 기준을 한국 나이/학년으로 환산 (예: 만 6세~12세)
    7. participantType: 자녀 전용(아이만 통학) / 가족 동반(부모 동반 패키지) 중 분류
    8. programCategory: 영어 몰입 / STEM/창의 / 스포츠/예체능 / 정규 학제 스쿨링 중 분류
    9. ageGroup: 유치부 / 초등 저학년 / 초등 고학년 / 중고등 중 매핑
    10. schedule: 시작일 및 종료일 명시 (예: 2026.07.20 ~ 2026.08.14)
    11. accommodation: 기숙사(보딩) / 외부 연계 숙소 / 미포함(자체 통학) 중 분류
    12. cost: 현지 통화 기준 수집 후 대략적인 원화 환산 병기 (예: $1,500 (약 205만 원))
    13. summary: 커리큘럼 핵심을 3줄 요약 문장으로 생성
    
    [JSON Output Format Example]
    {
        "programName": "...", "place": "...", "seller": "...", "operationType": "...",
        "koreanSupport": "...", "targetAudience": "...", "participantType": "...",
        "programCategory": "...", "ageGroup": "...", "schedule": "...", "accommodation": "...",
        "cost": "...", "summary": "..."
    }
    """
    
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You are a helpful data extraction assistant that outputs strict JSON."},
            {"role": "user", "content": prompt + "\n\n[웹페이지 텍스트]\n" + text_content[:15000]} # Limit tokens
        ],
        response_format={ "type": "json_object" }
    )
    
    return json.loads(response.choices[0].message.content)

def main():
    args = parse_args()
    
    print(f"Starting crawl for {args.city}, {args.year}, {args.season}...")
    
    # Placeholder URLs - In a real scenario, we would search Google first.
    # For this script, we simulate hitting a target URL.
    target_urls = [
        "https://example.com/camp1", # Replace with actual logic to fetch urls
    ]
    
    camps_data = []
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        for url in target_urls:
            try:
                page.goto(url, timeout=30000)
                html_content = page.content()
                
                # Extract text using BeautifulSoup
                cleaned_text = extract_text_with_bs4(html_content)
                
                # Analyze with LLM
                print(f"Analyzing content from {url}...")
                llm_result = analyze_with_llm(cleaned_text)
                
                # Add default fields
                llm_result["sourceUrl"] = url
                llm_result["imageUrl"] = "default_camp.png" # Typically extracted via BS4 targeting <img>, set to default here
                
                camps_data.append(llm_result)
                
            except Exception as e:
                print(f"Failed to process {url}: {e}")
                
        browser.close()
        
    # Send to GAS
    gas_url = os.environ.get("GAS_API_URL")
    if gas_url and camps_data:
        payload = {
            "cityId": args.city,
            "year": args.year,
            "season": args.season,
            "camps": camps_data
        }
        
        print(f"Sending {len(camps_data)} records to GAS...")
        res = requests.post(gas_url, json=payload)
        print(f"GAS Response: {res.text}")
    else:
        print("GAS_API_URL not set or no data extracted.")

if __name__ == "__main__":
    main()
