import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import { encryptToken } from "@/lib/crypto";
import { GOOGLE_SCOPES, assertScopesAllowed } from "@/lib/google-scopes";
import { isEmailAllowed } from "@/lib/allowlist";

assertScopesAllowed(GOOGLE_SCOPES);

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          // offline + consent so Google always returns a refresh token,
          // which we need for the daily cron scan
          access_type: "offline",
          prompt: "consent",
          scope: GOOGLE_SCOPES.join(" "),
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google") {
        console.error("[dossier][signIn] rejected: non-google provider", {
          provider: account?.provider ?? null,
        });
        return false;
      }
      const email = user.email ?? profile?.email ?? null;
      if (!email) {
        console.error("[dossier][signIn] rejected: no email present", {
          userKeys: Object.keys(user ?? {}),
          profileKeys: Object.keys(profile ?? {}),
        });
        return false;
      }
      // App-level allowlist (defense-in-depth; no-op unless ALLOWED_EMAILS set).
      if (!isEmailAllowed(email)) {
        console.warn("[dossier][signIn] rejected: not on allowlist");
        return false;
      }

      try {
        const dbUser = await prisma.user.upsert({
          where: { email },
          create: { email, name: user.name ?? null },
          update: { name: user.name ?? undefined },
        });

        if (account.refresh_token) {
          const tokens = {
            refreshToken: encryptToken(account.refresh_token),
            accessToken: account.access_token
              ? encryptToken(account.access_token)
              : null,
            expiresAt: account.expires_at
              ? new Date(account.expires_at * 1000)
              : null,
          };
          await prisma.googleAccount.upsert({
            where: { userId: dbUser.id },
            create: { userId: dbUser.id, ...tokens },
            update: tokens,
          });
          // a fresh refresh token clears any pending reconnect state
          if (dbUser.status === "needs_reconnect") {
            await prisma.user.update({
              where: { id: dbUser.id },
              data: { status: "active" },
            });
          }
        }

        return true;
      } catch (err) {
        // Surface the real cause in Vercel logs — Auth.js otherwise swallows
        // this into a generic "Configuration" error page.
        console.error("[dossier][signIn] failed to persist user/tokens:", err);
        throw err;
      }
    },
    async jwt({ token, account }) {
      // on initial sign-in, pin our DB user id into the JWT
      if (account && token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
          select: { id: true },
        });
        if (dbUser) token.userId = dbUser.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.userId) session.user.id = token.userId;
      return session;
    },
  },
});
