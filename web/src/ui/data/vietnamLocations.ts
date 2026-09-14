/**
 * HUKI EBOOK - Vietnam Administrative Locations Dataset (34 Units Model)
 * Căn cứ: Nghị quyết Quốc hội & Cổng TTĐT Chính phủ (xaydungchinhsach.chinhphu.vn)
 * 34 Đơn vị Hành chính Cấp Tỉnh (6 Thành phố trực thuộc Trung ương + 28 Tỉnh)
 */

export type RegionZone = 'NORTH' | 'CENTRAL' | 'SOUTH';

export interface WardItem {
  code: string;
  name: string;
}

export interface DistrictItem {
  code: string;
  name: string;
  wards: WardItem[];
}

export interface ProvinceItem {
  code: string;
  name: string;
  zone: RegionZone;
  isCity?: boolean;
  isPopular?: boolean;
  legacyAliases?: string[]; // Tên các tỉnh/thành cũ hợp nhất để search thông minh
  districts: DistrictItem[];
}

export const VIETNAM_LOCATIONS: ProvinceItem[] = [
  // ==========================================
  // 6 THÀNH PHỐ TRỰC THUỘC TRUNG ƯƠNG
  // ==========================================
  {
    code: '01',
    name: 'Thành phố Hà Nội',
    zone: 'NORTH',
    isCity: true,
    isPopular: true,
    legacyAliases: ['Hà Nội', 'HN', 'Thủ đô Hà Nội', 'Hà Tây'],
    districts: [
      {
        code: '001',
        name: 'Quận Ba Đình',
        wards: [
          { code: '00001', name: 'Phường Phúc Xá' },
          { code: '00004', name: 'Phường Trúc Bạch' },
          { code: '00006', name: 'Phường Vĩnh Phúc' },
          { code: '00007', name: 'Phường Cống Vị' },
          { code: '00008', name: 'Phường Liễu Giai' },
          { code: '00010', name: 'Phường Nguyễn Trung Trực' },
          { code: '00013', name: 'Phường Quán Thánh' },
          { code: '00016', name: 'Phường Ngọc Hà' },
          { code: '00019', name: 'Phường Điện Biên' },
          { code: '00022', name: 'Phường Đội Cấn' },
          { code: '00025', name: 'Phường Ngọc Khánh' },
          { code: '00028', name: 'Phường Kim Mã' },
          { code: '00031', name: 'Phường Giảng Võ' },
          { code: '00034', name: 'Phường Thành Công' },
        ],
      },
      {
        code: '002',
        name: 'Quận Hoàn Kiếm',
        wards: [
          { code: '00037', name: 'Phường Phúc Tân' },
          { code: '00040', name: 'Phường Đồng Xuân' },
          { code: '00043', name: 'Phường Hàng Mã' },
          { code: '00046', name: 'Phường Hàng Buồm' },
          { code: '00049', name: 'Phường Hàng Đào' },
          { code: '00052', name: 'Phường Hàng Bồ' },
          { code: '00055', name: 'Phường Cửa Đông' },
          { code: '00058', name: 'Phường Lý Thái Tổ' },
          { code: '00061', name: 'Phường Hàng Bạc' },
          { code: '00064', name: 'Phường Hàng Gai' },
          { code: '00067', name: 'Phường Chương Dương' },
          { code: '00070', name: 'Phường Hàng Trống' },
          { code: '00073', name: 'Phường Cửa Nam' },
          { code: '00076', name: 'Phường Hàng Bông' },
          { code: '00079', name: 'Phường Tràng Tiền' },
          { code: '00082', name: 'Phường Trần Hưng Đạo' },
          { code: '00085', name: 'Phường Phan Chu Trinh' },
          { code: '00088', name: 'Phường Hàng Bài' },
        ],
      },
      {
        code: '005',
        name: 'Quận Cầu Giấy',
        wards: [
          { code: '00157', name: 'Phường Nghĩa Đô' },
          { code: '00160', name: 'Phường Nghĩa Tân' },
          { code: '00163', name: 'Phường Mai Dịch' },
          { code: '00166', name: 'Phường Dịch Vọng' },
          { code: '00167', name: 'Phường Dịch Vọng Hậu' },
          { code: '00169', name: 'Phường Quan Hoa' },
          { code: '00172', name: 'Phường Yên Hòa' },
          { code: '00175', name: 'Phường Trung Hòa' },
        ],
      },
      {
        code: '006',
        name: 'Quận Đống Đa',
        wards: [
          { code: '00178', name: 'Phường Cát Linh' },
          { code: '00181', name: 'Phường Văn Miếu' },
          { code: '00184', name: 'Phường Quốc Tử Giám' },
          { code: '00187', name: 'Phường Láng Thượng' },
          { code: '00190', name: 'Phường Ô Chợ Dừa' },
          { code: '00193', name: 'Phường Văn Chương' },
          { code: '00196', name: 'Phường Hàng Bột' },
          { code: '00199', name: 'Phường Láng Hạ' },
          { code: '00202', name: 'Phường Khâm Thiên' },
          { code: '00205', name: 'Phường Thổ Quan' },
          { code: '00208', name: 'Phường Nam Đồng' },
          { code: '00211', name: 'Phường Trung Phụng' },
          { code: '00214', name: 'Phường Quang Trung' },
          { code: '00217', name: 'Phường Trung Liệt' },
          { code: '00220', name: 'Phường Phương Liên' },
          { code: '00223', name: 'Phường Thịnh Quang' },
          { code: '00226', name: 'Phường Trung Tự' },
          { code: '00229', name: 'Phường Kim Liên' },
          { code: '00232', name: 'Phường Phương Mai' },
          { code: '00235', name: 'Phường Ngã Tư Sở' },
          { code: '00238', name: 'Phường Khương Thượng' },
        ],
      },
      {
        code: '007',
        name: 'Quận Hai Bà Trưng',
        wards: [
          { code: '00241', name: 'Phường Nguyễn Du' },
          { code: '00244', name: 'Phường Bạch Đằng' },
          { code: '00247', name: 'Phường Phạm Đình Hổ' },
          { code: '00256', name: 'Phường Lê Đại Hành' },
          { code: '00259', name: 'Phường Đồng Nhân' },
          { code: '00262', name: 'Phường Phố Huế' },
          { code: '00265', name: 'Phường Đống Mác' },
          { code: '00268', name: 'Phường Thanh Lương' },
          { code: '00271', name: 'Phường Thanh Nhàn' },
          { code: '00274', name: 'Phường Cầu Dền' },
          { code: '00277', name: 'Phường Bách Khoa' },
          { code: '00280', name: 'Phường Đồng Tâm' },
          { code: '00283', name: 'Phường Vĩnh Tuy' },
          { code: '00286', name: 'Phường Bạch Mai' },
          { code: '00289', name: 'Phường Quỳnh Mai' },
          { code: '00292', name: 'Phường Quỳnh Lôi' },
          { code: '00295', name: 'Phường Minh Khai' },
          { code: '00298', name: 'Phường Trương Định' },
        ],
      },
      {
        code: '008',
        name: 'Quận Hoàng Mai',
        wards: [
          { code: '00301', name: 'Phường Thanh Trì' },
          { code: '00304', name: 'Phường Vĩnh Hưng' },
          { code: '00307', name: 'Phường Định Công' },
          { code: '00310', name: 'Phường Mai Động' },
          { code: '00313', name: 'Phường Tương Mai' },
          { code: '00316', name: 'Phường Đại Kim' },
          { code: '00319', name: 'Phường Tân Mai' },
          { code: '00322', name: 'Phường Hoàng Văn Thụ' },
          { code: '00325', name: 'Phường Giáp Bát' },
          { code: '00328', name: 'Phường Lĩnh Nam' },
          { code: '00331', name: 'Phường Thịnh Liệt' },
          { code: '00334', name: 'Phường Trần Phú' },
          { code: '00337', name: 'Phường Hoàng Liệt' },
          { code: '00340', name: 'Phường Yên Sở' },
        ],
      },
    ],
  },
  {
    code: '79',
    name: 'Thành phố Hồ Chí Minh',
    zone: 'SOUTH',
    isCity: true,
    isPopular: true,
    legacyAliases: ['TP. Hồ Chí Minh', 'TP.HCM', 'Sài Gòn', 'Bình Dương', 'Bà Rịa - Vũng Tàu', 'Vũng Tàu'],
    districts: [
      {
        code: '760',
        name: 'Quận 1',
        wards: [
          { code: '26734', name: 'Phường Bến Nghé' },
          { code: '26737', name: 'Phường Bến Thành' },
          { code: '26740', name: 'Phường Cô Giang' },
          { code: '26743', name: 'Phường Cầu Kho' },
          { code: '26746', name: 'Phường Cầu Ông Lãnh' },
          { code: '26749', name: 'Phường Đa Kao' },
          { code: '26752', name: 'Phường Nguyễn Cư Trinh' },
          { code: '26755', name: 'Phường Nguyễn Thái Bình' },
          { code: '26758', name: 'Phường Phạm Ngũ Lão' },
          { code: '26761', name: 'Phường Tân Định' },
        ],
      },
      {
        code: '769',
        name: 'Thành phố Thủ Đức',
        wards: [
          { code: '26800', name: 'Phường Thảo Điền' },
          { code: '26803', name: 'Phường An Phú' },
          { code: '26806', name: 'Phường An Khánh' },
          { code: '26809', name: 'Phường Bình An' },
          { code: '26812', name: 'Phường Thủ Thiêm' },
          { code: '26815', name: 'Phường Hiệp Bình Chánh' },
          { code: '26818', name: 'Phường Hiệp Bình Phước' },
          { code: '26821', name: 'Phường Linh Tây' },
          { code: '26824', name: 'Phường Linh Chiểu' },
          { code: '26827', name: 'Phường Linh Trung' },
          { code: '26830', name: 'Phường Linh Xuân' },
          { code: '26833', name: 'Phường Tăng Nhơn Phú A' },
          { code: '26836', name: 'Phường Tăng Nhơn Phú B' },
          { code: '26839', name: 'Phường Phước Long A' },
          { code: '26842', name: 'Phường Phước Long B' },
        ],
      },
      {
        code: '764',
        name: 'Quận Gò Vấp',
        wards: [
          { code: '26860', name: 'Phường 1' },
          { code: '26863', name: 'Phường 3' },
          { code: '26866', name: 'Phường 4' },
          { code: '26869', name: 'Phường 5' },
          { code: '26872', name: 'Phường 6' },
          { code: '26875', name: 'Phường 7' },
          { code: '26878', name: 'Phường 8' },
          { code: '26881', name: 'Phường 9' },
          { code: '26884', name: 'Phường 10' },
          { code: '26887', name: 'Phường 11' },
          { code: '26890', name: 'Phường 12' },
          { code: '26893', name: 'Phường 14' },
          { code: '26896', name: 'Phường 15' },
          { code: '26899', name: 'Phường 16' },
          { code: '26902', name: 'Phường 17' },
        ],
      },
      {
        code: '765',
        name: 'Quận Bình Thạnh',
        wards: [
          { code: '26905', name: 'Phường 1' },
          { code: '26908', name: 'Phường 2' },
          { code: '26911', name: 'Phường 3' },
          { code: '26914', name: 'Phường 5' },
          { code: '26917', name: 'Phường 6' },
          { code: '26920', name: 'Phường 7' },
          { code: '26923', name: 'Phường 11' },
          { code: '26926', name: 'Phường 12' },
          { code: '26929', name: 'Phường 13' },
          { code: '26932', name: 'Phường 14' },
          { code: '26935', name: 'Phường 15' },
          { code: '26938', name: 'Phường 17' },
          { code: '26941', name: 'Phường 19' },
          { code: '26944', name: 'Phường 21' },
          { code: '26947', name: 'Phường 22' },
          { code: '26950', name: 'Phường 24' },
          { code: '26953', name: 'Phường 25' },
          { code: '26956', name: 'Phường 26' },
          { code: '26959', name: 'Phường 27' },
          { code: '26962', name: 'Phường 28' },
        ],
      },
      {
        code: '774',
        name: 'Quận 7',
        wards: [
          { code: '27040', name: 'Phường Tân Thuận Đông' },
          { code: '27043', name: 'Phường Tân Thuận Tây' },
          { code: '27046', name: 'Phường Tân Kiểng' },
          { code: '27049', name: 'Phường Tân Hưng' },
          { code: '27052', name: 'Phường Bình Thuận' },
          { code: '27055', name: 'Phường Tân Quy' },
          { code: '27058', name: 'Phường Phú Thuận' },
          { code: '27061', name: 'Phường Tân Phú' },
          { code: '27064', name: 'Phường Tân Phong' },
          { code: '27067', name: 'Phường Phú Mỹ' },
        ],
      },
      {
        code: '775',
        name: 'Quận Tân Bình',
        wards: [
          { code: '27070', name: 'Phường 1' },
          { code: '27073', name: 'Phường 2' },
          { code: '27076', name: 'Phường 3' },
          { code: '27079', name: 'Phường 4' },
          { code: '27082', name: 'Phường 5' },
          { code: '27085', name: 'Phường 6' },
          { code: '27088', name: 'Phường 7' },
          { code: '27091', name: 'Phường 8' },
          { code: '27094', name: 'Phường 9' },
          { code: '27097', name: 'Phường 10' },
          { code: '27100', name: 'Phường 11' },
          { code: '27103', name: 'Phường 12' },
          { code: '27106', name: 'Phường 13' },
          { code: '27109', name: 'Phường 14' },
          { code: '27112', name: 'Phường 15' },
        ],
      },
      // Khu vực Bình Dương hợp nhất
      {
        code: '718',
        name: 'Thành phố Thủ Dầu Một (Bình Dương)',
        wards: [
          { code: '25684', name: 'Phường Phú Cường' },
          { code: '25687', name: 'Phường Hiệp Thành' },
          { code: '25690', name: 'Phường Chánh Nghĩa' },
          { code: '25693', name: 'Phường Phú Thọ' },
          { code: '25696', name: 'Phường Phú Hòa' },
          { code: '25699', name: 'Phường Phú Lợi' },
          { code: '25702', name: 'Phường Phú Mỹ' },
          { code: '25705', name: 'Phường Định Hòa' },
          { code: '25708', name: 'Phường Hiệp An' },
          { code: '25711', name: 'Phường Tân An' },
        ],
      },
      {
        code: '724',
        name: 'Thành phố Bến Cát (Bình Dương)',
        wards: [
          { code: '25816', name: 'Phường Mỹ Phước' },
          { code: '25819', name: 'Phường Thới Hòa' },
          { code: '25822', name: 'Phường Tân Định' },
          { code: '25825', name: 'Phường Hòa Lợi' },
          { code: '25828', name: 'Phường Chánh Phú Hòa' },
          { code: '25831', name: 'Phường An Điền' },
          { code: '25834', name: 'Phường An Tây' },
        ],
      },
      {
        code: '725',
        name: 'Thành phố Tân Uyên (Bình Dương)',
        wards: [
          { code: '25840', name: 'Phường Uyên Hưng' },
          { code: '25843', name: 'Phường Tân Phước Khánh' },
          { code: '25846', name: 'Phường Thái Hòa' },
          { code: '25849', name: 'Phường Thạnh Phước' },
          { code: '25852', name: 'Phường Tân Hiệp' },
          { code: '25855', name: 'Phường Khánh Bình' },
        ],
      },
      // Khu vực Bà Rịa - Vũng Tàu hợp nhất
      {
        code: '747',
        name: 'Thành phố Vũng Tàu (Bà Rịa - Vũng Tàu)',
        wards: [
          { code: '26500', name: 'Phường 1' },
          { code: '26503', name: 'Phường 2' },
          { code: '26506', name: 'Phường 3' },
          { code: '26509', name: 'Phường 4' },
          { code: '26512', name: 'Phường Thắng Nhì' },
          { code: '26515', name: 'Phường Thắng Tam' },
          { code: '26518', name: 'Phường Thắng Nhất' },
          { code: '26521', name: 'Phường Nguyễn An Ninh' },
          { code: '26524', name: 'Phường Rạch Dừa' },
        ],
      },
      {
        code: '753',
        name: 'Thành phố Phú Mỹ (Bà Rịa - Vũng Tàu)',
        wards: [
          { code: '26632', name: 'Phường Phú Mỹ' },
          { code: '26635', name: 'Phường Hắc Dịch' },
          { code: '26638', name: 'Phường Mỹ Xuân' },
          { code: '26641', name: 'Phường Phước Hòa' },
          { code: '26644', name: 'Phường Tân Phước' },
        ],
      },
      {
        code: '754',
        name: 'Huyện Long Đất (Long Điền + Đất Đỏ)',
        wards: [
          { code: '26650', name: 'Thị trấn Long Điền' },
          { code: '26653', name: 'Thị trấn Long Hải' },
          { code: '26656', name: 'Thị trấn Đất Đỏ' },
          { code: '26659', name: 'Thị trấn Phước Hải' },
          { code: '26662', name: 'Xã Phước Hội' },
          { code: '26665', name: 'Xã Lộc An' },
        ],
      },
    ],
  },
  {
    code: '31',
    name: 'Thành phố Hải Phòng',
    zone: 'NORTH',
    isCity: true,
    isPopular: true,
    legacyAliases: ['Hải Phòng', 'HP', 'Hải Dương'],
    districts: [
      {
        code: '303',
        name: 'Quận Hồng Bàng',
        wards: [
          { code: '11200', name: 'Phường Hoàng Văn Thụ' },
          { code: '11203', name: 'Phường Quang Trung' },
          { code: '11206', name: 'Phường Phan Bội Châu' },
          { code: '11209', name: 'Phường Phạm Hồng Thái' },
        ],
      },
      {
        code: '304',
        name: 'Quận Ngô Quyền',
        wards: [
          { code: '11220', name: 'Phường Lạc Viên' },
          { code: '11223', name: 'Phường Cầu Đất' },
          { code: '11226', name: 'Phường Lê Lợi' },
        ],
      },
      {
        code: '308',
        name: 'Thành phố Thủy Nguyên (Hải Phòng)',
        wards: [
          { code: '11300', name: 'Phường Núi Đèo' },
          { code: '11303', name: 'Phường Minh Đức' },
          { code: '11306', name: 'Phường Lại Xuân' },
          { code: '11309', name: 'Phường Quảng Thanh' },
          { code: '11312', name: 'Phường Lưu Kiếm' },
          { code: '11315', name: 'Phường Thủy Đường' },
        ],
      },
      {
        code: '309',
        name: 'Quận An Dương (Hải Phòng)',
        wards: [
          { code: '11330', name: 'Phường An Dương' },
          { code: '11333', name: 'Phường Lê Thiện' },
          { code: '11336', name: 'Phường Tân Tiến' },
          { code: '11339', name: 'Phường An Hòa' },
        ],
      },
      // Khu vực Hải Dương hợp nhất
      {
        code: '288',
        name: 'Thành phố Hải Dương (Hải Dương)',
        wards: [
          { code: '10500', name: 'Phường Quang Trung' },
          { code: '10503', name: 'Phường Trần Phú' },
          { code: '10506', name: 'Phường Lê Thanh Nghị' },
          { code: '10509', name: 'Phường Tứ Minh' },
        ],
      },
      {
        code: '290',
        name: 'Thành phố Chí Linh (Hải Dương)',
        wards: [
          { code: '10550', name: 'Phường Sao Đỏ' },
          { code: '10553', name: 'Phường Cộng Hòa' },
          { code: '10556', name: 'Phường Bến Tắm' },
        ],
      },
    ],
  },
  {
    code: '46',
    name: 'Thành phố Huế',
    zone: 'CENTRAL',
    isCity: true,
    isPopular: true,
    legacyAliases: ['Thừa Thiên Huế', 'Huế', 'TT Huế'],
    districts: [
      {
        code: '474',
        name: 'Quận Trung Tâm Huế',
        wards: [
          { code: '19800', name: 'Phường Vĩnh Ninh' },
          { code: '19803', name: 'Phường Phú Nhuận' },
          { code: '19806', name: 'Phường Phú Hội' },
          { code: '19809', name: 'Phường Thuận Thành' },
          { code: '19812', name: 'Phường Thuận Lộc' },
          { code: '19815', name: 'Phường Tây Lộc' },
        ],
      },
      {
        code: '476',
        name: 'Thị xã Hương Thủy',
        wards: [
          { code: '19850', name: 'Phường Phú Bài' },
          { code: '19853', name: 'Phường Thủy Dương' },
          { code: '19856', name: 'Phường Thủy Phương' },
        ],
      },
      {
        code: '477',
        name: 'Thị xã Hương Trà',
        wards: [
          { code: '19880', name: 'Phường Tứ Hạ' },
          { code: '19883', name: 'Phường Hương Văn' },
          { code: '19886', name: 'Phường Hương Vân' },
        ],
      },
    ],
  },
  {
    code: '48',
    name: 'Thành phố Đà Nẵng',
    zone: 'CENTRAL',
    isCity: true,
    isPopular: true,
    legacyAliases: ['Đà Nẵng', 'ĐN', 'Quảng Nam', 'Hội An'],
    districts: [
      {
        code: '490',
        name: 'Quận Hải Châu',
        wards: [
          { code: '20194', name: 'Phường Hải Châu I' },
          { code: '20197', name: 'Phường Hải Châu II' },
          { code: '20200', name: 'Phường Thạch Thang' },
          { code: '20203', name: 'Phường Thanh Bình' },
          { code: '20206', name: 'Phường Thuận Phước' },
          { code: '20209', name: 'Phường Hòa Thuận Đông' },
          { code: '20212', name: 'Phường Hòa Thuận Tây' },
        ],
      },
      {
        code: '492',
        name: 'Quận Sơn Trà',
        wards: [
          { code: '20224', name: 'Phường An Hải Bắc' },
          { code: '20227', name: 'Phường An Hải Tây' },
          { code: '20230', name: 'Phường An Hải Đông' },
          { code: '20233', name: 'Phường Phước Mỹ' },
          { code: '20236', name: 'Phường Thọ Quang' },
        ],
      },
      {
        code: '493',
        name: 'Quận Ngũ Hành Sơn',
        wards: [
          { code: '20245', name: 'Phường Mỹ An' },
          { code: '20248', name: 'Phường Khuê Mỹ' },
          { code: '20251', name: 'Phường Hòa Quý' },
          { code: '20254', name: 'Phường Hòa Hải' },
        ],
      },
      // Khu vực Quảng Nam hợp nhất
      {
        code: '502',
        name: 'Thành phố Hội An (Quảng Nam)',
        wards: [
          { code: '20500', name: 'Phường Minh An' },
          { code: '20503', name: 'Phường Cẩm Phô' },
          { code: '20506', name: 'Phường Tân An' },
          { code: '20509', name: 'Phường Cẩm Châu' },
          { code: '20512', name: 'Phường Cửa Đại' },
        ],
      },
      {
        code: '503',
        name: 'Thành phố Tam Kỳ (Quảng Nam)',
        wards: [
          { code: '20530', name: 'Phường An Mỹ' },
          { code: '20533', name: 'Phường An Xuân' },
          { code: '20536', name: 'Phường Phước Hòa' },
          { code: '20539', name: 'Phường Tân Thạnh' },
        ],
      },
    ],
  },
  {
    code: '92',
    name: 'Thành phố Cần Thơ',
    zone: 'SOUTH',
    isCity: true,
    isPopular: true,
    legacyAliases: ['Cần Thơ', 'CT', 'Hậu Giang', 'Sóc Trăng'],
    districts: [
      {
        code: '916',
        name: 'Quận Ninh Kiều',
        wards: [
          { code: '31147', name: 'Phường Cái Khế' },
          { code: '31150', name: 'Phường An Hòa' },
          { code: '31153', name: 'Phường Thới Bình' },
          { code: '31156', name: 'Phường An Nghiệp' },
          { code: '31159', name: 'Phường An Cư' },
          { code: '31162', name: 'Phường Tân An' },
          { code: '31165', name: 'Phường An Phú' },
          { code: '31168', name: 'Phường Xuân Khánh' },
          { code: '31171', name: 'Phường Hưng Lợi' },
        ],
      },
      {
        code: '918',
        name: 'Quận Cái Răng',
        wards: [
          { code: '31189', name: 'Phường Lê Bình' },
          { code: '31192', name: 'Phường Hưng Phú' },
          { code: '31195', name: 'Phường Hưng Thạnh' },
          { code: '31198', name: 'Phường Ba Láng' },
        ],
      },
      // Khu vực Hậu Giang hợp nhất
      {
        code: '930',
        name: 'Thành phố Vị Thanh (Hậu Giang)',
        wards: [
          { code: '31400', name: 'Phường 1' },
          { code: '31403', name: 'Phường 3' },
          { code: '31406', name: 'Phường 4' },
          { code: '31409', name: 'Phường 5' },
        ],
      },
      // Khu vực Sóc Trăng hợp nhất
      {
        code: '941',
        name: 'Thành phố Sóc Trăng (Sóc Trăng)',
        wards: [
          { code: '31600', name: 'Phường 1' },
          { code: '31603', name: 'Phường 2' },
          { code: '31606', name: 'Phường 3' },
          { code: '31609', name: 'Phường 4' },
        ],
      },
    ],
  },

  // ==========================================
  // 28 TỈNH TOÀN QUỐC
  // ==========================================
  // MIỀN BẮC (10 TỈNH)
  {
    code: '04',
    name: 'Tỉnh Cao Bằng',
    zone: 'NORTH',
    legacyAliases: ['Cao Bằng'],
    districts: [
      {
        code: '040',
        name: 'Thành phố Cao Bằng',
        wards: [
          { code: '01200', name: 'Phường Hợp Giang' },
          { code: '01203', name: 'Phường Sông Bằng' },
          { code: '01206', name: 'Phường Tân Giang' },
        ],
      },
    ],
  },
  {
    code: '11',
    name: 'Tỉnh Điện Biên',
    zone: 'NORTH',
    legacyAliases: ['Điện Biên'],
    districts: [
      {
        code: '094',
        name: 'Thành phố Điện Biên Phủ',
        wards: [
          { code: '03100', name: 'Phường Mường Thanh' },
          { code: '03103', name: 'Phường Him Lam' },
          { code: '03106', name: 'Phường Nam Thanh' },
        ],
      },
    ],
  },
  {
    code: '12',
    name: 'Tỉnh Lai Châu',
    zone: 'NORTH',
    legacyAliases: ['Lai Châu'],
    districts: [
      {
        code: '105',
        name: 'Thành phố Lai Châu',
        wards: [
          { code: '03400', name: 'Phường Quyết Thắng' },
          { code: '03403', name: 'Phường Tân Phong' },
          { code: '03406', name: 'Phường Đoàn Kết' },
        ],
      },
    ],
  },
  {
    code: '20',
    name: 'Tỉnh Lạng Sơn',
    zone: 'NORTH',
    legacyAliases: ['Lạng Sơn'],
    districts: [
      {
        code: '178',
        name: 'Thành phố Lạng Sơn',
        wards: [
          { code: '05900', name: 'Phường Hoàng Văn Thụ' },
          { code: '05903', name: 'Phường Tam Thanh' },
          { code: '05906', name: 'Phường Vĩnh Trại' },
        ],
      },
    ],
  },
  {
    code: '22',
    name: 'Tỉnh Quảng Ninh',
    zone: 'NORTH',
    isPopular: true,
    legacyAliases: ['Quảng Ninh', 'Hạ Long'],
    districts: [
      {
        code: '193',
        name: 'Thành phố Hạ Long',
        wards: [
          { code: '06500', name: 'Phường Bạch Đằng' },
          { code: '06503', name: 'Phường Hồng Gai' },
          { code: '06506', name: 'Phường Bãi Cháy' },
          { code: '06509', name: 'Phường Hùng Thắng' },
        ],
      },
      {
        code: '194',
        name: 'Thành phố Móng Cái',
        wards: [
          { code: '06550', name: 'Phường Ka Long' },
          { code: '06553', name: 'Phường Trần Phú' },
          { code: '06556', name: 'Phường Ninh Dương' },
        ],
      },
      {
        code: '195',
        name: 'Thành phố Cẩm Phả',
        wards: [
          { code: '06600', name: 'Phường Cẩm Trung' },
          { code: '06603', name: 'Phường Cẩm Thành' },
        ],
      },
      {
        code: '196',
        name: 'Thành phố Uông Bí',
        wards: [
          { code: '06650', name: 'Phường Quang Trung' },
          { code: '06653', name: 'Phường Thanh Sơn' },
        ],
      },
      {
        code: '197',
        name: 'Thành phố Đông Triều',
        wards: [
          { code: '06700', name: 'Phường Đông Triều' },
          { code: '06703', name: 'Phường Mạo Khê' },
          { code: '06706', name: 'Phường Đức Chính' },
          { code: '06709', name: 'Phường Kim Sơn' },
        ],
      },
    ],
  },
  {
    code: '14',
    name: 'Tỉnh Sơn La',
    zone: 'NORTH',
    legacyAliases: ['Sơn La'],
    districts: [
      {
        code: '118',
        name: 'Thành phố Sơn La',
        wards: [
          { code: '03800', name: 'Phường Chiềng Lề' },
          { code: '03803', name: 'Phường Tô Hiệu' },
          { code: '03806', name: 'Phường Quyết Thắng' },
        ],
      },
    ],
  },
  {
    code: '08',
    name: 'Tỉnh Tuyên Quang',
    zone: 'NORTH',
    legacyAliases: ['Tuyên Quang', 'Hà Giang'],
    districts: [
      {
        code: '070',
        name: 'Thành phố Tuyên Quang',
        wards: [
          { code: '02200', name: 'Phường Phan Thiết' },
          { code: '02203', name: 'Phường Minh Xuân' },
          { code: '02206', name: 'Phường Tân Quang' },
        ],
      },
      {
        code: '024',
        name: 'Thành phố Hà Giang (Hà Giang cũ)',
        wards: [
          { code: '00600', name: 'Phường Trần Phú' },
          { code: '00603', name: 'Phường Minh Khai' },
        ],
      },
    ],
  },
  {
    code: '10',
    name: 'Tỉnh Lào Cai',
    zone: 'NORTH',
    legacyAliases: ['Lào Cai', 'Sa Pa', 'Yên Bái'],
    districts: [
      {
        code: '080',
        name: 'Thành phố Lào Cai',
        wards: [
          { code: '02600', name: 'Phường Kim Tân' },
          { code: '02603', name: 'Phường Cốc Lếu' },
          { code: '02606', name: 'Phường Bắc Cường' },
        ],
      },
      {
        code: '088',
        name: 'Thị xã Sa Pa',
        wards: [
          { code: '02800', name: 'Phường Sa Pa' },
          { code: '02803', name: 'Phường Hàm Rồng' },
          { code: '02806', name: 'Phường Phan Si Păng' },
        ],
      },
      {
        code: '132',
        name: 'Thành phố Yên Bái (Yên Bái cũ)',
        wards: [
          { code: '04300', name: 'Phường Đồng Tâm' },
          { code: '04303', name: 'Phường Yên Ninh' },
        ],
      },
    ],
  },
  {
    code: '19',
    name: 'Tỉnh Thái Nguyên',
    zone: 'NORTH',
    legacyAliases: ['Thái Nguyên', 'Bắc Kạn'],
    districts: [
      {
        code: '164',
        name: 'Thành phố Thái Nguyên',
        wards: [
          { code: '05400', name: 'Phường Phan Đình Phùng' },
          { code: '05403', name: 'Phường Hoàng Văn Thụ' },
          { code: '05406', name: 'Phường Trưng Vương' },
        ],
      },
      {
        code: '165',
        name: 'Thành phố Sông Công',
        wards: [
          { code: '05450', name: 'Phường Mỏ Chè' },
          { code: '05453', name: 'Phường Cải Đan' },
        ],
      },
      {
        code: '172',
        name: 'Thành phố Phổ Yên',
        wards: [
          { code: '05600', name: 'Phường Ba Hàng' },
          { code: '05603', name: 'Phường Bãi Bông' },
          { code: '05606', name: 'Phường Đắc Sơn' },
        ],
      },
      {
        code: '058',
        name: 'Thành phố Bắc Kạn (Bắc Kạn cũ)',
        wards: [
          { code: '01800', name: 'Phường Đức Xuân' },
          { code: '01803', name: 'Phường Sông Cầu' },
        ],
      },
    ],
  },
  {
    code: '25',
    name: 'Tỉnh Phú Thọ',
    zone: 'NORTH',
    legacyAliases: ['Phú Thọ', 'Vĩnh Phúc', 'Hòa Bình'],
    districts: [
      {
        code: '227',
        name: 'Thành phố Việt Trì',
        wards: [
          { code: '07800', name: 'Phường Tiên Cát' },
          { code: '07803', name: 'Phường Gia Cẩm' },
          { code: '07806', name: 'Phường Nông Trang' },
        ],
      },
      {
        code: '243',
        name: 'Thành phố Vĩnh Yên (Vĩnh Phúc cũ)',
        wards: [
          { code: '08500', name: 'Phường Ngô Quyền' },
          { code: '08503', name: 'Phường Liên Bảo' },
        ],
      },
      {
        code: '148',
        name: 'Thành phố Hòa Bình (Hòa Bình cũ)',
        wards: [
          { code: '04800', name: 'Phường Phương Lâm' },
          { code: '04803', name: 'Phường Đồng Tiến' },
        ],
      },
    ],
  },
  {
    code: '27',
    name: 'Tỉnh Bắc Ninh',
    zone: 'NORTH',
    isPopular: true,
    legacyAliases: ['Bắc Ninh', 'Bắc Giang'],
    districts: [
      {
        code: '256',
        name: 'Thành phố Bắc Ninh',
        wards: [
          { code: '09200', name: 'Phường Suối Hoa' },
          { code: '09203', name: 'Phường Tiền An' },
          { code: '09206', name: 'Phường Ninh Xá' },
        ],
      },
      {
        code: '258',
        name: 'Thành phố Từ Sơn',
        wards: [
          { code: '09300', name: 'Phường Đông Ngàn' },
          { code: '09303', name: 'Phường Đồng Nguyên' },
          { code: '09306', name: 'Phường Tân Hồng' },
        ],
      },
      {
        code: '213',
        name: 'Thành phố Bắc Giang (Bắc Giang cũ)',
        wards: [
          { code: '07100', name: 'Phường Trần Phú' },
          { code: '07103', name: 'Phường Ngô Quyền' },
        ],
      },
    ],
  },
  {
    code: '33',
    name: 'Tỉnh Hưng Yên',
    zone: 'NORTH',
    legacyAliases: ['Hưng Yên', 'Thái Bình'],
    districts: [
      {
        code: '323',
        name: 'Thành phố Hưng Yên',
        wards: [
          { code: '12000', name: 'Phường Lê Lợi' },
          { code: '12003', name: 'Phường Hiến Nam' },
        ],
      },
      {
        code: '336',
        name: 'Thành phố Thái Bình (Thái Bình cũ)',
        wards: [
          { code: '12500', name: 'Phường Lê Hồng Phong' },
          { code: '12503', name: 'Phường Bồ Xuyên' },
        ],
      },
    ],
  },
  {
    code: '37',
    name: 'Tỉnh Ninh Bình',
    zone: 'NORTH',
    legacyAliases: ['Ninh Bình', 'Hà Nam', 'Nam Định'],
    districts: [
      {
        code: '369',
        name: 'Thành phố Ninh Bình',
        wards: [
          { code: '14000', name: 'Phường Vân Giang' },
          { code: '14003', name: 'Phường Tân Thành' },
        ],
      },
      {
        code: '347',
        name: 'Thành phố Phủ Lý (Hà Nam cũ)',
        wards: [
          { code: '13000', name: 'Phường Minh Khai' },
          { code: '13003', name: 'Phường Lương Khánh Thiện' },
        ],
      },
      {
        code: '356',
        name: 'Thành phố Nam Định (Nam Định cũ)',
        wards: [
          { code: '13500', name: 'Phường Quang Trung' },
          { code: '13503', name: 'Phường Trần Hưng Đạo' },
        ],
      },
    ],
  },

  // MIỀN TRUNG & TÂY NGUYÊN (8 TỈNH)
  {
    code: '38',
    name: 'Tỉnh Thanh Hóa',
    zone: 'CENTRAL',
    isPopular: true,
    legacyAliases: ['Thanh Hóa', 'Sầm Sơn'],
    districts: [
      {
        code: '380',
        name: 'Thành phố Thanh Hóa',
        wards: [
          { code: '14500', name: 'Phường Ba Đình' },
          { code: '14503', name: 'Phường Lam Sơn' },
          { code: '14506', name: 'Phường Điện Biên' },
        ],
      },
      {
        code: '381',
        name: 'Thành phố Sầm Sơn',
        wards: [
          { code: '14550', name: 'Phường Trường Sơn' },
          { code: '14553', name: 'Phường Bắc Sơn' },
        ],
      },
    ],
  },
  {
    code: '40',
    name: 'Tỉnh Nghệ An',
    zone: 'CENTRAL',
    isPopular: true,
    legacyAliases: ['Nghệ An', 'TP Vinh', 'Vinh'],
    districts: [
      {
        code: '412',
        name: 'Thành phố Vinh',
        wards: [
          { code: '16000', name: 'Phường Lê Mao' },
          { code: '16003', name: 'Phường Quang Trung' },
          { code: '16006', name: 'Phường Trường Thi' },
        ],
      },
    ],
  },
  {
    code: '42',
    name: 'Tỉnh Hà Tĩnh',
    zone: 'CENTRAL',
    legacyAliases: ['Hà Tĩnh'],
    districts: [
      {
        code: '439',
        name: 'Thành phố Hà Tĩnh',
        wards: [
          { code: '17500', name: 'Phường Bắc Hà' },
          { code: '17503', name: 'Phường Nam Hà' },
        ],
      },
    ],
  },
  {
    code: '45',
    name: 'Tỉnh Quảng Trị',
    zone: 'CENTRAL',
    legacyAliases: ['Quảng Trị', 'Quảng Bình', 'Đồng Hới'],
    districts: [
      {
        code: '461',
        name: 'Thành phố Đông Hà',
        wards: [
          { code: '19000', name: 'Phường 1' },
          { code: '19003', name: 'Phường 2' },
        ],
      },
      {
        code: '450',
        name: 'Thành phố Đồng Hới (Quảng Bình cũ)',
        wards: [
          { code: '18500', name: 'Phường Đồng Mỹ' },
          { code: '18503', name: 'Phường Hải Đình' },
        ],
      },
    ],
  },
  {
    code: '51',
    name: 'Tỉnh Quảng Ngãi',
    zone: 'CENTRAL',
    legacyAliases: ['Quảng Ngãi', 'Kon Tum'],
    districts: [
      {
        code: '522',
        name: 'Thành phố Quảng Ngãi',
        wards: [
          { code: '21000', name: 'Phường Trần Phú' },
          { code: '21003', name: 'Phường Lê Hồng Phong' },
        ],
      },
      {
        code: '608',
        name: 'Thành phố Kon Tum (Kon Tum cũ)',
        wards: [
          { code: '23500', name: 'Phường Quyết Thắng' },
          { code: '23503', name: 'Phường Thống Nhất' },
        ],
      },
    ],
  },
  {
    code: '64',
    name: 'Tỉnh Gia Lai',
    zone: 'CENTRAL',
    legacyAliases: ['Gia Lai', 'Pleiku', 'Bình Định', 'Quy Nhơn'],
    districts: [
      {
        code: '622',
        name: 'Thành phố Pleiku',
        wards: [
          { code: '24000', name: 'Phường Diên Hồng' },
          { code: '24003', name: 'Phường Hoa Lư' },
        ],
      },
      {
        code: '540',
        name: 'Thành phố Quy Nhơn (Bình Định cũ)',
        wards: [
          { code: '21500', name: 'Phường Lê Lợi' },
          { code: '21503', name: 'Phường Trần Phú' },
          { code: '21506', name: 'Phường Nguyễn Văn Cừ' },
        ],
      },
    ],
  },
  {
    code: '56',
    name: 'Tỉnh Khánh Hòa',
    zone: 'CENTRAL',
    isPopular: true,
    legacyAliases: ['Khánh Hòa', 'Nha Trang', 'Ninh Thuận', 'Phan Rang'],
    districts: [
      {
        code: '568',
        name: 'Thành phố Nha Trang',
        wards: [
          { code: '22500', name: 'Phường Lộc Thọ' },
          { code: '22503', name: 'Phường Phước Tiến' },
          { code: '22506', name: 'Phường Vĩnh Nguyên' },
        ],
      },
      {
        code: '582',
        name: 'Thành phố Phan Rang - Tháp Chàm (Ninh Thuận cũ)',
        wards: [
          { code: '23000', name: 'Phường Kinh Dinh' },
          { code: '23003', name: 'Phường Thanh Sơn' },
        ],
      },
    ],
  },
  {
    code: '68',
    name: 'Tỉnh Lâm Đồng',
    zone: 'CENTRAL',
    isPopular: true,
    legacyAliases: ['Lâm Đồng', 'Đà Lạt', 'Bình Thuận', 'Phan Thiết', 'Đắk Nông'],
    districts: [
      {
        code: '672',
        name: 'Thành phố Đà Lạt',
        wards: [
          { code: '25000', name: 'Phường 1' },
          { code: '25003', name: 'Phường 2' },
          { code: '25006', name: 'Phường 3' },
          { code: '25009', name: 'Phường 10' },
        ],
      },
      {
        code: '593',
        name: 'Thành phố Phan Thiết (Bình Thuận cũ)',
        wards: [
          { code: '23200', name: 'Phường Đức Nghĩa' },
          { code: '23203', name: 'Phường Phú Thủy' },
        ],
      },
      {
        code: '660',
        name: 'Thành phố Gia Nghĩa (Đắk Nông cũ)',
        wards: [
          { code: '24800', name: 'Phường Nghĩa Đức' },
          { code: '24803', name: 'Phường Nghĩa Thành' },
        ],
      },
    ],
  },
  {
    code: '66',
    name: 'Tỉnh Đắk Lắk',
    zone: 'CENTRAL',
    legacyAliases: ['Đắk Lắk', 'Buôn Ma Thuột', 'Phú Yên', 'Tuy Hòa'],
    districts: [
      {
        code: '643',
        name: 'Thành phố Buôn Ma Thuột',
        wards: [
          { code: '24500', name: 'Phường Thắng Lợi' },
          { code: '24503', name: 'Phường Tân Lợi' },
        ],
      },
      {
        code: '555',
        name: 'Thành phố Tuy Hòa (Phú Yên cũ)',
        wards: [
          { code: '22000', name: 'Phường 1' },
          { code: '22003', name: 'Phường 7' },
        ],
      },
    ],
  },

  // MIỀN NAM (6 TỈNH)
  {
    code: '75',
    name: 'Tỉnh Đồng Nai',
    zone: 'SOUTH',
    isPopular: true,
    legacyAliases: ['Đồng Nai', 'Biên Hòa', 'Bình Phước', 'Đồng Xoài'],
    districts: [
      {
        code: '731',
        name: 'Thành phố Biên Hòa',
        wards: [
          { code: '26000', name: 'Phường Quyết Thắng' },
          { code: '26003', name: 'Phường Thanh Bình' },
          { code: '26006', name: 'Phường Tân Tiến' },
        ],
      },
      {
        code: '690',
        name: 'Thành phố Đồng Xoài (Bình Phước cũ)',
        wards: [
          { code: '25400', name: 'Phường Tân Bình' },
          { code: '25403', name: 'Phường Tân Phú' },
        ],
      },
    ],
  },
  {
    code: '72',
    name: 'Tỉnh Tây Ninh',
    zone: 'SOUTH',
    legacyAliases: ['Tây Ninh', 'Long An', 'Tân An'],
    districts: [
      {
        code: '703',
        name: 'Thành phố Tây Ninh',
        wards: [
          { code: '25500', name: 'Phường 1' },
          { code: '25503', name: 'Phường 2' },
          { code: '25506', name: 'Phường 3' },
        ],
      },
      {
        code: '794',
        name: 'Thành phố Tân An (Long An cũ)',
        wards: [
          { code: '27500', name: 'Phường 1' },
          { code: '27503', name: 'Phường 2' },
        ],
      },
    ],
  },
  {
    code: '86',
    name: 'Tỉnh Vĩnh Long',
    zone: 'SOUTH',
    legacyAliases: ['Vĩnh Long', 'Trà Vinh', 'Bến Tre'],
    districts: [
      {
        code: '855',
        name: 'Thành phố Vĩnh Long',
        wards: [
          { code: '29500', name: 'Phường 1' },
          { code: '29503', name: 'Phường 2' },
        ],
      },
      {
        code: '842',
        name: 'Thành phố Trà Vinh (Trà Vinh cũ)',
        wards: [
          { code: '29000', name: 'Phường 1' },
          { code: '29003', name: 'Phường 2' },
        ],
      },
      {
        code: '829',
        name: 'Thành phố Bến Tre (Bến Tre cũ)',
        wards: [
          { code: '28500', name: 'Phường An Hội' },
          { code: '28503', name: 'Phường Phú Khương' },
        ],
      },
    ],
  },
  {
    code: '87',
    name: 'Tỉnh Đồng Tháp',
    zone: 'SOUTH',
    legacyAliases: ['Đồng Tháp', 'Cao Lãnh', 'Sa Đéc', 'Tiền Giang', 'Mỹ Tho', 'Gò Công'],
    districts: [
      {
        code: '866',
        name: 'Thành phố Cao Lãnh',
        wards: [
          { code: '30000', name: 'Phường 1' },
          { code: '30003', name: 'Phường 2' },
        ],
      },
      {
        code: '867',
        name: 'Thành phố Sa Đéc',
        wards: [
          { code: '30050', name: 'Phường 1' },
          { code: '30053', name: 'Phường 2' },
        ],
      },
      {
        code: '815',
        name: 'Thành phố Mỹ Tho (Tiền Giang cũ)',
        wards: [
          { code: '28000', name: 'Phường 1' },
          { code: '28003', name: 'Phường 2' },
        ],
      },
      {
        code: '816',
        name: 'Thành phố Gò Công (Tiền Giang cũ)',
        wards: [
          { code: '28050', name: 'Phường 1' },
          { code: '28053', name: 'Phường 2' },
        ],
      },
    ],
  },
  {
    code: '89',
    name: 'Tỉnh An Giang',
    zone: 'SOUTH',
    legacyAliases: ['An Giang', 'Long Xuyên', 'Kiên Giang', 'Rạch Giá', 'Phú Quốc'],
    districts: [
      {
        code: '883',
        name: 'Thành phố Long Xuyên',
        wards: [
          { code: '30500', name: 'Phường Mỹ Bình' },
          { code: '30503', name: 'Phường Mỹ Long' },
        ],
      },
      {
        code: '899',
        name: 'Thành phố Rạch Giá (Kiên Giang cũ)',
        wards: [
          { code: '31000', name: 'Phường Vĩnh Thanh Vân' },
          { code: '31003', name: 'Phường Vĩnh Lạc' },
        ],
      },
      {
        code: '901',
        name: 'Thành phố Phú Quốc (Kiên Giang cũ)',
        wards: [
          { code: '31050', name: 'Phường Dương Đông' },
          { code: '31053', name: 'Phường An Thới' },
          { code: '31056', name: 'Xã Gành Dầu' },
          { code: '31059', name: 'Xã Hàm Ninh' },
        ],
      },
    ],
  },
  {
    code: '96',
    name: 'Tỉnh Cà Mau',
    zone: 'SOUTH',
    legacyAliases: ['Cà Mau', 'Bạc Liêu'],
    districts: [
      {
        code: '964',
        name: 'Thành phố Cà Mau',
        wards: [
          { code: '32000', name: 'Phường 1' },
          { code: '32003', name: 'Phường 2' },
          { code: '32006', name: 'Phường 5' },
        ],
      },
      {
        code: '954',
        name: 'Thành phố Bạc Liêu (Bạc Liêu cũ)',
        wards: [
          { code: '31800', name: 'Phường 1' },
          { code: '31803', name: 'Phường 2' },
          { code: '31806', name: 'Phường 3' },
        ],
      },
    ],
  },
];

/**
 * Utility functions for Vietnam Location management
 */
export function getProvinces(): ProvinceItem[] {
  return VIETNAM_LOCATIONS;
}

export function findProvince(query: string): ProvinceItem | undefined {
  if (!query) return undefined;
  const q = query.toLowerCase().trim();
  return VIETNAM_LOCATIONS.find(
    (p) =>
      p.code === query ||
      p.name.toLowerCase().includes(q) ||
      (p.legacyAliases && p.legacyAliases.some((alias) => alias.toLowerCase().includes(q)))
  );
}

export const getLocationByName = findProvince;

export function getDistrictsByProvince(provinceNameOrCode: string): DistrictItem[] {
  const p = findProvince(provinceNameOrCode);
  return p ? p.districts : [];
}

export function getWardsByDistrict(provinceNameOrCode: string, districtNameOrCode: string): WardItem[] {
  const districts = getDistrictsByProvince(provinceNameOrCode);
  const d = districts.find(
    (item) => item.code === districtNameOrCode || item.name.toLowerCase() === districtNameOrCode.toLowerCase()
  );
  return d ? d.wards : [];
}

/**
 * Calculate standard shipping fee based on Seller Warehouse Zone vs Buyer Delivery Zone
 */
export function calculateShippingFee(fromZone: RegionZone = 'SOUTH', toZone: RegionZone = 'SOUTH', isSameProvince: boolean = false): { fee: number; estimatedDays: string } {
  if (isSameProvince) {
    return { fee: 18000, estimatedDays: '1 - 2 ngày' };
  }
  if (fromZone === toZone) {
    return { fee: 28000, estimatedDays: '2 - 3 ngày' };
  }
  return { fee: 38000, estimatedDays: '3 - 4 ngày' };
}
