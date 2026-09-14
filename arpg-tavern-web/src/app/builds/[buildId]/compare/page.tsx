"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query
} from "firebase/firestore";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useEffect, useMemo, useState } from "react";
import { auth, db } from "@/lib/firebase/client";
import type {
  ArpgGame,
  BuildCategory,
  BuildVisibility
} from "@/lib/builds/types";
import "./compare.css";

type ComparableBuild = {
  id: string;
  source: "main" | "variant" | "version";
  label: string;
  title: string;
  game: ArpgGame;
  characterClass: string;
  patch: string;
  category: BuildCategory;
  visibility: BuildVisibility;
  notes: string;
};

type VariantData = Omit<ComparableBuild, "source" | "label">;

type VersionData = {
  id: string;
  label: string;
  patch: string;
  category: BuildCategory;
  notes: string;
  buildSnapshot?: {
    title?: string;
    game?: ArpgGame;
    characterClass?: string;
    patch?: string;
    category?: BuildCategory;
    visibility?: BuildVisibility;
    notes?: string;
  };
};

function readableVisibility(value: BuildVisibility) {
  return value === "private" ? "Privata" : "Non in elenco";
}

export default function CompareBuildPage() {
  const router = useRouter();
  const params = useParams<{ buildId: string }>();
  const buildId = params.buildId;

  const [user, setUser] = useState<User | null>(null);
  const [mainBuild, setMainBuild] = useState<ComparableBuild | null>(null);
  const [variants, setVariants] = useState<ComparableBuild[]>([]);
  const [versions, setVersions] = useState<ComparableBuild[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);

      if (!currentUser) {
        router.replace("/login");
      }
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!user || !buildId) {
      return;
    }
const userId = user.uid;
    async function loadComparableData() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const buildReference = doc(db, "users", userId, "builds", buildId);
        const buildSnapshot = await getDoc(buildReference);

        if (!buildSnapshot.exists()) {
          router.replace("/dashboard");
          return;
        }

        const buildData = buildSnapshot.data();

        const main: ComparableBuild = {
          id: "main",
          source: "main",
          label: "Build principale",
          title: buildData.title || "Build senza nome",
          game: buildData.game || "Path of Exile 2",
          characterClass: buildData.characterClass || "",
          patch: buildData.patch || "",
          category: buildData.category || "Theorycraft",
          visibility: buildData.visibility || "private",
          notes: buildData.notes || ""
        };

        const variantsQuery = query(
          collection(db, "users", userId, "builds", buildId, "variants"),
          orderBy("createdAt", "desc")
        );

        const versionsQuery = query(
          collection(db, "users", userId, "builds", buildId, "versions"),
          orderBy("createdAt", "desc")
        );

        const [variantsSnapshot, versionsSnapshot] = await Promise.all([
          getDocs(variantsQuery),
          getDocs(versionsQuery)
        ]);

        const loadedVariants: ComparableBuild[] = variantsSnapshot.docs.map(
          (variantDocument) => {
            const data = variantDocument.data() as VariantData;

            return {
              id: `variant:${variantDocument.id}`,
              source: "variant",
              label: `Variante · ${data.category || "Theorycraft"}`,
              title: data.title || "Variante senza nome",
              game: main.game,
              characterClass: main.characterClass,
              patch: data.patch || main.patch,
              category: data.category || main.category,
              visibility: data.visibility || main.visibility,
              notes: data.notes || ""
            };
          }
        );

        const loadedVersions: ComparableBuild[] = versionsSnapshot.docs.map(
          (versionDocument) => {
            const data = versionDocument.data() as VersionData;
            const snapshot = data.buildSnapshot || {};

            return {
              id: `version:${versionDocument.id}`,
              source: "version",
              label: `Snapshot · ${data.label || "Versione senza nome"}`,
              title: snapshot.title || main.title,
              game: snapshot.game || main.game,
              characterClass: snapshot.characterClass || main.characterClass,
              patch: data.patch || snapshot.patch || main.patch,
              category: data.category || snapshot.category || main.category,
              visibility: snapshot.visibility || main.visibility,
              notes: data.notes || snapshot.notes || ""
            };
          }
        );

        setMainBuild(main);
        setVariants(loadedVariants);
        setVersions(loadedVersions);

        const firstAlternative = loadedVariants[0] || loadedVersions[0];
        setSelectedId(firstAlternative?.id || "");
      } catch (error) {
        console.error("Errore comparatore:", error);
        setErrorMessage(
          "Non è stato possibile caricare dati per il confronto."
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadComparableData();
  }, [buildId, router, user]);

  const alternatives = useMemo(
    () => [...variants, ...versions],
    [variants, versions]
  );

  const selectedBuild = useMemo(
    () => alternatives.find((build) => build.id === selectedId) || null,
    [alternatives, selectedId]
  );

  if (isLoading || !user) {
    return (
      <main className="compare-page compare-loading">
        <p>Il cartografo prepara le pergamene del confronto...</p>
      </main>
    );
  }

  if (!mainBuild) {
    return null;
  }

  const rows = selectedBuild
    ? [
        { label: "Nome", left: mainBuild.title, right: selectedBuild.title },
        { label: "Gioco", left: mainBuild.game, right: selectedBuild.game },
        {
          label: "Classe / archetipo",
          left: mainBuild.characterClass || "Non specificata",
          right: selectedBuild.characterClass || "Non specificata"
        },
        {
          label: "Patch / stagione",
          left: mainBuild.patch || "Non specificata",
          right: selectedBuild.patch || "Non specificata"
        },
        {
          label: "Obiettivo",
          left: mainBuild.category,
          right: selectedBuild.category
        },
        {
          label: "Visibilità",
          left: readableVisibility(mainBuild.visibility),
          right: readableVisibility(selectedBuild.visibility)
        },
        {
          label: "Note",
          left: mainBuild.notes || "Nessuna nota",
          right: selectedBuild.notes || "Nessuna nota",
          isNotes: true
        }
      ]
    : [];

  return (
    <main className="compare-page">
      <header className="compare-topbar">
        <Link className="brand" href={`/builds/${buildId}`}>
          <span className="brand-mark">✦</span>
          <span className="brand-text">
            <small>Il tavolo del cartografo</small>
            ARPG Tavern
          </span>
        </Link>

        <Link className="compare-back-link" href={`/builds/${buildId}`}>
          ← Torna alla build
        </Link>
      </header>

      <section className="compare-hero">
        <p className="eyebrow">Pergamene affiancate</p>
        <h1>Confronta la tua build</h1>
        <p>
          Metti la build principale accanto a una variante oppure a uno
          snapshot storico e osserva subito ciò che è cambiato.
        </p>
      </section>

      {errorMessage && <p className="compare-error">{errorMessage}</p>}

      <section className="compare-picker">
        <div>
          <p className="eyebrow">Scegli il secondo tomo</p>
          <h2>Build principale contro...</h2>
        </div>

        <select
          value={selectedId}
          onChange={(event) => setSelectedId(event.target.value)}
          disabled={alternatives.length === 0}
        >
          {alternatives.length === 0 ? (
            <option value="">Crea prima una variante o uno snapshot</option>
          ) : (
            alternatives.map((alternative) => (
              <option key={alternative.id} value={alternative.id}>
                {alternative.label}
              </option>
            ))
          )}
        </select>
      </section>

      {!selectedBuild && alternatives.length === 0 && (
        <section className="compare-empty">
          <span aria-hidden="true">📜</span>
          <h2>Non ci sono ancora pergamene da confrontare</h2>
          <p>
            Torna alla build, crea una variante oppure salva uno snapshot:
            appariranno qui per il confronto.
          </p>
          <Link className="compare-gold-button" href={`/builds/${buildId}`}>
            Torna alla build
          </Link>
        </section>
      )}

      {selectedBuild && (
        <section className="compare-table">
          <div className="compare-column-title compare-main-title">
            <span>⚔</span>
            <div>
              <small>Build principale</small>
              <strong>{mainBuild.title}</strong>
            </div>
          </div>

          <div className="compare-middle-title">
            <span>VS</span>
          </div>

          <div className="compare-column-title compare-alternative-title">
            <span>{selectedBuild.source === "variant" ? "✦" : "⌛"}</span>
            <div>
              <small>{selectedBuild.label}</small>
              <strong>{selectedBuild.title}</strong>
            </div>
          </div>

          {rows.map((row) => {
            const isDifferent = row.left !== row.right;

            return (
              <div className="compare-row" key={row.label}>
                <div
                  className={`compare-value compare-left ${
                    isDifferent ? "is-different" : ""
                  } ${row.isNotes ? "is-notes" : ""}`}
                >
                  <small>{row.label}</small>
                  <p>{row.left}</p>
                </div>

                <div className="compare-row-marker">
                  {isDifferent ? "≠" : "="}
                </div>

                <div
                  className={`compare-value compare-right ${
                    isDifferent ? "is-different" : ""
                  } ${row.isNotes ? "is-notes" : ""}`}
                >
                  <small>{row.label}</small>
                  <p>{row.right}</p>
                </div>
              </div>
            );
          })}
        </section>
      )}
    </main>
  );
}