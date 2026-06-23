import type { Metadata, Viewport } from "next";
import { Anton, Oswald } from "next/font/google";
import "./globals.css";

// Anton = the tall, brutal impact face for every headline & menacing mark.
// Oswald = a condensed companion for body copy, so the whole UI reads "manga".
const anton = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});
const oswald = Oswald({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ASBR Match Randomizer & Tracker",
  description:
    "A JoJo's Bizarre Adventure: All-Star Battle R team randomizer and competitive match tracker — spin 3v3 teams, declare winners, and track shared stats.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b0907",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${anton.variable} ${oswald.variable}`}>
      <body>{children}</body>
    </html>
  );
}
