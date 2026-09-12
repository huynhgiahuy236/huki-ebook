import React from 'react';
import { Outlet } from 'react-router-dom';

/**
 * Standalone ReaderLayout for HUKI EBOOK WebReader
 * 100vw x 100vh Immersive Reader Canvas without Store Header, Sidebar or Footer.
 */
export default function ReaderLayout() {
  return (
    <div className="w-screen h-screen max-w-full max-h-full overflow-hidden bg-theme-bg text-theme-text flex flex-col font-sans select-none">
      <main id="main-content" tabIndex="-1" className="flex-1 w-full h-full overflow-hidden outline-none">
        <Outlet />
      </main>
    </div>
  );
}
