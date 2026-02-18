'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { LogOut, Shield, Key } from 'lucide-react';

export function Header() {
  const { data: session } = useSession();

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Key className="w-6 h-6 text-primary-600" />
          <span className="font-bold text-xl text-gray-800">비번톡톡</span>
        </Link>

        <div className="flex items-center gap-4">
          {session ? (
            <>
              {(session.user as any)?.isAdmin && (
                <Link
                  href="/admin"
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                >
                  <Shield className="w-4 h-4" />
                  관리자
                </Link>
              )}

              <div className="flex items-center gap-3">
                {session.user?.image && (
                  <img
                    src={session.user.image}
                    alt="Profile"
                    className="w-8 h-8 rounded-full"
                  />
                )}
                <div className="text-sm">
                  <p className="font-medium text-gray-800">{session.user?.name}</p>
                  <p className="text-gray-500 text-xs">{session.user?.email}</p>
                </div>
              </div>

              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                로그아웃
              </button>
            </>
          ) : (
            <span className="text-sm text-gray-500">테스트 모드</span>
          )}
        </div>
      </div>
    </header>
  );
}
