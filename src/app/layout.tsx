import type { Metadata, Viewport } from "next";
import { Courier_Prime, Inter } from "next/font/google";
import "./globals.css";
import { PwaRegister } from "@/components/pwa-register";
import { InstallHint } from "@/components/install-hint";

const courier = Courier_Prime({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-courier",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
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
  themeColor: "#efe7d5",
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
      <body className={`${courier.variable} ${inter.variable} antialiased`}>
        {children}
        <PwaRegister />
        <InstallHint />
      </body>
    </html>
  );
}
