import React from 'react';
import { NavLink } from 'react-router-dom';

export default function LeftRail() {
  const navItems = [
    { to: '/', icon: 'storefront', label: 'Sàn Sách Số' },
    { to: '/community', icon: 'groups', label: 'Mạng Xã Hội' },
    { to: '/books', icon: 'auto_stories', label: 'Khám Phá' },
    { to: '/library', icon: 'local_library', label: 'Tủ Sách' },
    { to: '/profile', icon: 'person', label: 'Hồ Sơ' },
    { to: '/seller/dashboard', icon: 'store', label: 'Kênh Người Bán' }
  ];

  return (
    <aside className="hidden md:flex flex-col items-center justify-between w-16 bg-theme-surface border-r border-theme-border py-4 shrink-0 h-[calc(100vh-64px)] sticky top-16 z-30">
      <div className="flex flex-col items-center gap-3 w-full px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center justify-center w-12 h-12 rounded-xl transition-all ${
                isActive
                  ? 'bg-theme-primary text-white shadow-md'
                  : 'text-theme-text-muted hover:bg-theme-secondary-subtle hover:text-theme-primary'
              }`
            }
            title={item.label}
          >
            <span className="material-symbols-outlined text-2xl">{item.icon}</span>
          </NavLink>
        ))}
      </div>

      <div className="flex flex-col items-center gap-2">
        <NavLink
          to="/seller/edge-cases"
          className="w-10 h-10 rounded-lg flex items-center justify-center text-theme-text-muted hover:text-theme-accent hover:bg-theme-secondary-subtle transition-colors"
          title="Thư viện trạng thái & Edge cases"
        >
          <span className="material-symbols-outlined text-xl">grid_view</span>
        </NavLink>
      </div>
    </aside>
  );
}
