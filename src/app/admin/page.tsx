'use client';

import React, { useState, useEffect } from 'react';
import { Play, Filter, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { CampData } from '@/components/CampCard';

export default function AdminDashboard() {
  const [camps, setCamps] = useState<CampData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterInquiry, setFilterInquiry] = useState(false);
  
  const [triggering, setTriggering] = useState(false);
  const [crawlLogs, setCrawlLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  useEffect(() => {
    fetchData();
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch('/api/crawl-logs');
      const json = await res.json();
      if (json.status === 'success') {
        setCrawlLogs(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch logs', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/camps');
      const json = await res.json();
      if (json.status === 'success') {
        setCamps(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const triggerCrawler = async () => {
    setTriggering(true);
    try {
      const res = await fetch('/api/trigger-crawler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (res.ok) {
        alert('크롤링이 백그라운드에서 시작되었습니다. 완료까지 최대 5분이 소요될 수 있습니다.\n잠시 후 "최근 기록 새로고침" 버튼을 눌러 확인하세요.');
      } else {
        alert('크롤러 실행 실패: ' + data.message);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTriggering(false);
    }
  };

  const filteredCamps = camps.filter(camp => {
    if (filterInquiry) {
      return Object.values(camp).some(val => val === '문의 필요');
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">관리자 대시보드</h1>
            <p className="text-slate-500">데이터 수집 파이프라인 및 승인 관리</p>
          </div>
        </div>

        {/* Crawler Trigger Card */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Play size={20} className="text-blue-500" />
            크롤러 파이프라인 실행
          </h2>
          <div className="flex flex-wrap gap-4 items-end">
            <p className="text-sm text-slate-500 mb-2 w-full">구글 시트의 [Target_Links] 탭에 있는 모든 대기열을 순차적으로 크롤링합니다.</p>
            <button 
              onClick={triggerCrawler}
              disabled={triggering}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-bold text-lg transition-colors flex items-center gap-2 disabled:bg-slate-400 w-full justify-center"
            >
              {triggering ? '요청 전송 중...' : '대기 중인 모든 링크 크롤링 시작'}
            </button>
          </div>
        </div>

        {/* Crawl Logs Table */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Clock size={20} className="text-slate-500" />
              최근 크롤링 기록
            </h2>
            <button 
              onClick={fetchLogs}
              disabled={loadingLogs}
              className="text-sm bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-4 py-2 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
            >
              {loadingLogs ? '불러오는 중...' : '기록 새로고침'}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-800 dark:text-slate-400 uppercase border-b dark:border-slate-700">
                <tr>
                  <th className="px-6 py-3">실행 일시</th>
                  <th className="px-6 py-3">수집 키워드</th>
                  <th className="px-6 py-3">수집 데이터 건수</th>
                  <th className="px-6 py-3">상태</th>
                </tr>
              </thead>
              <tbody>
                {crawlLogs.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-6 text-slate-500">최근 크롤링 기록이 없습니다.</td></tr>
                ) : crawlLogs.map((log, idx) => (
                  <tr key={idx} className="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="px-6 py-4 font-medium">{log.time}</td>
                    <td className="px-6 py-4">{log.query}</td>
                    <td className="px-6 py-4 text-blue-600 font-semibold">{log.count}건</td>
                    <td className="px-6 py-4">{log.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
            <h2 className="text-lg font-semibold">수집된 프로그램 데이터</h2>
            <button 
              onClick={() => setFilterInquiry(!filterInquiry)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filterInquiry ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300'}`}
            >
              <Filter size={16} />
              '문의 필요' 항목만 보기
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-800 dark:text-slate-400 uppercase">
                <tr>
                  <th className="px-6 py-3">상태</th>
                  <th className="px-6 py-3">프로그램 ID</th>
                  <th className="px-6 py-3">프로그램 명</th>
                  <th className="px-6 py-3">운영 기관</th>
                  <th className="px-6 py-3">시즌</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="text-center py-8">데이터를 불러오는 중...</td></tr>
                ) : filteredCamps.map((camp, idx) => (
                  <tr key={idx} className="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="px-6 py-4">
                      {camp['승인 상태'] === '승인' ? (
                        <span className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-full w-fit"><CheckCircle size={14}/> 승인</span>
                      ) : (
                        <span className="flex items-center gap-1 text-orange-600 bg-orange-50 px-2 py-1 rounded-full w-fit"><Clock size={14}/> 대기</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-medium">{camp['프로그램 ID']}</td>
                    <td className="px-6 py-4">
                      {camp['프로그램 명'] === '문의 필요' ? (
                        <span className="flex items-center gap-1 text-red-500"><AlertCircle size={14}/> 문의 필요</span>
                      ) : camp['프로그램 명']}
                    </td>
                    <td className="px-6 py-4">{camp['운영 기관']}</td>
                    <td className="px-6 py-4">{camp['시즌 분류']}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
