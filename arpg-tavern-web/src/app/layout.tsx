import type { Metadata } from "next";
import { BardMusic } from "@/components/tavern/bard-music";
import "./globals.css";

export const metadata: Metadata = {
  title: "ARPG Tavern",
  description: "Il rifugio dei viandanti delle stagioni ARPG.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body>
        <div className="tavern-global-atmosphere" aria-hidden="true">
          <span className="tavern-ember tavern-ember-one" />
          <span className="tavern-ember tavern-ember-two" />
          <span className="tavern-ember tavern-ember-three" />
          <span className="tavern-ember tavern-ember-four" />
          <span className="tavern-ember tavern-ember-five" />
          <span className="tavern-ember tavern-ember-six" />
        </div>

        {children}

        <BardMusic />
      </body>
    </html>
  );
}