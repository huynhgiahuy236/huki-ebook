import { NextResponse, NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';

export interface PenaltyRecord {
  id: string;
  storeId: string;
  violationType: string;
  violationName: string;
  points: number;
  reason: string;
  relatedOrderId?: string;
  relatedBookTitle?: string;
  createdAt: string;
  expiresAt: string;
  isAppealed?: boolean;
  appealStatus?: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
  appealReason?: string;
  appealProof?: string;
  appealAdminNote?: string;
  appealReviewedAt?: string;
}

export interface StorePenaltyProfile {
  storeId: string;
  storeName?: string;
  totalPoints: number;
  penaltyPoints: number;
  tier: string;
  tierLabel: string;
  tierDescription: string;
  badgeColor: string;
  canJoinPlatformFlashSale: boolean;
  maxBooksPerPlatformSlot: number;
  activeSanctionMessage?: string;
  sanctionExpiresAt?: string;
  quarterlyResetDate: string;
  metrics: {
    nonFulfillmentRate: number;
    lateShipmentRate: number;
    responseRate: number;
    rating: number;
  };
  history: PenaltyRecord[];
  violationHistory?: PenaltyRecord[];
  quarterCycle: string;
  checklist: any[];
}

const DEFAULT_PROFILES: Record<string, StorePenaltyProfile> = {
  'nxb-kim-dong': {
    storeId: 'nxb-kim-dong',
    storeName: 'Nhà Xuất Bản Kim Đồng Official',
    totalPoints: 0,
    penaltyPoints: 0,
    tier: 'TIER_0_GOOD',
    tierLabel: '🟢 Hạng Tốt (Uy Tín)',
    tierDescription: 'Gian hàng tuân thủ quy chuẩn chất lượng, đủ điều kiện tham gia Flash Sale của Sàn.',
    badgeColor: 'emerald',
    canJoinPlatformFlashSale: true,
    maxBooksPerPlatformSlot: 20,
    quarterlyResetDate: '2027-01-01',
    metrics: {
      nonFulfillmentRate: 0.8,
      lateShipmentRate: 1.2,
      responseRate: 98,
      rating: 4.9,
    },
    history: [],
    violationHistory: [],
    quarterCycle: 'Q4-2026',
    checklist: [],
  },
};

declare global {
  // eslint-disable-next-line no-var
  var __HUKI_SERVER_PENALTIES__: Record<string, StorePenaltyProfile> | undefined;
}

const STORAGE_FILE = path.join(process.cwd(), '.huki_seller_penalties.json');

function getPenaltiesFromStore(): Record<string, StorePenaltyProfile> {
  if (globalThis.__HUKI_SERVER_PENALTIES__) {
    return globalThis.__HUKI_SERVER_PENALTIES__;
  }
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const content = fs.readFileSync(STORAGE_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === 'object') {
        const merged: Record<string, StorePenaltyProfile> = { ...DEFAULT_PROFILES, ...parsed };
        globalThis.__HUKI_SERVER_PENALTIES__ = merged;
        return merged;
      }
    }
  } catch (err) {
    console.warn('Could not read seller penalties file, using defaults', err);
  }

  const initial: Record<string, StorePenaltyProfile> = { ...DEFAULT_PROFILES };
  globalThis.__HUKI_SERVER_PENALTIES__ = initial;
  savePenaltiesToStore(initial);
  return initial;
}

function savePenaltiesToStore(profiles: Record<string, StorePenaltyProfile>) {
  globalThis.__HUKI_SERVER_PENALTIES__ = profiles;
  try {
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(profiles, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not save seller penalties file', err);
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const storeId = searchParams.get('storeId');
  const profiles = getPenaltiesFromStore();

  if (storeId) {
    return NextResponse.json({ success: true, data: profiles[storeId] || null });
  }
  return NextResponse.json({ success: true, data: profiles });
}

export async function POST(req: NextRequest) {
  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      const text = await req.text();
      body = text ? JSON.parse(text) : {};
    }

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, message: 'Invalid payload' }, { status: 400 });
    }

    const current = getPenaltiesFromStore();
    let updated = { ...current };

    if (body.profiles && typeof body.profiles === 'object') {
      updated = { ...updated, ...body.profiles };
    } else if (body.storeId && body.profile) {
      updated[body.storeId] = body.profile;
    }

    savePenaltiesToStore(updated);
    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err?.message || 'Server error' }, { status: 500 });
  }
}
