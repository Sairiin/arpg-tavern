"use client";

import { collection, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase/client";

type BuildVariantCountProps = {
  userId: string;
  buildId: string;
};

export function BuildVariantCount({
  userId,
  buildId,
}: BuildVariantCountProps) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "users", userId, "builds", buildId, "variants"),
      (snapshot) => {
        setCount(snapshot.size);
      },
      (error) => {
        console.error("Errore conteggio varianti:", error);
        setCount(null);
      },
    );

    return () => unsubscribe();
  }, [buildId, userId]);

  if (!count) {
    return null;
  }

  return (
    <span className="saved-build-variant-count">
      {count} {count === 1 ? "variante" : "varianti"}
    </span>
  );
}
