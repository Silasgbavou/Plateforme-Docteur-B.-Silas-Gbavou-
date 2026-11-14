/** Génère les icônes PWA (PNG) à partir du monogramme vectoriel public/icons/icon.svg. */
import sharp from "sharp";
import { readFile } from "node:fs/promises";

const svg = await readFile("public/icons/icon.svg");
const maskable = await readFile("public/icons/maskable.svg");
await sharp(svg).resize(192, 192).png().toFile("public/icons/icon-192.png");
await sharp(svg).resize(512, 512).png().toFile("public/icons/icon-512.png");
await sharp(svg).resize(180, 180).png().toFile("public/icons/apple-touch-icon.png");
await sharp(maskable).resize(512, 512).png().toFile("public/icons/maskable-512.png");
console.log("Icônes générées.");
