"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import 'leaflet/dist/leaflet.css';

// Canonical Province / City Coordinates and Logistics Hubs for all 63 Vietnam Provinces
const PROVINCES_MAP: Record<string, { lat: number; lng: number; hub: string; eta: string; aliases: string[] }> = {
  // --- Miền Nam ---
  'đồng tháp': {
    lat: 10.4578,
    lng: 105.6324,
    hub: 'Bưu Cục Cao Lãnh - Sa Đéc (GHTK Hub Đồng Tháp)',
    eta: '1 - 2 ngày',
    aliases: ['dong thap', 'tinh dong thap', 'cao lanh', 'sa dec', 'hong ngu', 'thap muoi', 'lai vung', 'lap vo'],
  },
  'tiền giang': {
    lat: 10.3544,
    lng: 106.3639,
    hub: 'Bưu Cục Mỹ Tho (Viettel Post Hub Tiền Giang)',
    eta: '1 - 2 ngày',
    aliases: ['tien giang', 'tinh tien giang', 'my tho', 'cai lay', 'go cong', 'cho gao', 'cai be'],
  },
  'hồ chí minh': {
    lat: 10.8231,
    lng: 106.6297,
    hub: 'Tổng Kho Phân Loại Tân Bình (SPX/GHTK Hub Miền Nam)',
    eta: '1 - 2 ngày',
    aliases: ['ho chi minh', 'tp ho chi minh', 'thanh pho ho chi minh', 'sai gon', 'tp hcm', 'tphcm', 'thu duc', 'quan 1', 'go vap', 'tan binh', 'binh thanh', 'quan 7'],
  },
  'bình dương': {
    lat: 10.9804,
    lng: 106.6519,
    hub: 'Hub Thuận An - Dĩ An (SPX Express Bình Dương)',
    eta: '1 - 2 ngày',
    aliases: ['binh duong', 'tinh binh duong', 'thu dau mot', 'di an', 'thuan an', 'ben cat', 'tan uyen'],
  },
  'đồng nai': {
    lat: 10.9574,
    lng: 106.8427,
    hub: 'Kho Phân Phối Biên Hòa (GHTK Đồng Nai)',
    eta: '1 - 2 ngày',
    aliases: ['dong nai', 'tinh dong nai', 'bien hoa', 'long thanh', 'nhon trach', 'trang bom', 'long khanh'],
  },
  'bà rịa - vũng tàu': {
    lat: 10.3460,
    lng: 107.0843,
    hub: 'Bưu Cục Vũng Tàu (Viettel Post Hub)',
    eta: '1 - 2 ngày',
    aliases: ['ba ria vung tau', 'vung tau', 'ba ria', 'phu my', 'con dao', 'long dien'],
  },
  'bình phước': {
    lat: 11.5333,
    lng: 106.8833,
    hub: 'Bưu Cục Đồng Xoài (Viettel Post Bình Phước)',
    eta: '2 ngày',
    aliases: ['binh phuoc', 'tinh binh phuoc', 'dong xoai', 'phuoc long', 'binh long', 'chon thanh'],
  },
  'tây ninh': {
    lat: 11.3103,
    lng: 106.0983,
    hub: 'Bưu Cục TP. Tây Ninh (Viettel Post)',
    eta: '1 - 2 ngày',
    aliases: ['tay ninh', 'tinh tay ninh', 'trang bang', 'hoa thanh'],
  },
  'long an': {
    lat: 10.5333,
    lng: 106.4000,
    hub: 'Bưu Cục Tân An (SPX Express Long An)',
    eta: '1 - 2 ngày',
    aliases: ['long an', 'tinh long an', 'tan an', 'ben luc', 'duc hoa', 'can giuoc'],
  },
  'bến tre': {
    lat: 10.2415,
    lng: 106.3759,
    hub: 'Bưu Cục TP. Bến Tre (GHN Hub Bến Tre)',
    eta: '1 - 2 ngày',
    aliases: ['ben tre', 'tinh ben tre', 'mo cay', 'ba tri', 'chau thanh ben tre'],
  },
  'vĩnh long': {
    lat: 10.2537,
    lng: 105.9722,
    hub: 'Bưu Cục TP. Vĩnh Long (GHN Vĩnh Long)',
    eta: '1 - 2 ngày',
    aliases: ['vinh long', 'tinh vinh long', 'binh minh', 'long ho', 'mang thit'],
  },
  'trà vinh': {
    lat: 9.9347,
    lng: 106.3456,
    hub: 'Bưu Cục TP. Trà Vinh (SPX Express)',
    eta: '2 ngày',
    aliases: ['tra vinh', 'tinh tra vinh', 'duyen hai', 'tieu can', 'cau ke'],
  },
  'cần thơ': {
    lat: 10.0452,
    lng: 105.7469,
    hub: 'Trung Tâm Khai Thác Cần Thơ (GHN Hub Tây Nam Bộ)',
    eta: '1 - 2 ngày',
    aliases: ['can tho', 'tp can tho', 'thanh pho can tho', 'ninh kieu', 'cai rang', 'binh thuy', 'o mon', 'thot not'],
  },
  'hậu giang': {
    lat: 9.7844,
    lng: 105.4700,
    hub: 'Bưu Cục Vị Thanh (GHTK Hậu Giang)',
    eta: '2 ngày',
    aliases: ['hau giang', 'tinh hau giang', 'vi thanh', 'nga bay', 'long my'],
  },
  'sóc trăng': {
    lat: 9.6033,
    lng: 105.9800,
    hub: 'Bưu Cục TP. Sóc Trăng (GHN Hub Sóc Trăng)',
    eta: '2 ngày',
    aliases: ['soc trang', 'tinh soc trang', 'vinh chau', 'nga nam'],
  },
  'bạc liêu': {
    lat: 9.2941,
    lng: 105.7278,
    hub: 'Bưu Cục TP. Bạc Liêu (SPX Express)',
    eta: '2 ngày',
    aliases: ['bac lieu', 'tinh bac lieu', 'gia rai', 'hong dan'],
  },
  'cà mau': {
    lat: 9.1769,
    lng: 105.1524,
    hub: 'Bưu Cục TP. Cà Mau (GHTK Hub Đất Mũi)',
    eta: '2 - 3 ngày',
    aliases: ['ca mau', 'tinh ca mau', 'nam can', 'u minh', 'dat mui', 'tran van thoi'],
  },
  'an giang': {
    lat: 10.3833,
    lng: 105.4167,
    hub: 'Bưu Cục Long Xuyên (GHTK Hub An Giang)',
    eta: '1 - 2 ngày',
    aliases: ['an giang', 'tinh an giang', 'long xuyen', 'chau doc', 'tan chau', 'tri ton', 'tinh bien'],
  },
  'kiên giang': {
    lat: 10.0125,
    lng: 105.0809,
    hub: 'Bưu Cục Rạch Giá - Phú Quốc (GHN Kiên Giang)',
    eta: '2 ngày',
    aliases: ['kien giang', 'tinh kien giang', 'rach gia', 'phu quoc', 'ha tien', 'kien luong'],
  },

  // --- Miền Trung & Tây Nguyên ---
  'đà nẵng': {
    lat: 16.0544,
    lng: 108.2022,
    hub: 'Bưu Cục Trung Tâm Hải Châu (Viettel Post Miền Trung)',
    eta: '1 - 2 ngày',
    aliases: ['da nang', 'tp da nang', 'thanh pho da nang', 'hai chau', 'thanh khe', 'son tra', 'ngu hanh son', 'lien chieu', 'cam le'],
  },
  'thừa thiên huế': {
    lat: 16.4637,
    lng: 107.5909,
    hub: 'Bưu Cục TP. Huế (GHTK Thừa Thiên Huế)',
    eta: '2 ngày',
    aliases: ['thua thien hue', 'hue', 'tp hue', 'huong thuy', 'huong tra', 'phong dien'],
  },
  'quảng nam': {
    lat: 15.5394,
    lng: 108.0191,
    hub: 'Bưu Cục Tam Kỳ - Hội An (Viettel Post)',
    eta: '2 ngày',
    aliases: ['quang nam', 'tinh quang nam', 'tam ky', 'hoi an', 'dien ban', 'nui thanh'],
  },
  'quảng ngãi': {
    lat: 15.1205,
    lng: 108.7923,
    hub: 'Bưu Cục TP. Quảng Ngãi (SPX Quảng Ngãi)',
    eta: '2 ngày',
    aliases: ['quang ngai', 'tinh quang ngai', 'duc pho', 'binh son', 'ly son'],
  },
  'bình định': {
    lat: 13.7820,
    lng: 109.2197,
    hub: 'Bưu Cục Quy Nhơn (GHTK Hub Bình Định)',
    eta: '2 ngày',
    aliases: ['binh dinh', 'tinh binh dinh', 'quy nhon', 'an nhon', 'hoai nhon'],
  },
  'phú yên': {
    lat: 13.0882,
    lng: 109.3076,
    hub: 'Bưu Cục TP. Tuy Hòa (SPX Phú Yên)',
    eta: '2 ngày',
    aliases: ['phu yen', 'tinh phu yen', 'tuy hoa', 'song cau', 'dong hoa'],
  },
  'khánh hòa': {
    lat: 12.2388,
    lng: 109.1967,
    hub: 'Bưu Cục Nha Trang (SPX Express Khánh Hòa)',
    eta: '2 ngày',
    aliases: ['khanh hoa', 'tinh khanh hoa', 'nha trang', 'cam ranh', 'ninh hoa', 'van ninh'],
  },
  'ninh thuận': {
    lat: 11.5653,
    lng: 108.9882,
    hub: 'Bưu Cục Phan Rang - Tháp Chàm (GHN)',
    eta: '2 ngày',
    aliases: ['ninh thuan', 'tinh ninh thuan', 'phan rang', 'thap cham', 'ninh hai'],
  },
  'bình thuận': {
    lat: 10.9333,
    lng: 108.1000,
    hub: 'Bưu Cục Phan Thiết (SPX Bình Thuận)',
    eta: '2 ngày',
    aliases: ['binh thuan', 'tinh binh thuan', 'phan thiet', 'la gi', 'ham thuan', 'mui ne'],
  },
  'kon tum': {
    lat: 14.3500,
    lng: 108.0000,
    hub: 'Bưu Cục TP. Kon Tum (GHTK)',
    eta: '2 - 3 ngày',
    aliases: ['kon tum', 'tinh kon tum', 'mang den', 'ngoc hoi'],
  },
  'gia lai': {
    lat: 13.9833,
    lng: 108.0000,
    hub: 'Bưu Cục Pleiku (GHTK Gia Lai)',
    eta: '2 - 3 ngày',
    aliases: ['gia lai', 'tinh gia lai', 'pleiku', 'an khe', 'ayun pa'],
  },
  'đắk lắk': {
    lat: 12.6667,
    lng: 108.0383,
    hub: 'Bưu Cục Buôn Ma Thuột (SPX Hub Tây Nguyên)',
    eta: '2 - 3 ngày',
    aliases: ['dak lak', 'dac lac', 'tinh dak lak', 'buon ma thuot', 'bmt', 'buon ho'],
  },
  'đắk nông': {
    lat: 12.0000,
    lng: 107.6833,
    hub: 'Bưu Cục Gia Nghĩa (GHTK Đắk Nông)',
    eta: '2 - 3 ngày',
    aliases: ['dak nong', 'dac nong', 'tinh dak nong', 'gia nghia', 'cu jut'],
  },
  'lâm đồng': {
    lat: 11.9404,
    lng: 108.4583,
    hub: 'Bưu Cục Đà Lạt - Bảo Lộc (GHTK Lâm Đồng)',
    eta: '2 ngày',
    aliases: ['lam dong', 'tinh lam dong', 'da lat', 'bao loc', 'duc trong', 'don duong'],
  },
  'quảng trị': {
    lat: 16.8167,
    lng: 107.1000,
    hub: 'Bưu Cục Đông Hà (GHTK Quảng Trị)',
    eta: '2 - 3 ngày',
    aliases: ['quang tri', 'tinh quang tri', 'dong ha', 'thi xa quang tri'],
  },
  'quảng bình': {
    lat: 17.4687,
    lng: 106.6225,
    hub: 'Bưu Cục Đồng Hới (Viettel Post Quảng Bình)',
    eta: '2 - 3 ngày',
    aliases: ['quang binh', 'tinh quang binh', 'dong hoi', 'ba don', 'bo trach'],
  },
  'hà tĩnh': {
    lat: 18.3430,
    lng: 105.9058,
    hub: 'Bưu Cục TP. Hà Tĩnh (SPX Express)',
    eta: '2 - 3 ngày',
    aliases: ['ha tinh', 'tinh ha tinh', 'hong linh', 'ky anh'],
  },
  'nghệ an': {
    lat: 18.6734,
    lng: 105.6813,
    hub: 'Tổng Kho TP. Vinh (SPX Nghệ An)',
    eta: '2 ngày',
    aliases: ['nghe an', 'tinh nghe an', 'vinh', 'cua lo', 'thai hoa', 'hoang mai', 'dien chau'],
  },
  'thanh hóa': {
    lat: 19.8067,
    lng: 105.7852,
    hub: 'Bưu Cục TP. Thanh Hóa (GHN Thanh Hóa)',
    eta: '2 ngày',
    aliases: ['thanh hoa', 'tinh thanh hoa', 'sam son', 'bim son', 'nghi son'],
  },

  // --- Miền Bắc ---
  'hà nội': {
    lat: 21.0285,
    lng: 105.8542,
    hub: 'Tổng Kho Đống Đa - Ba Đình (GHTK Hub Miền Bắc)',
    eta: '1 - 2 ngày',
    aliases: ['ha noi', 'thanh pho ha noi', 'tp ha noi', 'hoan kiem', 'ba dinh', 'dong da', 'hai ba trung', 'cau giay', 'thanh xuan', 'hoang mai', 'ha dong'],
  },
  'hải phòng': {
    lat: 20.8449,
    lng: 106.6881,
    hub: 'Tổng Kho Ngô Quyền - Lê Chân (GHTK Hải Phòng)',
    eta: '1 - 2 ngày',
    aliases: ['hai phong', 'tp hai phong', 'thanh pho hai phong', 'hong bang', 'ngo quyen', 'le chan', 'hai an', 'kien an', 'thuy nguyen', 'do son'],
  },
  'quảng ninh': {
    lat: 20.9505,
    lng: 107.0734,
    hub: 'Bưu Cục TP. Hạ Long (Viettel Post Quảng Ninh)',
    eta: '2 ngày',
    aliases: ['quang ninh', 'tinh quang ninh', 'ha long', 'cam pha', 'mong cai', 'uong bi', 'dong trieu', 'quang yen'],
  },
  'bắc ninh': {
    lat: 21.1861,
    lng: 106.0763,
    hub: 'Kho Khai Thác Bắc Ninh (GHTK Hub Bắc Ninh)',
    eta: '1 - 2 ngày',
    aliases: ['bac ninh', 'tinh bac ninh', 'tu son', 'que vo', 'yen phong'],
  },
  'bắc giang': {
    lat: 21.2731,
    lng: 106.1946,
    hub: 'Hub Phân Loại Bắc Giang (GHTK)',
    eta: '2 ngày',
    aliases: ['bac giang', 'tinh bac giang', 'viet yen', 'hiep hoa', 'lang giang'],
  },
  'hải dương': {
    lat: 20.9374,
    lng: 106.3146,
    hub: 'Bưu Cục Hải Dương (SPX Hải Dương)',
    eta: '2 ngày',
    aliases: ['hai duong', 'tinh hai duong', 'chi linh', 'kinh mon'],
  },
  'hưng yên': {
    lat: 20.6464,
    lng: 106.0511,
    hub: 'Bưu Cục TP. Hưng Yên (Viettel Post)',
    eta: '2 ngày',
    aliases: ['hung yen', 'tinh hung yen', 'my hao', 'van giang', 'yen my'],
  },
  'thái bình': {
    lat: 20.4464,
    lng: 106.3364,
    hub: 'Bưu Cục TP. Thái Bình (GHTK)',
    eta: '2 ngày',
    aliases: ['thai binh', 'tinh thai binh', 'dong hung', 'tien hai', 'kien xuong'],
  },
  'hà nam': {
    lat: 20.5411,
    lng: 105.9139,
    hub: 'Bưu Cục Phủ Lý (Viettel Post Hà Nam)',
    eta: '2 ngày',
    aliases: ['ha nam', 'tinh ha nam', 'phu ly', 'duy tien', 'kim bang'],
  },
  'nam định': {
    lat: 20.4344,
    lng: 106.1683,
    hub: 'Bưu Cục Nam Định (Viettel Post Nam Định)',
    eta: '2 ngày',
    aliases: ['nam dinh', 'tinh nam dinh', 'hai hau', 'giao thuy', 'xuan truong'],
  },
  'ninh bình': {
    lat: 20.2506,
    lng: 105.9745,
    hub: 'Bưu Cục TP. Ninh Bình (GHTK)',
    eta: '2 ngày',
    aliases: ['ninh binh', 'tinh ninh binh', 'tam diep', 'hoa lu', 'gia vien'],
  },
  'thái nguyên': {
    lat: 21.5942,
    lng: 105.8481,
    hub: 'Bưu Cục TP. Thái Nguyên (GHTK Thái Nguyên)',
    eta: '2 ngày',
    aliases: ['thai nguyen', 'tinh thai nguyen', 'song cong', 'pho yen'],
  },
  'vĩnh phúc': {
    lat: 21.3089,
    lng: 105.6049,
    hub: 'Bưu Cục Vĩnh Yên (GHTK Vĩnh Phúc)',
    eta: '2 ngày',
    aliases: ['vinh phuc', 'tinh vinh phuc', 'vinh yen', 'phuc yen', 'binh xuyen'],
  },
  'phú thọ': {
    lat: 21.3228,
    lng: 105.4019,
    hub: 'Bưu Cục Việt Trì (GHTK Phú Thọ)',
    eta: '2 ngày',
    aliases: ['phu tho', 'tinh phu tho', 'viet tri', 'phu tho', 'lam thao'],
  },
  'tuyên quang': {
    lat: 21.8233,
    lng: 105.2144,
    hub: 'Bưu Cục TP. Tuyên Quang (VNPost)',
    eta: '2 - 3 ngày',
    aliases: ['tuyen quang', 'tinh tuyen quang', 'son duong'],
  },
  'hà giang': {
    lat: 22.8233,
    lng: 104.9839,
    hub: 'Bưu Cục TP. Hà Giang (VNPost)',
    eta: '2 - 3 ngày',
    aliases: ['ha giang', 'tinh ha giang', 'dong van', 'meo vac'],
  },
  'cao bằng': {
    lat: 22.6667,
    lng: 106.2500,
    hub: 'Bưu Cục TP. Cao Bằng (VNPost)',
    eta: '3 ngày',
    aliases: ['cao bang', 'tinh cao bang', 'trung khanh', 'bao lac'],
  },
  'bắc kạn': {
    lat: 22.1470,
    lng: 105.8348,
    hub: 'Bưu Cục TP. Bắc Kạn (VNPost)',
    eta: '2 - 3 ngày',
    aliases: ['bac kan', 'bac can', 'tinh bac kan', 'ba be', 'cho don'],
  },
  'lạng sơn': {
    lat: 21.8536,
    lng: 106.7617,
    hub: 'Bưu Cục TP. Lạng Sơn (Viettel Post)',
    eta: '2 - 3 ngày',
    aliases: ['lang son', 'tinh lang son', 'dong dang', 'huu lung'],
  },
  'lào cai': {
    lat: 22.4856,
    lng: 103.9707,
    hub: 'Bưu Cục TP. Lào Cai (SPX Lào Cai)',
    eta: '2 - 3 ngày',
    aliases: ['lao cai', 'tinh lao cai', 'sa pa', 'sapa', 'bat xat', 'bac ha'],
  },
  'yên bái': {
    lat: 21.7167,
    lng: 104.9000,
    hub: 'Bưu Cục TP. Yên Bái (VNPost)',
    eta: '2 - 3 ngày',
    aliases: ['yen bai', 'tinh yen bai', 'nghia lo', 'luc yen', 'mu cang chai'],
  },
  'hòa bình': {
    lat: 20.8167,
    lng: 105.3333,
    hub: 'Bưu Cục TP. Hòa Bình (VNPost)',
    eta: '2 - 3 ngày',
    aliases: ['hoa binh', 'tinh hoa binh', 'luong son', 'mai chau'],
  },
  'sơn la': {
    lat: 21.3283,
    lng: 103.9144,
    hub: 'Bưu Cục TP. Sơn La (VNPost)',
    eta: '3 ngày',
    aliases: ['son la', 'tinh son la', 'moc chau', 'mai son'],
  },
  'điện biên': {
    lat: 21.3833,
    lng: 103.0167,
    hub: 'Bưu Cục TP. Điện Biên Phủ (VNPost)',
    eta: '3 ngày',
    aliases: ['dien bien', 'tinh dien bien', 'dien bien phu', 'muong lay'],
  },
  'lai châu': {
    lat: 22.3964,
    lng: 103.4689,
    hub: 'Bưu Cục TP. Lai Châu (VNPost)',
    eta: '3 ngày',
    aliases: ['lai chau', 'tinh lai chau', 'tam duong', 'muong te'],
  },
};

// Sub-District Hotspots to refine coordinates when specific major cities are selected
const SUB_DISTRICT_HOTSPOTS: Record<string, { lat: number; lng: number }> = {
  'cao lanh': { lat: 10.4600, lng: 105.6333 },
  'sa dec': { lat: 10.2941, lng: 105.7570 },
  'hong ngu': { lat: 10.8144, lng: 105.3400 },
  'my tho': { lat: 10.3544, lng: 106.3639 },
  'cai lay': { lat: 10.4133, lng: 106.1167 },
  'go cong': { lat: 10.3600, lng: 106.6600 },
  'long xuyen': { lat: 10.3833, lng: 105.4167 },
  'chau doc': { lat: 10.7000, lng: 105.1167 },
  'rach gia': { lat: 10.0125, lng: 105.0809 },
  'phu quoc': { lat: 10.2899, lng: 103.9840 },
  'nha trang': { lat: 12.2388, lng: 109.1967 },
  'cam ranh': { lat: 11.9214, lng: 109.1591 },
  'da lat': { lat: 11.9404, lng: 108.4583 },
  'bao loc': { lat: 11.5478, lng: 107.8083 },
  'buon ma thuot': { lat: 12.6667, lng: 108.0383 },
  'pleiku': { lat: 13.9833, lng: 108.0000 },
  'quy nhon': { lat: 13.7820, lng: 109.2197 },
  'tam ky': { lat: 15.5683, lng: 108.4817 },
  'hoi an': { lat: 15.8801, lng: 108.3380 },
  'hue': { lat: 16.4637, lng: 107.5909 },
  'vinh': { lat: 18.6734, lng: 105.6813 },
  'ha long': { lat: 20.9505, lng: 107.0734 },
  'bien hoa': { lat: 10.9574, lng: 106.8427 },
  'thu dau mot': { lat: 10.9804, lng: 106.6519 },
  'vung tau': { lat: 10.3460, lng: 107.0843 },
};

function cleanText(str: string) {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .replace(/^(tinh|thanh pho|tp\.|tp|quan|huyen|thi xa|tx\.|phuong|xa|thi tran|tt\.)\s+/i, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function resolveLocation(provinceStr: string, wardStr: string, districtStr: string, addressStr: string) {
  const cleanProv = cleanText(provinceStr);
  const cleanWard = cleanText(wardStr);
  const cleanDist = cleanText(districtStr);
  const cleanAddr = cleanText(addressStr);

  let targetProvinceKey = '';

  // 1. Match Province accurately
  if (cleanProv) {
    for (const [key, val] of Object.entries(PROVINCES_MAP)) {
      const cleanKey = cleanText(key);
      if (cleanProv === cleanKey || cleanProv.includes(cleanKey) || cleanKey.includes(cleanProv)) {
        targetProvinceKey = key;
        break;
      }
      if (val.aliases.some((alias) => cleanProv.includes(alias) || alias.includes(cleanProv))) {
        targetProvinceKey = key;
        break;
      }
    }
  }

  // 2. Fallback to HCM if no province found
  if (!targetProvinceKey) {
    targetProvinceKey = 'hồ chí minh';
  }

  const provData = PROVINCES_MAP[targetProvinceKey] || PROVINCES_MAP['hồ chí minh'];
  let lat = provData.lat;
  let lng = provData.lng;
  const hub = provData.hub;
  const eta = provData.eta;

  // 3. Refine coordinates if ward or district mentions a specific major city hotspot
  const subTexts = [cleanWard, cleanDist, cleanAddr].filter(Boolean);
  for (const text of subTexts) {
    for (const [spotKey, coords] of Object.entries(SUB_DISTRICT_HOTSPOTS)) {
      if (text === spotKey || text.includes(spotKey)) {
        lat = coords.lat;
        lng = coords.lng;
        break;
      }
    }
  }

  return { lat, lng, hub, eta };
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
 * Modern Interactive Address Map Preview Component with Leaflet
 * 100% Reliable Tile Engine, Smooth flyTo Pan, Square & Borderless Aesthetic
 */
export default function AddressMapPreview({
  province = '',
  district = '',
  ward = '',
  address = '',
  className = '',
  minHeight = 'min-h-[420px]',
}: AddressMapPreviewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerInstanceRef = useRef<any>(null);

  const [zoomLevel, setZoomLevel] = useState(13); // Zoom 13 is ideal district/ward level
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLeafletReady, setIsLeafletReady] = useState(false);

  const fullAddressText = useMemo(() => {
    return [address, ward, district, province].filter(Boolean).join(', ');
  }, [address, ward, district, province]);

  const locationInfo = useMemo(() => {
    return resolveLocation(province, ward, district, address);
  }, [province, ward, district, address]);

  // Initialize Leaflet Map once container is mounted
  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (!mapContainerRef.current || mapInstanceRef.current) return;

      const L = (await import('leaflet')).default;
      if (!isMounted || !mapContainerRef.current) return;

      const map = L.map(mapContainerRef.current, {
        center: [locationInfo.lat, locationInfo.lng],
        zoom: zoomLevel,
        zoomControl: false,
        attributionControl: false,
      });

      // High Performance OpenStreetMap tiles (100% Free, No Watermark, Vietnamese Street & City Labels)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        subdomains: ['a', 'b', 'c'],
        attribution: '© OpenStreetMap contributors',
      }).addTo(map);

      // Custom Center Marker
      const customIcon = L.divIcon({
        className: 'huki-map-marker-container',
        html: `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -100%); pointer-events: none;">
            <div style="position: absolute; bottom: 0; width: 42px; height: 42px; border-radius: 50%; background: rgba(0, 59, 43, 0.25); animation: ping 1.2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="padding: 4px 10px; background: #003B2B; color: #ffffff; font-size: 11px; font-weight: 700; border-radius: 2px; box-shadow: 0 4px 12px rgba(0,0,0,0.25); display: flex; align-items: center; gap: 4px; white-space: nowrap; margin-bottom: 2px; border: 1px solid rgba(255,255,255,0.3);">
              <span>📦 Điểm nhận sách HUKI</span>
            </div>
            <svg width="34" height="34" viewBox="0 0 24 24" fill="#003B2B" style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.35));">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
          </div>
        `,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });

      const marker = L.marker([locationInfo.lat, locationInfo.lng], { icon: customIcon }).addTo(map);

      mapInstanceRef.current = map;
      markerInstanceRef.current = marker;
      setIsLeafletReady(true);
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Smoothly Pan/Fly to new Coordinates when location changes
  useEffect(() => {
    if (!mapInstanceRef.current || !isLeafletReady) return;

    mapInstanceRef.current.flyTo([locationInfo.lat, locationInfo.lng], zoomLevel, {
      duration: 1.0,
      easeLinearity: 0.25,
    });

    if (markerInstanceRef.current) {
      markerInstanceRef.current.setLatLng([locationInfo.lat, locationInfo.lng]);
    }
  }, [locationInfo.lat, locationInfo.lng, zoomLevel, isLeafletReady]);

  // Handle Zoom change
  const handleZoom = (delta: number) => {
    const newZoom = Math.max(9, Math.min(18, zoomLevel + delta));
    setZoomLevel(newZoom);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setZoom(newZoom);
    }
  };

  const googleMapsSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddressText || `${locationInfo.lat},${locationInfo.lng}`)}`;

  const containerContent = (
    <div className={`w-full ${minHeight} rounded-none border-0 border-none bg-[var(--theme-surface,#ffffff)] overflow-hidden flex flex-col relative group transition-all duration-300 shadow-none ${className}`}>
      {/* Map Header Toolbar - Clean Square Design without border */}
      <div className="bg-[var(--theme-surface,#ffffff)] px-4 py-3 flex items-center justify-between z-10 gap-3 border-b border-black/5 dark:border-white/5 rounded-none">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
          <div className="min-w-0">
            <span className="text-xs sm:text-sm font-bold text-[var(--theme-text,#1c1b1f)] truncate block">
              Bản Đồ Định Vị Bưu Cục &amp; Điểm Giao Hàng Live
            </span>
            <span className="text-[11px] text-[var(--theme-text-muted,#49454f)] block truncate">
              {province ? `Khu vực: ${province}` : 'Tự động đồng bộ GPS theo địa chỉ'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Zoom Control Buttons */}
          <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 rounded-none p-0.5 border border-black/5 dark:border-white/5">
            <button
              type="button"
              title="Phóng to"
              onClick={() => handleZoom(1)}
              disabled={zoomLevel >= 18}
              className="w-7 h-7 flex items-center justify-center text-xs font-bold hover:bg-white dark:hover:bg-neutral-700 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer rounded-none"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
            </button>
            <div className="w-[1px] h-4 bg-neutral-300 dark:bg-neutral-700"></div>
            <button
              type="button"
              title="Thu nhỏ"
              onClick={() => handleZoom(-1)}
              disabled={zoomLevel <= 9}
              className="w-7 h-7 flex items-center justify-center text-xs font-bold hover:bg-white dark:hover:bg-neutral-700 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer rounded-none"
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
            className="w-8 h-8 rounded-none bg-[var(--theme-primary,#003B2B)]/10 text-[var(--theme-primary,#003B2B)] hover:bg-[var(--theme-primary,#003B2B)] hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">open_in_new</span>
          </a>

          {/* Fullscreen Toggle Button */}
          <button
            type="button"
            title={isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}
            onClick={() => setIsFullscreen((f) => !f)}
            className="w-8 h-8 rounded-none bg-neutral-100 dark:bg-neutral-800 text-[var(--theme-text,#1c1b1f)] hover:bg-neutral-200 dark:hover:bg-neutral-700 flex items-center justify-center transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">
              {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
            </span>
          </button>
        </div>
      </div>

      {/* Map View Area - Leaflet Tile Canvas */}
      <div className="relative flex-1 w-full min-h-[340px] sm:min-h-[420px] bg-[#e5e3df] dark:bg-neutral-900 overflow-hidden rounded-none z-0">
        <div
          ref={mapContainerRef}
          className="w-full h-full min-h-[340px] sm:min-h-[420px] rounded-none z-0"
        />

        {/* Floating Delivery Hub Badge on Map Top Left */}
        <div className="absolute top-3 left-3 right-3 sm:right-auto sm:max-w-md p-3 rounded-none bg-[var(--theme-surface,#ffffff)]/95 backdrop-blur-md shadow-lg flex items-center justify-between gap-3 text-xs z-[400] transition-all border-0 pointer-events-auto">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-9 h-9 rounded-none bg-[var(--theme-primary,#003B2B)]/15 text-[var(--theme-primary,#003B2B)] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[20px]">warehouse</span>
            </span>
            <div className="min-w-0">
              <span className="font-bold text-xs sm:text-sm text-[var(--theme-text,#1c1b1f)] block truncate">
                {locationInfo.hub}
              </span>
              <span className="text-[11px] text-[var(--theme-text-muted,#49454f)] block truncate">
                Dự kiến bưu tá phát sách: <strong className="text-[var(--theme-primary,#003B2B)] font-bold">{locationInfo.eta}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Live Status Pill Top Right */}
        <div className="hidden sm:flex absolute top-3 right-3 px-3 py-1.5 rounded-none bg-emerald-950/85 backdrop-blur-md text-emerald-300 text-[11px] font-bold border border-emerald-500/30 shadow-md items-center gap-1.5 z-[400]">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Sẵn sàng kết nối Hub</span>
        </div>
      </div>

      {/* Map Footer: Live Address Summary */}
      <div className="px-4 py-3 bg-[var(--theme-background,#F2FBF9)]/95 border-t border-black/5 dark:border-white/5 text-xs rounded-none">
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
        <div className="w-full max-w-5xl h-[85vh] relative flex flex-col rounded-none overflow-hidden">
          {containerContent}
        </div>
      </div>
    );
  }

  return containerContent;
}
