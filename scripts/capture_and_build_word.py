import asyncio
import os
import sys
import json
import time
import requests
from playwright.async_api import async_playwright

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

SCREENSHOT_DIR = r"e:\HuKi\screenshots"
DOCX_OUTPUT = r"e:\HuKi\Bao_Cao_Giao_Dien_HuKi.docx"
BASE_URL = "http://localhost:3100"
API_BASE = "http://localhost:3001/api/v1"

# Accounts
BUYER_ACC = {"email": "huy@gmail.com", "password": "Password123!"}
SELLER_ACC = {"email": "phuongthuy@gmail.com", "password": "Password123!"}
ADMIN_ACC = {"email": "adminhuki@gmail.com", "password": "Password123!"}

def login_api(email, password):
    for base in ["http://localhost:3001/api/v1", "http://localhost:3100/api/v1"]:
        try:
            res = requests.post(f"{base}/auth/login", json={"email": email, "password": password}, timeout=5)
            if res.status_code in [200, 201]:
                data = res.json()
                payload = data.get("data", data)
                token = payload.get("accessToken") or payload.get("access_token") or payload.get("token")
                user = payload.get("user", {})
                if token:
                    return token, user
        except Exception as e:
            pass
    return None, None

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), fill_hex)
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def set_table_borders(table, color="D0D7DE", sz="4", val="single"):
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
    p = doc.add_paragraph(style=f'Heading {heading_level}')
    p.paragraph_format.space_before = Pt(14)
    p.paragraph_format.space_after = Pt(3)
    p.paragraph_format.keep_with_next = True
    
    bm_start = OxmlElement('w:bookmarkStart')
    bm_start.set(qn('w:id'), str(bookmark_id))
    bm_start.set(qn('w:name'), bookmark_name)
    p._p.append(bm_start)
    
    run = p.add_run(text)
    run.font.name = 'Times New Roman'
    run.font.size = font_size
    run.font.bold = bold
    run.font.color.rgb = RGBColor(0x00, 0x00, 0x00)
    
    bm_end = OxmlElement('w:bookmarkEnd')
    bm_end.set(qn('w:id'), str(bookmark_id))
    p._p.append(bm_end)
    return p

def add_hyperlink_to_bookmark(paragraph, bookmark_name, text, color="003366", bold=False, italic=False, size=Pt(11), underline=False):
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

async def capture_all_screenshots():
    os.makedirs(SCREENSHOT_DIR, exist_ok=True)
    print("=== BẮT ĐẦU CHỤP ẢNH TỰ ĐỘNG BẰNG PLAYWRIGHT ===")

    # Get tokens
    buyer_token, buyer_user = login_api(BUYER_ACC["email"], BUYER_ACC["password"])
    seller_token, seller_user = login_api(SELLER_ACC["email"], SELLER_ACC["password"])
    admin_token, admin_user = login_api(ADMIN_ACC["email"], ADMIN_ACC["password"])

    print(f"Buyer Token: {'OK' if buyer_token else 'FAILED'}")
    print(f"Seller Token: {'OK' if seller_token else 'FAILED'}")
    print(f"Admin Token: {'OK' if admin_token else 'FAILED'}")

    async with async_playwright() as p:
        browser = None
        for ch in ["msedge", "chrome", None]:
            try:
                if ch:
                    browser = await p.chromium.launch(channel=ch, headless=True)
                else:
                    browser = await p.chromium.launch(headless=True, args=['--no-sandbox', '--disable-setuid-sandbox'])
                if browser:
                    print(f"Launched browser using channel: {ch or 'bundled-chromium'}")
                    break
            except Exception as e:
                pass
        
        if not browser:
            raise RuntimeError("Could not launch any browser via Playwright")
        
        # Helper to set localStorage token
        async def init_context_with_auth(token, user):
            ctx = await browser.new_context(
                viewport={"width": 1440, "height": 900},
                device_scale_factor=1.5
            )
            page = await ctx.new_page()
            # Prime domain
            await page.goto(f"{BASE_URL}/auth/login", wait_until="commit")
            if token:
                user_json = json.dumps(user or {})
                await page.evaluate(f"""() => {{
                    localStorage.setItem('huki_access_token', '{token}');
                    localStorage.setItem('accessToken', '{token}');
                    localStorage.setItem('token', '{token}');
                    localStorage.setItem('huki_user', JSON.stringify({user_json}));
                    localStorage.setItem('user', JSON.stringify({user_json}));
                    document.cookie = 'token={token}; path=/; max-age=86400';
                    document.cookie = 'accessToken={token}; path=/; max-age=86400';
                }}""")
            return ctx, page

        # Guest Context
        guest_ctx = await browser.new_context(viewport={"width": 1440, "height": 900}, device_scale_factor=1.5)
        guest_page = await guest_ctx.new_page()

        # Buyer Context
        buyer_ctx, buyer_page = await init_context_with_auth(buyer_token, buyer_user)

        # Seller Context
        seller_ctx, seller_page = await init_context_with_auth(seller_token, seller_user)

        # Admin Context
        admin_ctx, admin_page = await init_context_with_auth(admin_token, admin_user)

        # Shot helper
        async def snap(page, url, file_name, wait_sec=2.5, scroll_y=0, full_page=False, action=None):
            out_file = os.path.join(SCREENSHOT_DIR, file_name)
            try:
                full_url = f"{BASE_URL}{url}" if url.startswith("/") else url
                print(f"Capturing [{file_name}]: {full_url}")
                try:
                    await page.goto(full_url, wait_until="load", timeout=12000)
                except Exception:
                    try:
                        await page.goto(full_url, wait_until="domcontentloaded", timeout=12000)
                    except Exception:
                        pass
                await asyncio.sleep(wait_sec)
                
                if scroll_y > 0:
                    await page.evaluate(f"window.scrollTo(0, {scroll_y})")
                    await asyncio.sleep(1)

                if action:
                    await action(page)
                    await asyncio.sleep(1)

                await page.screenshot(path=out_file, full_page=full_page)
                print(f"  -> Saved {file_name}")
                return out_file
            except Exception as e:
                print(f"  -> Error capturing {file_name}: {e}")
                try:
                    await page.screenshot(path=out_file)
                except:
                    pass
                return out_file

        # =========================================================================
        # 1. PHẦN 1: KHÁCH HÀNG & ĐỘC GIẢ (CLIENT / READER)
        # =========================================================================
        # 1.1 Homepage
        await snap(guest_page, "/", "1_1_homepage_hero.png", scroll_y=0)
        await snap(guest_page, "/", "1_1_homepage_flashsale.png", scroll_y=550)
        await snap(guest_page, "/", "1_1_homepage_recommend.png", scroll_y=1200)
        await snap(guest_page, "/", "1_1_homepage_categories.png", scroll_y=1900)

        # 1.2 Books Catalog
        await snap(guest_page, "/books", "1_2_books_catalog_top.png", scroll_y=0)
        await snap(guest_page, "/books?format=ebook", "1_2_books_filter_ebook.png", scroll_y=200)

        # 1.3 Flash Sale
        await snap(guest_page, "/flash-sale", "1_3_flash_sale.png", scroll_y=100)

        # 1.4 Vouchers
        await snap(buyer_page, "/vouchers", "1_4_vouchers_wallet.png", scroll_y=100)

        # 1.5 Book Detail (Find first valid book or sample)
        await snap(buyer_page, "/book/b-1", "1_5_book_detail_overview.png", scroll_y=0)
        await snap(buyer_page, "/book/b-1", "1_5_book_detail_reviews.png", scroll_y=800)

        # 1.6 Preview
        await snap(buyer_page, "/book/b-1/preview", "1_6_book_preview.png", scroll_y=0)

        # 1.7 E-Reader
        await snap(buyer_page, "/reader", "1_7_reader_light.png", scroll_y=0)
        
        # Reader Dark Mode action
        async def set_reader_dark(p):
            try:
                btn = await p.query_selector("button:has-text('Tối'), button:has-text('Dark'), [title*='Dark'], [title*='Tối']")
                if btn:
                    await btn.click()
            except:
                pass
        await snap(buyer_page, "/reader", "1_7_reader_dark.png", action=set_reader_dark)

        # 1.8 Audiobooks
        await snap(buyer_page, "/audiobooks", "1_8_audiobooks_player.png", scroll_y=100)

        # 1.9 Cart
        await snap(buyer_page, "/cart", "1_9_cart.png", scroll_y=0)

        # 1.10 Checkout
        await snap(buyer_page, "/checkout", "1_10_checkout_address.png", scroll_y=0)
        await snap(buyer_page, "/checkout", "1_10_checkout_payment.png", scroll_y=500)

        # 1.11 Order Success
        await snap(buyer_page, "/order-success", "1_11_order_success.png", scroll_y=0)

        # 1.12 Library
        await snap(buyer_page, "/library", "1_12_library.png", scroll_y=0)

        # 1.13 DRM Devices
        await snap(buyer_page, "/library/devices", "1_13_library_devices.png", scroll_y=0)

        # 1.14 Orders List
        await snap(buyer_page, "/orders", "1_14_orders_list.png", scroll_y=0)

        # 1.15 Order Detail & Tracking
        await snap(buyer_page, "/orders/ord-sample", "1_15_order_detail_tracking.png", scroll_y=0)

        # 1.16 Invoice
        await snap(buyer_page, "/orders/ord-sample/invoice", "1_16_order_invoice.png", scroll_y=0)

        # 1.17 Review Form
        await snap(buyer_page, "/orders/ord-sample/review", "1_17_order_review.png", scroll_y=0)

        # 1.18 Return / Dispute
        await snap(buyer_page, "/orders/ord-sample/return", "1_18_order_return.png", scroll_y=0)

        # 1.19 Messages Chat
        await snap(buyer_page, "/messages", "1_19_messages_chat.png", scroll_y=0)

        # 1.20 - 1.23 Profile & Subpages
        await snap(buyer_page, "/profile", "1_20_profile.png", scroll_y=0)
        await snap(buyer_page, "/profile/addresses", "1_21_profile_addresses.png", scroll_y=0)
        await snap(buyer_page, "/profile/security", "1_22_profile_security.png", scroll_y=0)
        await snap(buyer_page, "/profile/wallet", "1_23_profile_wallet.png", scroll_y=0)

        # 1.24 Author & 1.25 Shop
        await snap(buyer_page, "/author/auth-1", "1_24_author_page.png", scroll_y=0)
        await snap(buyer_page, "/shop/pub-1", "1_25_shop_page.png", scroll_y=0)


        # =========================================================================
        # 2. PHẦN 2: XÁC THỰC & ONBOARDING (AUTH)
        # =========================================================================
        await snap(guest_page, "/auth/login", "2_1_auth_login.png", scroll_y=0)
        await snap(guest_page, "/auth/register", "2_2_auth_register.png", scroll_y=0)
        await snap(guest_page, "/auth/forgot-password", "2_3_auth_forgot_password.png", scroll_y=0)
        await snap(guest_page, "/auth/verify", "2_4_auth_verify_otp.png", scroll_y=0)
        await snap(guest_page, "/onboarding", "2_5_onboarding_genre_selection.png", scroll_y=0)


        # =========================================================================
        # 3. PHẦN 3: KÊNH NGƯỜI BÁN & NXB (SELLER PORTAL - phuongthuy@gmail.com)
        # =========================================================================
        # 3.1 Business Registration Flow
        await snap(buyer_page, "/seller/register", "3_0_seller_register_step1.png", scroll_y=0)
        await snap(buyer_page, "/seller/stores/new", "3_0_seller_register_step2_store.png", scroll_y=0)

        # 3.2 Seller Dashboard
        await snap(seller_page, "/seller/dashboard", "3_1_seller_dashboard_kpi.png", scroll_y=0)
        await snap(seller_page, "/seller/dashboard", "3_1_seller_dashboard_charts.png", scroll_y=500)

        # 3.3 Products & Creations
        await snap(seller_page, "/seller/products", "3_2_seller_products_list.png", scroll_y=0)
        await snap(seller_page, "/seller/product/create-ebook", "3_3_seller_create_ebook.png", scroll_y=0)
        await snap(seller_page, "/seller/product/create-physical", "3_4_seller_create_physical.png", scroll_y=0)
        await snap(seller_page, "/seller/product/create-hybrid", "3_5_seller_create_hybrid.png", scroll_y=0)

        # 3.4 Orders
        await snap(seller_page, "/seller/orders", "3_6_seller_orders_list.png", scroll_y=0)
        await snap(seller_page, "/seller/orders/ord-sample", "3_7_seller_order_detail.png", scroll_y=0)
        await snap(seller_page, "/seller/returns", "3_8_seller_returns.png", scroll_y=0)

        # 3.5 Promotions
        await snap(seller_page, "/seller/promotions/vouchers", "3_9_seller_vouchers.png", scroll_y=0)
        await snap(seller_page, "/seller/promotions/flash-sale", "3_10_seller_flash_sale.png", scroll_y=0)

        # 3.6 Financials & Management
        await snap(seller_page, "/seller/revenue", "3_11_seller_revenue.png", scroll_y=0)
        await snap(seller_page, "/seller/wallet", "3_12_seller_wallet_payout.png", scroll_y=0)
        await snap(seller_page, "/seller/staff", "3_13_seller_staff.png", scroll_y=0)
        await snap(seller_page, "/seller/chat", "3_14_seller_chat.png", scroll_y=0)


        # =========================================================================
        # 4. PHẦN 4: KÊNH GIAO HÀNG (SHIPPER PORTAL)
        # =========================================================================
        await snap(seller_page, "/shipper", "4_1_shipper_active_deliveries.png", scroll_y=0)
        await snap(seller_page, "/shipper/available-orders", "4_2_shipper_available_orders.png", scroll_y=0)
        await snap(seller_page, "/shipper/history", "4_3_shipper_history.png", scroll_y=0)
        await snap(seller_page, "/shipper/remit-cod", "4_4_shipper_remit_cod.png", scroll_y=0)


        # =========================================================================
        # 5. PHẦN 5: QUẢN TRỊ HỆ THỐNG (ADMIN PORTAL - adminhuki@gmail.com)
        # =========================================================================
        await snap(admin_page, "/admin/dashboard", "5_1_admin_dashboard_kpi.png", scroll_y=0)
        await snap(admin_page, "/admin/dashboard", "5_1_admin_dashboard_charts.png", scroll_y=500)
        await snap(admin_page, "/admin/users", "5_2_admin_users.png", scroll_y=0)
        await snap(admin_page, "/admin/businesses", "5_3_admin_businesses_approvals.png", scroll_y=0)
        await snap(admin_page, "/admin/book-moderation", "5_4_admin_book_moderation.png", scroll_y=0)
        await snap(admin_page, "/admin/categories", "5_5_admin_categories_tree.png", scroll_y=0)
        await snap(admin_page, "/admin/promotions/flash-sale", "5_6_admin_promotions_flash_sale.png", scroll_y=0)
        await snap(admin_page, "/admin/finance", "5_7_admin_finance_escrow.png", scroll_y=0)
        await snap(admin_page, "/admin/disputes", "5_8_admin_disputes_arbitration.png", scroll_y=0)
        await snap(admin_page, "/admin/drm-vault", "5_9_admin_drm_vault.png", scroll_y=0)
        await snap(admin_page, "/admin/reports", "5_10_admin_reports.png", scroll_y=0)

        await browser.close()
        print("=== HOÀN TẤT CHỤP ẢNH TẤT CẢ CÁC MÀN HÌNH ===")

def build_complete_word_document():
    print(f"=== ĐANG XÂY DỰNG FILE WORD TỔNG HỢP: {DOCX_OUTPUT} ===")
    doc = docx.Document()

    for section in doc.sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.8)
        section.right_margin = Inches(0.8)

    style = doc.styles['Normal']
    font = style.font
    font.name = 'Times New Roman'
    font.size = Pt(12)
    font.color.rgb = RGBColor(0, 0, 0)

    # Document Header
    top_p = doc.add_paragraph()
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

    # Master Structure
    data = [
        {
            "part_id": "PART_1",
            "part_title": "PHẦN 1. PHÂN HỆ KHÁCH HÀNG & ĐỘC GIẢ (CLIENT / READER)",
            "part_desc": "Toàn bộ các màn hình chức năng thuộc luồng trải nghiệm của khách hàng từ trang chủ, tìm kiếm sách, đọc thử, mua sắm đến quản lý tủ sách và đơn hàng.",
            "items": [
                {
                    "id": "SCR_1_1", "num": "1.1", "title": "Trang chủ (Homepage)", "url": "http://localhost:3100/",
                    "desc": "Trang chủ hệ thống với Banner sự kiện, danh mục sách thịnh hành, Flash Sale theo khung giờ, sách gợi ý cá nhân hóa và sách bán chạy.",
                    "images": [
                        ("1_1_homepage_hero.png", "Ảnh 1.1a: Khu vực Hero Banner & Danh mục sách nổi bật"),
                        ("1_1_homepage_flashsale.png", "Ảnh 1.1b: Khu vực Flash Sale giảm sốc có đếm ngược giờ"),
                        ("1_1_homepage_recommend.png", "Ảnh 1.1c: Khu vực Gợi ý sách theo sở thích độc giả & Sách bán chạy"),
                        ("1_1_homepage_categories.png", "Ảnh 1.1d: Cụm thể loại sách & Chân trang")
                    ]
                },
                {
                    "id": "SCR_1_2", "num": "1.2", "title": "Khám phá & Danh mục sách", "url": "http://localhost:3100/books",
                    "desc": "Danh sách sách với bộ lọc đa chiều (thể loại, định dạng Ebook/Sách giấy, khoảng giá, đánh giá sao, nhà xuất bản) và sắp xếp.",
                    "images": [
                        ("1_2_books_catalog_top.png", "Ảnh 1.2a: Toàn bộ danh mục sách & Bộ lọc bên trái"),
                        ("1_2_books_filter_ebook.png", "Ảnh 1.2b: Lọc danh sách theo định dạng Ebook")
                    ]
                },
                {
                    "id": "SCR_1_3", "num": "1.3", "title": "Chương trình Flash Sale", "url": "http://localhost:3100/flash-sale",
                    "desc": "Sàn Flash Sale săn deal giảm giá chớp nhoáng theo từng khung giờ trong ngày.",
                    "images": [("1_3_flash_sale.png", "Ảnh 1.3: Giao diện săn Flash Sale trực tiếp")]
                },
                {
                    "id": "SCR_1_4", "num": "1.4", "title": "Kho Voucher & Mã giảm giá", "url": "http://localhost:3100/vouchers",
                    "desc": "Tổng hợp mã khuyến mãi toàn sàn và voucher riêng của gian hàng, cho phép lưu vào ví trước khi mua sắm.",
                    "images": [("1_4_vouchers_wallet.png", "Ảnh 1.4: Kho voucher giảm giá toàn sàn & shop")]
                },
                {
                    "id": "SCR_1_5", "num": "1.5", "title": "Chi tiết sách", "url": "http://localhost:3100/book/[id]",
                    "desc": "Thông tin chi tiết cuốn sách: tác giả, NXB, chọn định dạng (Ebook / Sách giấy / Combo), gian hàng bán và đánh giá.",
                    "images": [
                        ("1_5_book_detail_overview.png", "Ảnh 1.5a: Phần thông tin tác giả, giá bán & lựa chọn định dạng sách"),
                        ("1_5_book_detail_reviews.png", "Ảnh 1.5b: Tóm tắt nội dung sách, thông số kỹ thuật & Đánh giá bình luận")
                    ]
                },
                {
                    "id": "SCR_1_6", "num": "1.6", "title": "Trải nghiệm Đọc thử", "url": "http://localhost:3100/book/[id]/preview",
                    "desc": "Cho phép người dùng đọc thử một số chương mẫu miễn phí trước khi mua.",
                    "images": [("1_6_book_preview.png", "Ảnh 1.6: Trình đọc thử sách điện tử")]
                },
                {
                    "id": "SCR_1_7", "num": "1.7", "title": "Trình đọc sách trực tuyến (Web E-Reader)", "url": "http://localhost:3100/reader",
                    "desc": "Giao diện đọc Ebook: tùy chỉnh cỡ chữ, font chữ, chế độ đọc tối/sáng và mục lục chương.",
                    "images": [
                        ("1_7_reader_light.png", "Ảnh 1.7a: Trình đọc sách chế độ Ban ngày"),
                        ("1_7_reader_dark.png", "Ảnh 1.7b: Trình đọc sách chế độ Ban đêm (Dark Mode) & Mục lục")
                    ]
                },
                {
                    "id": "SCR_1_8", "num": "1.8", "title": "Sách nói (Audiobooks)", "url": "http://localhost:3100/audiobooks",
                    "desc": "Giao diện phát âm thanh sách nói, điều chỉnh tốc độ đọc, hẹn giờ và chọn chương.",
                    "images": [("1_8_audiobooks_player.png", "Ảnh 1.8: Trình phát sách nói Audio Player")]
                },
                {
                    "id": "SCR_1_9", "num": "1.9", "title": "Giỏ hàng", "url": "http://localhost:3100/cart",
                    "desc": "Danh sách sách đã chọn theo từng gian hàng, cập nhật số lượng và tính tạm tính.",
                    "images": [("1_9_cart.png", "Ảnh 1.9: Giỏ hàng mua sắm")]
                },
                {
                    "id": "SCR_1_10", "num": "1.10", "title": "Thanh toán & Đặt hàng", "url": "http://localhost:3100/checkout",
                    "desc": "Chọn địa chỉ giao hàng, phương thức vận chuyển, nhập voucher và chọn cổng thanh toán.",
                    "images": [
                        ("1_10_checkout_address.png", "Ảnh 1.10a: Chọn địa chỉ giao hàng & Đơn vị vận chuyển"),
                        ("1_10_checkout_payment.png", "Ảnh 1.10b: Chọn phương thức thanh toán & Áp dụng mã Voucher")
                    ]
                },
                {
                    "id": "SCR_1_11", "num": "1.11", "title": "Đặt hàng thành công", "url": "http://localhost:3100/order-success",
                    "desc": "Màn hình thông báo đặt hàng thành công kèm mã đơn và tổng thanh toán.",
                    "images": [("1_11_order_success.png", "Ảnh 1.11: Thông báo xác nhận đơn hàng")]
                },
                {
                    "id": "SCR_1_12", "num": "1.12", "title": "Tủ sách cá nhân", "url": "http://localhost:3100/library",
                    "desc": "Toàn bộ Ebook đã sở hữu để mở đọc trực tiếp mọi lúc mọi nơi.",
                    "images": [("1_12_library.png", "Ảnh 1.12: Tủ sách điện tử cá nhân")]
                },
                {
                    "id": "SCR_1_13", "num": "1.13", "title": "Quản lý thiết bị đọc (DRM)", "url": "http://localhost:3100/library/devices",
                    "desc": "Danh sách các thiết bị được cấp quyền đọc Ebook bản quyền DRM an toàn.",
                    "images": [("1_13_library_devices.png", "Ảnh 1.13: Quản lý thiết bị cấp phép đọc sách")]
                },
                {
                    "id": "SCR_1_14", "num": "1.14", "title": "Quản lý đơn mua hàng", "url": "http://localhost:3100/orders",
                    "desc": "Lịch sử toàn bộ các đơn hàng đã đặt theo từng trạng thái xử lý.",
                    "images": [("1_14_orders_list.png", "Ảnh 1.14: Danh sách đơn mua hàng")]
                },
                {
                    "id": "SCR_1_15", "num": "1.15", "title": "Chi tiết đơn hàng & Vận chuyển", "url": "http://localhost:3100/orders/[id]",
                    "desc": "Xem chi tiết kiện hàng và dòng thời gian vận chuyển (tracking shipper).",
                    "images": [("1_15_order_detail_tracking.png", "Ảnh 1.15: Chi tiết đơn hàng & Lộ trình giao")]
                },
                {
                    "id": "SCR_1_16", "num": "1.16", "title": "Hóa đơn điện tử", "url": "http://localhost:3100/orders/[id]/invoice",
                    "desc": "Xem và tải hóa đơn điện tử cho từng đơn hàng đã hoàn tất.",
                    "images": [("1_16_order_invoice.png", "Ảnh 1.16: Hóa đơn điện tử")]
                },
                {
                    "id": "SCR_1_17", "num": "1.17", "title": "Đánh giá đơn hàng", "url": "http://localhost:3100/orders/[id]/review",
                    "desc": "Form chấm điểm sao và nhận xét về sản phẩm nhận được.",
                    "images": [("1_17_order_review.png", "Ảnh 1.17: Đánh giá chất lượng sách & giao hàng")]
                },
                {
                    "id": "SCR_1_18", "num": "1.18", "title": "Yêu cầu đổi trả / Hoàn tiền", "url": "http://localhost:3100/orders/[id]/return",
                    "desc": "Form gửi yêu cầu đổi trả sách lỗi kèm lý do và ảnh bằng chứng.",
                    "images": [("1_18_order_return.png", "Ảnh 1.18: Gửi yêu cầu khiếu nại đổi trả")]
                },
                {
                    "id": "SCR_1_19", "num": "1.19", "title": "Hộp thư tin nhắn", "url": "http://localhost:3100/messages",
                    "desc": "Hệ thống chat trực tuyến giữa người mua và nhà bán hàng.",
                    "images": [("1_19_messages_chat.png", "Ảnh 1.19: Khung chat nhắn tin tư vấn trực tuyến")]
                },
                {
                    "id": "SCR_1_20", "num": "1.20", "title": "Hồ sơ cá nhân", "url": "http://localhost:3100/profile",
                    "desc": "Cập nhật thông tin tài khoản, họ tên, email, số điện thoại.",
                    "images": [("1_20_profile.png", "Ảnh 1.20: Thông tin hồ sơ cá nhân")]
                },
                {
                    "id": "SCR_1_21", "num": "1.21", "title": "Sổ địa chỉ nhận hàng", "url": "http://localhost:3100/profile/addresses",
                    "desc": "Quản lý danh sách địa chỉ giao hàng và địa chỉ mặc định.",
                    "images": [("1_21_profile_addresses.png", "Ảnh 1.21: Sổ địa chỉ giao hàng")]
                },
                {
                    "id": "SCR_1_22", "num": "1.22", "title": "Bảo mật tài khoản", "url": "http://localhost:3100/profile/security",
                    "desc": "Đổi mật khẩu và quản lý các phiên đăng nhập đang hoạt động.",
                    "images": [("1_22_profile_security.png", "Ảnh 1.22: Cài đặt bảo mật & Phiên đăng nhập")]
                },
                {
                    "id": "SCR_1_23", "num": "1.23", "title": "Ví cá nhân / Hoàn tiền", "url": "http://localhost:3100/profile/wallet",
                    "desc": "Theo dõi số dư ví tiền tích lũy và lịch sử giao dịch ví.",
                    "images": [("1_23_profile_wallet.png", "Ảnh 1.23: Ví điện tử cá nhân")]
                },
                {
                    "id": "SCR_1_24", "num": "1.24", "title": "Trang Tác giả", "url": "http://localhost:3100/author/[id]",
                    "desc": "Hồ sơ tác giả, tiểu sử và toàn bộ danh mục sách đã xuất bản.",
                    "images": [("1_24_author_page.png", "Ảnh 1.24: Trang tiểu sử tác giả")]
                },
                {
                    "id": "SCR_1_25", "num": "1.25", "title": "Trang Gian hàng / Cửa hàng", "url": "http://localhost:3100/shop/[id]",
                    "desc": "Giao diện chính thức của nhà sách: banner, voucher và danh mục sách đang bán.",
                    "images": [("1_25_shop_page.png", "Ảnh 1.25: Gian hàng nhà xuất bản")]
                }
            ]
        },
        {
            "part_id": "PART_2",
            "part_title": "PHẦN 2. PHÂN HỆ XÁC THỰC & KHỞI TẠO TÀI KHOẢN (AUTH)",
            "part_desc": "Bao gồm các màn hình bảo mật đăng nhập, đăng ký, khôi phục tài khoản và khảo sát sở thích ban đầu.",
            "items": [
                {"id": "SCR_2_1", "num": "2.1", "title": "Màn hình Đăng nhập", "url": "http://localhost:3100/auth/login", "desc": "Đăng nhập tài khoản bằng email và mật khẩu.", "images": [("2_1_auth_login.png", "Ảnh 2.1: Màn hình Đăng nhập")]},
                {"id": "SCR_2_2", "num": "2.2", "title": "Màn hình Đăng ký", "url": "http://localhost:3100/auth/register", "desc": "Form đăng ký tài khoản thành viên mới.", "images": [("2_2_auth_register.png", "Ảnh 2.2: Màn hình Đăng ký tài khoản")]},
                {"id": "SCR_2_3", "num": "2.3", "title": "Quên mật khẩu", "url": "http://localhost:3100/auth/forgot-password", "desc": "Gửi yêu cầu khôi phục mật khẩu qua email.", "images": [("2_3_auth_forgot_password.png", "Ảnh 2.3: Form Quên mật khẩu")]},
                {"id": "SCR_2_4", "num": "2.4", "title": "Xác thực mã OTP", "url": "http://localhost:3100/auth/verify", "desc": "Nhập mã số xác thực để kích hoạt tài khoản an toàn.", "images": [("2_4_auth_verify_otp.png", "Ảnh 2.4: Xác thực mã OTP Email")]},
                {"id": "SCR_2_5", "num": "2.5", "title": "Khảo sát sở thích đọc sách (Onboarding)", "url": "http://localhost:3100/onboarding", "desc": "Chọn thể loại yêu thích ban đầu để hệ thống tự động cá nhân hóa thuật toán gợi ý.", "images": [("2_5_onboarding_genre_selection.png", "Ảnh 2.5: Màn hình chọn thể loại sách yêu thích")]}
            ]
        },
        {
            "part_id": "PART_3",
            "part_title": "PHẦN 3. KÊNH NGƯỜI BÁN & NHÀ XUẤT BẢN (SELLER PORTAL)",
            "part_desc": "Dành cho chủ gian hàng và NXB quản lý sản phẩm, đơn hàng, xuất bản sách và tài chính.",
            "items": [
                {
                    "id": "SCR_3_0", "num": "3.0", "title": "Đăng ký Doanh nghiệp & Mở Gian hàng", "url": "http://localhost:3100/seller/register",
                    "desc": "Quy trình đăng ký doanh nghiệp: điền mã số thuế, tải lên giấy phép kinh doanh và tạo gian hàng mới.",
                    "images": [
                        ("3_0_seller_register_step1.png", "Ảnh 3.0a: Bước 1 - Điền thông tin doanh nghiệp / NXB & Giấy phép"),
                        ("3_0_seller_register_step2_store.png", "Ảnh 3.0b: Bước 2 - Thiết lập thông tin Gian hàng / Nhà sách")
                    ]
                },
                {
                    "id": "SCR_3_1", "num": "3.1", "title": "Tổng quan người bán (Dashboard)", "url": "http://localhost:3100/seller/dashboard",
                    "desc": "Thống kê doanh số, số đơn hàng mới, biểu đồ kinh doanh và sách bán chạy.",
                    "images": [
                        ("3_1_seller_dashboard_kpi.png", "Ảnh 3.1a: Bảng số liệu KPI & Tóm tắt đơn hàng cần xử lý"),
                        ("3_1_seller_dashboard_charts.png", "Ảnh 3.1b: Biểu đồ doanh thu & Danh sách sách bán chạy")
                    ]
                },
                {
                    "id": "SCR_3_2", "num": "3.2", "title": "Quản lý danh sách sản phẩm", "url": "http://localhost:3100/seller/products",
                    "desc": "Danh sách toàn bộ sách của shop, trạng thái bán và số lượng tồn kho.",
                    "images": [("3_2_seller_products_list.png", "Ảnh 3.2: Quản lý kho sách của gian hàng")]
                },
                {
                    "id": "SCR_3_3", "num": "3.3", "title": "Đăng bán sách điện tử (Ebook)", "url": "http://localhost:3100/seller/product/create-ebook",
                    "desc": "Tải lên tệp PDF/EPUB, trích xuất mục lục, cài đặt bảo mật DRM và định giá bán.",
                    "images": [("3_3_seller_create_ebook.png", "Ảnh 3.3: Form đăng sách điện tử & Cấu hình DRM")]
                },
                {
                    "id": "SCR_3_4", "num": "3.4", "title": "Đăng bán sách giấy", "url": "http://localhost:3100/seller/product/create-physical",
                    "desc": "Nhập thông tin quy cách đóng gói, trọng lượng, tồn kho và danh mục.",
                    "images": [("3_4_seller_create_physical.png", "Ảnh 3.4: Form đăng bán sách in")]
                },
                {
                    "id": "SCR_3_5", "num": "3.5", "title": "Đăng bán sách Combo / Hybrid", "url": "http://localhost:3100/seller/product/create-hybrid",
                    "desc": "Đăng gói bán kết hợp cả sách giấy và bản Ebook tiện lợi.",
                    "images": [("3_5_seller_create_hybrid.png", "Ảnh 3.5: Form đăng sách Combo Hybrid")]
                },
                {
                    "id": "SCR_3_6", "num": "3.6", "title": "Quản lý đơn hàng người bán", "url": "http://localhost:3100/seller/orders",
                    "desc": "Quy trình xử lý đơn hàng: Xác nhận đơn -> Đóng gói -> Bàn giao cho vận chuyển.",
                    "images": [("3_6_seller_orders_list.png", "Ảnh 3.6: Danh sách đơn hàng cần xử lý của Shop")]
                },
                {
                    "id": "SCR_3_7", "num": "3.7", "title": "Chi tiết đơn hàng shop & In phiếu giao", "url": "http://localhost:3100/seller/orders/[id]",
                    "desc": "Xem chi tiết đơn, thông tin người nhận và in mã vận đơn.",
                    "images": [("3_7_seller_order_detail.png", "Ảnh 3.7: Chi tiết đơn hàng & In vận đơn đóng gói")]
                },
                {
                    "id": "SCR_3_8", "num": "3.8", "title": "Quản lý đổi trả & Khiếu nại", "url": "http://localhost:3100/seller/returns",
                    "desc": "Tiếp nhận và xử lý yêu cầu đổi trả sách từ khách hàng.",
                    "images": [("3_8_seller_returns.png", "Ảnh 3.8: Xử lý yêu cầu đổi trả hàng")]
                },
                {
                    "id": "SCR_3_9", "num": "3.9", "title": "Quản lý Voucher của Shop", "url": "http://localhost:3100/seller/promotions/vouchers",
                    "desc": "Tạo và quản lý các mã giảm giá áp dụng riêng cho gian hàng.",
                    "images": [("3_9_seller_vouchers.png", "Ảnh 3.9: Tạo và quản lý mã giảm giá của Shop")]
                },
                {
                    "id": "SCR_3_10", "num": "3.10", "title": "Đăng ký Flash Sale", "url": "http://localhost:3100/seller/promotions/flash-sale",
                    "desc": "Đăng ký các đầu sách tham gia vào chương trình Flash Sale của sàn.",
                    "images": [("3_10_seller_flash_sale.png", "Ảnh 3.10: Đăng ký sách tham gia Flash Sale")]
                },
                {
                    "id": "SCR_3_11", "num": "3.11", "title": "Báo cáo doanh thu", "url": "http://localhost:3100/seller/revenue",
                    "desc": "Báo cáo doanh thu thực nhận, đối soát và dòng tiền bán hàng.",
                    "images": [("3_31_seller_revenue.png" if os.path.exists(os.path.join(SCREENSHOT_DIR, "3_31_seller_revenue.png")) else "3_11_seller_revenue.png", "Ảnh 3.11: Báo cáo tài chính & Doanh thu gian hàng")]
                },
                {
                    "id": "SCR_3_12", "num": "3.12", "title": "Ví gian hàng & Rút tiền", "url": "http://localhost:3100/seller/wallet",
                    "desc": "Quản lý số dư khả dụng và tạo lệnh rút tiền về tài khoản ngân hàng.",
                    "images": [("3_12_seller_wallet_payout.png", "Ảnh 3.12: Quản lý số dư ví & Yêu cầu rút tiền")]
                },
                {
                    "id": "SCR_3_13", "num": "3.13", "title": "Quản lý nhân viên shop", "url": "http://localhost:3100/seller/staff",
                    "desc": "Phân quyền quản lý đơn hàng, kho và chăm sóc khách hàng cho nhân viên.",
                    "images": [("3_13_seller_staff.png", "Ảnh 3.13: Danh sách nhân viên & Phân quyền")]
                },
                {
                    "id": "SCR_3_14", "num": "3.14", "title": "Kênh chat tư vấn khách hàng", "url": "http://localhost:3100/seller/chat",
                    "desc": "Khung chat trực tiếp với độc giả để giải đáp thắc mắc và tư vấn sách.",
                    "images": [("3_14_seller_chat.png", "Ảnh 3.14: Giao diện Chat tư vấn khách hàng")]
                }
            ]
        },
        {
            "part_id": "PART_4",
            "part_title": "PHẦN 4. KÊNH VẬN CHUYỂN & GIAO HÀNG (SHIPPER PORTAL)",
            "part_desc": "Giao diện dành riêng cho tài xế giao nhận để tiếp nhận đơn, cập nhật tiến độ giao và nộp tiền COD.",
            "items": [
                {"id": "SCR_4_1", "num": "4.1", "title": "Danh sách đơn hàng đang giao", "url": "http://localhost:3100/shipper", "desc": "Danh sách các đơn hàng đã nhận từ kho và đang trên đường giao đến khách.", "images": [("4_1_shipper_active_deliveries.png", "Ảnh 4.1: Danh sách đơn hàng đang thực hiện giao")]},
                {"id": "SCR_4_2", "num": "4.2", "title": "Nhận đơn hàng mới", "url": "http://localhost:3100/shipper/available-orders", "desc": "Danh sách các đơn hàng đã đóng gói sẵn đang chờ tài xế tiếp nhận.", "images": [("4_2_shipper_available_orders.png", "Ảnh 4.2: Danh sách đơn hàng có sẵn cần lấy")]},
                {"id": "SCR_4_3", "num": "4.3", "title": "Lịch sử giao hàng", "url": "http://localhost:3100/shipper/history", "desc": "Lịch sử các đơn hàng đã giao thành công hoặc giao không thành công.", "images": [("4_3_shipper_history.png", "Ảnh 4.3: Lịch sử hoàn thành giao hàng")]},
                {"id": "SCR_4_4", "num": "4.4", "title": "Nộp tiền thu hộ COD", "url": "http://localhost:3100/shipper/remit-cod", "desc": "Quản lý số tiền mặt thu hộ đang giữ và tạo lệnh nộp tiền về hệ thống.", "images": [("4_4_shipper_remit_cod.png", "Ảnh 4.4: Đối soát & Nộp tiền thu hộ COD")]}
            ]
        },
        {
            "part_id": "PART_5",
            "part_title": "PHẦN 5. PHÂN HỆ QUẢN TRỊ HỆ THỐNG (ADMIN PORTAL)",
            "part_desc": "Trung tâm kiểm soát toàn diện: giám sát KPI kinh doanh, kiểm duyệt nội dung, người dùng, tài chính và phân xử tranh chấp.",
            "items": [
                {
                    "id": "SCR_5_1", "num": "5.1", "title": "Bảng điều khiển quản trị (Dashboard)", "url": "http://localhost:3100/admin/dashboard",
                    "desc": "Tổng quan toàn sàn: Tổng giá trị giao dịch (GMV), biểu đồ tăng trưởng, đơn hàng và số lượng sách.",
                    "images": [
                        ("5_1_admin_dashboard_kpi.png", "Ảnh 5.1a: Bảng số liệu KPI tăng trưởng toàn sàn"),
                        ("5_1_admin_dashboard_charts.png", "Ảnh 5.1b: Biểu đồ doanh thu GMV & Phân bổ đơn hàng")
                    ]
                },
                {
                    "id": "SCR_5_2", "num": "5.2", "title": "Quản lý người dùng & Phân quyền", "url": "http://localhost:3100/admin/users",
                    "desc": "Danh sách tài khoản toàn hệ thống, phân quyền và khóa tài khoản vi phạm.",
                    "images": [("5_2_admin_users.png", "Ảnh 5.2: Quản lý người dùng toàn sàn")]
                },
                {
                    "id": "SCR_5_3", "num": "5.3", "title": "Xét duyệt hồ sơ gian hàng / NXB", "url": "http://localhost:3100/admin/businesses",
                    "desc": "Kiểm tra giấy phép kinh doanh và phê duyệt yêu cầu mở gian hàng của các NXB.",
                    "images": [("5_3_admin_businesses_approvals.png", "Ảnh 5.3: Xét duyệt hồ sơ pháp lý Doanh nghiệp & NXB")]
                },
                {
                    "id": "SCR_5_4", "num": "5.4", "title": "Kiểm duyệt nội dung sách", "url": "http://localhost:3100/admin/book-moderation",
                    "desc": "Kiểm duyệt sách mới đăng trước khi cho phép xuất bản công khai lên sàn.",
                    "images": [("5_4_admin_book_moderation.png", "Ảnh 5.4: Kiểm duyệt nội dung & Xuất bản sách")]
                },
                {
                    "id": "SCR_5_5", "num": "5.5", "title": "Quản lý danh mục thể loại", "url": "http://localhost:3100/admin/categories",
                    "desc": "Cấu hình cấu trúc cây thể loại sách đa cấp và trạng thái hiển thị.",
                    "images": [("5_5_admin_categories_tree.png", "Ảnh 5.5: Quản lý cây danh mục thể loại sách")]
                },
                {
                    "id": "SCR_5_6", "num": "5.6", "title": "Quản lý Flash Sale & Khuyến mãi sàn", "url": "http://localhost:3100/admin/promotions/flash-sale",
                    "desc": "Cấu hình khung giờ Flash Sale toàn hệ thống và mã voucher sàn tài trợ.",
                    "images": [("5_6_admin_promotions_flash_sale.png", "Ảnh 5.6: Quản lý chương trình Flash Sale & Voucher sàn")]
                },
                {
                    "id": "SCR_5_7", "num": "5.7", "title": "Quản lý tài chính & Ký quỹ Escrow", "url": "http://localhost:3100/admin/finance",
                    "desc": "Theo dõi dòng tiền tạm giữ ký quỹ đơn hàng và duyệt lệnh rút tiền của shop.",
                    "images": [("5_7_admin_finance_escrow.png", "Ảnh 5.7: Giám sát tài khoản ký quỹ Escrow & Đối soát")]
                },
                {
                    "id": "SCR_5_8", "num": "5.8", "title": "Trọng tài phân xử tranh chấp", "url": "http://localhost:3100/admin/disputes",
                    "desc": "Xem xét bằng chứng và đưa ra quyết định xử lý khiếu nại giữa người mua và shop.",
                    "images": [("5_8_admin_disputes_arbitration.png", "Ảnh 5.8: Hội đồng trọng tài phân xử khiếu nại đơn hàng")]
                },
                {
                    "id": "SCR_5_9", "num": "5.9", "title": "Kho bảo mật bản quyền số (DRM Vault)", "url": "http://localhost:3100/admin/drm-vault",
                    "desc": "Giám sát hệ thống cấp khóa mã hóa và bản quyền số Ebook.",
                    "images": [("5_9_admin_drm_vault.png", "Ảnh 5.9: Quản trị kho khóa bảo mật DRM AES-GCM-256")]
                },
                {
                    "id": "SCR_5_10", "num": "5.10", "title": "Báo cáo thống kê chuyên sâu", "url": "http://localhost:3100/admin/reports",
                    "desc": "Xuất báo cáo tổng hợp hiệu suất kinh doanh và đối soát toàn sàn.",
                    "images": [("5_10_admin_reports.png", "Ảnh 5.10: Báo cáo & Thống kê toàn hệ thống")]
                }
            ]
        }
    ]

    # TOC
    toc_heading = doc.add_paragraph()
    toc_heading.paragraph_format.space_before = Pt(12)
    toc_heading.paragraph_format.space_after = Pt(4)
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

    # Content
    bm_counter = 100
    for section in data:
        bm_counter += 1
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
            item_h = add_bookmarked_heading(doc, f"{item['num']}. {item['title']}", item["id"], bm_counter, heading_level=2, font_size=Pt(12), bold=True)
            item_h.add_run("   ")
            add_hyperlink_to_bookmark(item_h, "TOC_TOP", "[Về mục lục]", color="888888", italic=True, size=Pt(9.5), underline=True)

            url_p = doc.add_paragraph()
            url_p.paragraph_format.space_after = Pt(1)
            url_p.paragraph_format.keep_with_next = True
            u_label = url_p.add_run("Đường dẫn: ")
            u_label.bold = True
            u_label.font.size = Pt(10.5)
            u_val = url_p.add_run(item["url"])
            u_val.font.size = Pt(10.5)
            u_val.font.color.rgb = RGBColor(0x00, 0x33, 0x66)

            desc_p = doc.add_paragraph()
            desc_p.paragraph_format.space_after = Pt(6)
            desc_p.paragraph_format.keep_with_next = True
            d_label = desc_p.add_run("Mô tả: ")
            d_label.bold = True
            d_label.font.size = Pt(11)
            d_val = desc_p.add_run(item["desc"])
            d_val.font.size = Pt(11)

            # Insert Image(s)
            for img_name, img_caption in item.get("images", []):
                img_path = os.path.join(SCREENSHOT_DIR, img_name)
                
                # Image Frame (Table)
                table = doc.add_table(rows=1, cols=1)
                table.alignment = WD_TABLE_ALIGNMENT.CENTER
                set_table_borders(table, color="D0D7DE", sz="4", val="single")

                cell = table.cell(0, 0)
                cell.width = Inches(6.8)
                set_cell_background(cell, "FFFFFF")
                set_cell_margins(cell, top=80, bottom=80, left=80, right=80)

                cp = cell.paragraphs[0]
                cp.alignment = WD_ALIGN_PARAGRAPH.CENTER
                
                if os.path.exists(img_path) and os.path.getsize(img_path) > 1000:
                    try:
                        run_img = cp.add_run()
                        run_img.add_picture(img_path, width=Inches(6.6))
                    except Exception as e:
                        cp.add_run(f"[Không thể tải ảnh: {img_name} - {e}]")
                else:
                    cp.add_run(f"[Chưa có ảnh: {img_name}]\n(Dán ảnh chụp màn hình vào đây)")

                # Caption
                cap_p = doc.add_paragraph()
                cap_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                cap_p.paragraph_format.space_before = Pt(3)
                cap_p.paragraph_format.space_after = Pt(10)
                c_run = cap_p.add_run(img_caption)
                c_run.font.size = Pt(10)
                c_run.font.italic = True
                c_run.font.color.rgb = RGBColor(0x55, 0x55, 0x55)

            spacer = doc.add_paragraph()
            spacer.paragraph_format.space_after = Pt(8)

    doc.save(DOCX_OUTPUT)
    print(f"=== ĐÃ LƯU FILE WORD THÀNH CÔNG: {DOCX_OUTPUT} ===")

if __name__ == "__main__":
    asyncio.run(capture_all_screenshots())
    build_complete_word_document()
