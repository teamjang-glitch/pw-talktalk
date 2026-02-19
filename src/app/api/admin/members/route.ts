import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, isAdmin } from '@/lib/auth';
import { getMembers, addMember, deleteMember, addAdminLog } from '@/lib/sheets';

const SKIP_AUTH = process.env.SKIP_AUTH === 'true';

// 프로덕션 환경에서 SKIP_AUTH 사용 차단
if (process.env.NODE_ENV === 'production' && SKIP_AUTH) {
  throw new Error('SKIP_AUTH는 프로덕션에서 사용할 수 없습니다.');
}

// 멤버 목록 조회
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

    const members = await getMembers();
    return NextResponse.json({ members });
  } catch (error) {
    console.error('Get members error:', error);
    return NextResponse.json(
      { error: '멤버 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 멤버 추가
export async function POST(request: NextRequest) {
  try {
    let adminEmail = 'system';

    if (!SKIP_AUTH) {
      const session = await getServerSession(authOptions);

      if (!session?.user?.email || !isAdmin(session.user.email)) {
        return NextResponse.json(
          { error: '관리자 권한이 필요합니다.' },
          { status: 403 }
        );
      }
      adminEmail = session.user.email;
    }

    const body = await request.json();
    const { email, group, emails } = body;

    // 대량 추가 처리
    if (emails && Array.isArray(emails)) {
      const ip = request.headers.get('x-forwarded-for') || 'unknown';

      for (const memberEmail of emails) {
        await addMember(memberEmail, group);
      }

      await addAdminLog({
        adminEmail,
        action: 'BULK_MEMBER_ADD',
        targetGroup: group,
        details: `${emails.length}명 추가: ${emails.slice(0, 3).join(', ')}${emails.length > 3 ? '...' : ''}`,
        ip,
      });

      return NextResponse.json({ success: true, count: emails.length });
    }

    if (!email || !group) {
      return NextResponse.json(
        { error: '이메일과 그룹을 입력해주세요.' },
        { status: 400 }
      );
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: '올바른 이메일 형식이 아닙니다.' },
        { status: 400 }
      );
    }

    // 도메인 체크
    const allowedDomain = process.env.ALLOWED_DOMAIN || 'spacecloud.kr';
    if (!email.toLowerCase().endsWith(`@${allowedDomain}`)) {
      return NextResponse.json(
        { error: `@${allowedDomain} 도메인의 이메일만 등록 가능합니다.` },
        { status: 400 }
      );
    }

    await addMember(email, group);

    // 관리자 액션 로그 기록
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    await addAdminLog({
      adminEmail,
      action: 'MEMBER_ADD',
      targetEmail: email,
      targetGroup: group,
      ip,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Add member error:', error);
    return NextResponse.json(
      { error: '멤버 추가 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 멤버 삭제
export async function DELETE(request: NextRequest) {
  try {
    let adminEmail = 'system';

    if (!SKIP_AUTH) {
      const session = await getServerSession(authOptions);

      if (!session?.user?.email || !isAdmin(session.user.email)) {
        return NextResponse.json(
          { error: '관리자 권한이 필요합니다.' },
          { status: 403 }
        );
      }
      adminEmail = session.user.email;
    }

    const body = await request.json();
    const { email, group } = body;

    if (!email || !group) {
      return NextResponse.json(
        { error: '이메일과 그룹을 입력해주세요.' },
        { status: 400 }
      );
    }

    await deleteMember(email, group);

    // 관리자 액션 로그 기록
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    await addAdminLog({
      adminEmail,
      action: 'MEMBER_DELETE',
      targetEmail: email,
      targetGroup: group,
      ip,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete member error:', error);
    return NextResponse.json(
      { error: '멤버 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
