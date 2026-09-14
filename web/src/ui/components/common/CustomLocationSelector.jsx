import React, { useState, useEffect, useRef, useMemo } from 'react';
import { VIETNAM_LOCATIONS } from '../../data/vietnamLocations';

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
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase().trim();
    return options.filter((opt) => opt.name.toLowerCase().includes(q));
  }, [options, search]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
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

  const handleSelect = (option) => {
    onChange(option);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div className="relative w-full flex flex-col gap-1 text-left" ref={containerRef}>
      <label className="text-xs font-bold text-[var(--theme-text-muted,#49454f)] flex items-center gap-1">
        <span>{label}</span>
        {required && <span className="text-rose-500">*</span>}
      </label>

      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={`w-full min-h-[42px] px-3.5 py-2 rounded-xl border text-xs sm:text-sm flex items-center justify-between gap-2 transition-all select-none cursor-pointer ${
          disabled
            ? 'bg-neutral-100 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-400 cursor-not-allowed opacity-60'
            : isOpen
            ? 'bg-[var(--theme-surface,#ffffff)] border-[var(--theme-primary,#003B2B)] ring-2 ring-[var(--theme-primary,#003B2B)]/15 shadow-sm'
            : 'bg-[var(--theme-surface,#ffffff)] border-[var(--theme-border,#e8e5df)] hover:border-[var(--theme-primary,#003B2B)]/50'
        }`}
      >
        <span className={`truncate font-medium ${value ? 'text-[var(--theme-text,#1c1b1f)]' : 'text-[var(--theme-text-muted,#49454f)]/70'}`}>
          {value || placeholder}
        </span>
        <span
          className={`material-symbols-outlined text-[18px] text-[var(--theme-text-muted,#49454f)] shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[var(--theme-primary,#003B2B)]' : ''
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
        <div className="absolute top-[calc(100%+4px)] left-0 right-0 z-50 bg-[var(--theme-surface,#ffffff)] border border-[var(--theme-border,#e8e5df)] rounded-2xl shadow-xl p-2 animate-in fade-in zoom-in-95 duration-150 flex flex-col gap-1.5 min-w-[220px]">
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
          <div className="max-h-52 overflow-y-auto pr-1 space-y-0.5 scrollbar-thin">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-xs text-[var(--theme-text-muted,#49454f)]">
                Không tìm thấy kết quả phù hợp
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = value === opt.name;
                return (
                  <div
                    key={opt.code || opt.name}
                    onClick={() => handleSelect(opt)}
                    className={`px-3 py-2 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[var(--theme-primary,#003B2B)]/10 text-[var(--theme-primary,#003B2B)] font-bold'
                        : 'text-[var(--theme-text,#1c1b1f)] hover:bg-[var(--theme-background,#F2FBF9)]/80'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="truncate">{opt.name}</span>
                      {opt.isPopular && (
                        <span className="bg-[var(--theme-primary,#003B2B)]/15 text-[var(--theme-primary,#003B2B)] text-[9px] px-1.5 py-0.2 rounded font-bold shrink-0">
                          Phổ biến
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <span className="material-symbols-outlined text-[16px] text-[var(--theme-primary,#003B2B)] shrink-0">
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

/**
 * Custom Vietnam Location Cascader (Province -> District -> Ward)
 */
export default function CustomLocationSelector({
  province = '',
  district = '',
  ward = '',
  onChange,
  required = true,
}) {
  const currentProvinceObj = useMemo(() => {
    return VIETNAM_LOCATIONS.find((p) => p.name === province || p.code === province);
  }, [province]);

  const currentDistrictObj = useMemo(() => {
    if (!currentProvinceObj) return null;
    return currentProvinceObj.districts.find(
      (d) => d.name === district || d.code === district
    );
  }, [currentProvinceObj, district]);

  const districtOptions = useMemo(() => {
    return currentProvinceObj?.districts || [];
  }, [currentProvinceObj]);

  const wardOptions = useMemo(() => {
    return currentDistrictObj?.wards || [];
  }, [currentDistrictObj]);

  const handleProvinceChange = (opt) => {
    onChange({
      province: opt.name,
      provinceCode: opt.code,
      district: '',
      districtCode: '',
      ward: '',
      wardCode: '',
    });
  };

  const handleDistrictChange = (opt) => {
    onChange({
      province: province || currentProvinceObj?.name || '',
      district: opt.name,
      districtCode: opt.code,
      ward: '',
      wardCode: '',
    });
  };

  const handleWardChange = (opt) => {
    onChange({
      province: province || currentProvinceObj?.name || '',
      district: district || currentDistrictObj?.name || '',
      ward: opt.name,
      wardCode: opt.code,
    });
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
      {/* Tỉnh / Thành Phố */}
      <SearchableSelect
        label="Tỉnh / Thành phố"
        placeholder="Chọn Tỉnh / Thành phố"
        value={province}
        onChange={handleProvinceChange}
        options={VIETNAM_LOCATIONS}
        required={required}
      />

      {/* Quận / Huyện */}
      <SearchableSelect
        label="Quận / Huyện"
        placeholder="Chọn Quận / Huyện"
        value={district}
        onChange={handleDistrictChange}
        options={districtOptions}
        disabled={!province}
        disabledHint="Vui lòng chọn Tỉnh/Thành trước"
        required={required}
      />

      {/* Phường / Xã */}
      <div className="sm:col-span-2">
        <SearchableSelect
          label="Phường / Xã"
          placeholder="Chọn Phường / Xã"
          value={ward}
          onChange={handleWardChange}
          options={wardOptions}
          disabled={!district}
          disabledHint="Vui lòng chọn Quận/Huyện trước"
          required={required}
        />
      </div>
    </div>
  );
}
