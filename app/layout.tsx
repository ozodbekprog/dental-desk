import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = { themeColor: "#0E7C86", width: "device-width", initialScale: 1 };

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://dentaldesk.uz";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Dental Desk — stomatologlar tarmog'i",
  description:
    "Toshkentdagi stomatologlar va klinikalar: shifokor toping, bo'sh vaqtni tanlang va onlayn yoziling. Tasdiqlangach manzil va vaqt ko'rinadi. 3D tish tarixi bemor kabinetida.",
  authors: [{ name: "Ozodbek Xoshimov Xusanovich", url: "https://t.me/oz4vka" }],
  manifest: "/manifest.webmanifest",
  applicationName: "Dental Desk",
  appleWebApp: { capable: true, title: "Dental Desk", statusBarStyle: "default" },
  icons: { icon: "/app-assets/logo.svg", apple: "/app-assets/icon-192.png" },
  other: { "mobile-web-app-capable": "yes" },
  creator: "Xoshimov Group",
  publisher: "Xoshimov Group",
  keywords: [
    "stomatolog",
    "tish shifokori",
    "stomatologiya klinikasi",
    "onlayn qabul",
    "Toshkent",
    "3D tish xaritasi",
    "Dental Desk",
    "O'zbekiston",
  ],
  openGraph: {
    type: "website",
    locale: "uz_UZ",
    url: "/",
    siteName: "Dental Desk",
    title: "Dental Desk — stomatologlar tarmog'i",
    description:
      "Shifokoringizni toping va qabulga bir daqiqada yoziling. Vaqt va manzil shifokor tasdiqlagach ko'rinadi.",
    images: [{ url: "/app-assets/icon-512.png", width: 512, height: 512, alt: "Dental Desk" }],
  },
  twitter: {
    card: "summary",
    title: "Dental Desk — stomatologlar tarmog'i",
    description: "Shifokor toping, bo'sh vaqtni tanlang, onlayn yoziling.",
    images: ["/app-assets/icon-512.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uz">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
