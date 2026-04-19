import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Keywise — AI Property Management for Small Landlords",
  description:
    "Free property management for 1-2 units. AI lease extraction, online rent collection, document signing. Built for independent landlords.",
  metadataBase: new URL("https://keywise.app"),
  alternates: { canonical: "https://keywise.app" },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    title: "Keywise — AI Property Management for Small Landlords",
    description:
      "Free property management for 1-2 units. AI lease extraction, online rent collection, document signing. Built for independent landlords.",
    url: "https://keywise.app",
    siteName: "Keywise",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 628,
        alt: "Keywise — AI Property Management for Small Landlords",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Keywise — AI Property Management for Small Landlords",
    description:
      "Free property management for 1-2 units. AI lease extraction, online rent collection, document signing. Built for independent landlords.",
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
      <head>
        <Script async src="https://www.googletagmanager.com/gtag/js?id=AW-18070985639" strategy="afterInteractive" />
        <Script id="google-ads" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'AW-18070985639');`}
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
                price: "19.00",
                priceCurrency: "USD",
              },
              description:
                "AI-powered property management software for independent landlords.",
              url: "https://keywise.app",
            }),
          }}
        />
        {children}
      </body>
    </html>
  );
}
