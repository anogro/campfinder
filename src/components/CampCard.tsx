'use client';

import React from 'react';
import { MapPin, Calendar, Users, CircleDollarSign, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

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
  image_url?: string;
}

export default function CampCard({ camp }: { camp: CampData }) {
  const isNeedsInquiry = (val: string) => val === '문의 필요';
  
  const handleInquiryClick = () => {
    const inquiryUrl = process.env.NEXT_PUBLIC_CONSULTING_URL || '#';
    window.open(inquiryUrl, '_blank');
  };

  const getCategoryColor = (season: string) => {
    if (season?.includes('여름')) return 'from-blue-500 to-cyan-400';
    if (season?.includes('겨울')) return 'from-slate-600 to-slate-400';
    return 'from-fuchsia-500 to-indigo-500';
  };

  const itemVariant = {
    hidden: { opacity: 0, y: 50, scale: 0.95 },
    show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring' as const, stiffness: 100, damping: 15 } }
  };

  return (
    <motion.div 
      variants={itemVariant}
      whileHover={{ y: -10, scale: 1.02 }}
      className="group relative flex flex-col bg-[#0a0a1a]/80 backdrop-blur-2xl rounded-[2rem] overflow-hidden shadow-2xl transition-all duration-300 border border-white/10"
    >
      {/* Background Glow Effect on Hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-[2rem] pointer-events-none"></div>
      
      {/* Shimmer Border Overlay */}
      <div className="absolute inset-0 border border-white/5 rounded-[2rem] group-hover:border-white/20 transition-colors duration-500 pointer-events-none"></div>

      {/* Image Section */}
      <div className="relative h-60 w-full bg-[#050510] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <motion.img 
          src={camp.image_url || '/default_camp.png'} 
          alt={camp.camp_name || 'Camp'}
          className="w-full h-full object-cover"
          whileHover={{ scale: 1.1 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a1a] via-[#0a0a1a]/40 to-transparent"></div>
        
        <div className="absolute top-5 right-5 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
          <div className={`bg-gradient-to-r ${getCategoryColor(camp.season)} text-white text-xs font-black px-4 py-1.5 rounded-full shadow-inner tracking-wider`}>
            {camp.season || '상시'}
          </div>
        </div>

        <div className="absolute bottom-5 left-5 right-5">
          <span className="inline-block text-xs font-bold text-slate-200 bg-white/10 backdrop-blur-md px-3 py-1 rounded-lg border border-white/20 mb-3 shadow-lg">
            {camp.age_range || '연령 미정'}
          </span>
          <h3 className="text-2xl font-black text-white leading-tight line-clamp-2 drop-shadow-xl tracking-tight">
            {isNeedsInquiry(camp.camp_name) ? '프로그램명 확인 중' : camp.camp_name || '프로그램 이름 없음'}
          </h3>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-7 flex flex-col flex-grow relative z-10">
        <p className="text-sm text-slate-400 mb-6 line-clamp-3 leading-relaxed font-light">
          {camp.city}, {camp.country}에서 진행되는 특별한 여정입니다.
        </p>

        <div className="space-y-4 mt-auto mb-8 text-sm font-medium text-slate-300 bg-white/5 p-5 rounded-2xl border border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 shadow-[0_0_10px_rgba(59,130,246,0.2)]">
              <MapPin size={16} className="text-blue-400" />
            </div>
            <span className="truncate text-slate-200">{camp.country} {camp.city}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-fuchsia-500/20 flex items-center justify-center flex-shrink-0 shadow-[0_0_10px_rgba(217,70,239,0.2)]">
              <Calendar size={16} className="text-fuchsia-400" />
            </div>
            <span className="truncate text-slate-200">{camp.year} {camp.season}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
              <Users size={16} className="text-emerald-400" />
            </div>
            <span className="truncate text-slate-200">{camp.duration || '기간 미정'} <span className="text-slate-500 text-xs">({camp.accommodation || '숙소 미정'})</span></span>
          </div>
          <div className="flex items-center gap-3 pt-3 mt-1 border-t border-white/10">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
              <CircleDollarSign size={16} className="text-amber-400" />
            </div>
            <span className="truncate font-black text-xl text-white">
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
            className="w-full relative overflow-hidden bg-white/10 hover:bg-white/20 text-white font-bold py-4 rounded-xl transition-all duration-300 flex justify-center items-center gap-2 border border-white/20 group/btn"
          >
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-fuchsia-500 to-blue-500 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></div>
            <span className="relative z-10 flex items-center gap-2">
              상세 정보 보기
              <ArrowRight size={18} className="transform group-hover/btn:translate-x-1 transition-transform" />
            </span>
          </a>
        </div>
      </div>
    </motion.div>
  );
}
