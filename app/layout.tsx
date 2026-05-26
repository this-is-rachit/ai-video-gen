// app/layout.tsx
import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { checkEnvOnce } from "@/lib/env";

// Log a clear warning at server startup if required API keys are missing.
checkEnvOnce();

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://reelify.app"),
  title: { default: "Reelify — Turn any topic into a finished video", template: "%s · Reelify" },
  description:
    "Reelify turns a single topic into a finished video: script, AI voiceover, word-synced captions, cinematic visuals and music — in portrait or landscape. One click.",
  keywords: ["AI video generator", "text to video", "faceless video", "AI voiceover", "Murf Falcon", "auto captions", "Shorts", "Reels", "YouTube video maker"],
  openGraph: {
    title: "Reelify — Turn any topic into a finished video",
    description: "Script, voice, captions, visuals and music — generated and synced automatically. Portrait or landscape, ready to post.",
    type: "website",
    siteName: "Reelify",
  },
  twitter: { card: "summary_large_image", title: "Reelify", description: "Turn any topic into a finished video, in one click." },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={poppins.variable}>
      <body>{children}</body>
    </html>
  );
}