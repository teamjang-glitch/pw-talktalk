import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPopularServices, getUserGroups } from '@/lib/sheets';

const SKIP_AUTH = process.env.SKIP_AUTH === 'true';

export async function GET() {
  try {
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
