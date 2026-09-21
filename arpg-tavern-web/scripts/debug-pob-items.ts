import { importPobCode } from "../src/lib/builds/pob-import";

const code = process.argv[2];

if (!code) {
  console.error("Uso: npx tsx scripts/debug-pob-items.ts '<codice-pob>'");
  process.exit(1);
}

const result = importPobCode(code);

console.dir(
  {
    itemCount: result.items.length,
    slots: result.items.map((item) => ({
      slot: item.slot,
      name: item.name,
      baseType: item.baseType,
    })),
  },
  { depth: null },
);
