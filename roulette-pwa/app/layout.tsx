import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Roulette PWA (Simulation)",
  description: "Play-money roulette simulation with a fair, unweighted RNG.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#0a0508",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
