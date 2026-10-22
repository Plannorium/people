import type { Metadata, Viewport } from "next";
import "./globals.css";
// Self-hosted brand fonts
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/ibm-plex-sans-arabic/400.css";
import "@fontsource/ibm-plex-sans-arabic/600.css";
import "@fontsource/ibm-plex-sans-arabic/500.css";
import "@fontsource/ibm-plex-sans-arabic/700.css";
import "@fontsource/sora/600.css";
import "@fontsource/sora/700.css";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { Header } from "@/components/layout/Header";
import Providers from "./providers";

export const metadata: Metadata = {
  metadataBase: new URL("https://people.plannorium.com"),
  title: { default: "Plannorium People", template: "%s | Plannorium People" },
  description: "Internal Staff Directory & Safety Portal",
  robots: {
    index: false,
    follow: false,
  },
  icons: {
    icon: [{ url: "/favicon.ico", sizes: "any" }, { url: "/favicon-people.png", type: "image/png", sizes: "512x512" }],
    apple: "/favicon-apple.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0A0A0B",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" dir="ltr">
      <head>
        <meta name="robots" content="noindex, nofollow" />
      </head>
      <body className="bg-canvas text-label min-h-screen flex flex-col antialiased">
        <Providers>
          <LanguageProvider>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "WebSite", name: "Plannorium People", url: "https://people.plannorium.com", description: "Private staff directory and safety portal" }) }} />
            <Header />
            <main className="flex-1 w-full max-w-[1200px] mx-auto px-4 sm:px-6 pt-8 pb-16 sm:pt-10">
              {children}
            </main>
          </LanguageProvider>
        </Providers>
      </body>
    </html>
  );
}
