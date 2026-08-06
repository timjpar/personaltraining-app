import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Hanken_Grotesk, IBM_Plex_Mono } from "next/font/google";
import { getThemePrefs } from "@/lib/theme-server";
import "./globals.css";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--ff-display",
  display: "swap",
});

const body = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--ff-body",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--ff-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Chalkline — coaching that closes the loop",
  description:
    "Program training for your clients, watch them log it, and know the moment they finish.",
};

// `viewport-fit=cover` is what makes env(safe-area-inset-*) resolve to real
// numbers; without it the fixed tab bar sits under the iPhone home indicator.
// No maximumScale/userScalable here on purpose — pinch-zoom stays available,
// and the 16px input floor in globals.css is what stops the unwanted
// auto-zoom, rather than banning zoom outright.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Read on the server and stamped onto <html>, so the correct palette is in
  // the first byte of HTML — no flash of the wrong theme, and no blocking
  // inline script. Every page already reads cookies via requireUser(), so this
  // costs no extra dynamism.
  const { theme, accent } = await getThemePrefs();

  return (
    <html
      lang="en"
      data-theme={theme}
      data-accent={accent}
      // Tells the browser to match form controls and scrollbars to the theme.
      style={{ colorScheme: theme }}
      className={`${display.variable} ${body.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
