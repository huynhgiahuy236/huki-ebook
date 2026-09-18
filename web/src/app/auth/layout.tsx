import React from 'react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-white text-theme-text font-sans antialiased selection:bg-theme-secondary/20">
      {children}
    </div>
  );
}
