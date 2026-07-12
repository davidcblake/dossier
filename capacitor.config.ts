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
  },
};

export default config;
