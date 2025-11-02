import type { AuthOptions, Session, User } from "next-auth";
import type { JWT } from "next-auth/jwt";
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { findOrCreateUser, ensureUserHasOrganization } from '../../../lib/auth-helpers';
import type { Organization, Role } from '../../../types';

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google" && user.email) {
        try {
          // Find or create user in database
          await findOrCreateUser(user.email, user.name || undefined);
          return true;
        } catch (error) {
          console.error("Error during sign in:", error);
          return false;
        }
      }
      return true;
    },

    async jwt({ token, user, account }) {
      // Initial sign in
      if (account && user && user.email) {
        try {
          // Find or create user
          const dbUser = await findOrCreateUser(user.email, user.name || undefined);

          // Ensure user has an organization
          const orgData = await ensureUserHasOrganization(dbUser.id, user.name || undefined);

          // Add custom data to token
          token.userId = dbUser.id;
          token.organizationId = orgData.organization.id;
          token.role = orgData.role;
          token.organizationName = orgData.organization.name;
        } catch (error) {
          console.error("Error in JWT callback:", error);
        }
      }
      return token;
    },

    async session({ session, token }: { session: Session; token: JWT }) {
      if (session.user && token.sub) {
        (session.user as User & { id?: string }).id = token.sub;
      }

      // Add organization data to session
      if (token.userId && token.organizationId && token.role) {
        (session.user as any).userId = token.userId;
        (session.user as any).organizationId = token.organizationId;
        (session.user as any).role = token.role;
        (session.user as any).organizationName = token.organizationName;
      }

      return session;
    },
  },
  pages: {
    signIn: '/',
    error: '/',
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
