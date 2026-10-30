# HƯỚNG DẪN THIẾT KẾ ANTI-AI & DESIGN SYSTEM COMPACT (HUKI PRODUCTION)

> **Mục đích:** Đặt ra quy chuẩn kỹ thuật bắt buộc cho toàn bộ lập trình viên frontend khi tạo mới hoặc sửa đổi các component, page, layout; đảm bảo giao diện luôn đạt độ tinh tế, mật độ thông tin cao, không bị thô kệch hay mang phong cách "AI tự vẽ".

---

## 1. Quy Chuẩn Kích Thước & Mật Độ (Size & Density Scale)

Giao diện AI thường mắc bệnh "phóng to" mọi thứ: nút cao tới 52px, chữ to 18px, padding thẻ tới 24px-32px khiến màn hình bị loãng. Chuẩn HuKi Production áp dụng hệ thống kích thước **Compact Density**:

### 1.1. Bảng So Sánh Kích Thước Trước & Sau
| Thành phần | Chuẩn Cũ (AI Oversized) | Chuẩn Mới (HuKi Compact) | Lợi ích thực tế |
| :--- | :--- | :--- | :--- |
| **Nút bấm chính (Button)** | `h-12` hoặc `h-14` (48-56px), `text-base font-bold` | `h-8` đến `h-9` (32-36px), `text-xs font-semibold px-3` | Tiết kiệm 35% diện tích dọc, thao tác chuẩn xác |
| **Nút bấm phụ / Table Action** | `h-10 px-4` | `h-7 px-2.5 text-[11px] font-medium` | Vừa vặn trong từng hàng của bảng dữ liệu |
| **Ô nhập liệu (Input / Select)** | `h-12 text-base rounded-2xl` | `h-8.5 sm:h-9 text-xs sm:text-[13px] rounded-lg` | Vừa tầm mắt, không choáng chỗ khi mở bàn phím ảo |
| **Padding của Card/Thẻ** | `p-6` đến `p-8` (24-32px) | `p-3.5` đến `p-4.5` (14-18px) | Chứa được nhiều nội dung hơn trên cùng một khung nhìn |
| **Khoảng cách giữa các Card** | `gap-6` đến `gap-8` (24-32px) | `gap-3` đến `gap-4` (12-16px) | Bố cục liền mạch, không bị đứt đoạn vô lý |
| **Bán kính bo góc (Border Radius)** | `rounded-3xl` hoặc `rounded-2xl` quá cong (trông như đồ chơi) | `rounded-lg` (8px) hoặc `rounded-xl` (12px) | Đường nét hiện đại, chững chạc theo chuẩn SaaS/Shopee |

---

## 2. Hệ Thống Typography (Font Scale Chuẩn)

Tuyệt đối không dùng chữ quá to trong các phần tử giao diện quản trị hay danh sách sản phẩm. Sử dụng font sans-serif tinh gọn cho UI (`Inter` / `system-ui`) và font serif trang nhã cho tiêu đề sách (`Merriweather` / `Playfair Display`).

```
[Tiêu đề trang h1]         : text-lg sm:text-xl font-bold tracking-tight (18px - 20px)
[Tiêu đề phân mục h2]      : text-sm sm:text-base font-semibold (14px - 16px)
[Tiêu đề card sản phẩm h3] : text-[13px] sm:text-sm font-semibold line-clamp-2 (13px - 14px)
[Nội dung mô tả (Body)]    : text-xs leading-relaxed text-slate-600 dark:text-slate-300 (12px)
[Metadata / Thời gian]     : text-[11px] text-slate-400 dark:text-slate-500 (11px)
[Badge / Nhãn phụ]         : text-[10px] font-medium tracking-wide (10px)
[Giá tiền (Price)]         : text-sm sm:text-base font-bold text-[#ac2c19] (14px - 16px)
```

---

## 3. Quy Tắc Xóa Bỏ Viền & Màu Mè Sặc Sỡ (Anti-Rainbow Rule)

### 3.1. Những thứ NGHIÊM CẤM (Anti-Patterns)
* ❌ **Không dùng viền màu neon hoặc dày 2px:** Cấm dùng `border-2 border-emerald-400`, `border-purple-500`, `border-blue-400` quanh các thẻ nội dung.
* ❌ **Không dùng gradient nền lòe loẹt:** Cấm dùng `bg-gradient-to-r from-purple-500 via-pink-500 to-red-500` làm nền card hoặc thanh công cụ.
* ❌ **Không dùng bóng đổ quá gắt:** Cấm dùng `shadow-2xl` trên các panel thông thường, chỉ dùng bóng sâu cho duy nhất Modal Dialog đè lên backdrop mờ.

### 3.2. Quy Chuẩn Viền & Đổ Bóng Chuẩn (Allowed Design Tokens)
* **Đường viền mặc định (Hairline Border):**
  - Light mode: `border border-slate-200/80` hoặc `border-slate-100` (1px, độ tương phản dịu mắt).
  - Dark mode: `border border-zinc-800` hoặc `border-zinc-800/80`.
* **Đổ bóng tinh tế (Micro Shadow):**
  - Mặc định: `shadow-2xs` hoặc `shadow-xs` (`box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.04)`).
  - Thẻ khi hover: `hover:shadow-sm hover:border-slate-300 dark:hover:border-zinc-700 transition-all duration-150`.
* **Bảng màu trạng thái trung tính (Subtle Status Colors):**
  - **Thành công (Success/Delivered):** `bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400`
  - **Chờ xử lý (Pending/Warning):** `bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400`
  - **Hủy/Lỗi (Failed/Cancelled):** `bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400`
  - **Vận chuyển/Thông tin (Shipping/Info):** `bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400`
  - **Hệ thống/Trung tính (Neutral/Default):** `bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-slate-300`

---

## 4. Quy Tắc Icon & Emoji (Strict Iconography Standard)

### 4.1. Tuyệt Đối Không Dùng Emoji Trong Chuỗi Hệ Thống
* ❌ KHÔNG VIẾT: `📢 Thông báo đơn hàng mới 🚀`, `🛡️ Quản trị viên`, `🛵 Bưu tá giao vận`.
* ✅ VIẾT CHUẨN: `Thông báo đơn hàng`, `Ban Quản Trị`, `Bưu tá Express`.

### 4.2. Kích Thước & Loại Icon Cho Phép
* **Thư viện icon duy nhất:** `Material Symbols Outlined` (đã nạp sẵn trong dự án).
* **Kích thước chuẩn:**
  - Icon trong nút bấm (Button icon): `text-[16px]` hoặc `text-[17px]`.
  - Icon danh mục / Avatar tròn: `w-8 h-8` hoặc `w-9 h-9`, icon bên trong `text-[18px]`.
  - Icon chỉ báo trạng thái nhỏ: `text-[14px]`.
* **Màu icon:** Đi theo màu chữ của phần tử cha (`currentColor` hoặc `text-slate-500`), không tô màu lòe loẹt trừ khi đó là điểm chạm thương hiệu chính.

---

## 5. Quy Tắc Badge & Nhãn Trạng Thái (Status Chips)

### 5.1. Quy tắc "Single Badge":
Mỗi phần tử chỉ được phép có **tối đa 1 badge trạng thái duy nhất**. Cấm xếp hàng ngang 3-4 badge khác nhau.

```tsx
// ❌ SAI: Kiểu AI xếp chồng badge
<div className="flex gap-2">
  <span className="badge bg-purple-100 text-purple-700">🛡️ Quản trị viên</span>
  <span className="badge bg-rose-500 text-white">KHẨN CẤP</span>
  <span className="badge bg-amber-400 text-black">ƯU TIÊN</span>
  <span className="badge bg-blue-100">#1792342547426</span>
</div>

// ✅ ĐÚNG: Kiểu Human-Crafted tinh tế
<div className="flex items-center gap-1.5 text-[11px] text-slate-500">
  <span className="font-medium text-slate-700 dark:text-slate-300">Ban Quản Trị</span>
  <span>·</span>
  <span>11 ngày trước</span>
  <span className="ml-1.5 px-1.5 py-0.2 rounded text-[10px] font-medium bg-rose-50 text-rose-600 border border-rose-200/60">Khẩn cấp</span>
</div>
```

---

## 6. Quy Tắc Bảng Dữ Liệu Quản Trị (Admin & Seller Tables)

Để loại bỏ cảm giác "AI tạo form", các bảng danh sách đơn hàng, tồn kho, người dùng phải tuân thủ:
1. **Chiều cao hàng (Row Height):** `py-2.5 sm:py-3 px-3 sm:px-4` (không dùng `p-6` cho mỗi hàng table).
2. **Đường kẻ phân cách:** `border-b border-slate-100 dark:border-zinc-800/80` (hairline divider).
3. **Màu nền xen kẽ:** Dùng màu trắng làm chuẩn, `hover:bg-slate-50/70 dark:hover:bg-zinc-850/60` phản hồi tức thì khi di chuột.
4. **Cột hành động (Action Column):** Đặt nút icon nhỏ gọn `w-7 h-7 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800`, không dùng các nút to đùng dạng "Chi tiết đơn hàng ngay".

