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
          prompt: 'select_account',
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      const email = (user.email || '').toLowerCase();

      // @spacecloud.kr 도메인만 허용
      if (!email.endsWith('@spacecloud.kr')) {
        console.log(`[Auth] 도메인 불일치로 거부: ${email}`);
        return false;
      }

      console.log(`[Auth] 로그인 허용: ${email}`);
      return true;
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
