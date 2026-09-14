import React, { useMemo } from 'react';

// Coordinates mapping for major Vietnam regions
const REGION_COORDINATES = {
  'TP. Hồ Chí Minh': { lat: 10.8231, lng: 106.6297, hub: 'Kho Phân Loại Tân Bình (SPX/GHTK)', eta: '1 - 2 ngày' },
  'Hà Nội': { lat: 21.0285, lng: 105.8542, hub: 'Tổng Kho Đống Đa - Ba Đình (GHTK)', eta: '1 - 2 ngày' },
  'Đà Nẵng': { lat: 16.0544, lng: 108.2022, hub: 'Bưu Cục Trung Tâm Hải Châu (Viettel Post)', eta: '2 ngày' },
  'Hải Phòng': { lat: 20.8449, lng: 106.6881, hub: 'Bưu Cục Ngô Quyền (GHTK)', eta: '2 - 3 ngày' },
  'Cần Thơ': { lat: 10.0452, lng: 105.7469, hub: 'Trung Tâm Khai Thác Cần Thơ (GHN)', eta: '2 - 3 ngày' },
  'Bình Dương': { lat: 10.9804, lng: 106.6519, hub: 'Hub Thuận An - Dĩ An (SPX)', eta: '1 - 2 ngày' },
  'Đồng Nai': { lat: 10.9574, lng: 106.8427, hub: 'Kho Phân Phối Biên Hòa (GHTK)', eta: '1 - 2 ngày' },
  'Bà Rịa - Vũng Tàu': { lat: 10.3460, lng: 107.0843, hub: 'Bưu Cục Vũng Tàu (Viettel Post)', eta: '2 ngày' },
  'Thừa Thiên Huế': { lat: 16.4637, lng: 107.5909, hub: 'Bưu Cục TP. Huế (GHTK)', eta: '2 - 3 ngày' },
  'Khánh Hòa': { lat: 12.2388, lng: 109.1967, hub: 'Bưu Cục Nha Trang (SPX)', eta: '2 - 3 ngày' },
  'Lâm Đồng': { lat: 11.9404, lng: 108.4583, hub: 'Bưu Cục Đà Lạt (GHTK)', eta: '2 - 3 ngày' },
};

/**
 * Modern Interactive Address Map Preview Component
 */
export default function AddressMapPreview({
  province = '',
  district = '',
  ward = '',
  address = '',
}) {
  const fullAddressText = useMemo(() => {
    return [address, ward, district, province].filter(Boolean).join(', ');
  }, [address, ward, district, province]);

  const regionInfo = useMemo(() => {
    return (
      REGION_COORDINATES[province] || {
        lat: 10.8231,
        lng: 106.6297,
        hub: 'Bưu Cục Giao Sách HUKI Tiêu Chuẩn',
        eta: '2 - 3 ngày',
      }
    );
  }, [province]);

  const bbox = useMemo(() => {
    const d = 0.04;
    return `${regionInfo.lng - d},${regionInfo.lat - d},${regionInfo.lng + d},${regionInfo.lat + d}`;
  }, [regionInfo]);

  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${regionInfo.lat},${regionInfo.lng}`;

  return (
    <div className="w-full h-full min-h-[360px] rounded-3xl border border-[var(--theme-border,#e8e5df)] bg-[var(--theme-surface,#ffffff)] overflow-hidden flex flex-col shadow-sm relative group">
      {/* Map Header Toolbar */}
      <div className="bg-[var(--theme-surface,#ffffff)] px-4 py-3 border-b border-[var(--theme-border,#e8e5df)]/80 flex items-center justify-between z-10">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
          <span className="text-xs sm:text-sm font-bold text-[var(--theme-text,#1c1b1f)] truncate">
            Định Vị Điểm Giao Hàng Live
          </span>
        </div>
        <span className="text-[10px] bg-[var(--theme-primary,#003B2B)]/10 text-[var(--theme-primary,#003B2B)] px-2.5 py-0.5 rounded-full font-bold shrink-0">
          GPS Live 24/7
        </span>
      </div>

      {/* Map View Area */}
      <div className="relative flex-1 w-full min-h-[250px] bg-[#e5e3df] dark:bg-neutral-900 overflow-hidden">
        <iframe
          title="Bản đồ giao nhận HUKI"
          width="100%"
          height="100%"
          frameBorder="0"
          scrolling="no"
          marginHeight="0"
          marginWidth="0"
          src={mapUrl}
          className="w-full h-full min-h-[260px] pointer-events-auto opacity-95 transition-opacity"
        />

        {/* Center Custom Pulse Pin Marker */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative flex flex-col items-center -mt-8">
            {/* Radar Ripple */}
            <span className="absolute -bottom-1 w-10 h-10 rounded-full bg-[var(--theme-primary,#003B2B)]/30 animate-ping"></span>
            <span className="absolute -bottom-1 w-5 h-5 rounded-full bg-[var(--theme-primary,#003B2B)]/60"></span>

            {/* Floating Marker Badge */}
            <div className="px-3 py-1 rounded-xl bg-[var(--theme-primary,#003B2B)] text-white text-[11px] font-bold shadow-xl flex items-center gap-1.5 mb-1 animate-bounce duration-1000">
              <span className="material-symbols-outlined text-[14px]">local_shipping</span>
              <span>Điểm nhận sách</span>
            </div>

            {/* Pin Icon */}
            <span className="material-symbols-outlined text-[36px] text-[var(--theme-primary,#003B2B)] drop-shadow-lg">
              location_on
            </span>
          </div>
        </div>

        {/* Floating Delivery Hub Badge on Map */}
        <div className="absolute top-3 left-3 right-3 p-3 rounded-2xl bg-[var(--theme-surface,#ffffff)]/95 backdrop-blur-md border border-[var(--theme-border,#e8e5df)] shadow-lg flex items-center justify-between gap-2 text-xs z-10">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-8 h-8 rounded-xl bg-[var(--theme-primary,#003B2B)]/15 text-[var(--theme-primary,#003B2B)] flex items-center justify-center shrink-0 shadow-xs">
              <span className="material-symbols-outlined text-[18px]">warehouse</span>
            </span>
            <div className="min-w-0">
              <span className="font-bold text-xs text-[var(--theme-text,#1c1b1f)] block truncate">
                {regionInfo.hub}
              </span>
              <span className="text-[11px] text-[var(--theme-text-muted,#49454f)] block truncate">
                Thời gian bưu tá giao dự kiến: <strong className="text-[var(--theme-primary,#003B2B)]">{regionInfo.eta}</strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Map Footer: Live Address Summary */}
      <div className="p-3.5 bg-[var(--theme-background,#F2FBF9)]/90 border-t border-[var(--theme-border,#e8e5df)] text-xs">
        <div className="flex items-start gap-2 text-[var(--theme-text-muted,#49454f)]">
          <span className="material-symbols-outlined text-[18px] text-[var(--theme-primary,#003B2B)] shrink-0 mt-0.5">
            home_pin
          </span>
          <span className="text-xs leading-relaxed break-words font-medium text-[var(--theme-text,#1c1b1f)]">
            {fullAddressText || 'Vui lòng chọn Tỉnh/Thành và nhập địa chỉ để định vị'}
          </span>
        </div>
      </div>
    </div>
  );
}
