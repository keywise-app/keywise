import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Keywise — Property Management, Made Intelligent",
  description:
    "AI-powered property management for independent landlords. Lease tracking, online rent collection, tenant communications, maintenance tracking, and more — all in one place.",
  metadataBase: new URL("https://keywise.app"),
  openGraph: {
    title: "Keywise — Property Management, Made Intelligent",
    description:
      "AI-powered property management for independent landlords. Lease tracking, online rent collection, tenant communications and more.",
    url: "https://keywise.app",
    siteName: "Keywise",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Keywise — Property Management, Made Intelligent",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Keywise — Property Management, Made Intelligent",
    description:
      "AI-powered property management for independent landlords. Lease tracking, online rent collection, tenant communications and more.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "256x256", type: "image/x-icon" },
    ],
    shortcut: "/favicon.svg",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
