'use client';

import React from 'react';
import { MapPin, Calendar, Users, CircleDollarSign, ArrowRight } from 'lucide-react';

export interface CampData {
  "프로그램 ID": string;
  "연동 도시 ID": string;
  "시즌 분류": string;
  "프로그램 명": string;
  "운영 기관": string;
  "모집/대행 기관": string;
  "운영 형태": string;
  "한국어 지원 수준": string;
  "참가 대상": string;
  "참가 형태": string;
  "프로그램 유형": string;
  "연령대 그룹": string;
  "정확한 일정": string;
  "숙소 옵션": string;
  "프로그램 비용": string;
  "대표 이미지 URL": string;
  "상세 페이지 링크": string;
  "커리큘럼 핵심 요약": string;
  "승인 상태": string;
}

export default function CampCard({ camp }: { camp: CampData }) {
  const isNeedsInquiry = (val: string) => val === '문의 필요';
  
  const handleInquiryClick = () => {
    const inquiryUrl = process.env.NEXT_PUBLIC_CONSULTING_URL || '#';
    window.open(inquiryUrl, '_blank');
  };

  const getCategoryColor = (category: string) => {
    if (category.includes('STEM') || category.includes('창의')) return 'from-purple-500 to-indigo-500';
    if (category.includes('영어') || category.includes('스쿨링')) return 'from-blue-500 to-cyan-500';
    if (category.includes('스포츠') || category.includes('예체능')) return 'from-emerald-500 to-teal-500';
    return 'from-slate-600 to-slate-800';
  };

  return (
    <div className="group relative flex flex-col bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-[2rem] overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 border border-slate-200/50 dark:border-slate-700/50 transform hover:-translate-y-2">
      
      {/* Background Glow Effect on Hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-[2rem] pointer-events-none"></div>

      {/* Image Section */}
      <div className="relative h-56 w-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img 
          src={camp['대표 이미지 URL'] === 'default_camp.png' || !camp['대표 이미지 URL'] ? '/default_camp.png' : camp['대표 이미지 URL']} 
          alt={camp['프로그램 명']}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/default_camp.png';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent"></div>
        
        <div className="absolute top-4 right-4 shadow-xl">
          <div className={`bg-gradient-to-r ${getCategoryColor(camp['프로그램 유형'])} text-white text-xs font-extrabold px-4 py-1.5 rounded-full backdrop-blur-md shadow-inner`}>
            {camp['프로그램 유형']}
          </div>
        </div>

        <div className="absolute bottom-4 left-4 right-4">
          <span className="inline-block text-xs font-bold text-white bg-white/20 backdrop-blur-md px-3 py-1 rounded-lg border border-white/30 mb-2">
            {camp['연령대 그룹']}
          </span>
          <h3 className="text-xl font-bold text-white leading-tight line-clamp-2 drop-shadow-md">
            {isNeedsInquiry(camp['프로그램 명']) ? '프로그램명 확인 중' : camp['프로그램 명']}
          </h3>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-6 flex flex-col flex-grow relative z-10">
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 line-clamp-3 leading-relaxed font-medium">
          {isNeedsInquiry(camp['커리큘럼 핵심 요약']) ? '커리큘럼 상세 내용을 확인 중입니다.' : camp['커리큘럼 핵심 요약']}
        </p>

        <div className="space-y-3 mt-auto mb-6 text-sm font-medium text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
              <MapPin size={16} className="text-blue-600 dark:text-blue-400" />
            </div>
            <span className="truncate text-slate-800 dark:text-slate-200">{camp['운영 기관']}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
              <Calendar size={16} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <span className="truncate text-slate-800 dark:text-slate-200">{camp['정확한 일정']}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
              <Users size={16} className="text-purple-600 dark:text-purple-400" />
            </div>
            <span className="truncate text-slate-800 dark:text-slate-200">{camp['참가 대상']} <span className="text-slate-400 text-xs">({camp['참가 형태']})</span></span>
          </div>
          <div className="flex items-center gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
              <CircleDollarSign size={16} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="truncate font-bold text-lg text-slate-900 dark:text-white">
              {camp['프로그램 비용']}
            </span>
          </div>
        </div>

        {/* Action Button */}
        <div>
          {Object.values(camp).some(isNeedsInquiry) ? (
            <button 
              onClick={handleInquiryClick}
              className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold py-4 rounded-xl transition-all flex justify-center items-center gap-2 shadow-[0_4px_14px_0_rgba(0,0,0,0.1)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.15)] group/btn"
            >
              상담 및 문의하기
              <ArrowRight size={18} className="transform group-hover/btn:translate-x-1 transition-transform" />
            </button>
          ) : (
            <a 
              href={camp['상세 페이지 링크']} 
              target="_blank" 
              rel="noreferrer"
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-4 rounded-xl transition-all flex justify-center items-center gap-2 shadow-[0_4px_14px_0_rgba(59,130,246,0.39)] hover:shadow-[0_6px_20px_rgba(59,130,246,0.23)] group/btn"
            >
              상세 정보 보기
              <ArrowRight size={18} className="transform group-hover/btn:translate-x-1 transition-transform" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
