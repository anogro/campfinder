'use client';

import React from 'react';
import { MapPin, Calendar, Users, CircleDollarSign, ArrowRight } from 'lucide-react';

export interface CampData {
  camp_name: string;
  city: string;
  country: string;
  year: string;
  season: string;
  age_range: string;
  duration: string;
  accommodation: string;
  tuition: string;
  source_url: string;
}

export default function CampCard({ camp }: { camp: CampData }) {
  const isNeedsInquiry = (val: string) => val === '문의 필요';
  
  const handleInquiryClick = () => {
    const inquiryUrl = process.env.NEXT_PUBLIC_CONSULTING_URL || '#';
    window.open(inquiryUrl, '_blank');
  };

  const getCategoryColor = (season: string) => {
    if (season?.includes('여름')) return 'from-blue-500 to-cyan-500';
    if (season?.includes('겨울')) return 'from-slate-600 to-slate-800';
    return 'from-purple-500 to-indigo-500';
  };

  return (
    <div className="group relative flex flex-col bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-[2rem] overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 border border-slate-200/50 dark:border-slate-700/50 transform hover:-translate-y-2">
      
      {/* Background Glow Effect on Hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-[2rem] pointer-events-none"></div>

      {/* Image Section */}
      <div className="relative h-56 w-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img 
          src={'/default_camp.png'} 
          alt={camp.camp_name || 'Camp'}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent"></div>
        
        <div className="absolute top-4 right-4 shadow-xl">
          <div className={`bg-gradient-to-r ${getCategoryColor(camp.season)} text-white text-xs font-extrabold px-4 py-1.5 rounded-full backdrop-blur-md shadow-inner`}>
            {camp.season || '상시'}
          </div>
        </div>

        <div className="absolute bottom-4 left-4 right-4">
          <span className="inline-block text-xs font-bold text-white bg-white/20 backdrop-blur-md px-3 py-1 rounded-lg border border-white/30 mb-2">
            {camp.age_range || '연령 미정'}
          </span>
          <h3 className="text-xl font-bold text-white leading-tight line-clamp-2 drop-shadow-md">
            {isNeedsInquiry(camp.camp_name) ? '프로그램명 확인 중' : camp.camp_name || '프로그램 이름 없음'}
          </h3>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-6 flex flex-col flex-grow relative z-10">
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 line-clamp-3 leading-relaxed font-medium">
          {camp.city}, {camp.country}에서 진행되는 캠프입니다.
        </p>

        <div className="space-y-3 mt-auto mb-6 text-sm font-medium text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
              <MapPin size={16} className="text-blue-600 dark:text-blue-400" />
            </div>
            <span className="truncate text-slate-800 dark:text-slate-200">{camp.country} {camp.city}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
              <Calendar size={16} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <span className="truncate text-slate-800 dark:text-slate-200">{camp.year} {camp.season}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
              <Users size={16} className="text-purple-600 dark:text-purple-400" />
            </div>
            <span className="truncate text-slate-800 dark:text-slate-200">{camp.duration || '기간 미정'} ({camp.accommodation || '숙소 미정'})</span>
          </div>
          <div className="flex items-center gap-3 pt-2 border-t border-slate-200 dark:border-slate-700">
            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
              <CircleDollarSign size={16} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="truncate font-bold text-lg text-slate-900 dark:text-white">
              {camp.tuition || '비용 문의'}
            </span>
          </div>
        </div>

        {/* Action Button */}
        <div>
          <a 
            href={camp.source_url || '#'} 
            target="_blank" 
            rel="noreferrer"
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-4 rounded-xl transition-all flex justify-center items-center gap-2 shadow-[0_4px_14px_0_rgba(59,130,246,0.39)] hover:shadow-[0_6px_20px_rgba(59,130,246,0.23)] group/btn"
          >
            상세 정보 보기
            <ArrowRight size={18} className="transform group-hover/btn:translate-x-1 transition-transform" />
          </a>
        </div>
      </div>
    </div>
  );
}
