import React from 'react';
import { Outlet } from 'react-router-dom';

/**
 * Standalone PrintLayout for HUKI EBOOK
 * Optimized for A4 printing and clean paper views without headers, sidebars or footers.
 */
export default function PrintLayout() {
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans p-4 sm:p-8 print:p-0">
      <main id="main-content" className="max-w-4xl mx-auto">
        <Outlet />
      </main>
    </div>
  );
}
