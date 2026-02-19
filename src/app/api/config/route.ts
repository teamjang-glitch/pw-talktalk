import { NextResponse } from 'next/server';

// 프로덕션 환경에서는 항상 skipAuth: false 반환
// 개발 환경에서만 실제 SKIP_AUTH 값 반환
export async function GET() {
  // 프로덕션에서는 절대 skipAuth를 true로 반환하지 않음
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({
      skipAuth: false,
    });
  }

  return NextResponse.json({
    skipAuth: process.env.SKIP_AUTH === 'true',
  });
}
