import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });
const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-display" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://factorytwin.online"),
  title: { default: "FactoryTwin AI — Digital Twin Platform for Smart Manufacturing", template: "%s · FactoryTwin AI" },
  description: "FactoryTwin turns factory, equipment and production data into a structured digital twin so manufacturing teams can anticipate problems, simulate changes and decide with evidence.",
  openGraph: { title: "FactoryTwin AI", description: "A smarter digital view of every factory.", url: "https://factorytwin.online", type: "website" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable}`}>
      <body>{children}</body>
    </html>
  );
}
