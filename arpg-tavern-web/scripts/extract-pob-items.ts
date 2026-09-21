import fs from "node:fs";
import { inflate } from "pako";

const inputPath = process.argv[2];

if (!inputPath) {
  throw new Error("Uso: npx tsx scripts/extract-pob-items.ts /tmp/build-pob.txt");
}

const input = fs.readFileSync(inputPath, "utf8").trim();
const normalised = input
  .replace(/^Path of Building Code:\s*/i, "")
  .replace(/\s+/g, "")
  .replace(/-/g, "+")
  .replace(/_/g, "/");

const padding = "=".repeat((4 - (normalised.length % 4)) % 4);
const binary = atob(normalised + padding);
const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
const xml = new TextDecoder("utf-8").decode(inflate(bytes));

fs.writeFileSync("/tmp/build-pob.xml", xml);

const start = xml.indexOf("<Items");
const end = xml.indexOf("</Items>");

if (start === -1 || end === -1) {
  throw new Error("Sezione Items non trovata");
}

const itemsXml = xml.slice(start, end + "</Items>".length);
fs.writeFileSync("/tmp/pob-items.xml", itemsXml);

console.log("XML completo:", xml.length, "caratteri");
console.log("Sezione Items:", itemsXml.length, "caratteri");
console.log("Salvato in /tmp/pob-items.xml");
