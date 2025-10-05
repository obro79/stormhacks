import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EchoMe – Build Apps by Talking",
  description:
    "EchoMe lets you build full web applications by describing them with your voice or text. No typing required – just speak, preview, and deploy instantly.",
  keywords: [
    "AI app builder",
    "voice coding",
    "no-code",
    "hackathon",
    "EchoMe",
    "speech to code",
    "Next.js",
  ],
  openGraph: {
    title: "EchoMe – Build Apps by Talking",
    description:
      "Turn your ideas into live web apps with your voice. Speak your vision, see a preview, and deploy instantly.",
    // url: "https://echome.vercel.app", // update with your actual deployed URL
    siteName: "EchoMe",
    images: [
      {
        url: "/og-image.png", // add a banner image for social previews
        width: 1200,
        height: 630,
        alt: "EchoMe Preview",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "EchoMe – Build Apps by Talking",
    description:
      "Build and deploy apps instantly by describing them with your voice.",
    images: ["/og-image.png"], // same as OG image
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
