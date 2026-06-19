import CampCard, { CampData } from '@/components/CampCard';
import { getCampsData } from '@/lib/googleSheets';

export default async function Home() {
  let camps: CampData[] = [];
  let errorMsg = '';
  let isLoadingDummy = false;

  try {
    const result = await getCampsData();
    if (result.status === 'error' || !result.data) {
      errorMsg = 'API 연동에 실패했습니다: ' + (result.message || 'Unknown error');
      if (result.message?.includes('not properly configured')) {
        isLoadingDummy = true;
      }
    } else {
      camps = result.data; // Camps sheet now only contains SUCCESS camps
    }
  } catch (error: any) {
    console.error('Fetch error:', error.message);
    errorMsg = '서버와의 통신 중 오류가 발생했습니다. (' + error.message + ')';
  }

  // Dummy data for design preview when API is not set
  if (isLoadingDummy) {
    camps = [
      {
        camp_name: "뉴욕 아이비리그 리더십 영어 캠프",
        city: "New York",
        country: "USA",
        year: "2026",
        season: "여름방학",
        age_range: "만 10세 ~ 15세",
        duration: "3주",
        accommodation: "기숙사",
        tuition: "$4,500",
        source_url: "#"
      },
      {
        camp_name: "런던 브리티시 스쿨링 & 해리포터 스튜디오 투어",
        city: "London",
        country: "UK",
        year: "2026",
        season: "겨울방학",
        age_range: "만 8세 ~ 13세",
        duration: "4주",
        accommodation: "외부 연계 숙소",
        tuition: "£3,200",
        source_url: "#"
      }
    ];
  }

  return (
    <main className="min-h-screen bg-[var(--background)] selection:bg-blue-500/30">
      {/* Premium Hero Section */}
      <section className="relative overflow-hidden py-32 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 z-0"></div>
        
        {/* Animated Background Orbs */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-blue-500/30 blur-[120px] animate-pulse"></div>
          <div className="absolute top-[20%] -right-[10%] w-[30%] h-[30%] rounded-full bg-indigo-500/30 blur-[100px] animate-pulse" style={{ animationDelay: '2s' }}></div>
          <div className="absolute -bottom-[20%] left-[20%] w-[50%] h-[50%] rounded-full bg-cyan-500/20 blur-[120px] animate-pulse" style={{ animationDelay: '4s' }}></div>
        </div>
        
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10 mix-blend-overlay z-0"></div>
        
        <div className="container mx-auto px-6 relative z-10 text-center flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-md mb-8 shadow-2xl">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span>
            <span className="w-2 h-2 rounded-full bg-blue-400 absolute"></span>
            <span className="text-sm font-medium text-blue-100 tracking-wide">2026 해외 캠프 얼리버드 모집 중</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-100 to-indigo-200 drop-shadow-lg leading-tight">
            우리 아이를 위한<br />최고의 글로벌 여정
          </h1>
          <p className="text-lg md:text-2xl text-blue-100/90 max-w-3xl mx-auto mb-12 font-light leading-relaxed">
            검증된 어학연수, 스쿨링, 프리미엄 캠프 정보를<br className="hidden md:block" /> 한눈에 비교하고 가장 완벽한 경험을 선사하세요.
          </p>
          
          <div className="flex gap-4 items-center">
            <a href="#explore" className="px-8 py-4 bg-white text-blue-900 rounded-full font-bold text-lg hover:bg-blue-50 transition-all duration-300 shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_rgba(255,255,255,0.5)] transform hover:-translate-y-1">
              캠프 탐색하기
            </a>
          </div>
        </div>
        
        {/* Scroll Indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-70 animate-bounce">
          <span className="text-white text-sm font-medium">Scroll down</span>
          <div className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center p-1">
            <div className="w-1.5 h-3 bg-white rounded-full"></div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section id="explore" className="container mx-auto px-6 py-24 relative z-10 -mt-10">
        
        {errorMsg && (
          <div className="mb-12 p-6 bg-amber-500/10 border border-amber-500/20 backdrop-blur-md text-amber-700 dark:text-amber-400 rounded-2xl flex items-start gap-4 shadow-xl">
            <div className="p-2 bg-amber-500/20 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-1">시스템 알림</h3>
              <p>{errorMsg}</p>
            </div>
          </div>
        )}

        <div className="flex justify-between items-end mb-12">
          <div>
            <h2 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-3">추천 프리미엄 캠프</h2>
            <p className="text-lg text-slate-500 dark:text-slate-400">전문가들이 꼼꼼하게 검증하고 선정한 최고의 프로그램입니다.</p>
          </div>
        </div>

        {camps.length === 0 && !errorMsg ? (
          <div className="text-center py-32 bg-white/50 dark:bg-slate-800/30 backdrop-blur-xl border border-slate-200 dark:border-slate-700 rounded-3xl shadow-2xl">
            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">승인된 프로그램이 없습니다</h3>
            <p className="text-slate-500">관리자가 새로운 캠프 정보를 심사 중입니다. 잠시 후 다시 확인해 주세요.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {camps.map((camp, idx) => (
              <CampCard key={camp['프로그램 ID'] || idx} camp={camp} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
