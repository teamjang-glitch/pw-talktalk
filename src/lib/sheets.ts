import { ServiceData, Member, SearchLog, ServicePermission, Favorite, AdminLog, AdminAction } from '@/types';

// Google Apps Script API URL
const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL || '';
const USE_MOCK = !APPS_SCRIPT_URL || process.env.USE_MOCK === 'true';

// ============ 캐시 설정 ============
let cachedServices: ServiceData[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5분 캐시

// ============ Mock 데이터 ============
let mockServices: ServiceData[] = [
  {
    id: 'service-1',
    serviceName: 'AWS 콘솔',
    url: 'https://console.aws.amazon.com',
    accountId: 'admin@spacecloud.kr',
    password: 'aws-admin-2024!@#',
    usage: '클라우드 인프라 관리',
    lastModified: '2024-02-15',
  },
];

let mockMembers: Member[] = [
  { email: 'socialjung@spacecloud.kr', group: '로드맵' },
  { email: 'master@spacecloud.kr', group: '디렉터스' },
];

let mockLogs: SearchLog[] = [];

// 서비스별 접근 권한 (serviceId -> allowedGroups)
// 빈 배열 = 전체 접근 가능
let servicePermissions: Map<string, string[]> = new Map();

// ============ Apps Script API 호출 ============
async function fetchFromAppsScript(): Promise<any> {
  const response = await fetch(APPS_SCRIPT_URL, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Apps Script API 오류: ${response.status}`);
  }

  return response.json();
}

// ============ 문자열 변환 헬퍼 ============
function toString(value: any): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}

// ============ API 응답을 ServiceData로 변환 ============
function mapApiResponseToServiceData(item: any): ServiceData {
  return {
    id: toString(item.id),
    serviceName: toString(item['사이트명'] || item.serviceName),
    url: toString(item.url || item.URL),
    accountId: toString(item.accountId || item['계정'] || item['아이디'] || item['ID']),
    password: toString(item.password || item['PW'] || item['비밀번호']),
    passwordKr: toString(item['PW(한글)']),
    usage: toString(item.usage || item['용도'] || item['비고']),
    lastModified: toString(item.lastModified || item['최종수정일'] || item['최종 수정일']),
    editor: toString(item['편집자']),
    registrant: toString(item['계정가입자/본인인증']),
    verified: toString(item['확인']),
  };
}

// ============ 서비스 데이터 조회 (캐시 적용) ============
export async function getServices(): Promise<ServiceData[]> {
  if (USE_MOCK) {
    return mockServices;
  }

  // 캐시가 유효하면 캐시 반환
  const now = Date.now();
  if (cachedServices && (now - cacheTimestamp) < CACHE_DURATION) {
    console.log('[Cache Hit] 캐시된 데이터 반환');
    return cachedServices;
  }

  try {
    console.log('[API Call] Apps Script에서 데이터 로드 중...');
    const result = await fetchFromAppsScript();
    const data = result.data || [];
    const services = data.map(mapApiResponseToServiceData);
    cachedServices = services;
    cacheTimestamp = now;
    console.log(`[API Call] ${services.length}개 데이터 로드 완료`);
    return services;
  } catch (error) {
    console.error('Apps Script API 오류:', error);
    // 캐시가 있으면 오류 시에도 캐시 반환
    if (cachedServices) {
      console.log('[Fallback] 캐시된 데이터 반환');
      return cachedServices;
    }
    return [];
  }
}

// ============ 서비스 검색 (로컬 필터링 + 권한 체크) ============
export async function searchServices(
  query: string,
  userGroups: string[]
): Promise<ServiceData[]> {
  const services = await getServices();
  const lowerQuery = query.toLowerCase();

  return services.filter((service) => {
    // 검색어 매칭
    const matchesServiceName = (service.serviceName || '').toLowerCase().includes(lowerQuery);
    const matchesUrl = (service.url || '').toLowerCase().includes(lowerQuery);
    const matchesQuery = matchesServiceName || matchesUrl;

    if (!matchesQuery) return false;

    // 권한 체크 ('*'는 모든 서비스 접근 가능 - 어드민용)
    if (userGroups.includes('*')) return true;

    // 서비스별 접근 권한 확인
    const allowedGroups = servicePermissions.get(service.id);

    // 권한이 설정되지 않았거나 빈 배열이면 전체 접근 가능
    if (!allowedGroups || allowedGroups.length === 0) return true;

    // 사용자 그룹 중 하나라도 허용된 그룹에 포함되면 접근 가능
    return userGroups.some(group => allowedGroups.includes(group));
  });
}

// ============ 캐시 갱신 ============
export async function refreshCache(): Promise<void> {
  cachedServices = null;
  cacheTimestamp = 0;
  await getServices();
}

// ============ 멤버 관리 ============
// 멤버 캐시
let cachedMembers: Member[] | null = null;
let membersCacheTimestamp: number = 0;
const MEMBERS_CACHE_DURATION = 60 * 1000; // 1분 캐시

export async function getMembers(): Promise<Member[]> {
  if (USE_MOCK) {
    return mockMembers;
  }

  // 캐시 확인
  const now = Date.now();
  if (cachedMembers && (now - membersCacheTimestamp) < MEMBERS_CACHE_DURATION) {
    return cachedMembers;
  }

  try {
    const response = await fetch(`${APPS_SCRIPT_URL}?action=getMembers`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`API 오류: ${response.status}`);
    }

    const result = await response.json();
    const members: Member[] = result.members || [];
    cachedMembers = members;
    membersCacheTimestamp = now;
    return members;
  } catch (error) {
    console.error('멤버 조회 오류:', error);
    if (cachedMembers) {
      return cachedMembers;
    }
    return mockMembers;
  }
}

export async function getUserGroups(email: string): Promise<string[]> {
  const members = await getMembers();
  return members
    .filter((member) => member.email.toLowerCase() === email.toLowerCase())
    .map((member) => member.group);
}

export async function addMember(email: string, group: string): Promise<void> {
  if (USE_MOCK) {
    mockMembers.push({ email, group });
    return;
  }

  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'addMember',
        email,
        group,
      }),
    });

    if (!response.ok) {
      throw new Error(`API 오류: ${response.status}`);
    }

    // 캐시 무효화
    cachedMembers = null;
    membersCacheTimestamp = 0;
  } catch (error) {
    console.error('멤버 추가 오류:', error);
    throw error;
  }
}

export async function deleteMember(email: string, group: string): Promise<void> {
  if (USE_MOCK) {
    mockMembers = mockMembers.filter(
      (m) => !(m.email === email && m.group === group)
    );
    return;
  }

  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'deleteMember',
        email,
        group,
      }),
    });

    if (!response.ok) {
      throw new Error(`API 오류: ${response.status}`);
    }

    // 캐시 무효화
    cachedMembers = null;
    membersCacheTimestamp = 0;
  } catch (error) {
    console.error('멤버 삭제 오류:', error);
    throw error;
  }
}

// ============ 로그 관리 ============
export async function addLog(log: Omit<SearchLog, 'timestamp'>): Promise<void> {
  mockLogs.unshift({
    ...log,
    timestamp: new Date().toISOString(),
  });

  if (mockLogs.length > 1000) {
    mockLogs = mockLogs.slice(0, 1000);
  }
}

export async function getLogs(limit = 100): Promise<SearchLog[]> {
  return mockLogs.slice(0, limit);
}

export async function initializeSpreadsheet(): Promise<void> {
  console.log('[Info] Apps Script 모드');
}

// ============ 인기 서비스 조회 ============
// 검색 로그 기반으로 가장 많이 검색된 서비스 반환
export async function getPopularServices(limit = 9, userGroups: string[] = ['*']): Promise<ServiceData[]> {
  const services = await getServices();
  const logs = await getLogs(500); // 최근 500개 로그 분석

  // 검색어별 카운트
  const searchCounts: Map<string, number> = new Map();
  logs.forEach(log => {
    if (log.success && log.searchQuery) {
      const query = log.searchQuery.toLowerCase();
      searchCounts.set(query, (searchCounts.get(query) || 0) + 1);
    }
  });

  // 서비스별 점수 계산 (검색 매칭 횟수)
  const serviceScores: Map<string, number> = new Map();
  services.forEach(service => {
    let score = 0;
    const serviceName = service.serviceName.toLowerCase();
    const serviceUrl = service.url.toLowerCase();

    searchCounts.forEach((count, query) => {
      if (serviceName.includes(query) || serviceUrl.includes(query)) {
        score += count;
      }
    });

    serviceScores.set(service.id, score);
  });

  // 권한 필터링 및 정렬
  const filteredServices = services.filter(service => {
    if (userGroups.includes('*')) return true;
    const allowedGroups = servicePermissions.get(service.id);
    if (!allowedGroups || allowedGroups.length === 0) return true;
    return userGroups.some(group => allowedGroups.includes(group));
  });

  // 점수로 정렬, 점수가 같으면 서비스명으로 정렬
  const sorted = filteredServices.sort((a, b) => {
    const scoreA = serviceScores.get(a.id) || 0;
    const scoreB = serviceScores.get(b.id) || 0;
    if (scoreB !== scoreA) return scoreB - scoreA;
    return a.serviceName.localeCompare(b.serviceName);
  });

  // 점수가 0인 것들은 랜덤하게 섞어서 다양하게 보여줌
  const withScore = sorted.filter(s => (serviceScores.get(s.id) || 0) > 0);
  const withoutScore = sorted.filter(s => (serviceScores.get(s.id) || 0) === 0);

  // 점수 있는 것 + 없는 것에서 랜덤 선택
  const result = [...withScore];
  const remaining = limit - result.length;
  if (remaining > 0 && withoutScore.length > 0) {
    // 검색 기록이 없으면 앞에서부터 선택 (주요 서비스가 앞에 있다고 가정)
    result.push(...withoutScore.slice(0, remaining));
  }

  return result.slice(0, limit);
}

// ============ 서비스 권한 관리 ============
export async function getServicePermissions(): Promise<ServicePermission[]> {
  const services = await getServices();
  return services.map(service => ({
    serviceId: service.id,
    serviceName: service.serviceName,
    allowedGroups: servicePermissions.get(service.id) || [],
  }));
}

export async function getServicePermission(serviceId: string): Promise<string[]> {
  return servicePermissions.get(serviceId) || [];
}

export async function setServicePermission(serviceId: string, allowedGroups: string[]): Promise<void> {
  if (allowedGroups.length === 0) {
    servicePermissions.delete(serviceId);
  } else {
    servicePermissions.set(serviceId, allowedGroups);
  }
}

export async function getServicesWithPermissions(): Promise<(ServiceData & { allowedGroups: string[] })[]> {
  const services = await getServices();
  return services.map(service => ({
    ...service,
    allowedGroups: servicePermissions.get(service.id) || [],
  }));
}

// ============ 즐겨찾기 관리 ============
// Mock 데이터 (API 연동 실패 시 폴백)
let mockFavorites: Favorite[] = [];

// 즐겨찾기 캐시
let cachedFavorites: Map<string, Favorite[]> = new Map();
let favoritesCacheTimestamp: Map<string, number> = new Map();
const FAVORITES_CACHE_DURATION = 60 * 1000; // 1분 캐시

// 사용자의 즐겨찾기 목록 조회
export async function getFavorites(email: string): Promise<Favorite[]> {
  if (USE_MOCK) {
    return mockFavorites
      .filter(f => f.email.toLowerCase() === email.toLowerCase())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // 캐시 확인
  const now = Date.now();
  const cacheKey = email.toLowerCase();
  const cachedTime = favoritesCacheTimestamp.get(cacheKey) || 0;

  if (cachedFavorites.has(cacheKey) && (now - cachedTime) < FAVORITES_CACHE_DURATION) {
    return cachedFavorites.get(cacheKey) || [];
  }

  try {
    const response = await fetch(`${APPS_SCRIPT_URL}?action=getFavorites&email=${encodeURIComponent(email)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`API 오류: ${response.status}`);
    }

    const result = await response.json();
    const rawFavorites = result.favorites || [];

    // 중복 제거 (serviceId 기준)
    const seen = new Set<string>();
    const favorites = rawFavorites.filter((f: Favorite) => {
      if (seen.has(f.serviceId)) {
        return false;
      }
      seen.add(f.serviceId);
      return true;
    });

    // 캐시 저장
    cachedFavorites.set(cacheKey, favorites);
    favoritesCacheTimestamp.set(cacheKey, now);

    return favorites;
  } catch (error) {
    console.error('즐겨찾기 조회 오류:', error);
    // 캐시가 있으면 반환
    if (cachedFavorites.has(cacheKey)) {
      return cachedFavorites.get(cacheKey) || [];
    }
    return [];
  }
}

// 즐겨찾기 추가
export async function addFavorite(email: string, serviceId: string, serviceName: string): Promise<void> {
  if (USE_MOCK) {
    const exists = mockFavorites.some(
      f => f.email.toLowerCase() === email.toLowerCase() && f.serviceId === serviceId
    );
    if (!exists) {
      mockFavorites.push({
        email: email.toLowerCase(),
        serviceId,
        serviceName,
        createdAt: new Date().toISOString(),
      });
    }
    return;
  }

  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'addFavorite',
        email,
        serviceId,
        serviceName,
      }),
    });

    if (!response.ok) {
      throw new Error(`API 오류: ${response.status}`);
    }

    // 캐시 무효화
    const cacheKey = email.toLowerCase();
    cachedFavorites.delete(cacheKey);
    favoritesCacheTimestamp.delete(cacheKey);
  } catch (error) {
    console.error('즐겨찾기 추가 오류:', error);
    throw error;
  }
}

// 즐겨찾기 삭제
export async function removeFavorite(email: string, serviceId: string): Promise<void> {
  if (USE_MOCK) {
    mockFavorites = mockFavorites.filter(
      f => !(f.email.toLowerCase() === email.toLowerCase() && f.serviceId === serviceId)
    );
    return;
  }

  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'removeFavorite',
        email,
        serviceId,
      }),
    });

    if (!response.ok) {
      throw new Error(`API 오류: ${response.status}`);
    }

    // 캐시 무효화
    const cacheKey = email.toLowerCase();
    cachedFavorites.delete(cacheKey);
    favoritesCacheTimestamp.delete(cacheKey);
  } catch (error) {
    console.error('즐겨찾기 삭제 오류:', error);
    throw error;
  }
}

// 사용자가 해당 서비스를 즐겨찾기했는지 확인
export async function isFavorite(email: string, serviceId: string): Promise<boolean> {
  const favorites = await getFavorites(email);
  return favorites.some(f => f.serviceId === serviceId);
}

// 사용자의 즐겨찾기 서비스 데이터 조회
export async function getFavoriteServices(email: string): Promise<ServiceData[]> {
  const favorites = await getFavorites(email);
  const services = await getServices();

  const favoriteServiceIds = new Set(favorites.map(f => f.serviceId));
  return services.filter(service => favoriteServiceIds.has(service.id));
}

// 전체 즐겨찾기 통계 (어드민용)
export async function getFavoriteStats(): Promise<{ serviceId: string; serviceName: string; count: number; users: string[] }[]> {
  if (USE_MOCK) {
    const stats = new Map<string, { serviceName: string; count: number; users: string[] }>();

    mockFavorites.forEach(f => {
      const existing = stats.get(f.serviceId);
      if (existing) {
        existing.count++;
        existing.users.push(f.email);
      } else {
        stats.set(f.serviceId, {
          serviceName: f.serviceName,
          count: 1,
          users: [f.email],
        });
      }
    });

    return Array.from(stats.entries())
      .map(([serviceId, data]) => ({
        serviceId,
        serviceName: data.serviceName,
        count: data.count,
        users: data.users,
      }))
      .sort((a, b) => b.count - a.count);
  }

  try {
    const response = await fetch(`${APPS_SCRIPT_URL}?action=getAllFavorites`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`API 오류: ${response.status}`);
    }

    const result = await response.json();
    return result.stats || [];
  } catch (error) {
    console.error('즐겨찾기 통계 조회 오류:', error);
    return [];
  }
}

// ============ 관리자 액션 로그 ============
let adminLogs: AdminLog[] = [];

// 관리자 액션 로그 추가
export async function addAdminLog(log: Omit<AdminLog, 'timestamp'>): Promise<void> {
  const newLog: AdminLog = {
    ...log,
    timestamp: new Date().toISOString(),
  };

  adminLogs.unshift(newLog);

  // 최대 1000개 로그 유지
  if (adminLogs.length > 1000) {
    adminLogs = adminLogs.slice(0, 1000);
  }

  console.log(`[Admin Log] ${log.action} by ${log.adminEmail}`, {
    target: log.targetEmail || log.targetServiceId,
    details: log.details,
  });
}

// 관리자 액션 로그 조회
export async function getAdminLogs(limit = 100): Promise<AdminLog[]> {
  return adminLogs.slice(0, limit);
}

// 액션 타입별 한글 라벨
export function getActionLabel(action: AdminAction): string {
  const labels: Record<AdminAction, string> = {
    'MEMBER_ADD': '멤버 추가',
    'MEMBER_DELETE': '멤버 삭제',
    'PERMISSION_UPDATE': '권한 수정',
    'BULK_MEMBER_ADD': '대량 멤버 추가',
  };
  return labels[action] || action;
}
