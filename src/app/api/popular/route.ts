import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPopularServices, getUserGroups } from '@/lib/sheets';
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
    const rateLimitResult = checkRateLimit(clientIP, 'popular');

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult),
        }
      );
    }

    let userGroups: string[] = ['*'];

    if (!SKIP_AUTH) {
      const session = await getServerSession(authOptions);
      if (!session?.user?.email) {
        return NextResponse.json(
          { error: '인증이 필요합니다.' },
          { status: 401 }
        );
      }

      // 사용자 그룹 조회
      userGroups = await getUserGroups(session.user.email);

      // 어드민은 모든 서비스 접근 가능
      const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase());
      if (adminEmails.includes(session.user.email.toLowerCase())) {
        userGroups = ['*'];
      }
    }

    const services = await getPopularServices(9, userGroups);

    return NextResponse.json({ services });
  } catch (error) {
    console.error('Popular services error:', error);
    return NextResponse.json(
      { error: '인기 서비스 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
