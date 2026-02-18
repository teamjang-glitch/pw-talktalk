import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, isAdmin } from '@/lib/auth';
import { getMembers, addMember, deleteMember } from '@/lib/sheets';

const SKIP_AUTH = process.env.SKIP_AUTH === 'true';

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
    const { email, group } = body;

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
    const { email, group } = body;

    if (!email || !group) {
      return NextResponse.json(
        { error: '이메일과 그룹을 입력해주세요.' },
        { status: 400 }
      );
    }

    await deleteMember(email, group);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete member error:', error);
    return NextResponse.json(
      { error: '멤버 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
