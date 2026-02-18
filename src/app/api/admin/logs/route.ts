import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, isAdmin } from '@/lib/auth';
import { getLogs } from '@/lib/sheets';

const SKIP_AUTH = process.env.SKIP_AUTH === 'true';

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

    const logs = await getLogs(limit);
    return NextResponse.json({ logs });
  } catch (error) {
    console.error('Get logs error:', error);
    return NextResponse.json(
      { error: '로그 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
