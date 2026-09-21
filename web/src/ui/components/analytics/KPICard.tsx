"use client";

import React from 'react';

export interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  color?: 'emerald' | 'blue' | 'amber' | 'purple' | 'gray';
  badge?: string;
  loading?: boolean;
}

export function KPICard({
  title,
  value,
  subtitle,
  icon,
  color = 'emerald',
  badge,
  loading = false,
}: KPICardProps) {
  const colorStyles = {
    emerald: {
      bgIcon: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      borderHover: 'hover:border-emerald-300',
    },
    blue: {
      bgIcon: 'bg-blue-50 text-blue-600 border-blue-100',
      borderHover: 'hover:border-blue-300',
    },
    amber: {
      bgIcon: 'bg-amber-50 text-amber-600 border-amber-100',
      borderHover: 'hover:border-amber-300',
    },
    purple: {
      bgIcon: 'bg-purple-50 text-purple-600 border-purple-100',
      borderHover: 'hover:border-purple-300',
    },
    gray: {
      bgIcon: 'bg-slate-100 text-slate-600 border-slate-200',
      borderHover: 'hover:border-slate-300',
    },
  }[color];

  if (loading) {
    return (
      <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] shadow-2xs animate-pulse flex flex-col justify-between h-32">
        <div className="flex items-center justify-between">
          <div className="h-3 w-28 bg-slate-200 rounded"></div>
          <div className="w-9 h-9 rounded-xl bg-slate-100"></div>
        </div>
        <div className="h-7 w-36 bg-slate-200 rounded mt-2"></div>
        <div className="h-2.5 w-44 bg-slate-100 rounded mt-1"></div>
      </div>
    );
  }

  return (
    <div
      className={`p-4 rounded-2xl bg-white border border-[#E2E8F0] ${colorStyles.borderHover} transition-all shadow-2xs flex flex-col justify-between relative overflow-hidden group`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
            {title}
          </span>
          {badge && (
            <span className="mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 w-fit">
              {badge}
            </span>
          )}
        </div>
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border group-hover:scale-105 transition-transform ${colorStyles.bgIcon}`}
        >
          <span className="material-symbols-outlined text-[20px]">{icon}</span>
        </div>
      </div>

      <div className="mt-2.5">
        <div className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight font-editorial truncate" title={String(value)}>
          {value}
        </div>
        {subtitle && (
          <p className="mt-1 text-[11px] text-gray-500 truncate" title={subtitle}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

export default KPICard;
