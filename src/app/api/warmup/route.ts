import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, isAdmin } from '@/lib/auth';
import { getServices, refreshCache } from '@/lib/sheets';
import { checkRateLimit, getClientIP, getRateLimitHeaders } from '@/lib/rate-limit';

const SKIP_AUTH = process.env.SKIP_AUTH === 'true';

// 프로덕션 환경에서 SKIP_AUTH 사용 차단
if (process.env.NODE_ENV === 'production' && SKIP_AUTH) {
  throw new Error('SKIP_AUTH는 프로덕션에서 사용할 수 없습니다.');
}

// 서버 시작 시 캐시를 미리 로드하는 API (관리자 전용)
export async function GET(request: NextRequest) {
  try {
    // Rate Limit 체크 (캐시 새로고침 남용 방지)
    const clientIP = getClientIP(request);
    const rateLimitResult = checkRateLimit(clientIP, 'admin');

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult),
        }
      );
    }

    // 관리자 인증 체크
    if (!SKIP_AUTH) {
      const session = await getServerSession(authOptions);

      if (!session?.user?.email || !isAdmin(session.user.email)) {
        return NextResponse.json(
          { error: '관리자 권한이 필요합니다.' },
          { status: 403 }
        );
      }
    }

    console.log('[Warmup] 캐시 워밍업 시작...');
    const startTime = Date.now();

    // 캐시 강제 갱신
    await refreshCache();
    const services = await getServices();

    const duration = Date.now() - startTime;
    console.log(`[Warmup] 캐시 워밍업 완료: ${services.length}개 서비스, ${duration}ms`);

    return NextResponse.json({
      success: true,
      count: services.length,
      duration: `${duration}ms`,
    });
  } catch (error) {
    console.error('[Warmup] 캐시 워밍업 실패:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
