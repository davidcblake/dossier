import type { CapacitorConfig } from "@capacitor/cli";

// Native iOS shell config (Plug and Play framework, remote mode): the
// shell loads the deployed URL directly, so server-rendered routes/API
// routes/cron work unmodified. Values must match the defaults in
// .github/workflows/ios-build.yml. See CLAUDE.md "iOS app (Plug and Play)".
const config: CapacitorConfig = {
  appId: "com.wpv.dossier",
  appName: "Dossier",
  webDir: "public", // unused in remote mode, but required by the CLI
  server: {
    url: "https://mydossier.vercel.app",
    cleartext: false,
  },
  ios: {
    contentInset: "automatic",
    // Interim workaround: Google blocks OAuth in embedded webviews by
    // sniffing the user agent (verified on-device 2026-07-14:
    // sign-in errors inside the shell). Presenting as plain Safari
    // lets Auth.js Google login work. The real fix is the Accounts
    // service's system-browser login (plug-and-play Phase 3) — remove
    // this override when that lands.
    overrideUserAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  },
};

export default config;
