// 간단한 인메모리 Rate Limiter
// 프로덕션에서는 Redis 등을 사용하는 것이 권장됨

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// IP별 요청 카운터
const rateLimitMap = new Map<string, RateLimitEntry>();

// 오래된 엔트리 정리 (메모리 누수 방지)
setInterval(() => {
  const now = Date.now();
  const keysToDelete: string[] = [];

  rateLimitMap.forEach((entry, key) => {
    if (entry.resetTime < now) {
      keysToDelete.push(key);
    }
  });

  keysToDelete.forEach(key => rateLimitMap.delete(key));
}, 60000); // 1분마다 정리

export interface RateLimitConfig {
  windowMs: number;    // 시간 윈도우 (밀리초)
  maxRequests: number; // 윈도우 내 최대 요청 수
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number; // 초 단위
}

// 기본 설정
const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 60 * 1000,  // 1분
  maxRequests: 60,      // 분당 60회
};

// API별 설정
export const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  // 검색 API: 분당 30회
  'search': {
    windowMs: 60 * 1000,
    maxRequests: 30,
  },
  // 인기 서비스 API: 분당 20회
  'popular': {
    windowMs: 60 * 1000,
    maxRequests: 20,
  },
  // 즐겨찾기 API: 분당 30회
  'favorites': {
    windowMs: 60 * 1000,
    maxRequests: 30,
  },
  // 관리자 API: 분당 60회
  'admin': {
    windowMs: 60 * 1000,
    maxRequests: 60,
  },
};

/**
 * Rate Limit 체크
 * @param identifier - IP 주소 또는 사용자 식별자
 * @param apiName - API 이름 (설정 조회용)
 * @returns Rate limit 결과
 */
export function checkRateLimit(
  identifier: string,
  apiName: string = 'default'
): RateLimitResult {
  const config = RATE_LIMIT_CONFIGS[apiName] || DEFAULT_CONFIG;
  const now = Date.now();
  const key = `${apiName}:${identifier}`;

  let entry = rateLimitMap.get(key);

  // 새 엔트리 또는 윈도우 만료
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 1,
      resetTime: now + config.windowMs,
    };
    rateLimitMap.set(key, entry);

    return {
      success: true,
      remaining: config.maxRequests - 1,
      resetTime: entry.resetTime,
    };
  }

  // 기존 윈도우 내 요청
  entry.count++;

  if (entry.count > config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    return {
      success: false,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfter,
    };
  }

  return {
    success: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
  };
}

/**
 * IP 주소 추출
 */
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  return 'unknown';
}

/**
 * Rate Limit 헤더 생성
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetTime / 1000)),
  };

  if (result.retryAfter) {
    headers['Retry-After'] = String(result.retryAfter);
  }

  return headers;
}
