import type { Metadata, Viewport } from "next";
import { Courier_Prime, Inter, Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { PwaRegister } from "@/components/pwa-register";
import { InstallHint } from "@/components/install-hint";
import { NativeGate } from "@/components/native-gate";

const courier = Courier_Prime({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-courier",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

// Serif for the daily brief — calm, editorial, easy to read (per CLAUDE.md design).
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cormorant",
});

export const metadata: Metadata = {
  title: "Dossier",
  description: "Know what’s waiting on you. Your inbox’s chief of staff.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Dossier",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#f6f3ea",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${courier.variable} ${inter.variable} ${cormorant.variable} antialiased`}
      >
        <NativeGate>{children}</NativeGate>
        <PwaRegister />
        <InstallHint />
        <Analytics />
      </body>
    </html>
  );
}
