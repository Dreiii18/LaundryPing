import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://laundryping.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "LaundryPing - SMS Notifications for Philippine Laundromats",
    template: "%s | LaundryPing",
  },
  description:
    "Automatically send SMS notifications to your laundromat customers when their laundry is done. Simple, fast, and built for Philippine laundromats.",
  keywords: [
    "laundry SMS Philippines",
    "laundromat notification system",
    "laundry done SMS",
    "Philippine laundromat software",
    "laundry management app",
    "SMS notifications laundry",
  ],
  authors: [{ name: "LaundryPing", url: siteUrl }],
  creator: "LaundryPing",
  openGraph: {
    type: "website",
    siteName: "LaundryPing",
    locale: "en_PH",
    images: [
      {
        url: "/laundryping-logo.png",
        width: 1536,
        height: 1024,
        alt: "LaundryPing - SMS Notifications for Philippine Laundromats",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/laundryping-logo.png"],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
        <Toaster position="top-right" richColors duration={2500} closeButton />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
