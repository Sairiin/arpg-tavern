import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ARPG Tavern",
  description: "Il rifugio dei viandanti delle stagioni ARPG."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}