import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, isAdmin } from '@/lib/auth';
import {
  getServicesWithPermissions,
  setServicePermission,
} from '@/lib/sheets';

const SKIP_AUTH = process.env.SKIP_AUTH === 'true';

// 서비스 목록 + 권한 조회
export async function GET() {
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

    const services = await getServicesWithPermissions();
    return NextResponse.json({ services });
  } catch (error) {
    console.error('Get permissions error:', error);
    return NextResponse.json(
      { error: '권한 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 서비스 권한 설정
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { serviceId, allowedGroups } = body;

    if (!serviceId) {
      return NextResponse.json(
        { error: '서비스 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    await setServicePermission(serviceId, allowedGroups || []);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Set permission error:', error);
    return NextResponse.json(
      { error: '권한 설정 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
