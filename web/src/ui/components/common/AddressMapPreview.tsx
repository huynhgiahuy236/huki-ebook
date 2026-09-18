import React, { useState, useMemo } from 'react';

// Comprehensive coordinates mapping and hub info for Vietnam provinces/cities
const REGION_COORDINATES_MAP: Record<string, { lat: number; lng: number; hub: string; eta: string }> = {
  'hồ chí minh': { lat: 10.8231, lng: 106.6297, hub: 'Tổng Kho Phân Loại Tân Bình (SPX/GHTK Hub Miền Nam)', eta: '1 - 2 ngày' },
  'tp. hồ chí minh': { lat: 10.8231, lng: 106.6297, hub: 'Tổng Kho Phân Loại Tân Bình (SPX/GHTK Hub Miền Nam)', eta: '1 - 2 ngày' },
  'thành phố hồ chí minh': { lat: 10.8231, lng: 106.6297, hub: 'Tổng Kho Phân Loại Tân Bình (SPX/GHTK Hub Miền Nam)', eta: '1 - 2 ngày' },
  'sài gòn': { lat: 10.8231, lng: 106.6297, hub: 'Tổng Kho Phân Loại Tân Bình (SPX/GHTK Hub Miền Nam)', eta: '1 - 2 ngày' },
  'hà nội': { lat: 21.0285, lng: 105.8542, hub: 'Tổng Kho Đống Đa - Ba Đình (GHTK Hub Miền Bắc)', eta: '1 - 2 ngày' },
  'thành phố hà nội': { lat: 21.0285, lng: 105.8542, hub: 'Tổng Kho Đống Đa - Ba Đình (GHTK Hub Miền Bắc)', eta: '1 - 2 ngày' },
  'đà nẵng': { lat: 16.0544, lng: 108.2022, hub: 'Bưu Cục Trung Tâm Hải Châu (Viettel Post Miền Trung)', eta: '1 - 2 ngày' },
  'thành phố đà nẵng': { lat: 16.0544, lng: 108.2022, hub: 'Bưu Cục Trung Tâm Hải Châu (Viettel Post Miền Trung)', eta: '1 - 2 ngày' },
  'hải phòng': { lat: 20.8449, lng: 106.6881, hub: 'Tổng Kho Ngô Quyền - Lê Chân (GHTK)', eta: '2 ngày' },
  'cần thơ': { lat: 10.0452, lng: 105.7469, hub: 'Trung Tâm Khai Thác Cần Thơ (GHN Hub Tây Nam Bộ)', eta: '2 ngày' },
  'bình dương': { lat: 10.9804, lng: 106.6519, hub: 'Hub Thuận An - Dĩ An (SPX Express)', eta: '1 - 2 ngày' },
  'đồng nai': { lat: 10.9574, lng: 106.8427, hub: 'Kho Phân Phối Biên Hòa (GHTK)', eta: '1 - 2 ngày' },
  'bà rịa - vũng tàu': { lat: 10.3460, lng: 107.0843, hub: 'Bưu Cục Vũng Tàu (Viettel Post)', eta: '2 ngày' },
  'vũng tàu': { lat: 10.3460, lng: 107.0843, hub: 'Bưu Cục Vũng Tàu (Viettel Post)', eta: '2 ngày' },
  'thừa thiên huế': { lat: 16.4637, lng: 107.5909, hub: 'Bưu Cục TP. Huế (GHTK)', eta: '2 - 3 ngày' },
  'huế': { lat: 16.4637, lng: 107.5909, hub: 'Bưu Cục TP. Huế (GHTK)', eta: '2 - 3 ngày' },
  'khánh hòa': { lat: 12.2388, lng: 109.1967, hub: 'Bưu Cục Nha Trang (SPX)', eta: '2 - 3 ngày' },
  'lâm đồng': { lat: 11.9404, lng: 108.4583, hub: 'Bưu Cục Đà Lạt (GHTK)', eta: '2 - 3 ngày' },
  'quảng ninh': { lat: 20.9505, lng: 107.0734, hub: 'Bưu Cục TP. Hạ Long (Viettel Post)', eta: '2 - 3 ngày' },
  'bắc ninh': { lat: 21.1861, lng: 106.0763, hub: 'Kho Khai Thác Bắc Ninh (GHTK)', eta: '1 - 2 ngày' },
  'nghệ an': { lat: 18.6734, lng: 105.6813, hub: 'Tổng Kho TP. Vinh (SPX)', eta: '2 - 3 ngày' },
  'thanh hóa': { lat: 19.8067, lng: 105.7852, hub: 'Bưu Cục TP. Thanh Hóa (GHN)', eta: '2 - 3 ngày' },
  'quảng nam': { lat: 15.5394, lng: 108.0191, hub: 'Bưu Cục Tam Kỳ (Viettel Post)', eta: '2 - 3 ngày' },
  'bình định': { lat: 13.7820, lng: 109.2197, hub: 'Bưu Cục Quy Nhơn (GHTK)', eta: '2 - 3 ngày' },
  'đắk lắk': { lat: 12.6667, lng: 108.0383, hub: 'Bưu Cục Buôn Ma Thuột (SPX)', eta: '2 - 3 ngày' },
  'gia lai': { lat: 13.9833, lng: 108.0000, hub: 'Bưu Cục Pleiku (GHTK)', eta: '2 - 3 ngày' },
  'kiên giang': { lat: 10.0125, lng: 105.0809, hub: 'Bưu Cục Rạch Giá - Phú Quốc (GHN)', eta: '2 - 3 ngày' },
  'an giang': { lat: 10.3833, lng: 105.4167, hub: 'Bưu Cục Long Xuyên (GHTK)', eta: '2 - 3 ngày' },
  'tiền giang': { lat: 10.3633, lng: 106.3633, hub: 'Bưu Cục Mỹ Tho (Viettel Post)', eta: '1 - 2 ngày' },
  'long an': { lat: 10.5333, lng: 106.4000, hub: 'Bưu Cục Tân An (SPX Express)', eta: '1 - 2 ngày' },
  'bến tre': { lat: 10.2333, lng: 106.3833, hub: 'Bưu Cục Bến Tre (GHN)', eta: '2 ngày' },
  'thái nguyên': { lat: 21.5942, lng: 105.8481, hub: 'Bưu Cục TP. Thái Nguyên (GHTK)', eta: '2 ngày' },
  'hải dương': { lat: 20.9374, lng: 106.3146, hub: 'Bưu Cục Hải Dương (SPX)', eta: '2 ngày' },
  'nam định': { lat: 20.4344, lng: 106.1683, hub: 'Bưu Cục Nam Định (Viettel Post)', eta: '2 ngày' },
  'vĩnh phúc': { lat: 21.3089, lng: 105.6049, hub: 'Bưu Cục Vĩnh Yên (GHTK)', eta: '2 ngày' },
  'bình thuận': { lat: 10.9333, lng: 108.1000, hub: 'Bưu Cục Phan Thiết (SPX)', eta: '2 ngày' },
};

function normalizeName(str: string) {
  if (!str) return '';
  return str.toLowerCase().replace(/^(tỉnh|thành phố|tp\.|tp)\s+/i, '').trim();
}

export interface AddressMapPreviewProps {
  province?: string;
  district?: string;
  ward?: string;
  address?: string;
  className?: string;
  minHeight?: string;
}

/**
 * Modern Interactive Address Map Preview Component
 * Polished, enlarged dimensions, dynamic zoom level and fullscreen view
 */
export default function AddressMapPreview({
  province = '',
  district = '',
  ward = '',
  address = '',
  className = '',
  minHeight = 'min-h-[440px]',
}: AddressMapPreviewProps) {
  const [zoomLevel, setZoomLevel] = useState(2); // 1: City, 2: District, 3: Street
  const [isFullscreen, setIsFullscreen] = useState(false);

  const fullAddressText = useMemo(() => {
    return [address, ward, district, province].filter(Boolean).join(', ');
  }, [address, ward, district, province]);

  const regionInfo = useMemo(() => {
    const rawKey = (province || '').trim().toLowerCase();
    const cleanKey = normalizeName(rawKey);

    // Direct match or partial search
    for (const [k, val] of Object.entries(REGION_COORDINATES_MAP)) {
      if (rawKey === k || cleanKey === normalizeName(k) || rawKey.includes(k) || k.includes(cleanKey)) {
        return val;
      }
    }

    return {
      lat: 10.8231,
      lng: 106.6297,
      hub: 'Bưu Cục Giao Sách HUKI Tiêu Chuẩn',
      eta: '2 - 3 ngày',
    };
  }, [province]);

  const delta = useMemo(() => {
    switch (zoomLevel) {
      case 3:
        return 0.012; // High detail (street level)
      case 1:
        return 0.08; // Wide view (province level)
      case 2:
      default:
        return 0.035; // Default district level
    }
  }, [zoomLevel]);

  const bbox = useMemo(() => {
    return `${regionInfo.lng - delta},${regionInfo.lat - delta},${regionInfo.lng + delta},${regionInfo.lat + delta}`;
  }, [regionInfo, delta]);

  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${regionInfo.lat},${regionInfo.lng}`;
  const googleMapsSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddressText || `${regionInfo.lat},${regionInfo.lng}`)}`;

  const containerContent = (
    <div className={`w-full ${minHeight} rounded-3xl border border-[var(--theme-border,#e8e5df)] bg-[var(--theme-surface,#ffffff)] overflow-hidden flex flex-col shadow-md relative group transition-all duration-300 ${className}`}>
      {/* Map Header Toolbar */}
      <div className="bg-[var(--theme-surface,#ffffff)] px-5 py-3.5 border-b border-[var(--theme-border,#e8e5df)] flex items-center justify-between z-10 gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shrink-0 shadow-xs shadow-emerald-500/50"></span>
          <div className="min-w-0">
            <span className="text-xs sm:text-sm font-black text-[var(--theme-text,#1c1b1f)] truncate block">
              Bản Đồ Định Vị Bưu Cục &amp; Điểm Giao Hàng Live
            </span>
            <span className="text-[11px] text-[var(--theme-text-muted,#49454f)] block truncate">
              {province ? `Khu vực: ${province}` : 'Tự động đồng bộ GPS theo địa chỉ'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Zoom Control Buttons */}
          <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 rounded-xl p-0.5 border border-[var(--theme-border,#e8e5df)]">
            <button
              type="button"
              title="Phóng to"
              onClick={() => setZoomLevel((z) => Math.min(3, z + 1))}
              disabled={zoomLevel >= 3}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold hover:bg-white dark:hover:bg-neutral-700 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
            </button>
            <div className="w-[1px] h-4 bg-neutral-300 dark:bg-neutral-700"></div>
            <button
              type="button"
              title="Thu nhỏ"
              onClick={() => setZoomLevel((z) => Math.max(1, z - 1))}
              disabled={zoomLevel <= 1}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold hover:bg-white dark:hover:bg-neutral-700 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">remove</span>
            </button>
          </div>

          {/* External Google Maps Button */}
          <a
            href={googleMapsSearchUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Mở trên Google Maps"
            className="w-8 h-8 rounded-xl bg-[var(--theme-primary,#003B2B)]/10 text-[var(--theme-primary,#003B2B)] hover:bg-[var(--theme-primary,#003B2B)] hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">open_in_new</span>
          </a>

          {/* Fullscreen Toggle Button */}
          <button
            type="button"
            title={isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}
            onClick={() => setIsFullscreen((f) => !f)}
            className="w-8 h-8 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-[var(--theme-text,#1c1b1f)] hover:bg-neutral-200 dark:hover:bg-neutral-700 flex items-center justify-center transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">
              {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
            </span>
          </button>
        </div>
      </div>

      {/* Map View Area */}
      <div className="relative flex-1 w-full min-h-[300px] sm:min-h-[360px] bg-[#e5e3df] dark:bg-neutral-900 overflow-hidden">
        <iframe
          title="Bản đồ giao nhận HUKI"
          width="100%"
          height="100%"
          scrolling="no"
          src={mapUrl}
          className="w-full h-full min-h-[300px] sm:min-h-[360px] pointer-events-auto opacity-95 transition-opacity"
        />

        {/* Center Custom Pulse Pin Marker */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative flex flex-col items-center -mt-10">
            {/* Radar Ripple Waves */}
            <span className="absolute -bottom-1 w-14 h-14 rounded-full bg-[var(--theme-primary,#003B2B)]/25 animate-ping duration-1000"></span>
            <span className="absolute -bottom-1 w-7 h-7 rounded-full bg-[var(--theme-primary,#003B2B)]/60"></span>

            {/* Floating Marker Badge */}
            <div className="px-3.5 py-1.5 rounded-2xl bg-[var(--theme-primary,#003B2B)] text-white text-xs font-bold shadow-2xl flex items-center gap-1.5 mb-1 animate-bounce duration-1000 border border-white/20">
              <span className="material-symbols-outlined text-[15px] text-amber-300">local_shipping</span>
              <span>Điểm nhận sách HUKI</span>
            </div>

            {/* Pin Icon */}
            <span className="material-symbols-outlined text-[42px] text-[var(--theme-primary,#003B2B)] drop-shadow-xl filter">
              location_on
            </span>
          </div>
        </div>

        {/* Floating Delivery Hub Badge on Map Top Left */}
        <div className="absolute top-3 left-3 right-3 sm:right-auto sm:max-w-md p-3.5 rounded-2xl bg-[var(--theme-surface,#ffffff)]/95 backdrop-blur-md border border-[var(--theme-border,#e8e5df)] shadow-xl flex items-center justify-between gap-3 text-xs z-10 transition-all">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-10 h-10 rounded-2xl bg-[var(--theme-primary,#003B2B)]/15 text-[var(--theme-primary,#003B2B)] flex items-center justify-center shrink-0 shadow-xs">
              <span className="material-symbols-outlined text-[22px]">warehouse</span>
            </span>
            <div className="min-w-0">
              <span className="font-bold text-xs sm:text-sm text-[var(--theme-text,#1c1b1f)] block truncate">
                {regionInfo.hub}
              </span>
              <span className="text-[11px] text-[var(--theme-text-muted,#49454f)] block truncate">
                Dự kiến bưu tá phát sách: <strong className="text-[var(--theme-primary,#003B2B)] font-bold">{regionInfo.eta}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Live Status Pill Top Right */}
        <div className="hidden sm:flex absolute top-3 right-3 px-3 py-1.5 rounded-full bg-emerald-950/80 backdrop-blur-md text-emerald-300 text-[11px] font-bold border border-emerald-500/30 shadow-md items-center gap-1.5 z-10">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Sẵn sàng kết nối Hub</span>
        </div>
      </div>

      {/* Map Footer: Live Address Summary */}
      <div className="p-4 bg-[var(--theme-background,#F2FBF9)]/95 border-t border-[var(--theme-border,#e8e5df)] text-xs">
        <div className="flex items-start gap-2.5 text-[var(--theme-text-muted,#49454f)]">
          <span className="material-symbols-outlined text-[20px] text-[var(--theme-primary,#003B2B)] shrink-0 mt-0.5">
            home_pin
          </span>
          <div className="min-w-0 flex-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--theme-text-muted,#49454f)] block mb-0.5">
              Địa chỉ đích nhận hàng:
            </span>
            <span className="text-xs sm:text-sm leading-relaxed break-words font-bold text-[var(--theme-text,#1c1b1f)] block">
              {fullAddressText || 'Vui lòng chọn Tỉnh/Thành và nhập số nhà tên đường để bản đồ định vị chính xác.'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-200">
        <div className="w-full max-w-5xl h-[85vh] relative flex flex-col">
          {containerContent}
        </div>
      </div>
    );
  }

  return containerContent;
}
