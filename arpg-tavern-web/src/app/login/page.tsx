import Link from "next/link";
import { AuthPanel } from "@/components/auth/auth-panel";

export default function LoginPage() {
  return (
    <main className="auth-page">
      <div className="auth-page-background" />

      <div className="auth-topbar">
        <Link className="brand" href="/">

        </Link>

        <Link className="back-home-link" href="/">
          ← Torna al focolare
        </Link>
      </div>

      <div className="auth-layout">
        <div className="auth-story">
          <p className="eyebrow">Il registro è pronto</p>
          <h2>
            Ogni avventura merita
            <span>una pagina tutta sua.</span>
          </h2>
          <p>
            Le tue build rimarranno nel tuo archivio personale, ordinate per
            gioco, patch, stagione e variante.
          </p>
        </div>

        <AuthPanel />
      </div>
    </main>
  );
}