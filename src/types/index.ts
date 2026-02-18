export interface ServiceData {
  id: string;
  serviceName: string;      // 사이트명
  url: string;              // URL
  accountId: string;        // 계정 ID
  password: string;         // 비밀번호
  passwordKr?: string;      // PW(한글)
  usage: string;            // 용도
  lastModified: string;     // 최종 수정일
  editor?: string;          // 편집자
  registrant?: string;      // 계정가입자/본인인증
  verified?: string;        // 확인 (O/X)
}

export interface Member {
  email: string;
  group: string;
}

export interface SearchLog {
  timestamp: string;
  email: string;
  searchQuery: string;
  ip: string;
  browser: string;
  success: boolean;
}

// 서비스별 접근 권한
export interface ServicePermission {
  serviceId: string;
  serviceName: string;
  allowedGroups: string[];  // 빈 배열 = 전체 접근 가능
}

export interface UserSession {
  email: string;
  name: string;
  image: string;
  isAdmin: boolean;
  groups: string[];
}

export const GROUPS = [
  '로드맵',
  '디렉터스',
  '리더스',
  '베이스캠프',
  '국내 개발팀',
  '국내 서비스팀',
  '글로벌 서비스팀',
  '유저임팩트팀',
  '스페이스비즈팀',
  '행정관리자',
  'AXLab',
  '매니저 그룹',
] as const;

export type GroupType = typeof GROUPS[number];
