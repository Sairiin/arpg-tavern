import type { Metadata } from "next";
import { MedievalSharp } from "next/font/google";
import { BardMusic } from "@/components/tavern/bard-music";
import "./globals.css";

const medievalSharp = MedievalSharp({
  variable: "--font-medieval-sharp",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ARPG Tavern",
  description: "Il rifugio dei viandanti delle stagioni ARPG.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className="dark" style={{ colorScheme: "dark" }}>
      <body className={medievalSharp.variable}>
        {children}
        <BardMusic />
      </body>
    </html>
  );
}