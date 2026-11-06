import type { Metadata, Viewport } from "next";
import { Manrope, Onest, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

export const viewport: Viewport = { themeColor: "#0E7C86", width: "device-width", initialScale: 1 };

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
  weight: ["500", "600", "700", "800"],
});

const onest = Onest({
  variable: "--font-onest",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Dental Desk — stomatologiya klinikasi uchun boshqaruv tizimi",
  description:
    "Qabul jadvali, bemor kartalari, 3D tish xaritasi va tashriflar tarixi — bitta tizimda. O'zbek, rus va ingliz tillarida. 14 kun bepul.",
  authors: [{ name: "Ozodbek Xoshimov Xusanovich", url: "https://t.me/oz4vka" }],
  manifest: "/manifest.webmanifest",
  applicationName: "Dental Desk",
  appleWebApp: { capable: true, title: "Dental Desk", statusBarStyle: "default" },
  icons: { icon: "/app-assets/logo.svg", apple: "/app-assets/icon-192.png" },
  other: { "mobile-web-app-capable": "yes" },
  creator: "Xoshimov Group",
  publisher: "Xoshimov Group",
  keywords: [
    "stomatologiya",
    "dental CRM",
    "klinika boshqaruvi",
    "qabul jadvali",
    "bemor kartasi",
    "Dental Desk",
    "O'zbekiston",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uz">
      <body
        className={`${manrope.variable} ${onest.variable} ${plexMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
