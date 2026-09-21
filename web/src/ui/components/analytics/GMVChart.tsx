"use client";

import React, { useState } from 'react';
import type { PlatformGmvTimelineItem } from '../../api/analyticsApi';

export interface GMVChartProps {
  timeline: PlatformGmvTimelineItem[];
  interval: 'daily' | 'weekly' | 'monthly';
  loading?: boolean;
}

function formatVND(val: number | string): string {
  const num = typeof val === 'number' ? val : Number(val);
  if (isNaN(num)) return '0 ₫';
  return `${Math.round(num).toLocaleString('vi-VN')} ₫`;
}

function formatPeriodLabel(period: string, interval: 'daily' | 'weekly' | 'monthly'): string {
  if (!period) return '';
  if (interval === 'daily') {
    // YYYY-MM-DD -> DD/MM
    const parts = period.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
    return period;
  }
  if (interval === 'weekly') {
    // YYYY-Www -> Www
    return period.replace(/^\d{4}-/, '');
  }
  if (interval === 'monthly') {
    // YYYY-MM -> MM/YYYY
    const parts = period.split('-');
    if (parts.length === 2) return `${parts[1]}/${parts[0]}`;
    return period;
  }
  return period;
}

export function GMVChart({ timeline, interval, loading = false }: GMVChartProps) {
  const [metricMode, setMetricMode] = useState<'gmv' | 'orders'>('gmv');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-2xs h-80 flex flex-col justify-between animate-pulse">
        <div className="flex justify-between items-center">
          <div className="h-4 w-40 bg-slate-200 rounded"></div>
          <div className="h-8 w-32 bg-slate-100 rounded-lg"></div>
        </div>
        <div className="h-48 w-full bg-slate-100 rounded-xl"></div>
        <div className="flex justify-between">
          <div className="h-3 w-12 bg-slate-200 rounded"></div>
          <div className="h-3 w-12 bg-slate-200 rounded"></div>
          <div className="h-3 w-12 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!timeline || timeline.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-[#E2E8F0] shadow-2xs h-80 flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
          <span className="material-symbols-outlined text-[24px]">bar_chart_off</span>
        </div>
        <h4 className="text-sm font-bold text-gray-800">Không có dữ liệu biểu đồ</h4>
        <p className="text-xs text-gray-500 mt-1 max-w-sm">
          Chưa có giao dịch hoàn tất nào được ghi nhận trong khoảng thời gian đã chọn.
        </p>
      </div>
    );
  }

  // SVG Geometry Calculation (display-only coordinates)
  const values = timeline.map((t) => (metricMode === 'gmv' ? Number(t.gmv) || 0 : t.orders || 0));
  const maxVal = Math.max(...values, metricMode === 'gmv' ? 1000 : 1);
  const minVal = 0;
  const range = maxVal - minVal || 1;

  const svgWidth = 800;
  const svgHeight = 220;
  const padLeft = 40;
  const padRight = 30;
  const padTop = 20;
  const padBottom = 35;

  const plotWidth = svgWidth - padLeft - padRight;
  const plotHeight = svgHeight - padTop - padBottom;

  const n = timeline.length;
  const points = timeline.map((item, idx) => {
    const val = metricMode === 'gmv' ? Number(item.gmv) || 0 : item.orders || 0;
    const x = n === 1 ? padLeft + plotWidth / 2 : padLeft + (idx / (n - 1)) * plotWidth;
    const y = padTop + plotHeight - ((val - minVal) / range) * plotHeight;
    return { x, y, val, item };
  });

  const linePath = points.reduce((acc, pt, idx) => {
    return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, '');

  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x} ${padTop + plotHeight} L ${points[0].x} ${padTop + plotHeight} Z`
      : '';

  // Y-axis grid guides
  const gridSteps = 4;
  const gridLines = Array.from({ length: gridSteps + 1 }).map((_, idx) => {
    const ratio = idx / gridSteps;
    const yVal = minVal + ratio * range;
    const yCoord = padTop + plotHeight - ratio * plotHeight;
    const label = metricMode === 'gmv' ? formatVND(yVal) : `${Math.round(yVal)} đơn`;
    return { yCoord, label };
  });

  const activeItem = hoveredIdx !== null && points[hoveredIdx] ? points[hoveredIdx] : null;

  return (
    <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-2xs flex flex-col justify-between relative overflow-hidden">
      {/* 1. Header & Metric Mode Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#00875A]"></span>
            <h3 className="font-bold text-sm sm:text-base text-gray-900 font-editorial">
              {metricMode === 'gmv' ? 'Diễn Biến Tổng GMV Hoàn Tất' : 'Diễn Biến Số Lượng Đơn Hàng'}
            </h3>
          </div>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Dữ liệu tổng hợp theo chu kỳ <strong>{interval === 'daily' ? 'Ngày' : interval === 'weekly' ? 'Tuần ISO' : 'Tháng'}</strong>
          </p>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0">
          <button
            onClick={() => setMetricMode('gmv')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              metricMode === 'gmv' ? 'bg-white text-[#00875A] shadow-2xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            GMV (₫)
          </button>
          <button
            onClick={() => setMetricMode('orders')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              metricMode === 'orders' ? 'bg-white text-blue-600 shadow-2xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Số Đơn
          </button>
        </div>
      </div>

      {/* 2. Interactive SVG Canvas */}
      <div className="relative w-full mt-3">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto overflow-visible select-none"
          onMouseLeave={() => setHoveredIdx(null)}
        >
          <defs>
            <linearGradient id="gmvAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00875A" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#00875A" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="ordersAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563EB" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {gridLines.map((gl, i) => (
            <g key={i}>
              <line
                x1={padLeft}
                y1={gl.yCoord}
                x2={svgWidth - padRight}
                y2={gl.yCoord}
                stroke="#F1F5F9"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <text
                x={padLeft - 8}
                y={gl.yCoord + 3}
                fill="#94A3B8"
                fontSize="9"
                fontWeight="600"
                textAnchor="end"
              >
                {gl.label}
              </text>
            </g>
          ))}

          {/* Area Fill */}
          <path
            d={areaPath}
            fill={metricMode === 'gmv' ? 'url(#gmvAreaGradient)' : 'url(#ordersAreaGradient)'}
          />

          {/* Line Path */}
          <path
            d={linePath}
            fill="none"
            stroke={metricMode === 'gmv' ? '#00875A' : '#2563EB'}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data Points & X-Axis Labels */}
          {points.map((pt, idx) => {
            const isHovered = hoveredIdx === idx;
            const showLabel =
              n <= 12 || idx === 0 || idx === n - 1 || idx % Math.ceil(n / 8) === 0;

            return (
              <g key={idx}>
                {/* Vertical hover guide */}
                {isHovered && (
                  <line
                    x1={pt.x}
                    y1={padTop}
                    x2={pt.x}
                    y2={padTop + plotHeight}
                    stroke="#94A3B8"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                )}

                {/* Point circle */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 6 : n > 30 ? 2 : 4}
                  fill={isHovered ? '#FFFFFF' : metricMode === 'gmv' ? '#00875A' : '#2563EB'}
                  stroke={metricMode === 'gmv' ? '#00875A' : '#2563EB'}
                  strokeWidth={isHovered ? 3 : 2}
                  className="transition-all duration-150 cursor-pointer"
                  onMouseEnter={() => setHoveredIdx(idx)}
                />

                {/* Invisible hit target for smooth hovering */}
                <rect
                  x={pt.x - (plotWidth / n) / 2}
                  y={padTop}
                  width={Math.max(plotWidth / n, 20)}
                  height={plotHeight}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredIdx(idx)}
                />

                {/* X-Axis Label */}
                {showLabel && (
                  <text
                    x={pt.x}
                    y={padTop + plotHeight + 18}
                    fill="#64748B"
                    fontSize="10"
                    fontWeight="600"
                    textAnchor="middle"
                  >
                    {formatPeriodLabel(pt.item.period, interval)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Floating Tooltip */}
        {activeItem && (
          <div
            className="absolute z-20 pointer-events-none bg-gray-900 text-white p-2.5 rounded-xl shadow-xl text-xs flex flex-col gap-1 transform -translate-x-1/2 -translate-y-full mb-3"
            style={{
              left: `${(activeItem.x / svgWidth) * 100}%`,
              top: `${(activeItem.y / svgHeight) * 100}%`,
            }}
          >
            <div className="text-[10px] text-gray-400 font-bold uppercase border-b border-gray-700 pb-1">
              Kỳ: {activeItem.item.period}
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-gray-300">GMV:</span>
              <span className="font-extrabold text-emerald-400">
                {formatVND(activeItem.item.gmv)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-gray-300">Đơn hàng:</span>
              <span className="font-bold text-blue-300">
                {activeItem.item.orders.toLocaleString('vi-VN')} đơn
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default GMVChart;
