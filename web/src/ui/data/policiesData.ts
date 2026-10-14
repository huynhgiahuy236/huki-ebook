export interface PolicySection {
  id: string;
  title: string;
  content: string[];
  callout?: {
    type: 'info' | 'warning' | 'drm' | 'highlight';
    title: string;
    text: string;
  };
  table?: {
    headers: string[];
    rows: string[][];
  };
}

export interface PolicyDocument {
  slug: string;
  title: string;
  shortTitle: string;
  category: 'CHUNG' | 'KHACH_HANG' | 'DOI_TAC' | 'BAN_QUYEN';
  categoryLabel: string;
  icon: string;
  effectiveDate: string;
  version: string;
  summary: string;
  applicableTo: string;
  mappedPol: string[];
  sections: PolicySection[];
}

export const POLICIES_DATA: Record<string, PolicyDocument> = {
  'terms': {
    slug: 'terms',
    title: 'Điều Khoản Dịch Vụ Chung Sàn HuKi Ebook',
    shortTitle: 'Điều Khoản Dịch Vụ',
    category: 'CHUNG',
    categoryLabel: 'Quy Định Chung',
    icon: 'gavel',
    effectiveDate: '01/01/2026',
    version: '3.4',
    summary: 'Quy định quyền và nghĩa vụ của người mua, người bán và nền tảng khi tham gia mua bán sách giấy, sách điện tử và sách nói trên hệ sinh thái HuKi.',
    applicableTo: 'Toàn bộ độc giả, khách hàng, nhà bán hàng và tác giả/nhà xuất bản.',
    mappedPol: ['POL-01', 'POL-02'],
    sections: [
      {
        id: 'tong-quan',
        title: '1. Định Danh & Phạm Vi Điều Chỉnh',
        content: [
          'Hệ sinh thái TMĐT HuKi Ebook (thuộc Công ty TNHH Sách Điện Tử HuKi) là sàn giao dịch thương mại điện tử kết hợp đọc sách số bản quyền hàng đầu Việt Nam.',
          'Bằng việc đăng ký tài khoản, đăng tải ấn phẩm hoặc thực hiện đặt hàng trên HuKi, bạn đồng ý chịu sự ràng buộc bởi bản Điều khoản Dịch vụ này cùng các quy chế hoạt động liên quan.',
        ],
        callout: {
          type: 'info',
          title: 'Mô hình Hybrid độc quyền',
          text: 'HuKi vận hành đồng thời 2 nhóm sản phẩm: Sách In Giấy Vật Lý (giao hàng qua bưu tá) và Sách Điện Tử/Sách Nói (kích hoạt bản quyền đọc tức thì qua HuKi WebReader & Mobile App).'
        }
      },
      {
        id: 'tai-khoan',
        title: '2. Tài Khoản & Bảo Mật Người Dùng',
        content: [
          'Người dùng phải đủ 15 tuổi trở lên hoặc có sự đồng thuận của người giám hộ hợp pháp khi mở tài khoản và giao dịch trên sàn.',
          'Bạn có trách nhiệm bảo mật mật khẩu và tài khoản của mình. Mọi giao dịch phát sinh từ tài khoản của bạn được xem là giao dịch hợp lệ do chính bạn khởi tạo.',
          'Nghiêm cấm hành vi chia sẻ tài khoản cho nhiều người sử dụng trái phép, mua bán tài khoản hoặc sử dụng công cụ tự động (bot/crawler) can thiệp vào máy chủ.',
        ],
      },
      {
        id: 'giao-dich',
        title: '3. Nguyên Tắc Giao Dịch & Xác Nhận Đơn Hàng',
        content: [
          'Khi khách hàng đặt hàng, hợp đồng mua bán điện tử được xác lập ngay khi hệ thống HuKi gửi mã đơn hàng và thông báo xác nhận thành công qua email/ứng dụng.',
          'Đối với Sách Giấy: Giá bán niêm yết đã bao gồm thuế GTGT (VAT) theo luật định, chưa bao gồm phí vận chuyển (nếu có).',
          'Đối với Sách Điện Tử Ebook: Khách hàng mua quyền đọc và truy cập nội dung số vĩnh viễn gắn liền với tài khoản cá nhân, được bảo vệ bởi tiêu chuẩn mã hóa DRM.',
        ],
      },
      {
        id: 'vi-pham',
        title: '4. Xử Lý Vi Phạm & Chấm Dứt Dịch Vụ',
        content: [
          'HuKi có toàn quyền tạm khóa hoặc chấm dứt vĩnh viễn tài khoản nếu phát hiện người dùng: phát tán nội dung đồi trụy, vi phạm thuần phong mỹ tục, có hành vi gian lận voucher/khuyến mãi, hoặc cố tình trích xuất/bẻ khóa nội dung số DRM.',
          'Trường hợp gây thiệt hại cho tác giả hoặc sàn, đối tượng vi phạm phải bồi thường toàn bộ thiệt hại thực tế theo quy định của pháp luật Việt Nam.',
        ],
      },
    ],
  },

  'privacy': {
    slug: 'privacy',
    title: 'Chính Sách Bảo Mật & Bảo Vệ Dữ Liệu Cá Nhân',
    shortTitle: 'Chính Sách Bảo Mật',
    category: 'CHUNG',
    categoryLabel: 'Quy Định Chung',
    icon: 'security',
    effectiveDate: '01/01/2026',
    version: '2.8',
    summary: 'Cam kết bảo vệ dữ liệu cá nhân của người dùng theo Nghị định 13/2023/NĐ-CP và tiêu chuẩn mã hóa quốc tế SSL/TLS.',
    applicableTo: 'Mọi cá nhân truy cập, đăng ký và giao dịch trên nền tảng HuKi.',
    mappedPol: ['POL-02', 'POL-03'],
    sections: [
      {
        id: 'thu-thap-du-lieu',
        title: '1. Dữ Liệu Thu Thập & Mục Đích',
        content: [
          'Chúng tôi thu thập các thông tin tối thiểu cần thiết để phục vụ giao dịch: Họ tên, Số điện thoại, Email, Địa chỉ nhận hàng, và Lịch sử đọc sách.',
          'Đối với Nhà Bán Hàng: Thu thập thêm Mã số thuế, Số CCCD người đại diện, Giấy phép ĐKKD và Thông tin tài khoản ngân hàng thụ hưởng để phục vụ đối soát tài chính.',
          'Dữ liệu chỉ được sử dụng cho mục đích: Xử lý đơn hàng, Giao nhận bưu kiện, Cấp bản quyền DRM sách số, và Hỗ trợ giải quyết khiếu nại.',
        ],
      },
      {
        id: 'an-toan-thong-tin',
        title: '2. Biện Pháp Bảo Mật Kỹ Thuật',
        content: [
          'Toàn bộ kết nối được mã hóa bằng chuẩn TLS 1.3 / SSL 256-bit cao cấp.',
          'Mật khẩu người dùng và Mã PIN rút tiền được băm một chiều bằng thuật toán Bcrypt với Salt Rounds = 10, máy chủ và nhân viên HuKi hoàn toàn không thể xem được mã PIN gốc.',
          'Hệ thống sao lưu định kỳ phân tán và áp dụng tường lửa Web Application Firewall (WAF) ngăn chặn tấn công DDoS và rò rỉ dữ liệu.',
        ],
        callout: {
          type: 'highlight',
          title: 'Tuân thủ Nghị định 13/2023/NĐ-CP',
          text: 'HuKi không bao giờ bán, cho thuê hay chia sẻ dữ liệu cá nhân của bạn cho bên thứ ba vì mục đích tiếp thị khi chưa có sự đồng thuận rõ ràng.'
        }
      },
      {
        id: 'quyen-nguoi-dung',
        title: '3. Quyền Của Chủ Thể Dữ Liệu',
        content: [
          'Bạn có quyền truy cập, chỉnh sửa thông tin cá nhân hoặc yêu cầu trích xuất toàn bộ dữ liệu tài khoản tại mục Cài đặt Tài Khoản.',
          'Bạn có quyền yêu cầu xóa vĩnh viễn tài khoản và dữ liệu cá nhân bằng cách gửi email tới privacy@huki.vn hoặc thao tác tại trang Profile cá nhân.',
        ],
      },
    ],
  },

  'returns': {
    slug: 'returns',
    title: 'Chính Sách Đổi Trả, Hủy Đơn & Hoàn Tiền',
    shortTitle: 'Đổi Trả & Hoàn Tiền',
    category: 'KHACH_HANG',
    categoryLabel: 'Dành Cho Người Mua',
    icon: 'assignment_return',
    effectiveDate: '01/01/2026',
    version: '3.1',
    summary: 'Quy chuẩn đổi mới hoặc hoàn tiền 100% trong vòng 7 ngày cho Sách Giấy và quy định bản quyền đặc thù cho Sách Số DRM.',
    applicableTo: 'Khách hàng mua sách giấy vật lý và ấn phẩm nội dung số trên HuKi.',
    mappedPol: ['POL-11', 'POL-08'],
    sections: [
      {
        id: 'so-sanh-sach-giay-ebook',
        title: '1. So Sánh Quy Định Đổi Trả Giữa Sách Giấy & Ebook',
        content: [
          'Do bản chất hàng hóa số khác biệt hoàn toàn với hàng hóa vật lý, HuKi áp dụng 2 quy chuẩn riêng biệt minh bạch dưới đây:',
        ],
        table: {
          headers: ['Tiêu Chí', 'Sách In Giấy Vật Lý', 'Sách Điện Tử (Ebook) / Audio'],
          rows: [
            ['Thời hạn đổi trả', '07 ngày kể từ khi bưu tá giao hàng thành công', 'Không áp dụng sau khi đã kích hoạt bản quyền DRM'],
            ['Điều kiện áp dụng', 'Sách rách, ướt, in thiếu trang, mờ chữ, giao sai tựa sách', 'Lỗi file hệ thống không mở được (xử lý kỹ thuật trong 2h)'],
            ['Bằng chứng bắt buộc', 'Video quay rõ quá trình mở gói hàng (Unboxing)', 'Ảnh chụp màn hình lỗi mã lỗi DRM'],
            ['Chi phí đổi trả', 'Miễn phí 100% (Shop & Sàn chịu chi phí vận chuyển)', 'Không phát sinh chi phí'],
            ['Thời gian hoàn tiền', '1 - 2 ngày làm việc sau khi shop nhận lại sách', 'Hoàn tiền ngay nếu xác định lỗi xuất bản nội dung số'],
          ],
        },
      },
      {
        id: 'dieu-kien-doi-tra',
        title: '2. Điều Kiện Chấp Nhận Đổi Trả Sách In Giấy',
        content: [
          'Sách nhận được bị hư hỏng do vận chuyển (móp góc nặng, rách bìa, gãy gáy sách).',
          'Lỗi kỹ thuật xuất bản: Bị trùng trang, thiếu trang, ngược trang, mất chữ không đọc được.',
          'Giao sai sách so với đơn đặt hàng (sai ISBN, sai tựa đề hoặc sai tập).',
          'Sách phải còn nguyên bookmark, postcard hoặc quà tặng kèm (nếu đơn hàng có quà tặng khuyến mãi).',
        ],
        callout: {
          type: 'warning',
          title: 'Khuyến nghị quay video mở kiện hàng',
          text: 'Để bảo vệ quyền lợi tối đa khi khiếu nại, quý khách vui lòng quay video liền mạch từ lúc kiện hàng còn nguyên tem bưu tá đến khi kiểm tra sách bên trong.'
        }
      },
      {
        id: 'quy-trinh-hoan-tien',
        title: '3. Quy Trình Hoàn Tiền & Tiền Ký Quỹ Escrow',
        content: [
          'Khoản tiền mua hàng của bạn luôn được Quỹ Sàn HuKi Escrow giữ an toàn trong 7 ngày.',
          'Khi yêu cầu Trả hàng - Hoàn tiền được phê duyệt, hệ thống lập tức hoàn 100% tiền về Ví HuKi hoặc tài khoản ngân hàng/thẻ của bạn trong 24h - 48h làm việc.',
        ],
      },
    ],
  },

  'drm-copyright': {
    slug: 'drm-copyright',
    title: 'Bảo Vệ Bản Quyền Tác Giả & Chuẩn Mã Hóa DRM v3.4',
    shortTitle: 'Bản Quyền & DRM',
    category: 'BAN_QUYEN',
    categoryLabel: 'Bản Quyền Số',
    icon: 'lock',
    effectiveDate: '01/01/2026',
    version: '3.4',
    summary: 'Chính sách bảo vệ sở hữu trí tuệ, cơ chế chống sao chép bản lậu và công nghệ mã hóa DRM đa tầng độc quyền của HuKi.',
    applicableTo: 'Tác giả, Đơn vị xuất bản, và Người đọc ấn phẩm số.',
    mappedPol: ['POL-03', 'POL-04', 'POL-16'],
    sections: [
      {
        id: 'chuan-ma-hoa-drm',
        title: '1. Tiêu Chuẩn Công Nghệ Mã Hóa DRM v3.4',
        content: [
          'Tất cả file Ebook (EPUB/PDF) và Audiobook phát hành trên sàn đều được mã hóa bằng chuẩn AES-GCM 256-bit độc quyền của HuKi.',
          'Khóa giải mã (Decryption Key) được quản lý qua KMS (Key Management Service) và chỉ cấp quyền tạm thời vào bộ nhớ RAM của thiết bị khi người dùng đọc hợp lệ.',
          'Nghiêm cấm mọi hành vi trích xuất file, đảo ngược mã nguồn (reverse engineering) hoặc phát tán công cụ bẻ khóa DRM.',
        ],
        callout: {
          type: 'drm',
          title: 'Dynamic Forensic Watermark',
          text: 'Mỗi trang sách số khi hiển thị trên ứng dụng đều được chèn chữ ký số chìm vô hình (Forensic Watermark) mang mã định danh duy nhất của tài khoản người mua. Nếu chụp màn hình hoặc phát tán trái phép, hệ thống sẽ truy vết chính xác nguồn phát tán trong 60 giây.'
        }
      },
      {
        id: 'gioi-han-thiet-bi',
        title: '2. Giới Hạn Thiết Bị & Đọc Sách Ngoại Tuyến',
        content: [
          'Mỗi tài khoản được phép kích hoạt và đọc sách đồng thời trên tối đa 03 (ba) thiết bị cá nhân (VD: 1 Điện thoại, 1 Máy tính bảng, 1 Máy tính).',
          'Tính năng đọc ngoại tuyến (Offline Reading) lưu trữ bản mã hóa an toàn trên máy, tự động đồng bộ tiến độ đọc và ghi chú khi kết nối internet.',
        ],
      },
      {
        id: 'cam-ket-nha-ban',
        title: '3. Cam Kết Tác Quyền Của Nhà Xuất Bản & Tác Giả',
        content: [
          'Nhà xuất bản và Nhà bán hàng cam kết sở hữu đầy đủ Hợp đồng chuyển nhượng quyền tác giả hoặc Hợp đồng phân phối hợp pháp tại Việt Nam.',
          'HuKi cam kết chia sẻ doanh thu minh bạch (tỷ lệ 85% cho NXB / 15% phí nền tảng vận hành), đối soát và hiển thị báo cáo lượt đọc theo thời gian thực (Realtime Royalty Dashboard).',
        ],
      },
    ],
  },

  'shipping': {
    slug: 'shipping',
    title: 'Chính Sách Vận Chuyển, Giao Nhận & Đồng Kiểm',
    shortTitle: 'Vận Chuyển & Giao Nhận',
    category: 'KHACH_HANG',
    categoryLabel: 'Dành Cho Người Mua',
    icon: 'local_shipping',
    effectiveDate: '01/01/2026',
    version: '2.5',
    summary: 'Quy định về thời gian giao sách in, mức phí vận chuyển đa kho và quyền đồng kiểm ngoại quan khi nhận sách.',
    applicableTo: 'Khách hàng đặt mua sách giấy và các đối tác bưu chính vận chuyển (GHN, Viettel Post, HuKi Express).',
    mappedPol: ['POL-06', 'POL-07', 'POL-09'],
    sections: [
      {
        id: 'thoi-gian-giao-hang',
        title: '1. Thời Gian & Phạm Vi Giao Hàng',
        content: [
          'HuKi hỗ trợ giao sách trên phạm vi toàn quốc (63 tỉnh thành) thông qua các đối tác vận chuyển chuyên nghiệp.',
          'Nội thành Hà Nội & TP. Hồ Chí Minh: Giao nhanh từ 1 - 2 ngày làm việc.',
          'Các tỉnh thành khác và khu vực huyện/xã: Giao từ 2 - 4 ngày làm việc.',
        ],
      },
      {
        id: 'chinh-sach-dong-kiem',
        title: '2. Quyền Đồng Kiểm Ngoại Quan Khi Nhận Sách',
        content: [
          'Khách hàng ĐƯỢC PHÉP mở hộp kiện hàng để kiểm tra ngoại quan sách (số lượng cuốn, tựa sách, tình trạng bìa bên ngoài) trước mặt bưu tá.',
          'LƯU Ý: Không được bóc màng co (seal nilon) nguyên bản của nhà xuất bản hoặc bẻ gãy gáy sách trong lúc đồng kiểm.',
          'Nếu phát hiện móp rách nặng hoặc sai sách, quý khách có quyền từ chối nhận hàng và bưu tá sẽ hoàn trả về kho Shop miễn phí.',
        ],
        callout: {
          type: 'info',
          title: 'Đồng kiểm an toàn',
          text: 'Chính sách đồng kiểm giúp khách hàng yên tâm 100% không lo nhận phải hàng giả, hàng kém chất lượng hay giao thiếu sách.'
        }
      },
      {
        id: 'phi-van-chuyen',
        title: '3. Cước Phí Vận Chuyển & Đa Kho Hàng',
        content: [
          'Phí vận chuyển được tính tự động dựa trên khoảng cách từ Kho của Nhà Bán Hàng đến địa chỉ của bạn cùng trọng lượng thực tế của sách.',
          'Đơn hàng có sách từ nhiều Shop khác nhau sẽ được tính phí riêng theo từng kiện hàng và giao theo lộ trình độc lập.',
          'HuKi thường xuyên cung cấp Voucher Freeship (giảm từ 15.000đ đến 30.000đ) tại bước Thanh toán cho đơn hàng đạt điều kiện tối thiểu.',
        ],
      },
    ],
  },

  'payment-escrow': {
    slug: 'payment-escrow',
    title: 'Chính Sách Thanh Toán & Ký Quỹ Bảo Đảm HuKi Escrow',
    shortTitle: 'Thanh Toán & Ký Quỹ',
    category: 'CHUNG',
    categoryLabel: 'Quy Định Chung',
    icon: 'account_balance_wallet',
    effectiveDate: '01/01/2026',
    version: '3.0',
    summary: 'Cơ chế thanh toán đa kênh an toàn và mô hình Ký quỹ trung gian 7 ngày (Escrow) bảo vệ tuyệt đối tiền của khách hàng.',
    applicableTo: 'Người mua hàng và Người bán tham gia giao dịch trên sàn.',
    mappedPol: ['POL-08', 'POL-14', 'POL-15'],
    sections: [
      {
        id: 'phuong-thuc-thanh-toan',
        title: '1. Các Phương Thức Thanh Toán Hỗ Trợ',
        content: [
          'Thanh toán chuyển khoản tự động VietQR Pro / PayOS (khớp lệnh trong 3 giây).',
          'Thẻ ATM nội địa (NAPAS), Thẻ quốc tế Visa / MasterCard / JCB.',
          'Thanh toán tiền mặt khi nhận hàng (COD) áp dụng cho đơn sách giấy dưới 2.000.000đ.',
          'Thanh toán qua Ví điện tử HuKi Pay (dành cho bạn đọc thân thiết).',
        ],
      },
      {
        id: 'co-che-ky-quy-escrow',
        title: '2. Cơ Chế Ký Quỹ Trung Gian HuKi Escrow (POL-08)',
        content: [
          'Khi bạn thanh toán, tiền KHÔNG được chuyển ngay cho Shop mà được giữ an toàn tại tài khoản Ký Quỹ Sàn HuKi Escrow.',
          'Với Sách Giấy: Tiền được giữ ký quỹ trong đúng 07 ngày kể từ khi đơn hàng giao thành công để bảo đảm thời hạn đổi trả.',
          'Với Sách Số: Tiền được giữ 24 giờ để đảm bảo file sách đọc bình thường, sau đó giải ngân vào Ví người bán.',
          'Nếu có khiếu nại phát sinh trong thời gian giữ tiền, tiền sẽ bị đóng băng (Frozen Balance) cho đến khi hai bên hòa giải hoặc có quyết định của Trọng tài Sàn.',
        ],
        callout: {
          type: 'highlight',
          title: 'Không lo mất tiền',
          text: 'Cơ chế Escrow chuẩn quốc tế đảm bảo người mua chỉ thanh toán khi đã nhận đúng sách thật 100%, bảo vệ quyền lợi tuyệt đối cho khách hàng.'
        }
      },
    ],
  },

  'seller-rules': {
    slug: 'seller-rules',
    title: 'Quy Chế Hoạt Động, Tiêu Chuẩn Gian Hàng & Chế Tài Người Bán',
    shortTitle: 'Quy Chế Gian Hàng',
    category: 'DOI_TAC',
    categoryLabel: 'Dành Cho Đối Tác',
    icon: 'storefront',
    effectiveDate: '01/01/2026',
    version: '3.3',
    summary: 'Quy chuẩn vận hành dành cho Hộ kinh doanh cá thể, Nhà sách và NXB: tiêu chuẩn sách thật, thời hạn đóng gói và chế tài xử phạt.',
    applicableTo: 'Tất cả các chủ shop, hộ kinh doanh và doanh nghiệp xuất bản mở gian hàng trên HuKi.',
    mappedPol: ['POL-01', 'POL-10', 'POL-15', 'POL-17'],
    sections: [
      {
        id: 'tieu-chuan-mo-shop',
        title: '1. Tiêu Chuẩn Mở Gian Hàng (Hộ KD & Doanh Nghiệp)',
        content: [
          'HuKi công nhận 2 mô hình đối tác kinh doanh:',
          '• Hộ Kinh Doanh Cá Thể: Phù hợp tiệm sách tư nhân, hiệu sách cũ, cửa hàng truyện tranh. Yêu cầu có Mã số thuế hộ kinh doanh và CCCD chủ hộ.',
          '• Doanh Nghiệp / NXB: Yêu cầu Giấy chứng nhận ĐKKD, Giấy phép xuất bản số và cam kết chuẩn bảo mật DRM.',
        ],
      },
      {
        id: 'cam-ket-sach-that',
        title: '2. Cam Kết Tuyệt Đối Về Sách Thật & Nguồn Gốc',
        content: [
          'Nghiêm cấm tuyệt đối hành vi bày bán sách lậu, sách in sao chụp (photocopy) trái phép, sách vi phạm quyền tác giả.',
          'Nếu phát hiện vi phạm: Shop bị phạt 100% doanh thu đơn hàng, khóa vĩnh viễn gian hàng và chuyển hồ sơ sang Cục Xuất Bản & Cơ quan chức năng xử lý theo Điều 225 Bộ luật Hình sự.',
        ],
        callout: {
          type: 'warning',
          title: 'Chính sách Zero-Tolerance với sách lậu',
          text: 'HuKi kiên quyết xây dựng thị trường sách văn minh, bảo vệ quyền lợi tác giả và sự phát triển bền vững của ngành xuất bản Việt Nam.'
        }
      },
      {
        id: 'sla-dong-goi',
        title: '3. Tiêu Chuẩn SLA Đóng Gói & Bàn Giao Hàng',
        content: [
          'Shop có trách nhiệm xác nhận đơn hàng trong vòng 12 giờ làm việc.',
          'Đóng gói sách bằng màng xốp nổ chống sốc tối thiểu 2 lớp và dán tem niêm phong kiện hàng.',
          'Bàn giao sách cho bưu tá đúng hẹn trong vòng 24 giờ kể từ khi xác nhận đơn.',
        ],
      },
      {
        id: 'tai-chinh-rut-tien',
        title: '4. Đối Soát Doanh Thu & Quy Trình Rút Tiền',
        content: [
          'Sau khi hồ sơ được duyệt (APPROVED), Shop hoàn tất liên kết tài khoản ngân hàng chính chủ và thiết lập Mã PIN 6 số an toàn.',
          'Rút tiền từ Ví gian hàng: Số tiền tối thiểu 100.000đ/lần, xác thực an toàn bằng Mã PIN 6 số.',
          'Tiền rút được chuyển thẳng về tài khoản ngân hàng thụ hưởng đã xác thực của Shop.',
        ],
      },
    ],
  },

  'disputes': {
    slug: 'disputes',
    title: 'Quy Trình Xử Lý Tranh Chấp, Khiếu Nại & Trọng Tài Sàn',
    shortTitle: 'Khiếu Nại & Trọng Tài',
    category: 'CHUNG',
    categoryLabel: 'Quy Định Chung',
    icon: 'balance',
    effectiveDate: '01/01/2026',
    version: '2.6',
    summary: 'Cơ chế giải quyết công bằng, minh bạch giữa Người mua và Người bán với sự tham gia của Hội đồng Trọng tài Sàn HuKi.',
    applicableTo: 'Người mua hàng, Người bán và Ban giải quyết khiếu nại HuKi.',
    mappedPol: ['POL-12', 'POL-13'],
    sections: [
      {
        id: 'nguyen-tac-hoa-giai',
        title: '1. Nguyên Tắc Hòa Giải Tự Nguyện',
        content: [
          'HuKi khuyến khích Người mua và Người bán chủ động trao đổi văn minh thông qua kênh HuKi Chat để tìm phương án giải quyết tối ưu trong vòng 48 giờ đầu tiên.',
          'Người bán có quyền: Đồng ý đổi mới, Đồng ý hoàn tiền hoặc Đề xuất phương án bồi thường một phần thỏa đáng.',
        ],
      },
      {
        id: 'trong-tai-san',
        title: '2. Quyền Quyết Định Của Trọng Tài Sàn',
        content: [
          'Nếu sau 48 giờ hai bên không thống nhất được phương án, vụ việc được chuyển lên Hội đồng Trọng tài Sàn HuKi thụ lý độc lập.',
          'Trọng tài sàn sẽ căn cứ vào: Video mở hộp, Ảnh chụp tình trạng sách, Báo cáo cân nặng bưu tá và Lịch sử tin nhắn chat để đưa ra phán quyết chung thẩm.',
          'Phán quyết của Trọng tài Sàn là quyết định cuối cùng có hiệu lực thi hành đối với khoản tiền ký quỹ Escrow.',
        ],
        callout: {
          type: 'info',
          title: 'Thời gian phán quyết',
          text: 'Trọng tài Sàn cam kết ra quyết định xử lý khiếu nại trong vòng không quá 24 giờ kể từ khi tiếp nhận hồ sơ tranh chấp.'
        }
      },
    ],
  },
};

export const POLICIES_LIST = Object.values(POLICIES_DATA);
