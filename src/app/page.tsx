'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { SearchBox } from '@/components/SearchBox';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [skipAuth, setSkipAuth] = useState(false);

  useEffect(() => {
    // 테스트 모드 확인 및 캐시 워밍업
    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
        setSkipAuth(data.skipAuth || false);
      })
      .catch(() => setSkipAuth(false));

    // 캐시 워밍업 (백그라운드에서 데이터 미리 로드)
    fetch('/api/warmup')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          console.log(`[Warmup] ${data.count}개 서비스 데이터 로드 완료 (${data.duration})`);
        }
      })
      .catch(err => console.error('[Warmup] 실패:', err));
  }, []);

  useEffect(() => {
    if (!skipAuth && status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router, skipAuth]);

  // 로딩 중
  if (status === 'loading' && !skipAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // 테스트 모드이거나 로그인된 경우
  if (skipAuth || session) {
    return (
      <div className="min-h-screen bg-gray-50">
        {skipAuth && !session && (
          <div className="bg-amber-500 text-white text-center py-2 text-sm font-medium">
            테스트 모드 - 로그인 없이 접근 중
          </div>
        )}
        <Header />
        <main className="max-w-7xl mx-auto px-6 py-8">
          <SearchBox />
        </main>
      </div>
    );
  }

  return null;
}
