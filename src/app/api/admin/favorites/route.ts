import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getFavoriteStats } from '@/lib/sheets';

// GET: 즐겨찾기 통계 조회 (어드민 전용)
export async function GET() {
  const session = await getServerSession(authOptions);

  // 어드민 확인
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase());
  const isAdmin = session?.user?.email && adminEmails.includes(session.user.email.toLowerCase());

  if (!isAdmin) {
    return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 });
  }

  try {
    const stats = await getFavoriteStats();
    return NextResponse.json({ stats });
  } catch (error) {
    console.error('즐겨찾기 통계 조회 오류:', error);
    return NextResponse.json({ error: '조회 실패' }, { status: 500 });
  }
}
