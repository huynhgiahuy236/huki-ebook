"use client";

import React, { Suspense } from 'react';
import SellerCreateProductView from "@/ui/components/seller/SellerCreateProductView";

function SellerProductsCreatePageContent() {
  return <SellerCreateProductView initialFormat="BOTH" />;
}


export default function SellerProductsCreatePage(props: any) {
  return (
    <Suspense fallback={null}>
      <SellerProductsCreatePageContent {...props} />
    </Suspense>
  );
}
