import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { brand } from "./lib/brand";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: brand.title,
  description:
    brand.description + " " + brand.freeLabel + ". No credit card required.",
  metadataBase: new URL("https://keywise.app"),
  alternates: { canonical: "https://keywise.app" },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    title: brand.title,
    description:
      brand.description + " " + brand.freeLabel + ". No credit card required.",
    url: "https://keywise.app",
    siteName: brand.name,
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: brand.title,
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: brand.title,
    description:
      brand.description + " " + brand.freeLabel + ". No credit card required.",
    images: ["/opengraph-image"],
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
      <head>
        <Script async src="https://www.googletagmanager.com/gtag/js?id=AW-18416062236" strategy="afterInteractive" />
        <Script id="google-ads" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'AW-18416062236');`}
        </Script>
      </head>
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "Keywise",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
              },
              description:
                brand.description,
              url: "https://keywise.app",
            }),
          }}
        />
        {children}
      </body>
    </html>
  );
}
