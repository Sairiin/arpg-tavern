import fs from "node:fs";
import { importPobCode } from "../src/lib/builds/pob-import";

const inputPath = process.argv[2];

if (!inputPath) {
  console.error("Uso: npx tsx scripts/inspect-pob-items.ts /tmp/build-pob.txt");
  process.exit(1);
}

const pobCode = fs.readFileSync(inputPath, "utf8").trim();

try {
  const result = importPobCode(pobCode);

  const report = result.items.map((item) => ({
    slot: item.slot,
    name: item.name,
    baseType: item.baseType,
    rarity: item.rarity,
  }));

  console.log("Importazione riuscita");
  console.log("Numero oggetti:", report.length);
  console.table(report);

  fs.writeFileSync(
    "/tmp/pob-items-result.json",
    JSON.stringify(report, null, 2),
  );

  console.log("\nReport salvato in /tmp/pob-items-result.json");
} catch (error) {
  console.error("Errore durante l'importazione:");
  console.error(error);
  process.exit(1);
}
