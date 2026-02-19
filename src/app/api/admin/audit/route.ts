import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, isAdmin } from '@/lib/auth';
import { getAdminLogs } from '@/lib/sheets';

const SKIP_AUTH = process.env.SKIP_AUTH === 'true';

// 프로덕션 환경에서 SKIP_AUTH 사용 차단
if (process.env.NODE_ENV === 'production' && SKIP_AUTH) {
  throw new Error('SKIP_AUTH는 프로덕션에서 사용할 수 없습니다.');
}

// 관리자 액션 로그 조회
export async function GET(request: NextRequest) {
  try {
    if (!SKIP_AUTH) {
      const session = await getServerSession(authOptions);

      if (!session?.user?.email || !isAdmin(session.user.email)) {
        return NextResponse.json(
          { error: '관리자 권한이 필요합니다.' },
          { status: 403 }
        );
      }
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    const logs = await getAdminLogs(limit);
    return NextResponse.json({ logs });
  } catch (error) {
    console.error('Get admin logs error:', error);
    return NextResponse.json(
      { error: '관리자 로그 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
