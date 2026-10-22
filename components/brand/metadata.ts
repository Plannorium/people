import type { Metadata } from "next";

export const SITE_URL = "https://people.plannorium.com";
export const SITE_NAME = "Plannorium People";
export const SHARE_IMAGE = "/favicon-people-og.png";

/** People is a private staff portal, including its sign-in and privacy notice. */
export function pageMetadata(path: string, title: string, description: string): Metadata {
  return {
    title, description,
    alternates: { canonical: new URL(path, SITE_URL).toString() },
    robots: { index: false, follow: false },
    openGraph: {
      title: `${title} | ${SITE_NAME}`, description,
      url: new URL(path, SITE_URL).toString(), siteName: SITE_NAME, type: "website",
      images: [{ url: SHARE_IMAGE, width: 1200, height: 630, alt: "Plannorium People — Keystone Bars wordmark on obsidian" }],
    },
    twitter: { card: "summary_large_image", title: `${title} | ${SITE_NAME}`, description, images: [SHARE_IMAGE] },
  };
}
