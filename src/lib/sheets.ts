import { ServiceData, Member, SearchLog, ServicePermission, Favorite } from '@/types';

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
export async function getMembers(): Promise<Member[]> {
  return mockMembers;
}

export async function getUserGroups(email: string): Promise<string[]> {
  return mockMembers
    .filter((member) => member.email.toLowerCase() === email.toLowerCase())
    .map((member) => member.group);
}

export async function addMember(email: string, group: string): Promise<void> {
  mockMembers.push({ email, group });
}

export async function deleteMember(email: string, group: string): Promise<void> {
  mockMembers = mockMembers.filter(
    (m) => !(m.email === email && m.group === group)
  );
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
let mockFavorites: Favorite[] = [];

// 사용자의 즐겨찾기 목록 조회
export async function getFavorites(email: string): Promise<Favorite[]> {
  return mockFavorites
    .filter(f => f.email.toLowerCase() === email.toLowerCase())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// 즐겨찾기 추가
export async function addFavorite(email: string, serviceId: string, serviceName: string): Promise<void> {
  // 중복 체크
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
}

// 즐겨찾기 삭제
export async function removeFavorite(email: string, serviceId: string): Promise<void> {
  mockFavorites = mockFavorites.filter(
    f => !(f.email.toLowerCase() === email.toLowerCase() && f.serviceId === serviceId)
  );
}

// 사용자가 해당 서비스를 즐겨찾기했는지 확인
export async function isFavorite(email: string, serviceId: string): Promise<boolean> {
  return mockFavorites.some(
    f => f.email.toLowerCase() === email.toLowerCase() && f.serviceId === serviceId
  );
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
