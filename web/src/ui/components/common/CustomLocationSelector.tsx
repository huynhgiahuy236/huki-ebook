import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  VIETNAM_LOCATIONS,
  getProvinces,
  getWardsByProvince,
  findProvince,
  findWard,
  Province,
  Ward,
} from '../../data/vietnam-locations';

interface SearchableSelectOption {
  code?: string;
  name: string;
  isPopular?: boolean;
  region?: string;
  type?: string;
  slug?: string;
  legacyAliases?: string[];
}

interface SearchableSelectProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (opt: any) => void;
  options?: any[];
  disabled?: boolean;
  required?: boolean;
  disabledHint?: string;
}

/**
 * Custom Searchable Dropdown Field
 */
function SearchableSelect({
  label,
  placeholder,
  value,
  onChange,
  options = [],
  disabled = false,
  required = false,
  disabledHint = '',
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase().trim();
    return options.filter((opt: SearchableSelectOption) => {
      const matchName = opt.name?.toLowerCase().includes(q);
      const matchCode = opt.code?.toLowerCase().includes(q);
      const matchSlug = opt.slug?.toLowerCase().includes(q);
      const matchAliases = opt.legacyAliases && opt.legacyAliases.some((alias) => alias.toLowerCase().includes(q));
      return matchName || matchCode || matchSlug || matchAliases;
    });
  }, [options, search]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => {
    if (disabled) return;
    setIsOpen((prev) => {
      const next = !prev;
      if (next) {
        setTimeout(() => searchInputRef.current?.focus(), 50);
      } else {
        setSearch('');
      }
      return next;
    });
  };

  const handleSelect = (option: any) => {
    onChange(option);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div className="relative w-full flex flex-col gap-1 text-left" ref={containerRef}>
      <label className="text-[11px] font-semibold text-[var(--theme-text-muted,#49454f)] flex items-center gap-1">
        <span>{label}</span>
        {required && <span className="text-rose-500">*</span>}
      </label>

      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={`w-full min-h-[36px] px-3 py-2 rounded-xl border text-xs flex items-center justify-between gap-1.5 transition-all select-none cursor-pointer ${
          disabled
            ? 'bg-neutral-100 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-400 cursor-not-allowed opacity-60'
            : isOpen
            ? 'bg-[var(--theme-surface,#ffffff)] border-[#00875A] ring-2 ring-[#00875A]/15 shadow-2xs'
            : 'bg-[var(--theme-surface,#ffffff)] border-[var(--theme-border,#e8e5df)] hover:border-[#00875A]/50'
        }`}
      >
        <span className={`truncate font-medium ${value ? 'text-[var(--theme-text,#1c1b1f)]' : 'text-[var(--theme-text-muted,#49454f)]/70'}`}>
          {value || placeholder}
        </span>
        <span
          className={`material-symbols-outlined text-[18px] text-[var(--theme-text-muted,#49454f)] shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[#00875A]' : ''
          }`}
        >
          expand_more
        </span>
      </button>

      {disabled && disabledHint && (
        <span className="text-[10px] text-[var(--theme-text-muted,#49454f)]/70 italic mt-0.5">
          {disabledHint}
        </span>
      )}

      {/* Floating Options Popup */}
      {isOpen && (
        <div className="absolute top-[calc(100%+4px)] left-0 right-0 z-50 bg-[var(--theme-surface,#ffffff)] border border-[var(--theme-border,#e8e5df)] rounded-2xl shadow-xl p-2 animate-in fade-in zoom-in-95 duration-150 flex flex-col gap-1.5 min-w-[240px]">
          {/* Search Box */}
          <div className="relative flex items-center px-2 py-1 bg-[var(--theme-background,#F2FBF9)]/60 rounded-xl border border-[var(--theme-border,#e8e5df)]/60">
            <span className="material-symbols-outlined text-[16px] text-[var(--theme-text-muted,#49454f)] mr-1.5 shrink-0">
              search
            </span>
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Gõ để tìm nhanh..."
              className="w-full bg-transparent text-xs py-1 text-[var(--theme-text,#1c1b1f)] placeholder:text-[var(--theme-text-muted,#49454f)]/60 focus:outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="text-[var(--theme-text-muted,#49454f)] hover:text-[var(--theme-text,#1c1b1f)] text-xs p-0.5"
              >
                <span className="material-symbols-outlined text-[14px]">cancel</span>
              </button>
            )}
          </div>

          {/* Options List */}
          <div className="max-h-56 overflow-y-auto pr-1 space-y-0.5 scrollbar-thin">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-xs text-[var(--theme-text-muted,#49454f)]">
                Không tìm thấy kết quả phù hợp
              </div>
            ) : (
              filteredOptions.map((opt: any) => {
                const isSelected = value === opt.name || value === opt.code;
                return (
                  <div
                    key={opt.code || opt.name}
                    onClick={() => handleSelect(opt)}
                    className={`px-3 py-2 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-emerald-50 text-[#00875A] font-bold border border-emerald-200/50'
                        : 'text-[var(--theme-text,#1c1b1f)] hover:bg-[var(--theme-background,#F2FBF9)]/80'
                    }`}
                  >
                    <div className="flex flex-col gap-0.5 min-w-0 pr-2">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="truncate font-medium">{opt.name}</span>
                        {opt.isPopular && (
                          <span className="bg-emerald-100 text-[#00875A] text-[9px] px-1.5 py-0.2 rounded font-bold shrink-0">
                            Phổ biến
                          </span>
                        )}
                        {opt.type && opt.type !== 'ward' && (
                          <span className="text-[9px] text-gray-500 bg-gray-100 px-1.5 py-0.2 rounded shrink-0">
                            {opt.type === 'special_zone' ? 'Đặc khu' : opt.type === 'town' ? 'Thị trấn' : opt.type}
                          </span>
                        )}
                        {opt.region && (
                          <span className="text-[9px] text-[var(--theme-text-muted,#49454f)]/80 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.2 rounded shrink-0">
                            {opt.region === 'NORTH' ? 'Miền Bắc' : opt.region === 'CENTRAL' ? 'Miền Trung' : 'Miền Nam'}
                          </span>
                        )}
                      </div>
                      {opt.legacyAliases && opt.legacyAliases.length > 0 && (
                        <span className="text-[10px] text-[var(--theme-text-muted,#49454f)]/70 truncate">
                          Gồm: {opt.legacyAliases.join(', ')}
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <span className="material-symbols-outlined text-[16px] text-[#00875A] shrink-0">
                        check
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export interface LocationChangePayload {
  province: string;
  provinceCode?: string;
  ward: string;
  wardCode?: string;
  district?: string; // Backward compatibility for legacy DTOs
  districtCode?: string;
}

export interface CustomLocationSelectorProps {
  province?: string;
  provinceCode?: string;
  district?: string; // Legacy prop (ignored in new UI)
  districtCode?: string;
  ward?: string;
  wardCode?: string;
  onChange: (payload: LocationChangePayload) => void;
  required?: boolean;
}

/**
 * Standardized 2-Level Vietnam Location Cascader (34 Provinces -> 3,321 Wards/Communes/Special Zones)
 */
export default function CustomLocationSelector({
  province = '',
  provinceCode = '',
  ward = '',
  wardCode = '',
  onChange,
  required = true,
}: CustomLocationSelectorProps) {
  // Find currently selected province object
  const currentProvinceObj = useMemo(() => {
    if (provinceCode) {
      const byCode = VIETNAM_LOCATIONS.find((p) => p.code === provinceCode);
      if (byCode) return byCode;
    }
    if (province) {
      return findProvince(province);
    }
    return null;
  }, [province, provinceCode]);

  // Available ward options for the selected province
  const wardOptions = useMemo(() => {
    if (!currentProvinceObj) return [];
    return currentProvinceObj.wards || [];
  }, [currentProvinceObj]);

  // Handle Province selection
  const handleProvinceChange = (opt: Province) => {
    onChange({
      province: opt.name,
      provinceCode: opt.code,
      ward: '',
      wardCode: '',
      district: '', // Reset legacy district
      districtCode: '',
    });
  };

  // Handle Ward selection
  const handleWardChange = (opt: Ward) => {
    const selectedProvince = currentProvinceObj?.name || province;
    const selectedProvCode = currentProvinceObj?.code || provinceCode;
    onChange({
      province: selectedProvince,
      provinceCode: selectedProvCode,
      ward: opt.name,
      wardCode: opt.code,
      district: opt.name, // Fallback for backward compatibility with backend DTOs
      districtCode: opt.code,
    });
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full">
      {/* 1. Tỉnh / Thành Phố (34 Tỉnh/Thành) */}
      <SearchableSelect
        label="Tỉnh / Thành phố"
        placeholder="Chọn Tỉnh / Thành phố (34 tỉnh thành)"
        value={currentProvinceObj?.name || province}
        onChange={handleProvinceChange}
        options={VIETNAM_LOCATIONS}
        required={required}
      />

      {/* 2. Xã / Phường / Đặc Khu (Trực thuộc Tỉnh/Thành) */}
      <SearchableSelect
        label="Xã / Phường / Đặc khu"
        placeholder={currentProvinceObj ? 'Chọn Xã / Phường / Đặc khu' : 'Vui lòng chọn Tỉnh/Thành trước'}
        value={ward}
        onChange={handleWardChange}
        options={wardOptions}
        disabled={!currentProvinceObj && !province}
        disabledHint="Vui lòng chọn Tỉnh/Thành phố trước"
        required={required}
      />
    </div>
  );
}
