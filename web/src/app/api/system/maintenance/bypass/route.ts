import { NextResponse, NextRequest } from 'next/server';

const MASTER_BYPASS_KEY = process.env.MAINTENANCE_BYPASS_KEY || 'HUKI_MASTER_ADMIN_2026';
const BYPASS_COOKIE_NAME = 'huki_bypass_token';

export async function POST(req: NextRequest) {
  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      const text = await req.text();
      body = text ? JSON.parse(text) : {};
    }

    const key = body?.key ? String(body.key).trim() : '';
    if (!key || key !== MASTER_BYPASS_KEY.trim()) {
      return NextResponse.json(
        { success: false, message: 'Khóa Bypass quản trị không hợp lệ' },
        { status: 403 }
      );
    }

    const response = NextResponse.json({
      success: true,
      message: 'Xác thực Khóa Bypass thành công',
    });

    response.cookies.set({
      name: BYPASS_COOKIE_NAME,
      value: encodeURIComponent(MASTER_BYPASS_KEY),
      path: '/',
      maxAge: 86400,
      sameSite: 'lax',
      httpOnly: false,
    });

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || 'Server error' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({
    success: true,
    message: 'Đã xóa quyền Bypass',
  });

  response.cookies.set({
    name: BYPASS_COOKIE_NAME,
    value: '',
    path: '/',
    maxAge: 0,
    sameSite: 'lax',
  });

  return response;
}
