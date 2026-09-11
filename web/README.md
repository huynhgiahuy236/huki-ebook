# HUKI EBOOK Web

Ứng dụng giao diện HUKI EBOOK chạy bằng Next.js 16 App Router tại cổng `3100`.
Giao diện React mới đã được chuyển sang client boundary của Next.js; các luồng hiện
tại dùng dữ liệu mẫu và chưa tích hợp lại Phase 1–2 với backend.

## Chạy dự án

```powershell
cd D:\doan_huki_ebook\huki-ebook\web
npm ci
npm run dev
```

Mở `http://localhost:3100`. Không cần khởi động `platform` để kiểm tra riêng giao
diện mẫu trên nhánh migration này.

## Kiểm tra trước khi bàn giao

```powershell
npm run check
npm run build
```

## Cấu trúc chính

```text
src/
├── app/                 # Next.js entry, catch-all route và stylesheet
└── ui/                  # Toàn bộ giao diện React đã migration
    ├── components/
    ├── context/
    ├── data/
    ├── pages/
    ├── utils/
    └── App.jsx          # Providers và bảng route của giao diện
public/
├── banners/             # Ảnh banner giao diện
└── books/               # Tài liệu PDF mẫu cho ebook reader
```

Next.js phục vụ `/` qua trang tĩnh và chuyển mọi đường dẫn giao diện còn lại qua
route `[...slug]`. React Router xử lý các khu vực Store, Auth, Reader, Seller và
Admin ở phía trình duyệt. Khi bắt đầu lại Phase 1–2, tích hợp API thật vào các
context/feature tương ứng và thay thế dần dữ liệu mẫu.
