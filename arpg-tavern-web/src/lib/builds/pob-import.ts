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
  if (value === undefined || value === null) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function hasBuildSections(value: Record<string, unknown>): boolean {
  return Boolean(
    value.Build ||
      value.Character ||
      value.Tree ||
      value.Skills ||
      value.Items ||
      value.Config
  );
}

function getBuildRoot(parsedValue: unknown): Record<string, unknown> {
  const parsed = asRecord(parsedValue);

  const directCandidates = [
    parsed.PathOfBuilding,
    parsed.PathofBuilding,
    parsed.Build,
    parsed.build,
    parsed,
  ];

  for (const candidate of directCandidates) {
    const record = asRecord(candidate);

    if (Object.keys(record).length > 0 && hasBuildSections(record)) {
      return record;
    }
  }

  for (const candidate of directCandidates) {
    const record = asRecord(candidate);

    const nestedCandidates = [
      record.PathOfBuilding,
      record.PathofBuilding,
      record.Build,
      record.build,
    ];

    for (const nestedCandidate of nestedCandidates) {
      const nestedRecord = asRecord(nestedCandidate);

      if (
        Object.keys(nestedRecord).length > 0 &&
        hasBuildSections(nestedRecord)
      ) {
        return nestedRecord;
      }
    }
  }

  return {};
}

function getString(
  source: Record<string, unknown>,
  ...keys: string[]
): string | undefined {
  for (const key of keys) {
    const value = source[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (typeof value === "number") {
      return String(value);
    }
  }

  return undefined;
}

function getNumber(
  source: Record<string, unknown>,
  ...keys: string[]
): number | undefined {
  const value = getString(source, ...keys);

  if (!value) {
    return undefined;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : undefined;
}

function getItemName(rawText: string): string {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const rarityIndex = lines.findIndex((line) => line.startsWith("Rarity:"));

  if (rarityIndex >= 0 && lines[rarityIndex + 1]) {
    return lines[rarityIndex + 1];
  }

  return lines[0] || "Oggetto senza nome";
}

function getItemBaseType(rawText: string): string | undefined {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const rarityIndex = lines.findIndex((line) => line.startsWith("Rarity:"));

  if (rarityIndex < 0) {
    return undefined;
  }

  const rarity = lines[rarityIndex];

  if (rarity === "Rarity: Rare" || rarity === "Rarity: Unique") {
    return lines[rarityIndex + 2];
  }

  return lines[rarityIndex + 1];
}

function getItemRarity(
  rawText: string
): ImportedItem["rarity"] | undefined {
  const rarityLine = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.startsWith("Rarity:"));

  if (!rarityLine) {
    return undefined;
  }

  const rarity = rarityLine.replace("Rarity:", "").trim().toLowerCase();

  if (
    rarity === "normal" ||
    rarity === "magic" ||
    rarity === "rare" ||
    rarity === "unique"
  ) {
    return rarity;
  }

  return undefined;
}

function normalisePobCode(input: string): string {
  const trimmed = input.trim();

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
      "Per ora incolla il codice di condivisione PoB, non il link. Il supporto ai link verrà aggiunto dopo."
    );
  }

  return trimmed
    .replace(/^Path of Building Code:\s*/i, "")
    .replace(/\s+/g, "")
    .replace(/-/g, "+")
    .replace(/_/g, "/");
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

function addNodeIds(nodeList: string, target: Set<string>) {
  for (const nodeId of nodeList.split(/[,\s;]+/)) {
    const cleanNodeId = nodeId.trim();

    if (cleanNodeId) {
      target.add(cleanNodeId);
    }
  }
}

function parsePassives(tree: Record<string, unknown>): ImportedPassiveTree {
  const allocatedNodeIds = new Set<string>();
  const masterySelections: Record<string, number> = {};

  const specsContainer = asRecord(tree.Specs);
  const specCandidates = [
    ...asArray(tree.Spec),
    ...asArray(specsContainer.Spec),
  ];

  for (const spec of specCandidates) {
    const specRecord = asRecord(spec);
    const nodeList = getString(specRecord, "nodes", "nodeIds");

    if (nodeList) {
      addNodeIds(nodeList, allocatedNodeIds);
    }

    const nodesContainer = asRecord(specRecord.Nodes);
    const socketsContainer = asRecord(specRecord.Sockets);

    const nodeEntries = [
      ...asArray(specRecord.Node),
      ...asArray(nodesContainer.Node),
    ];

    for (const node of nodeEntries) {
      const nodeRecord = asRecord(node);
      const nodeId = getString(nodeRecord, "id", "nodeId");

      if (nodeId) {
        allocatedNodeIds.add(nodeId);
      }
    }

    const socketEntries = [
      ...asArray(specRecord.Socket),
      ...asArray(socketsContainer.Socket),
    ];

    for (const socket of socketEntries) {
      const socketRecord = asRecord(socket);
      const nodeId = getString(socketRecord, "nodeId", "id");
      const masteryId = getNumber(socketRecord, "masteryId", "mastery");

      if (nodeId && masteryId !== undefined) {
        masterySelections[nodeId] = masteryId;
      }
    }
  }

  const treeNodes = asRecord(tree.Nodes);

  for (const node of asArray(treeNodes.Node)) {
    const nodeRecord = asRecord(node);
    const nodeId = getString(nodeRecord, "id", "nodeId");

    if (nodeId) {
      allocatedNodeIds.add(nodeId);
    }
  }

  return {
    allocatedNodeIds: [...allocatedNodeIds],
    masterySelections,
  };
}

function parseSkills(skills: Record<string, unknown>): ImportedSkillGroup[] {
  const skillSetsContainer = asRecord(skills.SkillSets);
  const skillGroupsContainer = asRecord(skills.SkillGroups);

  const skillSetEntries = [
    ...asArray(skills.SkillSet),
    ...asArray(skillSetsContainer.SkillSet),
  ];

  const directSkillEntries = [
    ...asArray(skills.Skill),
    ...asArray(skillGroupsContainer.Skill),
    ...asArray(skillGroupsContainer.SkillGroup),
  ];

  const result: ImportedSkillGroup[] = [];
  let groupIndex = 0;

  function createSkillGroup(
    rawGroup: unknown,
    fallbackLabel: string,
    isMainSkill: boolean
  ) {
    const skillGroup = asRecord(rawGroup);
    const skillGroupId = getString(skillGroup, "id");

    const title =
      getString(skillGroup, "label", "title", "name", "slot") ||
      `${fallbackLabel} ${skillGroupId || groupIndex + 1}`;

    const gemContainer = asRecord(skillGroup.Gems);

    const gemEntries = [
      ...asArray(skillGroup.Gem),
      ...asArray(gemContainer.Gem),
    ];

    const gems: ImportedGem[] = [];

    for (const gem of gemEntries) {
      const gemRecord = asRecord(gem);

      const name = getString(
        gemRecord,
        "nameSpec",
        "name",
        "skillId",
        "gemId",
        "displayName"
      );

      if (!name) {
        continue;
      }

      const level = getNumber(gemRecord, "level");
      const quality = getNumber(gemRecord, "quality");
      const enabledValue = getString(gemRecord, "enabled");

      const importedGem: ImportedGem = {
        name,
        enabled: enabledValue !== "false" && enabledValue !== "0",
      };

      if (level !== undefined) {
        importedGem.level = level;
      }

      if (quality !== undefined) {
        importedGem.quality = quality;
      }

      gems.push(importedGem);
    }

    if (gems.length === 0) {
      return;
    }

    result.push({
      label: title,
      isMainSkill,
      gems,
    });

    groupIndex += 1;
  }

  for (const skillSet of skillSetEntries) {
    const skillSetRecord = asRecord(skillSet);

    const skillSetId = getString(skillSetRecord, "id");
    const skillSetTitle =
      getString(skillSetRecord, "title", "label", "name") ||
      `Set skill ${skillSetId || "senza nome"}`;

    const skillsInSet = asArray(skillSetRecord.Skill);

    for (let index = 0; index < skillsInSet.length; index += 1) {
      const skill = skillsInSet[index];
      const skillRecord = asRecord(skill);

      const mainActiveSkill = getString(
        skillRecord,
        "mainActiveSkill",
        "mainSkill",
        "isMainSkill"
      );

      const isMainSkill =
        mainActiveSkill === "true" ||
        mainActiveSkill === "1" ||
        (result.length === 0 && index === 0);

      createSkillGroup(
        skill,
        skillSetTitle,
        isMainSkill
      );
    }
  }

  for (let index = 0; index < directSkillEntries.length; index += 1) {
    const skill = directSkillEntries[index];
    const skillRecord = asRecord(skill);

    const mainActiveSkill = getString(
      skillRecord,
      "mainActiveSkill",
      "mainSkill",
      "isMainSkill"
    );

    const isMainSkill =
      mainActiveSkill === "true" ||
      mainActiveSkill === "1" ||
      result.length === 0;

    createSkillGroup(skill, "Gruppo skill", isMainSkill);
  }

  return result;
}

function parseItems(items: Record<string, unknown>): ImportedItem[] {
  const itemDefinitions = new Map<string, string>();

  for (const item of asArray(items.Item)) {
    const itemRecord = asRecord(item);
    const id = getString(itemRecord, "id");

    if (!id) {
      continue;
    }

    itemDefinitions.set(id, getItemText(itemRecord));
  }

  const usedItems = asRecord(items.UsedItems);
  const usedItemEntries = [
    ...asArray(items.UsedItem),
    ...asArray(usedItems.UsedItem),
  ];

  const result: ImportedItem[] = [];
  const usedItemIds = new Set<string>();

  for (const usedItem of usedItemEntries) {
    const usedItemRecord = asRecord(usedItem);
    const itemId = getString(usedItemRecord, "id", "itemId");
    const slot =
      getString(usedItemRecord, "slot", "name") || "Slot sconosciuto";

    if (!itemId) {
      continue;
    }

    usedItemIds.add(itemId);

    const rawText = itemDefinitions.get(itemId) || "";

    result.push({
      slot,
      name: getItemName(rawText),
      baseType: getItemBaseType(rawText),
      rarity: getItemRarity(rawText),
      rawText,
    });
  }

  for (const [itemId, rawText] of itemDefinitions) {
    if (usedItemIds.has(itemId)) {
      continue;
    }

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
        ].includes(tagName),
    });

    const parsed = parser.parse(xml);
    const buildRoot = getBuildRoot(parsed);

    if (Object.keys(buildRoot).length === 0) {
      throw new Error(
        "Il codice non contiene una build PoB riconoscibile. Verifica di aver copiato l’intero codice di condivisione."
      );
    }

    const buildInfo = asRecord(buildRoot.Build);
    const character = asRecord(buildRoot.Character);

    const className =
      getString(buildInfo, "className", "class") ||
      getString(character, "className", "class");

    const ascendancy =
      getString(buildInfo, "ascendClassName", "ascendancy") ||
      getString(character, "ascendClassName", "ascendancy");

    const level =
      getNumber(buildInfo, "level") ||
      getNumber(character, "level");

    const tree = asRecord(buildRoot.Tree);
    const skills = asRecord(buildRoot.Skills);
    console.log("PoB Skills:", skills);
    console.log("PoB Skills keys:", Object.keys(skills));
    const items = asRecord(buildRoot.Items);

    const passives = parsePassives(tree);
    const skillGroups = parseSkills(skills);
    const importedItems = parseItems(items);

    const gemCount = skillGroups.reduce(
      (total, group) => total + group.gems.length,
      0
    );

    const mainSkillGroup =
      skillGroups.find((group) => group.isMainSkill) || skillGroups[0];

    return {
      sourceFormat: "pob",
      rawXml: xml,
      character: {
        level,
        className,
        ascendancy,
      },
      passives,
      skills: skillGroups,
      items: importedItems,
      summary: {
        level,
        className,
        ascendancy,
        passiveCount: passives.allocatedNodeIds.length,
        skillGroupCount: skillGroups.length,
        gemCount,
        itemCount: importedItems.length,
        mainSkillName: mainSkillGroup?.gems[0]?.name,
      },
    };
  } catch (error) {
    console.error("Errore import PoB:", error);

    if (error instanceof Error) {
      throw error;
    }

    throw new Error(
      "Non è stato possibile analizzare questo codice Path of Building."
    );
  }
}