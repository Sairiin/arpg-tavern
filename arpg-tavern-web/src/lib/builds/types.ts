export const arpgGames = [
  "Path of Exile",
  "Path of Exile 2",
] as const;

export const buildCategories = [
  "League starter",
  "Leveling",
  "Mapping",
  "Endgame",
  "Bossing",
  "SSF",
  "Hardcore",
  "Budget",
  "Theorycraft",
] as const;

export const buildSourceTypes = [
  "manual",
  "pob-link",
  "pob-code",
  "poe2-build-file",
] as const;

export type ArpgGame = (typeof arpgGames)[number];
export type BuildCategory = (typeof buildCategories)[number];
export type BuildSourceType = (typeof buildSourceTypes)[number];
export type BuildVisibility = "private" | "unlisted";
export type ImportedGem = {
  name: string;
  level?: number;
  quality?: number;
  enabled: boolean;
};

export type ImportedSkillGroup = {
  label: string;
  isMainSkill: boolean;
  gems: ImportedGem[];
};

export type ImportedItem = {
  slot: string;
  name: string;
  baseType?: string;
  rarity?: "normal" | "magic" | "rare" | "unique";
  rawText: string;
};

export type ImportedPassiveTree = {
  allocatedNodeIds: string[];
  masterySelections: Record<string, number>;
};

export type ImportedBuildSummary = {
  level?: number;
  className?: string;
  ascendancy?: string;
  passiveCount: number;
  skillGroupCount: number;
  gemCount: number;
  itemCount: number;
  mainSkillName?: string;
};

export type ImportedBuildData = {
  sourceFormat: "pob";
  rawXml: string;
  character: {
    level?: number;
    className?: string;
    ascendancy?: string;
  };
  passives: ImportedPassiveTree;
  skills: ImportedSkillGroup[];
  items: ImportedItem[];
  summary: ImportedBuildSummary;
};
export type BuildRecord = {
  id: string;
  title: string;

  /**
   * Per ora ARPG Tavern supporta solo Path of Exile 1 e Path of Exile 2.
   */
  game: ArpgGame;

  characterClass: string;
  ascendancy?: string;
  patch: string;
  category: BuildCategory;
  visibility: BuildVisibility;
  notes: string;

  /**
   * Origine della build.
   *
   * manual: campi compilati direttamente nell'app.
   * pob-link: URL verso una build PoB / PoB 2.
   * pob-code: share code PoB / PoB 2 incollato dall'utente.
   * poe2-build-file: JSON originale del file .build di Path of Exile 2.
   *
   * È opzionale per mantenere compatibili le build già presenti in Firestore.
   */
  sourceType?: BuildSourceType;

  /**
   * Fonte della guida, opzionale.
   * Esempio: link a Maxroll, Mobalytics, forum, video o pagina del creatore.
   */
  sourceUrl?: string;

  /**
   * Nome dell'autore o creatore esterno della build, se presente.
   */
  externalAuthor?: string;

  /**
   * Link di Path of Building / Path of Building 2.
   * Viene utilizzato quando sourceType è "pob-link".
   */
  pobUrl?: string;

  /**
   * Codice di condivisione Path of Building / Path of Building 2.
   * Viene utilizzato quando sourceType è "pob-code".
   */
  pobCode?: string;

  /**
   * Solo Path of Exile 2.
   * JSON originale letto da un file .build, conservato senza conversioni.
   */
  poe2BuildJson?: string;

  /**
   * Solo Path of Exile 2.
   * Nome originale del file .build caricato dall'utente.
   */
  poe2BuildFileName?: string;
  /**
   * Dati ottenuti dal decoder Path of Building.
   * È opzionale: le build manuali e le build già salvate restano compatibili.
   */
  importedData?: ImportedBuildData;

  /**
   * Se true, la build resta conservata ma viene esclusa dalla vista attiva.
   */
  archived?: boolean;

  createdAt?: {
    seconds: number;
    nanoseconds: number;
  } | null;

  updatedAt?: {
    seconds: number;
    nanoseconds: number;
  } | null;
};