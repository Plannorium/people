import type { Metadata, Viewport } from "next";
import "./globals.css";
// Fallback faces for devices without the Apple system font
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/ibm-plex-sans-arabic/400.css";
import "@fontsource/ibm-plex-sans-arabic/600.css";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { Header } from "@/components/layout/Header";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "Plannorium People",
  description: "Internal Staff Directory & Safety Portal",
  robots: {
    index: false,
    follow: false,
  },
  icons: {
    icon: "/logo.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f5f7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  width: "device-width",
  initialScale: 1,
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
            <Header />
            <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-16 sm:pt-10">
              {children}
            </main>
          </LanguageProvider>
        </Providers>
      </body>
    </html>
  );
}
