import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import SellerFooter from './SellerFooter';
import SellerHeader from './SellerHeader';
import SellerSidebar from './SellerSidebar';

export default function SellerLayout() {
  const location = useLocation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => !prev);
  };

  const toggleMobileSidebar = () => {
    setIsMobileOpen(prev => !prev);
  };

  const closeMobileSidebar = () => {
    setIsMobileOpen(false);
  };

  const isChatPage = location.pathname.startsWith('/seller/chat');

  return (
    <div className={`bg-background text-on-surface flex flex-col ${isChatPage ? 'h-screen max-h-screen overflow-hidden' : 'min-h-dvh'}`}>
      <SellerHeader 
        isSidebarCollapsed={isSidebarCollapsed} 
        toggleSidebar={toggleSidebar} 
        toggleMobileSidebar={toggleMobileSidebar}
      />
      
      <div className={`flex flex-1 min-w-0 relative ${isChatPage ? 'overflow-hidden min-h-0' : ''}`}>
        {/* Desktop Sidebar */}
        <div className="hidden lg:block shrink-0">
          <SellerSidebar 
            isCollapsed={isSidebarCollapsed} 
            toggleSidebar={toggleSidebar} 
          />
        </div>

        {/* Mobile Slide-over Drawer */}
        {isMobileOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity" 
              onClick={closeMobileSidebar}
              aria-hidden="true"
            />
            {/* Drawer Content */}
            <div className="relative z-10 w-72 bg-theme-surface shadow-2xl h-full flex flex-col">
              <SellerSidebar 
                isCollapsed={false} 
                toggleSidebar={closeMobileSidebar}
                isMobile={true}
                onClose={closeMobileSidebar}
              />
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className={`min-w-0 flex-1 flex flex-col transition-all duration-300 ${isChatPage ? 'overflow-hidden min-h-0' : ''}`}>
          <main id="main-content" className={`flex-1 min-w-0 ${isChatPage ? 'overflow-hidden min-h-0 flex flex-col' : ''}`}>
            <Outlet />
          </main>
          {!isChatPage && <SellerFooter />}
        </div>
      </div>
    </div>
  );
}

