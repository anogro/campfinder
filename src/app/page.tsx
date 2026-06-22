import CampCard, { CampData } from '@/components/CampCard';
import { getCampsData } from '@/lib/googleSheets';
import { AnimatedReveal, AnimatedHero, AnimatedStaggerGroup } from '@/components/AnimatedReveal';

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
    <main className="min-h-screen bg-[#050510] text-slate-100 selection:bg-fuchsia-500/30 overflow-x-hidden">
      {/* Premium Hero Section with Cyber/Dark Space Theme */}
      <section className="relative overflow-hidden py-32 flex flex-col items-center justify-center min-h-[70vh]">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a1a] via-[#050510] to-[#020205] z-0"></div>
        
        {/* Animated Background Orbs */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
          <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-indigo-600/20 blur-[150px] animate-[pulse_6s_ease-in-out_infinite]"></div>
          <div className="absolute top-[30%] -right-[10%] w-[40%] h-[40%] rounded-full bg-fuchsia-600/20 blur-[130px] animate-[pulse_8s_ease-in-out_infinite_2s]"></div>
          <div className="absolute -bottom-[20%] left-[20%] w-[60%] h-[60%] rounded-full bg-blue-600/10 blur-[150px] animate-[pulse_7s_ease-in-out_infinite_4s]"></div>
        </div>
        
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03] mix-blend-screen z-0"></div>
        
        <AnimatedHero>
          <div className="container mx-auto px-6 flex flex-col items-center">
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl mb-10 shadow-[0_0_30px_rgba(139,92,246,0.15)] hover:bg-white/10 transition-colors">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-fuchsia-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-fuchsia-500"></span>
              </span>
              <span className="text-sm font-medium text-slate-200 tracking-wider">2026 해외 캠프 얼리버드 모집 중</span>
            </div>
            
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-8 text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-200 to-slate-500 drop-shadow-2xl leading-tight">
              가장 완벽한<br />글로벌 여정의 시작
            </h1>
            <p className="text-xl md:text-2xl text-slate-400 max-w-3xl mx-auto mb-14 font-light leading-relaxed">
              검증된 프리미엄 캠프, 스쿨링, 어학연수 정보를<br className="hidden md:block" /> 한눈에 비교하고 우리 아이에게 최고의 경험을 선물하세요.
            </p>
            
            <div className="flex gap-4 items-center">
              <a href="#explore" className="group relative px-10 py-5 bg-white text-slate-900 rounded-full font-bold text-lg hover:bg-slate-100 transition-all duration-300 transform hover:-translate-y-1 overflow-hidden shadow-[0_0_40px_rgba(255,255,255,0.15)] hover:shadow-[0_0_60px_rgba(255,255,255,0.3)]">
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                <span className="relative flex items-center gap-2">
                  프로그램 탐색하기
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                </span>
              </a>
            </div>
          </div>
        </AnimatedHero>
        
        {/* Scroll Indicator */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 opacity-50 animate-bounce">
          <div className="w-7 h-12 border-2 border-slate-400/50 rounded-full flex justify-center p-1.5">
            <div className="w-1.5 h-3 bg-slate-300 rounded-full"></div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section id="explore" className="container mx-auto px-6 py-32 relative z-10">
        <AnimatedReveal delay={0.1}>
          {errorMsg && (
            <div className="mb-16 p-6 bg-amber-500/10 border border-amber-500/20 backdrop-blur-xl text-amber-400 rounded-2xl flex items-start gap-4 shadow-[0_0_30px_rgba(245,158,11,0.1)]">
              <div className="p-2 bg-amber-500/20 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1 text-amber-300">시스템 알림</h3>
                <p>{errorMsg}</p>
              </div>
            </div>
          )}

          <div className="flex flex-col items-center text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tight">엄선된 글로벌 프로그램</h2>
            <div className="w-24 h-1.5 bg-gradient-to-r from-fuchsia-500 to-indigo-500 rounded-full mb-6"></div>
            <p className="text-xl text-slate-400 max-w-2xl">수천 개의 데이터 중 상위 1%의 프리미엄 캠프만을 선별하여 제안합니다.</p>
          </div>
        </AnimatedReveal>

        {camps.length === 0 && !errorMsg ? (
          <AnimatedReveal delay={0.3}>
            <div className="text-center py-32 bg-[#0a0a1a]/80 backdrop-blur-2xl border border-white/5 rounded-3xl shadow-2xl">
              <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner border border-white/10">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
              <h3 className="text-3xl font-bold text-white mb-4 tracking-tight">수집된 프로그램이 없습니다</h3>
              <p className="text-lg text-slate-400">데이터 수집 파이프라인이 실행 중이거나 새로운 캠프를 분석하고 있습니다.</p>
            </div>
          </AnimatedReveal>
        ) : (
          <AnimatedStaggerGroup className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {camps.map((camp, idx) => (
              <CampCard key={camp.camp_name || idx} camp={camp} />
            ))}
          </AnimatedStaggerGroup>
        )}
      </section>
    </main>
  );
}
