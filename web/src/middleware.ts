/**
 * Next.js Middleware - Route Handling
 *
 * Handles aliases & legacy route redirects to new Next.js App Router paths
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Legacy path mappings to new App Router routes
 */
const legacyMappings: Record<string, string> = {
  "/reviews": "/community/reviews",
  "/quotes": "/community/quotes",
  "/clubs": "/community/clubs",
  "/challenge": "/community/challenge",
  "/messenger": "/messages",
  "/addresses": "/profile/addresses",
  "/security": "/profile/security",
  "/wallet": "/profile/wallet",
  "/devices": "/library/devices",
  "/order/success": "/order-success",
  "/orders/success": "/order-success",
  "/seller/product/create": "/seller/products/create",
  "/admin/business-update-requests": "/admin/business-requests",
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static files, API routes, and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/static") ||
    pathname.includes(".") ||
    pathname.startsWith("/ui")
  ) {
    return NextResponse.next();
  }

  // Check direct alias mappings
  if (legacyMappings[pathname]) {
    const targetPath = legacyMappings[pathname];
    if (pathname !== targetPath) {
      return NextResponse.redirect(new URL(targetPath, request.url), 307);
    }
  }

  // Legacy singular redirects to plural routes
  // /order/:id -> /orders/:id
  const orderMatch = pathname.match(/^\/order\/([^/]+)$/);
  if (orderMatch && !pathname.startsWith("/order-success") && !pathname.startsWith("/order/success")) {
    return NextResponse.redirect(new URL(`/orders/${orderMatch[1]}`, request.url), 307);
  }

  // /order/:id/invoice -> /orders/:id/invoice
  if (pathname.startsWith("/order/") && !pathname.startsWith("/order/success")) {
    const parts = pathname.split("/");
    if (parts.length >= 3) {
      const orderId = parts[2];
      const subPath = parts.slice(3).join("/");
      if (subPath) {
        return NextResponse.redirect(new URL(`/orders/${orderId}/${subPath}`, request.url), 307);
      }
    }
  }

  // /seller/order/:id -> /seller/orders/:id
  const sellerOrderMatch = pathname.match(/^\/seller\/order\/([^/]+)$/);
  if (sellerOrderMatch) {
    return NextResponse.redirect(new URL(`/seller/orders/${sellerOrderMatch[1]}`, request.url), 307);
  }

  // /seller/product/edit/:id -> /seller/products/:id/edit
  const sellerProductEditMatch = pathname.match(/^\/seller\/product\/edit\/([^/]+)$/);
  if (sellerProductEditMatch) {
    return NextResponse.redirect(new URL(`/seller/products/${sellerProductEditMatch[1]}/edit`, request.url), 307);
  }

  // /club/:id -> /community/clubs/:id
  const clubMatch = pathname.match(/^\/club\/([^/]+)$/);
  if (clubMatch) {
    return NextResponse.redirect(new URL(`/community/clubs/${clubMatch[1]}`, request.url), 307);
  }

  // /post/:id -> /community/posts/:id
  const postMatch = pathname.match(/^\/post\/([^/]+)$/);
  if (postMatch) {
    return NextResponse.redirect(new URL(`/community/posts/${postMatch[1]}`, request.url), 307);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|ui).*)",
  ],
};
