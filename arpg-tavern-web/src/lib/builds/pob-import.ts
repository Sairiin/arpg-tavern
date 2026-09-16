import { inflate } from "pako";
import { XMLParser } from "fast-xml-parser";
import type {
  ImportedBuildData,
  ImportedGem,
  ImportedItem,
  ImportedPassiveTree,
  ImportedSkillGroup,
} from "./types";

const MAX_POB_CODE_LENGTH = 2_000_000;
const MAX_DECOMPRESSED_XML_LENGTH = 8_000_000;

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function getCaseInsensitiveValue(
  source: Record<string, unknown>,
  wantedKey: string
): unknown {
  const key = Object.keys(source).find(
    (candidate) => candidate.toLowerCase() === wantedKey.toLowerCase()
  );
  return key ? source[key] : undefined;
}

function getString(
  source: Record<string, unknown>,
  ...keys: string[]
): string | undefined {
  for (const key of keys) {
    const value = getCaseInsensitiveValue(source, key);
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return undefined;
}

function getNumber(
  source: Record<string, unknown>,
  ...keys: string[]
): number | undefined {
  const value = getString(source, ...keys);
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function hasBuildSections(value: Record<string, unknown>): boolean {
  const keys = new Set(Object.keys(value).map((key) => key.toLowerCase()));
  return [
    "build",
    "character",
    "tree",
    "skills",
    "items",
    "config",
    "spec",
  ].some((key) => keys.has(key));
}

function getBuildRoot(parsedValue: unknown): Record<string, unknown> {
  const parsed = asRecord(parsedValue);

  if (hasBuildSections(parsed)) return parsed;

  for (const value of Object.values(parsed)) {
    const record = asRecord(value);
    if (hasBuildSections(record)) return record;
  }

  for (const value of Object.values(parsed)) {
    const record = asRecord(value);
    for (const nested of Object.values(record)) {
      const nestedRecord = asRecord(nested);
      if (hasBuildSections(nestedRecord)) return nestedRecord;
    }
  }

  return {};
}

function normalisePobCode(input: string): string {
  const trimmed = input
    .trim()
    .replace(/^Path of Building Code:\s*/i, "")
    .replace(/\s+/g, "");

  if (!trimmed) {
    throw new Error("Incolla un codice Path of Building prima di analizzarlo.");
  }

  if (trimmed.length > MAX_POB_CODE_LENGTH) {
    throw new Error(
      "Il codice Path of Building è troppo grande per essere analizzato."
    );
  }

  if (/^https?:\/\//i.test(trimmed)) {
    throw new Error(
      "Hai incollato un link. Usa l’import da link oppure incolla direttamente il codice di condivisione."
    );
  }

  if (trimmed.startsWith("<")) {
    throw new Error(
      "Hai incollato XML PoB non compresso. Incolla il codice generato da Path of Building."
    );
  }

  const normalised = trimmed.replace(/-/g, "+").replace(/_/g, "/");

  if (!/^[A-Za-z0-9+/=]+$/.test(normalised)) {
    throw new Error(
      "Il codice PoB contiene caratteri non validi. Copia nuovamente l’intero codice."
    );
  }

  return normalised;
}

function decodeBase64ToBytes(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const decoded = atob(base64 + padding);
  const bytes = new Uint8Array(decoded.length);

  for (let index = 0; index < decoded.length; index += 1) {
    bytes[index] = decoded.charCodeAt(index);
  }

  return bytes;
}

function getItemText(item: Record<string, unknown>): string {
  return getString(item, "#text", "#cdata", "text", "item") || "";
}

function getItemName(rawText: string): string {
  const lines = rawText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const rarityIndex = lines.findIndex((line) => line.startsWith("Rarity:"));
  return rarityIndex >= 0 && lines[rarityIndex + 1]
    ? lines[rarityIndex + 1]
    : lines[0] || "Oggetto senza nome";
}

function getItemBaseType(rawText: string): string | undefined {
  const lines = rawText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const rarityIndex = lines.findIndex((line) => line.startsWith("Rarity:"));
  if (rarityIndex < 0) return undefined;
  const rarity = lines[rarityIndex];
  return rarity === "Rarity: Rare" || rarity === "Rarity: Unique"
    ? lines[rarityIndex + 2]
    : lines[rarityIndex + 1];
}

function getItemRarity(rawText: string): ImportedItem["rarity"] | undefined {
  const line = rawText
    .split(/\r?\n/)
    .map((value) => value.trim())
    .find((value) => value.startsWith("Rarity:"));

  if (!line) return undefined;
  const rarity = line.replace("Rarity:", "").trim().toLowerCase();
  return ["normal", "magic", "rare", "unique"].includes(rarity)
    ? (rarity as ImportedItem["rarity"])
    : undefined;
}

function parsePassives(tree: Record<string, unknown>): ImportedPassiveTree {
  const allocatedNodeIds = new Set<string>();
  const masterySelections: Record<string, number> = {};
  const specs = asRecord(getCaseInsensitiveValue(tree, "Specs"));
  const candidates = [
    ...asArray(getCaseInsensitiveValue(tree, "Spec")),
    ...asArray(getCaseInsensitiveValue(specs, "Spec")),
  ].map(asRecord);
  const source = candidates.find(
    (spec) => getString(spec, "active", "isActive") === "true"
  ) || candidates[0] || tree;

  const nodes = [
    ...asArray(getCaseInsensitiveValue(source, "Node")),
    ...asArray(getCaseInsensitiveValue(source, "Nodes")),
    ...asArray(getCaseInsensitiveValue(tree, "Node")),
  ];

  for (const value of nodes) {
    const node = asRecord(value);
    const nodeId = getString(node, "id", "nodeId", "skillId");
    if (nodeId) allocatedNodeIds.add(nodeId);

    const masteryId = getString(node, "mastery", "masteryId");
    const effect = getNumber(node, "effect", "effectId");
    if (masteryId && effect !== undefined) masterySelections[masteryId] = effect;
  }

  for (const key of ["allocatedNodes", "allocatedNodeIds", "nodes"]) {
    const value = getCaseInsensitiveValue(source, key);
    if (typeof value === "string") {
      for (const nodeId of value.split(/[,\s;]+/)) {
        if (nodeId.trim()) allocatedNodeIds.add(nodeId.trim());
      }
    }
  }

  return {
    allocatedNodeIds: [...allocatedNodeIds],
    masterySelections,
  };
}

function parseGems(skill: Record<string, unknown>): ImportedGem[] {
  const result: ImportedGem[] = [];

  function visit(value: unknown): void {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }

    const record = asRecord(value);
    if (Object.keys(record).length === 0) return;

    const name = getString(
      record,
      "name",
      "skillId",
      "gemId",
      "label",
      "gemName"
    );
    const level = getNumber(record, "level", "lvl");
    const quality = getNumber(record, "quality", "q");
    const enabled = getString(record, "enabled", "active");
    const looksLikeGem = Boolean(
      name &&
        (level !== undefined ||
          quality !== undefined ||
          enabled !== undefined ||
          getString(record, "skillId", "gemId") !== undefined)
    );

    if (looksLikeGem) {
      result.push({
        name: name || "Gemma senza nome",
        level,
        quality,
        enabled: enabled !== "false",
      });
    }

    for (const [key, child] of Object.entries(record)) {
      const lowerKey = key.toLowerCase();
      if (lowerKey === "gem" || lowerKey === "gems" || lowerKey === "skill") {
        visit(child);
      }
    }
  }

  visit(skill);

  const unique = new Map<string, ImportedGem>();
  for (const gem of result) {
    const key = `${gem.name}|${gem.level ?? ""}|${gem.quality ?? ""}`;
    if (!unique.has(key)) unique.set(key, gem);
  }

  return [...unique.values()];
}

function parseSkills(skills: Record<string, unknown>): ImportedSkillGroup[] {
  const groups = [
    ...asArray(getCaseInsensitiveValue(skills, "SkillSet")),
    ...asArray(getCaseInsensitiveValue(skills, "Skill")),
  ];

  return groups.map((value, index) => {
    const group = asRecord(value);
    const label =
      getString(group, "label", "name", "slot", "title") ||
      `Gruppo skill ${index + 1}`;
    const gems = parseGems(group);

    return {
      label,
      gems,
      isMainSkill:
        getString(group, "isMainSkill", "mainSkill", "enabled") === "true" ||
        index === 0,
    };
  });
}

function parseItems(items: Record<string, unknown>): ImportedItem[] {
  const definitions = new Map<string, string>();
  const itemNodes = [
    ...asArray(getCaseInsensitiveValue(items, "Item")),
    ...asArray(getCaseInsensitiveValue(items, "item")),
  ];

  for (const value of itemNodes) {
    const item = asRecord(value);
    const id = getString(item, "id", "itemId");
    const rawText = getItemText(item);
    if (id && rawText) definitions.set(id, rawText);
  }

  const result: ImportedItem[] = [];
  const usedIds = new Set<string>();
  const slots = asArray(getCaseInsensitiveValue(items, "Slot"));

  for (const value of slots) {
    const slot = asRecord(value);
    const itemId = getString(slot, "itemId", "id", "ItemID", "item");
    if (!itemId) continue;
    const rawText = definitions.get(itemId) || "";
    usedIds.add(itemId);
    result.push({
      slot: getString(slot, "name", "slot") || "Equipaggiamento",
      name: getItemName(rawText),
      baseType: getItemBaseType(rawText),
      rarity: getItemRarity(rawText),
      rawText,
    });
  }

  for (const [itemId, rawText] of definitions) {
    if (usedIds.has(itemId)) continue;
    result.push({
      slot: "Inventario / non equipaggiato",
      name: getItemName(rawText),
      baseType: getItemBaseType(rawText),
      rarity: getItemRarity(rawText),
      rawText,
    });
  }

  return result;
}

export function importPobCode(pobCode: string): ImportedBuildData {
  try {
    const normalisedCode = normalisePobCode(pobCode);
    const compressedBytes = decodeBase64ToBytes(normalisedCode);
    const inflatedBytes = inflate(compressedBytes);
    const xml = new TextDecoder("utf-8").decode(inflatedBytes);

    if (!xml || xml.length > MAX_DECOMPRESSED_XML_LENGTH) {
      throw new Error(
        "Il contenuto PoB decompresso è vuoto o troppo grande per essere analizzato."
      );
    }

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "",
      textNodeName: "#text",
      cdataPropName: "#cdata",
      trimValues: false,
      parseTagValue: false,
      parseAttributeValue: false,
      isArray: (tagName) =>
        [
          "Item",
          "UsedItem",
          "Skill",
          "SkillSet",
          "Gem",
          "Node",
          "Socket",
          "Spec",
          "Slot",
        ].includes(tagName),
    });

    const parsed = parser.parse(xml);
    const buildRoot = getBuildRoot(parsed);

    if (Object.keys(buildRoot).length === 0) {
      throw new Error(
        "Il codice non contiene una build PoB riconoscibile. Verifica di aver copiato l’intero codice di condivisione."
      );
    }

    const buildInfo = asRecord(getCaseInsensitiveValue(buildRoot, "Build"));
    const character = asRecord(
      getCaseInsensitiveValue(buildRoot, "Character")
    );
    const tree = asRecord(getCaseInsensitiveValue(buildRoot, "Tree"));
    const skills = asRecord(getCaseInsensitiveValue(buildRoot, "Skills"));
    const items = asRecord(getCaseInsensitiveValue(buildRoot, "Items"));
    const passives = parsePassives(tree);
    const skillGroups = parseSkills(skills);
    const importedItems = parseItems(items);

    const className =
      getString(buildInfo, "className", "class") ||
      getString(character, "className", "class") ||
      "Classe non rilevata";
    const ascendancy =
      getString(buildInfo, "ascendClassName", "ascendancy") ||
      getString(character, "ascendClassName", "ascendancy");
    const level =
      getNumber(buildInfo, "level") || getNumber(character, "level");

    return {
      sourceFormat: "pob",
      character: {
        className,
        ascendancy,
        level,
      },
      passives,
      skills: skillGroups,
      items: importedItems,
      summary: {
        passiveCount: passives.allocatedNodeIds.length,
        skillGroupCount: skillGroups.length,
        gemCount: skillGroups.reduce(
          (total, group) => total + group.gems.length,
          0
        ),
        itemCount: importedItems.length,
      },
      rawXml: xml,
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes("Path of Building")) {
      throw error;
    }

    console.error("Errore import PoB:", error);
    throw new Error(
      "Non è stato possibile analizzare questo codice Path of Building."
    );
  }
}
