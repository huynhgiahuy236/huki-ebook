"use client";

import React from 'react';
import AdminLayout from '@/ui/components/layout/AdminLayout';

export default function AdminRouteLayout({ children }: { children: React.ReactNode }) {
  return <AdminLayout>{children}</AdminLayout>;
}
