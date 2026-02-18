import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { getUserGroups, getMembers } from './sheets';

// 런타임에 환경변수를 읽는 헬퍼 함수
function getAllowedDomain(): string {
  return process.env.ALLOWED_DOMAIN || 'spacecloud.kr';
}

function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase());
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorization: {
        params: {
          hd: getAllowedDomain(),
          prompt: 'select_account',
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      const email = (user.email || '').toLowerCase();
      const allowedDomain = getAllowedDomain();
      const adminEmails = getAdminEmails();

      console.log(`[Auth] 로그인 시도: ${email}, 관리자 목록: ${adminEmails.join(', ')}`);

      // 도메인 체크
      if (!email.endsWith(`@${allowedDomain}`)) {
        console.log(`[Auth] 도메인 불일치: ${email}`);
        return false;
      }

      // 어드민은 항상 허용
      if (adminEmails.includes(email)) {
        console.log(`[Auth] 어드민 로그인: ${email}`);
        return true;
      }

      // 멤버 목록에 등록된 사용자만 허용
      try {
        const members = await getMembers();
        const isMember = members.some(m => m.email.toLowerCase() === email);

        if (!isMember) {
          console.log(`[Auth] 미등록 사용자: ${email}`);
          return false;
        }

        console.log(`[Auth] 멤버 로그인: ${email}`);
        return true;
      } catch (error) {
        console.error('[Auth] 멤버 확인 오류:', error);
        return false;
      }
    },
    async jwt({ token, user }) {
      if (user) {
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const email = (token.email as string).toLowerCase();

        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.image = token.picture as string;

        // 어드민 여부 확인
        (session.user as any).isAdmin = getAdminEmails().includes(email);

        // 사용자 그룹 조회
        try {
          const groups = await getUserGroups(email);
          (session.user as any).groups = groups;
        } catch (error) {
          console.error('Error fetching user groups:', error);
          (session.user as any).groups = [];
        }
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24시간
  },
};

export function isAdmin(email: string): boolean {
  return getAdminEmails().includes(email.toLowerCase());
}
