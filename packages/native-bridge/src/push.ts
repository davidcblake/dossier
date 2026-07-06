import { PushNotifications } from "@capacitor/push-notifications";
import { isNativePlatform } from "./platform";

export interface PushRegistration {
  /** APNs device token, hex-encoded. */
  token: string;
  platform: "ios" | "android";
}

export type RegisterTokenFn = (registration: PushRegistration) => Promise<void>;

/**
 * Requests notification permission and registers for APNs, forwarding the
 * device token to the app's own backend via `onToken`. Each app supplies
 * its own `onToken` implementation (e.g. `POST /api/push/subscribe-native`)
 * because each app owns its own send path (VAPID web push today, APNs once
 * this is wired in) — this package only owns getting the token off the
 * device.
 *
 * No-ops on web; call it unconditionally and it does the right thing in
 * both the browser and the native shell.
 */
export async function registerForNativePush(onToken: RegisterTokenFn): Promise<void> {
  if (!isNativePlatform()) return;

  const permission = await PushNotifications.requestPermissions();
  if (permission.receive !== "granted") return;

  await PushNotifications.register();

  PushNotifications.addListener("registration", async (token) => {
    await onToken({ token: token.value, platform: "ios" });
  });

  PushNotifications.addListener("registrationError", (error) => {
    console.error("[native-bridge] push registration failed", error);
  });
}

/**
 * Fires when the user taps a push notification. `route` should be a value
 * your backend put in the notification payload (e.g. `/today`) so the app
 * can navigate straight to the relevant item instead of just opening flat.
 */
export function onPushNotificationTapped(handler: (route: string | undefined) => void): void {
  if (!isNativePlatform()) return;

  PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
    handler(action.notification.data?.route);
  });
}
