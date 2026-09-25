"use client";

import Link from "next/link";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase/client";

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsCheckingAuth(false);

      if (!currentUser) {
        router.replace("/login");
      }
    });

    return () => unsubscribe();
  }, [router]);

  if (isCheckingAuth) {
    return (
      <main className="dashboard-page dashboard-loading">
        <p>Il locandiere consulta il registro dell’avventuriero...</p>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="dashboard-page">
      <header className="dashboard-topbar">
        <Link className="brand" href="/dashboard">
          <span className="brand-mark"><span className="site-guild-emblem" aria-hidden="true" /></span>

          <span className="brand-text">
            <small>La casa dei theorycrafter</small>
            ARPG Tavern
          </span>
        </Link>

        <Link className="back-home-link" href="/dashboard">
          ← Torna al registro
        </Link>
      </header>

      <section className="dashboard-hero">
        <div>
          <p className="eyebrow">Profilo del viandante</p>
          <h1>Il tuo account</h1>
          <p>
            Sei connesso come <strong>{user.displayName || "Avventuriero"}</strong>
            {user.email ? ` · ${user.email}` : ""}.
          </p>
        </div>
      </section>
    </main>
  );
}