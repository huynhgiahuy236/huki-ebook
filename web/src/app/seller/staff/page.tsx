"use client";

import React, { Suspense } from 'react';
import { SellerStaffView } from "@/ui/components/seller/SellerStaffView";

function SellerStaffPageContent() {
  return <SellerStaffView />;
}


export default function SellerStaffPage(props: any) {
  return (
    <Suspense fallback={null}>
      <SellerStaffPageContent {...props} />
    </Suspense>
  );
}
