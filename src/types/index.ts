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

// 즐겨찾기
export interface Favorite {
  email: string;           // 사용자 이메일
  serviceId: string;       // 서비스 ID
  serviceName: string;     // 서비스명 (검색용)
  createdAt: string;       // 등록일시
}

// 관리자 액션 로그
export interface AdminLog {
  timestamp: string;       // 실행 시간
  adminEmail: string;      // 관리자 이메일
  action: AdminAction;     // 액션 타입
  targetEmail?: string;    // 대상 이메일 (멤버 관련)
  targetGroup?: string;    // 대상 그룹
  targetServiceId?: string; // 대상 서비스 (권한 관련)
  details?: string;        // 추가 정보
  ip?: string;             // IP 주소
}

export type AdminAction =
  | 'MEMBER_ADD'           // 멤버 추가
  | 'MEMBER_DELETE'        // 멤버 삭제
  | 'PERMISSION_UPDATE'    // 서비스 권한 수정
  | 'BULK_MEMBER_ADD';     // 대량 멤버 추가
