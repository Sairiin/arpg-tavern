import { Poe2BuildLibrary } from "@/components/build-links/poe2-build-library";
import "./poe2-build-library.css";

export const metadata = {
  title: "Archivio build PoE 2 | ARPG Tavern",
  description: "Salva e ritrova i link delle tue build di Path of Exile 2.",
};

export default function Poe2BuildLinksPage() {
  return <Poe2BuildLibrary />;
}
