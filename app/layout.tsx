import type { Metadata, Viewport } from "next";
import "./globals.css";

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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
