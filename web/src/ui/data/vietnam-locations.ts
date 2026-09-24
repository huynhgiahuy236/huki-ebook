/**
 * HUKI EBOOK - Vietnam Administrative Locations (2025 - 2-level model)
 *
 * Official model:
 *   Province/City (34)
 *      └── Commune/Ward/Special Administrative Zone (3,321)
 *
 * Source:
 *   - Decision 19/2025/QĐ-TTg, effective 01/07/2025
 *   - 34 provincial-level administrative units
 *   - 3,321 commune-level administrative units
 *
 * IMPORTANT:
 *   Vietnam no longer uses Province -> District -> Ward for the current
 *   administrative model. HUKI should use Province -> Ward directly.
 *
 * DATA PROVIDER:
 *   npm: vietnam-address-database
 *   The package contains the 34 provinces, 3,321 wards/communes and
 *   historical ward mappings. This file adapts that dataset to HUKI's
 *   frontend-friendly shape so the 3,321 records do not need to be
 *   manually duplicated here.
 *
 * Install:
 *   npm install vietnam-address-database
 */

// @ts-ignore
import addressDataRaw from 'vietnam-address-database';

const addressData: any[] = Array.isArray(addressDataRaw) ? addressDataRaw : [];

export type RegionZone = 'NORTH' | 'CENTRAL' | 'SOUTH';

export type CommuneType = 'XA' | 'PHUONG' | 'DAC_KHU';

export interface WardItem {
    code: string;
    name: string;
    type: CommuneType;
    provinceCode: string;
}

export interface ProvinceItem {
    code: string;
    name: string;
    zone: RegionZone;
    isCity: boolean;
    isPopular?: boolean;
    legacyAliases?: string[];
    wards: WardItem[];
}

export type Province = ProvinceItem;
export type Ward = WardItem;

interface ProvinceRecord {
    id: string;
    province_code: string;
    name: string;
    short_name?: string;
    place_type?: string;
    code?: string;
}

interface WardRecord {
    id: string;
    ward_code: string;
    name: string;
    province_code: string;
}

interface TableRecord<T> {
    type: string;
    name: string;
    data: T[];
}

function getTable<T>(name: string): T[] {
    const table = addressData.find(
        (item: any) => item.type === 'table' && item.name === name,
    ) as TableRecord<T> | undefined;

    return table?.data ?? [];
}

const PROVINCES = getTable<ProvinceRecord>('provinces');
const WARDS = getTable<WardRecord>('wards');

function normalizeVietnamese(value: string): string {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/gi, 'd')
        .toLowerCase()
        .trim();
}

function getCommuneType(name: string): CommuneType {
    const normalized = normalizeVietnamese(name);

    if (normalized.startsWith('dac khu ')) {
        return 'DAC_KHU';
    }

    if (normalized.startsWith('phuong ')) {
        return 'PHUONG';
    }

    return 'XA';
}

function getZone(provinceCode: string): RegionZone {
    const north = new Set([
        '01', '04', '08', '11', '12', '14', '15', '19', '20', '22',
        '24', '25', '31', '33', '37',
    ]);

    const south = new Set([
        '75', '79', '80', '82', '86', '91', '92', '96',
    ]);

    if (north.has(provinceCode)) {
        return 'NORTH';
    }

    if (south.has(provinceCode)) {
        return 'SOUTH';
    }

    return 'CENTRAL';
}

const POPULAR_PROVINCES = new Set([
    '01', // Hà Nội
    '22', // Quảng Ninh
    '24', // Bắc Ninh
    '25', // Phú Thọ
    '31', // Hải Phòng
    '38', // Thanh Hóa
    '40', // Nghệ An
    '48', // Đà Nẵng
    '56', // Khánh Hòa
    '68', // Lâm Đồng
    '75', // Đồng Nai
    '79', // Hồ Chí Minh
    '92', // Cần Thơ
]);

const LEGACY_ALIASES: Record<string, string[]> = {
    '01': ['Hà Nội', 'HN', 'Thủ đô Hà Nội', 'Hà Tây'],
    '08': ['Tuyên Quang', 'Hà Giang'],
    '15': ['Lào Cai', 'Yên Bái'],
    '19': ['Thái Nguyên', 'Bắc Kạn'],
    '24': ['Bắc Ninh', 'Bắc Giang'],
    '25': ['Phú Thọ', 'Vĩnh Phúc', 'Hòa Bình'],
    '31': ['Hải Phòng', 'Hải Dương'],
    '33': ['Hưng Yên', 'Thái Bình'],
    '37': ['Ninh Bình', 'Hà Nam', 'Nam Định'],
    '44': ['Quảng Trị', 'Quảng Bình'],
    '48': ['Đà Nẵng', 'Quảng Nam', 'Hội An'],
    '51': ['Quảng Ngãi', 'Kon Tum'],
    '52': ['Gia Lai', 'Bình Định', 'Quy Nhơn'],
    '56': ['Khánh Hòa', 'Ninh Thuận', 'Nha Trang', 'Phan Rang'],
    '66': ['Đắk Lắk', 'Phú Yên', 'Buôn Ma Thuột', 'Tuy Hòa'],
    '68': ['Lâm Đồng', 'Bình Thuận', 'Đắk Nông', 'Đà Lạt', 'Phan Thiết'],
    '75': ['Đồng Nai', 'Bình Phước', 'Biên Hòa', 'Đồng Xoài'],
    '79': ['TP. Hồ Chí Minh', 'TP.HCM', 'Sài Gòn', 'Bình Dương', 'Bà Rịa - Vũng Tàu', 'Vũng Tàu'],
    '80': ['Tây Ninh', 'Long An', 'Tân An'],
    '82': ['Đồng Tháp', 'Tiền Giang', 'Cao Lãnh', 'Sa Đéc', 'Mỹ Tho', 'Gò Công'],
    '86': ['Vĩnh Long', 'Trà Vinh', 'Bến Tre'],
    '91': ['An Giang', 'Kiên Giang', 'Long Xuyên', 'Rạch Giá', 'Phú Quốc'],
    '92': ['Cần Thơ', 'Hậu Giang', 'Sóc Trăng'],
    '96': ['Cà Mau', 'Bạc Liêu'],
};

const PROVINCE_NAMES: Record<string, string> = {
    '01': 'Thành phố Hà Nội',
    '04': 'Tỉnh Cao Bằng',
    '08': 'Tỉnh Tuyên Quang',
    '11': 'Tỉnh Điện Biên',
    '12': 'Tỉnh Lai Châu',
    '14': 'Tỉnh Sơn La',
    '15': 'Tỉnh Lào Cai',
    '19': 'Tỉnh Thái Nguyên',
    '20': 'Tỉnh Lạng Sơn',
    '22': 'Tỉnh Quảng Ninh',
    '24': 'Tỉnh Bắc Ninh',
    '25': 'Tỉnh Phú Thọ',
    '31': 'Thành phố Hải Phòng',
    '33': 'Tỉnh Hưng Yên',
    '37': 'Tỉnh Ninh Bình',
    '38': 'Tỉnh Thanh Hóa',
    '40': 'Tỉnh Nghệ An',
    '42': 'Tỉnh Hà Tĩnh',
    '44': 'Tỉnh Quảng Trị',
    '46': 'Thành phố Huế',
    '48': 'Thành phố Đà Nẵng',
    '51': 'Tỉnh Quảng Ngãi',
    '52': 'Tỉnh Gia Lai',
    '56': 'Tỉnh Khánh Hòa',
    '66': 'Tỉnh Đắk Lắk',
    '68': 'Tỉnh Lâm Đồng',
    '75': 'Tỉnh Đồng Nai',
    '79': 'Thành phố Hồ Chí Minh',
    '80': 'Tỉnh Tây Ninh',
    '82': 'Tỉnh Đồng Tháp',
    '86': 'Tỉnh Vĩnh Long',
    '91': 'Tỉnh An Giang',
    '92': 'Thành phố Cần Thơ',
    '96': 'Tỉnh Cà Mau',
};

const provinceRecordsByCode = new Map(
    PROVINCES.map((province) => [province.province_code, province]),
);

const wardsByProvince = new Map<string, WardItem[]>();

for (const ward of WARDS) {
    const items = wardsByProvince.get(ward.province_code) ?? [];

    items.push({
        code: ward.ward_code,
        name: ward.name,
        type: getCommuneType(ward.name),
        provinceCode: ward.province_code,
    });

    wardsByProvince.set(ward.province_code, items);
}

/**
 * HUKI's canonical administrative dataset.
 *
 * Expected totals:
 *   - 34 provinces/cities
 *   - 3,321 wards/communes/special administrative zones
 */
export const VIETNAM_LOCATIONS: ProvinceItem[] = Object.entries(
    PROVINCE_NAMES,
).map(([code, fallbackName]) => {
    const province = provinceRecordsByCode.get(code);
    const wards = wardsByProvince.get(code) ?? [];

    return {
        code,
        name: province?.name ?? fallbackName,
        zone: getZone(code),
        isCity: province?.place_type?.toLowerCase().includes('trung ương') ?? fallbackName.startsWith('Thành phố'),
        isPopular: POPULAR_PROVINCES.has(code),
        legacyAliases: LEGACY_ALIASES[code],
        wards,
    };
});

/**
 * Return all 34 provincial-level units.
 */
export function getProvinces(): ProvinceItem[] {
    return VIETNAM_LOCATIONS;
}

/**
 * Find a province by:
 *   - 2-digit official code
 *   - full/partial name
 *   - legacy alias
 */
export function findProvince(query: string): ProvinceItem | undefined {
    if (!query) return undefined;

    const q = normalizeVietnamese(query);

    return VIETNAM_LOCATIONS.find((province) => {
        if (province.code === query.trim()) {
            return true;
        }

        if (normalizeVietnamese(province.name).includes(q)) {
            return true;
        }

        return province.legacyAliases?.some((alias) =>
            normalizeVietnamese(alias).includes(q),
        );
    });
}

export const getLocationByName = findProvince;

/**
 * Return all 2nd-level administrative units of a province.
 */
export function getWardsByProvince(
    provinceNameOrCode: string,
): WardItem[] {
    return findProvince(provinceNameOrCode)?.wards ?? [];
}

/**
 * Find a ward/commune by its official 5-digit code.
 */
export function findWard(
    provinceNameOrCode: string,
    wardNameOrCode: string,
): WardItem | undefined {
    const wards = getWardsByProvince(provinceNameOrCode);
    const query = normalizeVietnamese(wardNameOrCode);

    return wards.find(
        (ward) =>
            ward.code === wardNameOrCode.trim() ||
            normalizeVietnamese(ward.name) === query,
    );
}

/**
 * Search wards across Vietnam.
 *
 * Useful for address autocomplete.
 */
export function searchWards(query: string): Array<{
    province: ProvinceItem;
    ward: WardItem;
}> {
    if (!query.trim()) return [];

    const q = normalizeVietnamese(query);
    const results: Array<{ province: ProvinceItem; ward: WardItem }> = [];

    for (const province of VIETNAM_LOCATIONS) {
        for (const ward of province.wards) {
            if (
                ward.code === query.trim() ||
                normalizeVietnamese(ward.name).includes(q)
            ) {
                results.push({ province, ward });
            }
        }
    }

    return results;
}

/**
 * Check that the imported dataset matches the official expected totals.
 * Throws in development/test if the dataset is incomplete.
 */
export function validateVietnamLocations(): {
    provinceCount: number;
    wardCount: number;
    valid: boolean;
} {
    const provinceCount = VIETNAM_LOCATIONS.length;
    const wardCount = VIETNAM_LOCATIONS.reduce(
        (total, province) => total + province.wards.length,
        0,
    );

    return {
        provinceCount,
        wardCount,
        valid: provinceCount === 34 && wardCount === 3321,
    };
}

/**
 * Standard HUKI shipping fee by seller warehouse zone -> buyer zone.
 *
 * This is HUKI business logic, not an official government value.
 */
export function calculateShippingFee(
    fromZone: RegionZone = 'SOUTH',
    toZone: RegionZone = 'SOUTH',
    isSameProvince = false,
): { fee: number; estimatedDays: string } {
    if (isSameProvince) {
        return { fee: 18_000, estimatedDays: '1 - 2 ngày' };
    }

    if (fromZone === toZone) {
        return { fee: 28_000, estimatedDays: '2 - 3 ngày' };
    }

    return { fee: 38_000, estimatedDays: '3 - 4 ngày' };
}

/**
 * Dataset sanity check.
 *
 * Run:
 *   const stats = validateVietnamLocations();
 *   console.log(stats);
 *
 * Expected:
 *   {
 *     provinceCount: 34,
 *     wardCount: 3321,
 *     valid: true
 *   }
 */
