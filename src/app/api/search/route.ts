import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { searchServices, addLog, getUserGroups } from '@/lib/sheets';
import { checkRateLimit, getClientIP, getRateLimitHeaders } from '@/lib/rate-limit';

const SKIP_AUTH = process.env.SKIP_AUTH === 'true';

// 프로덕션 환경에서 SKIP_AUTH 사용 차단
if (process.env.NODE_ENV === 'production' && SKIP_AUTH) {
  throw new Error('SKIP_AUTH는 프로덕션에서 사용할 수 없습니다.');
}

export async function GET(request: NextRequest) {
  try {
    // Rate Limit 체크
    const clientIP = getClientIP(request);
    const rateLimitResult = checkRateLimit(clientIP, 'search');

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult),
        }
      );
    }

    let userEmail = 'test-mode@local';
    let userGroups: string[] = ['*']; // 기본: 모든 서비스 접근 가능

    // 테스트 모드가 아니면 인증 체크 및 그룹 조회
    if (!SKIP_AUTH) {
      const session = await getServerSession(authOptions);
      if (!session?.user?.email) {
        return NextResponse.json(
          { error: '인증이 필요합니다.' },
          { status: 401 }
        );
      }
      userEmail = session.user.email;

      // 사용자의 소속 팀 조회
      userGroups = await getUserGroups(userEmail);

      // 어드민은 모든 서비스 접근 가능
      const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase());
      if (adminEmails.includes(userEmail.toLowerCase())) {
        userGroups = ['*'];
      }
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    if (!query.trim()) {
      return NextResponse.json({ results: [] });
    }

    // 검색 실행 (사용자 그룹 기반 필터링)
    const results = await searchServices(query, userGroups);

    // 로그 기록
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const browser = request.headers.get('user-agent') || 'unknown';

    await addLog({
      email: userEmail,
      searchQuery: query,
      ip,
      browser,
      success: results.length > 0,
    });

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: '검색 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
