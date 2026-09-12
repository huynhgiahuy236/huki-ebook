import React from 'react';
import { Outlet } from 'react-router-dom';

/**
 * Standalone AuthLayout for HUKI EBOOK
 * Provides a clean standalone container for authentication flows without Store Header, Sidebar or Footer.
 */
export default function AuthLayout() {
  return (
    <div className="min-h-screen w-full bg-white text-theme-text font-sans antialiased selection:bg-theme-secondary/20">
      <Outlet />
    </div>
  );
}
