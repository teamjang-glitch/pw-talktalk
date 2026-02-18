import { NextResponse } from 'next/server';
import { getServices, refreshCache } from '@/lib/sheets';

// 서버 시작 시 캐시를 미리 로드하는 API
export async function GET() {
  try {
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
