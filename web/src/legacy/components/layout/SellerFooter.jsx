import React from 'react';
import { Link } from 'react-router-dom';

export default function SellerFooter() {
  return (
    <footer className="bg-theme-surface border-t border-theme-border py-6 px-4 md:px-8 text-xs text-theme-text-muted mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="font-editorial font-bold text-theme-primary text-base">HUKI SELLER CENTER</span>
          <span>•</span>
          <span>Cổng thông tin & dịch vụ TMĐT Sách Bản Quyền Số</span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/seller" className="hover:text-theme-text transition-colors">Quy chế hoạt động</Link>
          <span>•</span>
          <Link to="/seller/register" className="hover:text-theme-text transition-colors">Chính sách bản quyền DRM</Link>
          <span>•</span>
          <a href="tel:19008866" className="text-theme-secondary font-bold">Hotline B2B: 1900 8866</a>
        </div>
      </div>
    </footer>
  );
}
