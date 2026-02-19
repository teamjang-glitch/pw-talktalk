import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getFavorites, addFavorite, removeFavorite, getFavoriteServices, getServices } from '@/lib/sheets';

// GET: 즐겨찾기 목록 조회
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const withDetails = searchParams.get('details') === 'true';

  try {
    if (withDetails) {
      // 서비스 상세 정보와 함께 반환
      const services = await getFavoriteServices(session.user.email);
      return NextResponse.json({ favorites: services });
    } else {
      // 즐겨찾기 목록만 반환
      const favorites = await getFavorites(session.user.email);
      return NextResponse.json({ favorites });
    }
  } catch (error) {
    console.error('즐겨찾기 조회 오류:', error);
    return NextResponse.json({ error: '조회 실패' }, { status: 500 });
  }
}

// POST: 즐겨찾기 추가
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { serviceId, serviceName } = body;

    if (!serviceId) {
      return NextResponse.json({ error: 'serviceId가 필요합니다' }, { status: 400 });
    }

    // serviceName이 없으면 서비스 목록에서 찾기
    let name = serviceName;
    if (!name) {
      const services = await getServices();
      const service = services.find(s => s.id === serviceId);
      name = service?.serviceName || serviceId;
    }

    await addFavorite(session.user.email, serviceId, name);
    return NextResponse.json({ success: true, message: '즐겨찾기에 추가되었습니다' });
  } catch (error) {
    console.error('즐겨찾기 추가 오류:', error);
    return NextResponse.json({ error: '추가 실패' }, { status: 500 });
  }
}

// DELETE: 즐겨찾기 삭제
export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const serviceId = searchParams.get('serviceId');

    if (!serviceId) {
      return NextResponse.json({ error: 'serviceId가 필요합니다' }, { status: 400 });
    }

    await removeFavorite(session.user.email, serviceId);
    return NextResponse.json({ success: true, message: '즐겨찾기에서 삭제되었습니다' });
  } catch (error) {
    console.error('즐겨찾기 삭제 오류:', error);
    return NextResponse.json({ error: '삭제 실패' }, { status: 500 });
  }
}
