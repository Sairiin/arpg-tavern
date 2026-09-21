"use client";

import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { auth } from "@/lib/firebase/client";

type AuthPanelProps = {
  compact?: boolean;
};

export function AuthPanel({ compact = false }: AuthPanelProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function signInWithGoogle() {
    setErrorMessage("");
    setIsLoading(true);

    try {
      const provider = new GoogleAuthProvider();
await signInWithPopup(auth, provider);
      router.push("/dashboard");
    } catch (error) {
      console.error("Firebase Google Sign-In error:", error);
      setErrorMessage(
        "Non è stato possibile completare l'accesso. Controlla che Google Sign-In sia attivo in Firebase."
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className={compact ? "auth-panel auth-panel-compact" : "auth-panel"}>
      {!compact && (
        <>
          <p className="eyebrow">Firma il registro</p>
          <h1>Entra nella taverna</h1>
          <p className="auth-description">
            Accedi con Google per custodire le tue build, salvare versioni e
            proseguire il tuo viaggio da qualunque dispositivo.
          </p>
        </>
      )}

      <button
        type="button"
        className="google-sign-in-button"
        onClick={signInWithGoogle}
        disabled={isLoading}
      >
        <span className="google-glyph" aria-hidden="true">
          G
        </span>
        <span>{isLoading ? "Apertura del registro..." : "Continua con Google"}</span>
      </button>

      {errorMessage && <p className="auth-error">{errorMessage}</p>}

      {!compact && (
        <p className="auth-note">
          Non memorizziamo password. L&apos;accesso viene gestito in modo sicuro
          dal tuo account Google tramite Firebase Authentication.
        </p>
      )}
    </section>
  );
}