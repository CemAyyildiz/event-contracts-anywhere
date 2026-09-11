import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pub = resolve(root, "public");
const tmp = resolve(root, ".brand-fonts");
mkdirSync(tmp, { recursive: true });

async function grab(url, name) {
  const dest = resolve(tmp, name);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  return dest;
}

const [inter, serif] = await Promise.all([
  grab(
    "https://cdn.jsdelivr.net/fontsource/fonts/inter@5.2.5/latin-600-normal.ttf",
    "Inter-SemiBold.ttf",
  ),
  grab(
    "https://github.com/google/fonts/raw/main/ofl/instrumentserif/InstrumentSerif-Regular.ttf",
    "InstrumentSerif-Regular.ttf",
  ),
]);

function png(svgPath, outPath, width) {
  const svg = readFileSync(svgPath, "utf8");
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: width },
    font: {
      fontFiles: [inter, serif],
      loadSystemFonts: true,
      defaultFontFamily: "Inter",
    },
    background: "rgba(0,0,0,0)",
  });
  writeFileSync(outPath, resvg.render().asPng());
  console.log("wrote", outPath.replace(root + "/", ""));
}

png(resolve(pub, "brand/icon.svg"), resolve(pub, "logo-1024.png"), 1024);
png(resolve(pub, "brand/icon.svg"), resolve(pub, "logo-512.png"), 512);
png(resolve(pub, "brand/icon.svg"), resolve(pub, "logo-192.png"), 192);
png(resolve(pub, "brand/icon.svg"), resolve(pub, "apple-touch-icon.png"), 180);
png(resolve(pub, "favicon.svg"), resolve(pub, "favicon-32.png"), 32);
png(resolve(pub, "brand/og.svg"), resolve(pub, "og.png"), 1200);
