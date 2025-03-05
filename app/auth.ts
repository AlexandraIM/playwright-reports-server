import NextAuth, { NextAuthConfig, type User } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import jwt from 'jsonwebtoken';

const useAuth = !!process.env.API_TOKEN;

// strictly recommended to specify via env var
const secret = process.env.AUTH_SECRET ?? crypto.randomUUID();

// session expiration for api token auth
const expirationHours = process.env.UI_AUTH_EXPIRE_HOURS ? parseInt(process.env.UI_AUTH_EXPIRE_HOURS) : 2;
const expirationSeconds = expirationHours * 60 * 60;

const getJwtStubToken = () => {
  if (!secret) {
    throw new Error('AUTH_SECRET is not defined');
  }

  return jwt.sign({ authorized: true }, secret);
};

const commonConfig: Partial<NextAuthConfig> = {
  secret,
  session: {
    strategy: 'jwt',
    maxAge: expirationSeconds,
  },
  trustHost: true,
  pages: {
    signIn: '/login',
  },
};

export const authConfig: NextAuthConfig = {
  ...commonConfig,
  providers: [
    CredentialsProvider({
      name: 'API Token',
      credentials: {
        apiToken: { label: 'API Token', type: 'password' },
      },
      async authorize(credentials): Promise<User | null> {
        if (credentials?.apiToken === process.env.API_TOKEN) {
          if (!secret) {
            throw new Error('AUTH_SECRET is not defined');
          }
          const token = jwt.sign({ authorized: true }, secret);

          return {
            apiToken: credentials.apiToken as string,
            jwtToken: token,
          };
        }

        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.apiToken = user.apiToken;
        token.jwtToken = user.jwtToken;
      }

      return token;
    },
    async session({ session, token }) {
      session.user.apiToken = token.apiToken as string;
      session.user.jwtToken = token.jwtToken as string;

      return session;
    },
  },
};

const noAuthConfig: NextAuthConfig = {
  ...commonConfig,
  providers: [
    CredentialsProvider({
      name: 'No Auth',
      credentials: {},
      async authorize() {
        const token = getJwtStubToken();

        return { apiToken: token };
      },
    }),
  ],
  callbacks: {
    async session({ session }) {
      session.sessionToken = getJwtStubToken();
      session.user.jwtToken = session.sessionToken;

      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(useAuth ? authConfig : noAuthConfig);
