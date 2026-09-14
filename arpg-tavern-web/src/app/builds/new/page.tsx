"use client";

import Link from "next/link";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BuildForm } from "@/components/builds/build-form";
import { auth } from "@/lib/firebase/client";

export default function NewBuildPage() {
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
        <p>Il locandiere prepara una pagina del grimorio...</p>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="dashboard-page build-editor-page">
      <header className="dashboard-topbar">
        <Link className="brand" href="/dashboard">
          <span className="brand-mark">✦</span>

          <span className="brand-text">
            <small>La casa dei theorycrafter</small>
            ARPG Tavern
          </span>
        </Link>

        <Link className="back-home-link" href="/dashboard">
          ← Torna al registro
        </Link>
      </header>

      <div className="build-editor-container">
        <BuildForm userId={user.uid} />
      </div>
    </main>
  );
}