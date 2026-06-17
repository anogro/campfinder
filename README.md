# 해외 캠프 프로그램 정보 수집 파이프라인 및 서비스

본 프로젝트는 해외 캠프 프로그램 정보를 수집하고 사용자에게 보여주는 파이프라인 및 웹 서비스입니다. Python 크롤러, Google Apps Script(GAS) 백엔드, Next.js 프론트엔드로 구성되어 있습니다.

## 폴더 구조 설명

```
campfinder/
├── crawler/                  # 파이썬 기반 데이터 수집 크롤러
│   ├── main.py               # 크롤러 메인 스크립트 (Playwright + OpenAI + BS4)
│   ├── requirements.txt      # 파이썬 의존성 패키지
│   └── .env.example          # 크롤러 환경변수 예시
├── gas/                      # 구글 앱스 스크립트 (Google Apps Script)
│   └── Code.gs               # 구글 시트 기반 백엔드 (doPost, doGet)
├── frontend/                 # Next.js 웹 애플리케이션
│   ├── src/                  
│   │   ├── app/              # 랜딩페이지(/) 및 관리자 대시보드(/admin)
│   │   ├── components/       # CampCard 등 UI 컴포넌트
│   │   └── middleware.ts     # /admin 보호를 위한 미들웨어
│   ├── .env.local            # 프론트엔드 환경변수 파일
│   └── tailwind.config.ts    # Tailwind CSS 설정
└── .github/workflows/        # CI/CD 자동화 워크플로우
    └── crawler.yml           # GitHub Actions를 통한 크롤러 실행 스크립트
```

## Vercel 배포 가이드

1. **GitHub 저장소 생성 및 푸시**: 이 프로젝트를 본인의 GitHub 저장소에 푸시합니다.
2. **Vercel 프로젝트 연동**: Vercel 대시보드에서 `Add New...` -> `Project`를 클릭하고 해당 GitHub 저장소를 선택합니다.
3. **Framework Preset**: `Next.js`가 자동으로 선택됩니다.
4. **Root Directory**: `frontend` 폴더를 루트 디렉토리로 설정해야 합니다. (중요)
5. **환경 변수 (Environment Variables) 설정**:
   Vercel 환경 변수 설정 탭에서 아래 변수들을 등록합니다:
   - `NEXT_PUBLIC_GAS_API_URL`: 구글 앱스 스크립트 웹앱 배포 후 받은 URL
   - `NEXT_PUBLIC_CONSULTING_URL`: 문의 필요 시 이동할 상담 링크 주소 (예: 구글 폼, 카카오톡 채널)
   - `ADMIN_PASSWORD`: `/admin` 페이지 접속을 위한 관리자 비밀번호
   - `GITHUB_TOKEN`: (선택 사항) 관리자 페이지에서 GitHub Action 트리거 시 사용
6. **Deploy**: 배포 버튼을 눌러 완료합니다.

## Google Apps Script 설정

1. Google Drive에서 새 Google Sheets를 생성합니다. (기존 시트가 없다면 생성)
2. `확장 프로그램` > `Apps Script`를 클릭합니다.
3. `gas/Code.gs` 안의 내용을 붙여넣기 합니다.
4. `배포` > `새 배포`를 클릭하고, 유형을 `웹 앱`으로 선택합니다.
5. 액세스 권한을 `모든 사용자`로 설정하고 배포합니다.
6. 제공된 `웹 앱 URL`을 복사하여 크롤러의 `GAS_API_URL` 및 프론트엔드의 `NEXT_PUBLIC_GAS_API_URL`로 사용합니다.
7. **초기화**: 에디터에서 `setupSheets` 함수를 한 번 수동으로 실행하면 초기 헤더가 생성됩니다.

## 관리자 대시보드 접근

`/admin` 경로로 접속 시 브라우저 기본 인증 팝업이 뜹니다.
- **사용자 이름**: (아무거나 입력)
- **비밀번호**: Vercel 혹은 `.env.local`에 설정한 `ADMIN_PASSWORD` 값을 입력합니다.
