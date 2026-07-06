import { App as CapacitorApp, type URLOpenListenerEvent } from "@capacitor/app";
import { isNativePlatform } from "./platform";

/**
 * Handles universal links / custom-scheme opens (e.g. a push notification
 * or a shared link opening the app to a specific in-app route) and a tap
 * on a push notification landing on the right screen instead of just the
 * app's root. `onRoute` receives the in-app path to navigate to.
 */
export function onDeepLink(onRoute: (path: string) => void): void {
  if (!isNativePlatform()) return;

  CapacitorApp.addListener("appUrlOpen", (event: URLOpenListenerEvent) => {
    const url = new URL(event.url);
    onRoute(url.pathname + url.search);
  });
}
