import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), fill_hex)
    tcPr.append(shd)

def set_cell_margins(cell, top=140, bottom=140, left=200, right=200):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def set_table_borders(table, color="B0B0B0", sz="4", val="single"):
    tblPr = table._tbl.tblPr
    tblBorders = OxmlElement('w:tblBorders')
    for border_name in ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']:
        border = OxmlElement(f'w:{border_name}')
        border.set(qn('w:val'), val)
        border.set(qn('w:sz'), sz)
        border.set(qn('w:space'), '0')
        border.set(qn('w:color'), color)
        tblBorders.append(border)
    tblPr.append(tblBorders)

def add_bookmarked_heading(doc, text, bookmark_name, bookmark_id, heading_level=1, font_size=Pt(13.5), bold=True):
    """
    Creates a heading paragraph with a valid enclosing Word Bookmark.
    Structure: <w:p><w:bookmarkStart .../><w:r><w:t>Text</w:t></w:r><w:bookmarkEnd .../></w:p>
    """
    p = doc.add_paragraph(style=f'Heading {heading_level}')
    p.paragraph_format.space_before = Pt(14)
    p.paragraph_format.space_after = Pt(3)
    p.paragraph_format.keep_with_next = True
    
    # Bookmark Start
    bm_start = OxmlElement('w:bookmarkStart')
    bm_start.set(qn('w:id'), str(bookmark_id))
    bm_start.set(qn('w:name'), bookmark_name)
    p._p.append(bm_start)
    
    # Text Run
    run = p.add_run(text)
    run.font.name = 'Times New Roman'
    run.font.size = font_size
    run.font.bold = bold
    run.font.color.rgb = RGBColor(0x00, 0x00, 0x00)
    
    # Bookmark End
    bm_end = OxmlElement('w:bookmarkEnd')
    bm_end.set(qn('w:id'), str(bookmark_id))
    p._p.append(bm_end)
    
    return p

def add_hyperlink_to_bookmark(paragraph, bookmark_name, text, color="003366", bold=False, italic=False, size=Pt(11), underline=False):
    """
    Creates a clickable internal hyperlink targeting a bookmark anchor in Word.
    """
    p = paragraph._p
    hyperlink = OxmlElement('w:hyperlink')
    hyperlink.set(qn('w:anchor'), bookmark_name)
    hyperlink.set(qn('w:history'), '1')
    
    new_run = OxmlElement('w:r')
    rPr = OxmlElement('w:rPr')
    
    if color:
        c = OxmlElement('w:color')
        c.set(qn('w:val'), color)
        rPr.append(c)
        
    if underline:
        u = OxmlElement('w:u')
        u.set(qn('w:val'), 'single')
        rPr.append(u)
    
    if bold:
        b = OxmlElement('w:b')
        rPr.append(b)
        
    if italic:
        i = OxmlElement('w:i')
        rPr.append(i)
        
    if size:
        sz = OxmlElement('w:sz')
        sz.set(qn('w:val'), str(int(size.pt * 2)))
        rPr.append(sz)
        
    rFont = OxmlElement('w:rFonts')
    rFont.set(qn('w:ascii'), 'Times New Roman')
    rFont.set(qn('w:hAnsi'), 'Times New Roman')
    rPr.append(rFont)
    
    new_run.append(rPr)
    text_elem = OxmlElement('w:t')
    text_elem.text = text
    new_run.append(text_elem)
    
    hyperlink.append(new_run)
    p.append(hyperlink)

def create_clean_report():
    doc = docx.Document()

    # Standard A4 Margins
    for section in doc.sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.8)
        section.right_margin = Inches(0.8)

    # Clean Academic Font
    style = doc.styles['Normal']
    font = style.font
    font.name = 'Times New Roman'
    font.size = Pt(12)
    font.color.rgb = RGBColor(0, 0, 0)

    # DOCUMENT HEADER
    top_p = doc.add_paragraph()
    # Enclose Top Anchor with a valid bookmark
    bm_s = OxmlElement('w:bookmarkStart')
    bm_s.set(qn('w:id'), '1')
    bm_s.set(qn('w:name'), 'TOC_TOP')
    top_p._p.append(bm_s)
    
    t_run = top_p.add_run("BÁO CÁO TỔNG HỢP GIAO DIỆN HỆ THỐNG")
    t_run.font.size = Pt(16)
    t_run.font.bold = True
    top_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    
    bm_e = OxmlElement('w:bookmarkEnd')
    bm_e.set(qn('w:id'), '1')
    top_p._p.append(bm_e)

    sub_p = doc.add_paragraph()
    sub_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    s_run = sub_p.add_run("Dự án: Hệ thống Thương mại Điện tử và Đọc sách Điện tử HuKi (HuKi E-book)\n")
    s_run.font.size = Pt(13)
    s_run.font.bold = True

    # DATA DEFINITION
    data = [
        {
            "part_id": "PART_1",
            "part_title": "PHẦN 1. PHÂN HỆ KHÁCH HÀNG & ĐỘC GIẢ (CLIENT / READER)",
            "part_desc": "Toàn bộ các màn hình chức năng thuộc luồng trải nghiệm của khách hàng từ trang chủ, tìm kiếm sách, đọc thử, mua sắm đến quản lý tủ sách và đơn hàng.",
            "items": [
                {"id": "SCR_1_1", "num": "1.1", "title": "Trang chủ", "url": "http://localhost:3000/", "desc": "Banner sự kiện, danh mục sách, flash sale, sách bán chạy và gợi ý sách cá nhân hóa."},
                {"id": "SCR_1_2", "num": "1.2", "title": "Khám phá & Danh mục sách", "url": "http://localhost:3000/books", "desc": "Danh sách sách với bộ lọc theo thể loại, định dạng (Ebook/Sách giấy), khoảng giá và sắp xếp."},
                {"id": "SCR_1_3", "num": "1.3", "title": "Chương trình Flash Sale", "url": "http://localhost:3000/flash-sale", "desc": "Danh sách sản phẩm giảm giá chớp nhoáng theo khung giờ và đồng hồ đếm ngược."},
                {"id": "SCR_1_4", "num": "1.4", "title": "Kho Voucher & Mã giảm giá", "url": "http://localhost:3000/vouchers", "desc": "Danh sách các mã giảm giá toàn sàn và voucher của từng shop, cho phép lưu vào ví."},
                {"id": "SCR_1_5", "num": "1.5", "title": "Chi tiết sách", "url": "http://localhost:3000/book/[id]", "desc": "Thông tin tác giả, NXB, mô tả tóm tắt, chọn loại sách giấy/Ebook/Combo, gian hàng bán và đánh giá."},
                {"id": "SCR_1_6", "num": "1.6", "title": "Trải nghiệm Đọc thử", "url": "http://localhost:3000/book/[id]/preview", "desc": "Cho phép độc giả đọc thử một số chương mẫu trước khi mua sách."},
                {"id": "SCR_1_7", "num": "1.7", "title": "Trình đọc sách trực tuyến (E-Reader)", "url": "http://localhost:3000/reader", "desc": "Giao diện đọc Ebook với các tùy chỉnh font chữ, cỡ chữ, chế độ đọc tối/sáng và mục lục chương."},
                {"id": "SCR_1_8", "num": "1.8", "title": "Sách nói (Audiobooks)", "url": "http://localhost:3000/audiobooks", "desc": "Trình phát âm thanh sách nói, điều chỉnh tốc độ đọc, hẹn giờ và chọn chương phát."},
                {"id": "SCR_1_9", "num": "1.9", "title": "Giỏ hàng", "url": "http://localhost:3000/cart", "desc": "Danh sách sản phẩm đã chọn theo từng shop, cập nhật số lượng và tính tạm tính."},
                {"id": "SCR_1_10", "num": "1.10", "title": "Thanh toán & Đặt hàng", "url": "http://localhost:3000/checkout", "desc": "Chọn địa chỉ giao hàng, phương thức vận chuyển, nhập voucher và chọn cổng thanh toán."},
                {"id": "SCR_1_11", "num": "1.11", "title": "Đặt hàng thành công", "url": "http://localhost:3000/order-success", "desc": "Thông báo xác nhận đơn hàng thành công kèm mã đơn và tổng tiền."},
                {"id": "SCR_1_12", "num": "1.12", "title": "Tủ sách cá nhân", "url": "http://localhost:3000/library", "desc": "Quản lý toàn bộ Ebook đã mua và hỗ trợ mở đọc trực tiếp."},
                {"id": "SCR_1_13", "num": "1.13", "title": "Quản lý thiết bị đọc (DRM)", "url": "http://localhost:3000/library/devices", "desc": "Quản lý danh sách các thiết bị được cấp quyền đọc sách có bản quyền."},
                {"id": "SCR_1_14", "num": "1.14", "title": "Quản lý đơn mua hàng", "url": "http://localhost:3000/orders", "desc": "Lịch sử các đơn hàng đã đặt theo từng trạng thái xử lý và vận chuyển."},
                {"id": "SCR_1_15", "num": "1.15", "title": "Chi tiết đơn hàng & Vận chuyển", "url": "http://localhost:3000/orders/[id]", "desc": "Thông tin chi tiết kiện hàng và dòng thời gian vận chuyển (tracking)."},
                {"id": "SCR_1_16", "num": "1.16", "title": "Hóa đơn điện tử", "url": "http://localhost:3000/orders/[id]/invoice", "desc": "Xem và tải hóa đơn thanh toán cho đơn hàng đã hoàn tất."},
                {"id": "SCR_1_17", "num": "1.17", "title": "Đánh giá đơn hàng", "url": "http://localhost:3000/orders/[id]/review", "desc": "Gửi nhận xét và chấm điểm sao cho sản phẩm/nhà sách sau khi nhận hàng."},
                {"id": "SCR_1_18", "num": "1.18", "title": "Yêu cầu đổi trả / Hoàn tiền", "url": "http://localhost:3000/orders/[id]/return", "desc": "Form gửi khiếu nại đổi trả hàng kèm lý do và ảnh bằng chứng."},
                {"id": "SCR_1_19", "num": "1.19", "title": "Hộp thư tin nhắn", "url": "http://localhost:3000/messages", "desc": "Chat trực tiếp giữa người mua và gian hàng/tư vấn viên."},
                {"id": "SCR_1_20", "num": "1.20", "title": "Hồ sơ cá nhân", "url": "http://localhost:3000/profile", "desc": "Quản lý thông tin tài khoản, họ tên, email, số điện thoại."},
                {"id": "SCR_1_21", "num": "1.21", "title": "Sổ địa chỉ nhận hàng", "url": "http://localhost:3000/profile/addresses", "desc": "Thêm, sửa và quản lý danh sách địa chỉ giao nhận hàng."},
                {"id": "SCR_1_22", "num": "1.22", "title": "Bảo mật tài khoản", "url": "http://localhost:3000/profile/security", "desc": "Đổi mật khẩu và quản lý các phiên đăng nhập đang hoạt động."},
                {"id": "SCR_1_23", "num": "1.23", "title": "Ví cá nhân / Hoàn tiền", "url": "http://localhost:3000/profile/wallet", "desc": "Theo dõi số dư ví tiền tích lũy và lịch sử giao dịch ví."},
                {"id": "SCR_1_24", "num": "1.24", "title": "Trang Tác giả", "url": "http://localhost:3000/author/[id]", "desc": "Hồ sơ tác giả, tiểu sử và toàn bộ danh mục sách đã xuất bản."},
                {"id": "SCR_1_25", "num": "1.25", "title": "Trang Gian hàng / Cửa hàng", "url": "http://localhost:3000/shop/[id]", "desc": "Giao diện trang riêng của nhà sách: banner, voucher và các đầu sách của shop."}
            ]
        },
        {
            "part_id": "PART_2",
            "part_title": "PHẦN 2. PHÂN HỆ XÁC THỰC & TÀI KHOẢN (AUTH)",
            "part_desc": "Các màn hình đăng nhập, đăng ký, khôi phục tài khoản và thiết lập sở thích ban đầu.",
            "items": [
                {"id": "SCR_2_1", "num": "2.1", "title": "Đăng nhập", "url": "http://localhost:3000/auth/login", "desc": "Form đăng nhập bằng tài khoản email và mật khẩu."},
                {"id": "SCR_2_2", "num": "2.2", "title": "Đăng ký tài khoản", "url": "http://localhost:3000/auth/register", "desc": "Form tạo tài khoản thành viên mới."},
                {"id": "SCR_2_3", "num": "2.3", "title": "Quên mật khẩu", "url": "http://localhost:3000/auth/forgot-password", "desc": "Gửi yêu cầu khôi phục mật khẩu qua email."},
                {"id": "SCR_2_4", "num": "2.4", "title": "Xác thực mã OTP", "url": "http://localhost:3000/auth/verify", "desc": "Nhập mã số xác thực để kích hoạt tài khoản an toàn."},
                {"id": "SCR_2_5", "num": "2.5", "title": "Màn hình khảo sát sở thích (Onboarding)", "url": "http://localhost:3000/onboarding", "desc": "Chọn thể loại yêu thích ban đầu để hệ thống tự động cá nhân hóa gợi ý."}
            ]
        },
        {
            "part_id": "PART_3",
            "part_title": "PHẦN 3. KÊNH NGƯỜI BÁN & NHÀ XUẤT BẢN (SELLER PORTAL)",
            "part_desc": "Dành cho chủ gian hàng và NXB quản lý sản phẩm, đơn hàng, xuất bản sách và tài chính.",
            "items": [
                {"id": "SCR_3_1", "num": "3.1", "title": "Tổng quan người bán (Dashboard)", "url": "http://localhost:3000/seller/dashboard", "desc": "Thống kê doanh số, số đơn hàng mới, biểu đồ kinh doanh và sách bán chạy."},
                {"id": "SCR_3_2", "num": "3.2", "title": "Danh sách sản phẩm", "url": "http://localhost:3000/seller/products", "desc": "Quản lý toàn bộ sách của shop, trạng thái bán và số lượng tồn kho."},
                {"id": "SCR_3_3", "num": "3.3", "title": "Đăng bán sách điện tử (Ebook)", "url": "http://localhost:3000/seller/product/create-ebook", "desc": "Tải file Ebook, cài đặt bản quyền DRM và đặt giá bán."},
                {"id": "SCR_3_4", "num": "3.4", "title": "Đăng bán sách giấy", "url": "http://localhost:3000/seller/product/create-physical", "desc": "Nhập thông tin quy cách, trọng lượng, số lượng tồn kho và giá bìa."},
                {"id": "SCR_3_5", "num": "3.5", "title": "Đăng bán sách Combo / Hybrid", "url": "http://localhost:3000/seller/product/create-hybrid", "desc": "Tạo gói bán kết hợp cả bản giấy và bản điện tử Ebook."},
                {"id": "SCR_3_6", "num": "3.6", "title": "Quản lý đơn hàng", "url": "http://localhost:3000/seller/orders", "desc": "Quy trình xác nhận đơn, đóng gói hàng và bàn giao cho đơn vị vận chuyển."},
                {"id": "SCR_3_7", "num": "3.7", "title": "Chi tiết đơn hàng shop", "url": "http://localhost:3000/seller/orders/[id]", "desc": "Xem chi tiết đơn, thông tin người nhận và in phiếu giao hàng."},
                {"id": "SCR_3_8", "num": "3.8", "title": "Quản lý đổi trả & Khiếu nại", "url": "http://localhost:3000/seller/returns", "desc": "Tiếp nhận và xử lý các yêu cầu đổi trả sách từ người mua."},
                {"id": "SCR_3_9", "num": "3.9", "title": "Quản lý Voucher của Shop", "url": "http://localhost:3000/seller/promotions/vouchers", "desc": "Tạo và quản lý các mã giảm giá áp dụng riêng cho gian hàng."},
                {"id": "SCR_3_10", "num": "3.10", "title": "Đăng ký Flash Sale", "url": "http://localhost:3000/seller/promotions/flash-sale", "desc": "Đăng ký các đầu sách tham gia vào chương trình Flash Sale của sàn."},
                {"id": "SCR_3_11", "num": "3.11", "title": "Báo cáo doanh thu", "url": "http://localhost:3000/seller/revenue", "desc": "Báo cáo doanh thu thực nhận, đối soát và dòng tiền bán hàng."},
                {"id": "SCR_3_12", "num": "3.12", "title": "Ví gian hàng & Rút tiền", "url": "http://localhost:3000/seller/wallet", "desc": "Quản lý số dư khả dụng và tạo lệnh rút tiền về tài khoản ngân hàng."},
                {"id": "SCR_3_13", "num": "3.13", "title": "Quản lý nhân viên shop", "url": "http://localhost:3000/seller/staff", "desc": "Phân quyền quản lý đơn hàng, kho và chăm sóc khách hàng cho nhân viên."},
                {"id": "SCR_3_14", "num": "3.14", "title": "Kênh chat tư vấn khách hàng", "url": "http://localhost:3000/seller/chat", "desc": "Khung chat trực tiếp với độc giả để giải đáp thắc mắc và tư vấn sách."}
            ]
        },
        {
            "part_id": "PART_4",
            "part_title": "PHẦN 4. KÊNH VẬN CHUYỂN & GIAO HÀNG (SHIPPER PORTAL)",
            "part_desc": "Giao diện dành riêng cho tài xế giao nhận để tiếp nhận đơn, cập nhật tiến độ giao và nộp tiền COD.",
            "items": [
                {"id": "SCR_4_1", "num": "4.1", "title": "Danh sách đơn hàng đang giao", "url": "http://localhost:3000/shipper", "desc": "Danh sách các đơn hàng đã nhận từ kho và đang trên đường giao đến khách."},
                {"id": "SCR_4_2", "num": "4.2", "title": "Nhận đơn hàng mới", "url": "http://localhost:3000/shipper/available-orders", "desc": "Danh sách các đơn hàng đã đóng gói sẵn đang chờ tài xế tiếp nhận."},
                {"id": "SCR_4_3", "num": "4.3", "title": "Lịch sử giao hàng", "url": "http://localhost:3000/shipper/history", "desc": "Lịch sử các đơn hàng đã giao thành công hoặc giao không thành công."},
                {"id": "SCR_4_4", "num": "4.4", "title": "Nộp tiền thu hộ COD", "url": "http://localhost:3000/shipper/remit-cod", "desc": "Quản lý số tiền mặt thu hộ đang giữ và tạo lệnh nộp tiền về hệ thống."}
            ]
        },
        {
            "part_id": "PART_5",
            "part_title": "PHẦN 5. PHÂN HỆ QUẢN TRỊ HỆ THỐNG (ADMIN PORTAL)",
            "part_desc": "Trung tâm kiểm soát toàn diện: giám sát KPI kinh doanh, kiểm duyệt nội dung, người dùng, tài chính và phân xử tranh chấp.",
            "items": [
                {"id": "SCR_5_1", "num": "5.1", "title": "Bảng điều khiển quản trị (Dashboard)", "url": "http://localhost:3000/admin/dashboard", "desc": "Tổng quan toàn sàn: Tổng giá trị giao dịch (GMV), biểu đồ tăng trưởng, đơn hàng và số sách."},
                {"id": "SCR_5_2", "num": "5.2", "title": "Quản lý người dùng & Phân quyền", "url": "http://localhost:3000/admin/users", "desc": "Danh sách tài khoản toàn hệ thống, phân quyền và khóa tài khoản vi phạm."},
                {"id": "SCR_5_3", "num": "5.3", "title": "Xét duyệt hồ sơ gian hàng / NXB", "url": "http://localhost:3000/admin/businesses", "desc": "Kiểm tra thông tin giấy phép và phê duyệt yêu cầu mở gian hàng của các NXB."},
                {"id": "SCR_5_4", "num": "5.4", "title": "Kiểm duyệt nội dung sách", "url": "http://localhost:3000/admin/book-moderation", "desc": "Kiểm duyệt sách mới đăng trước khi cho phép xuất bản công khai lên sàn."},
                {"id": "SCR_5_5", "num": "5.5", "title": "Quản lý danh mục thể loại", "url": "http://localhost:3000/admin/categories", "desc": "Cấu hình cấu trúc cây thể loại sách đa cấp và trạng thái hiển thị."},
                {"id": "SCR_5_6", "num": "5.6", "title": "Quản lý Flash Sale & Khuyến mãi sàn", "url": "http://localhost:3000/admin/promotions/flash-sale", "desc": "Cấu hình khung giờ Flash Sale toàn hệ thống và mã voucher sàn tài trợ."},
                {"id": "SCR_5_7", "num": "5.7", "title": "Quản lý tài chính & Ký quỹ Escrow", "url": "http://localhost:3000/admin/finance", "desc": "Theo dõi dòng tiền tạm giữ ký quỹ đơn hàng và duyệt lệnh rút tiền của shop."},
                {"id": "SCR_5_8", "num": "5.8", "title": "Trọng tài phân xử tranh chấp", "url": "http://localhost:3000/admin/disputes", "desc": "Xem xét bằng chứng và đưa ra quyết định xử lý khiếu nại giữa người mua và shop."},
                {"id": "SCR_5_9", "num": "5.9", "title": "Kho bảo mật bản quyền số (DRM Vault)", "url": "http://localhost:3000/admin/drm-vault", "desc": "Giám sát hệ thống cấp khóa mã hóa và bản quyền số Ebook."},
                {"id": "SCR_5_10", "num": "5.10", "title": "Báo cáo thống kê chuyên sâu", "url": "http://localhost:3000/admin/reports", "desc": "Xuất báo cáo tổng hợp hiệu suất kinh doanh và đối soát toàn sàn."}
            ]
        }
    ]

    # ==========================================
    # CLEAN UNIFIED TABLE OF CONTENTS (MỤC LỤC CHUNG)
    # ==========================================
    toc_heading = doc.add_paragraph()
    toc_heading.paragraph_format.space_before = Pt(12)
    toc_heading.paragraph_format.space_after = Pt(6)
    th_run = toc_heading.add_run("MỤC LỤC TỔNG HỢP")
    th_run.font.size = Pt(14)
    th_run.font.bold = True

    guide_p = doc.add_paragraph()
    guide_p.paragraph_format.space_after = Pt(8)
    g_run = guide_p.add_run("(Nhấn giữ phím Ctrl và bấm chuột vào bất kỳ mục nào để chuyển thẳng đến màn hình đó)")
    g_run.font.italic = True
    g_run.font.size = Pt(10.5)
    g_run.font.color.rgb = RGBColor(0x66, 0x66, 0x66)

    for section in data:
        p_sec = doc.add_paragraph()
        p_sec.paragraph_format.space_before = Pt(6)
        p_sec.paragraph_format.space_after = Pt(2)
        add_hyperlink_to_bookmark(
            p_sec, 
            bookmark_name=section["part_id"], 
            text=section["part_title"], 
            color="000000", 
            bold=True, 
            size=Pt(11.5),
            underline=True
        )

        for item in section["items"]:
            p_item = doc.add_paragraph()
            p_item.paragraph_format.left_indent = Inches(0.25)
            p_item.paragraph_format.space_before = Pt(1)
            p_item.paragraph_format.space_after = Pt(1)

            add_hyperlink_to_bookmark(
                p_item,
                bookmark_name=item["id"],
                text=f"{item['num']}. {item['title']}",
                color="003366",
                bold=False,
                size=Pt(11),
                underline=True
            )

    doc.add_page_break()

    # ==========================================
    # BUILD DETAILED SECTIONS
    # ==========================================
    bm_counter = 100
    for section in data:
        bm_counter += 1
        
        # Section Heading with enclosing bookmark
        h1 = add_bookmarked_heading(doc, section["part_title"], section["part_id"], bm_counter, heading_level=1, font_size=Pt(13.5), bold=True)
        h1.add_run("   ")
        add_hyperlink_to_bookmark(h1, "TOC_TOP", "[Về mục lục]", color="666666", italic=True, size=Pt(10), underline=True)

        desc_p = doc.add_paragraph()
        desc_p.paragraph_format.space_after = Pt(10)
        desc_p.paragraph_format.keep_with_next = True
        d_run = desc_p.add_run(section["part_desc"])
        d_run.font.italic = True
        d_run.font.size = Pt(11)
        d_run.font.color.rgb = RGBColor(0x44, 0x44, 0x44)

        for item in section["items"]:
            bm_counter += 1
            
            # Item Header with enclosing bookmark
            item_h = add_bookmarked_heading(doc, f"{item['num']}. {item['title']}", item["id"], bm_counter, heading_level=2, font_size=Pt(12), bold=True)
            item_h.add_run("   ")
            add_hyperlink_to_bookmark(item_h, "TOC_TOP", "[Về mục lục]", color="888888", italic=True, size=Pt(9.5), underline=True)

            # URL
            url_p = doc.add_paragraph()
            url_p.paragraph_format.space_after = Pt(1)
            url_p.paragraph_format.keep_with_next = True
            u_label = url_p.add_run("Đường dẫn: ")
            u_label.bold = True
            u_label.font.size = Pt(10.5)
            u_val = url_p.add_run(item["url"])
            u_val.font.size = Pt(10.5)
            u_val.font.color.rgb = RGBColor(0x00, 0x33, 0x66)

            # Description
            desc_p = doc.add_paragraph()
            desc_p.paragraph_format.space_after = Pt(6)
            desc_p.paragraph_format.keep_with_next = True
            d_label = desc_p.add_run("Mô tả: ")
            d_label.bold = True
            d_label.font.size = Pt(11)
            d_val = desc_p.add_run(item["desc"])
            d_val.font.size = Pt(11)

            # Clean Minimal Placeholder Box
            table = doc.add_table(rows=1, cols=1)
            table.alignment = WD_TABLE_ALIGNMENT.CENTER
            set_table_borders(table, color="CCCCCC", sz="4", val="single")

            cell = table.cell(0, 0)
            cell.width = Inches(6.8)
            set_cell_background(cell, "FAFAFA")
            set_cell_margins(cell, top=280, bottom=280, left=180, right=180)

            cp = cell.paragraphs[0]
            cp.alignment = WD_ALIGN_PARAGRAPH.CENTER
            
            c1 = cp.add_run(f"[ VỊ TRÍ CHÈN ẢNH: {item['title'].upper()} ({item['num']}) ]\n")
            c1.font.size = Pt(10.5)
            c1.font.bold = True
            c1.font.color.rgb = RGBColor(0x55, 0x55, 0x55)

            c2 = cp.add_run("(Dán hoặc kéo thả ảnh chụp màn hình vào đây)")
            c2.font.size = Pt(9.5)
            c2.font.italic = True
            c2.font.color.rgb = RGBColor(0x88, 0x88, 0x88)

            spacer = doc.add_paragraph()
            spacer.paragraph_format.space_after = Pt(8)

    output_path = r"e:\HuKi\Bao_Cao_Giao_Dien_HuKi.docx"
    doc.save(output_path)
    print(f"SUCCESS: Created {output_path}")

if __name__ == "__main__":
    create_clean_report()
