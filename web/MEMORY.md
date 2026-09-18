---
name: nextjs-migration-status
description: Migration progress from React Router to Next.js App Router
metadata:
  type: project
---

# Next.js Migration Progress

## Completed Pages (8/84)
1. ✅ `src/app/auth/login/page.tsx`
2. ✅ `src/app/auth/register/page.tsx`
3. ✅ `src/app/auth/forgot-password/page.tsx`
4. ✅ `src/app/auth/verify/page.tsx`
5. ✅ `src/app/auth/reset-password/page.tsx`
6. ✅ `src/app/auth/change-password/page.tsx`
7. ✅ `src/app/auth/status/page.tsx`
8. ✅ `src/app/auth/onboarding/page.tsx`

## Remaining Pages (76)
- All Store pages (40+ files in `src/ui/pages/store/`)
- All Seller pages (20+ files in `src/ui/pages/seller/`)
- All Admin pages (20+ files in `src/ui/pages/admin/`)

## Migration Rules Applied
- Add `"use client"` directive for pages using hooks
- Replace `react-router-dom` with Next.js navigation
- `useNavigate()` → `useRouter()`
- `navigate()` → `router.push()`
- `<Link to=...>` → `<Link href=...>`
- `useLocation()` → `usePathname()`
- `useParams()` → `params as any` (from layout)
- Import paths: `../../context/` → `@/ui/context/`

## Scripts Created
- `scripts/migrate-pages.js` - Node.js script for batch migration
- `scripts/migrate.sh` - Bash script (may not work on Windows)
- `scripts/migrate-all.ps1` - PowerShell script (may not work in sandbox)

## How to Run
```bash
node scripts/migrate-pages.js
```

## Pending Fixes Needed After Migration
1. HomePage.tsx may need special handling (large file, 2477 lines)
2. Verify all `to=` links were converted to `href=`
3. Check `useSearchParams()` requires Suspense boundary in some cases
4. Dynamic routes like `[id]` need `params` prop from layout

**Why:** Full React Router → Next.js App Router migration for HUKI Ecommerce project.
**How to apply:** Run migration script, then manually fix TypeScript errors and verify all routes work.
