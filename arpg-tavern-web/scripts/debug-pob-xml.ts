import fs from "node:fs";
import { inflate } from "pako";

function normalisePobCode(input: string): string {
  const trimmed = input.trim();

  if (!trimmed) {
    throw new Error("Codice PoB vuoto");
  }

  const marker = trimmed.indexOf("<?xml");
  if (marker >= 0) {
    throw new Error("È stato passato XML invece del codice PoB");
  }

  return trimmed
    .replace(/^https?:\/\/pastebin\.com\/raw\//, "")
    .replace(/\s+/g, "")
    .replace(/-/g, "+")
    .replace(/_/g, "/");
}

function decodeBase64ToBytes(base64: string): Uint8Array {
  const binary = Buffer.from(base64, "base64");
  return new Uint8Array(binary);
}

const file = process.argv[2];

if (!file) {
  console.error("Uso: npx tsx scripts/debug-pob-xml.ts /tmp/build-pob.txt");
  process.exit(1);
}

const pobCode = fs.readFileSync(file, "utf8");
const normalisedCode = normalisePobCode(pobCode);
const compressedBytes = decodeBase64ToBytes(normalisedCode);
const inflatedBytes = inflate(compressedBytes);
const xml = new TextDecoder("utf-8").decode(inflatedBytes);

const start = xml.indexOf("<Items");
const end = xml.indexOf("</Items>");

if (start === -1 || end === -1) {
  console.error("Sezione <Items> non trovata");
  console.log("Prime 5000 caratteri dell'XML:");
  console.log(xml.slice(0, 5000));
  process.exit(1);
}

const itemsXml = xml.slice(start, end + "</Items>".length);
fs.writeFileSync("/tmp/pob-items.xml", itemsXml);

console.log("XML Items salvato in /tmp/pob-items.xml");
console.log("Dimensione:", itemsXml.length, "caratteri");
console.log();
console.log(itemsXml);
