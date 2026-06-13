import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import { decryptToken, encryptToken } from "@/lib/crypto";

type OAuth2Client = InstanceType<typeof google.auth.OAuth2>;

/**
 * Thrown when Google rejects the refresh token (Testing-mode 7-day expiry).
 * Callers mark the user `needs_reconnect` and skip them.
 */
export class NeedsReconnectError extends Error {
  constructor() {
    super("Google refresh token is invalid (needs_reconnect)");
    this.name = "NeedsReconnectError";
  }
}

/**
 * Build an authenticated OAuth2 client for a user, refreshing the access token
 * from the stored (encrypted) refresh token. On invalid_grant, marks the user
 * needs_reconnect and throws NeedsReconnectError. Shared by Gmail + Calendar.
 */
export async function authForUser(userId: string): Promise<OAuth2Client> {
  const account = await prisma.googleAccount.findUnique({ where: { userId } });
  if (!account) throw new NeedsReconnectError();

  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  auth.setCredentials({ refresh_token: decryptToken(account.refreshToken) });

  try {
    const { credentials } = await auth.refreshAccessToken();
    auth.setCredentials(credentials);
    if (credentials.access_token) {
      await prisma.googleAccount.update({
        where: { userId },
        data: {
          accessToken: encryptToken(credentials.access_token),
          expiresAt: credentials.expiry_date
            ? new Date(credentials.expiry_date)
            : null,
        },
      });
    }
  } catch (err: unknown) {
    const msg = String((err as { message?: string })?.message ?? err);
    if (/invalid_grant/i.test(msg)) {
      await prisma.user.update({
        where: { id: userId },
        data: { status: "needs_reconnect" },
      });
      throw new NeedsReconnectError();
    }
    throw err;
  }

  return auth;
}
