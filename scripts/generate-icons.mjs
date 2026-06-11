// Generates the Cat Diary app logo / favicon / PWA icon set from a single
// hand-authored SVG master. Run with: `node scripts/generate-icons.mjs`.
//
// The mark unites the app's two core ideas: a DIARY (a fountain-pen-blue
// journal cover with a spiral binding coil across the top) and a CAT (a cream
// paw print stamped on the cover). Colours come from the field-journal design
// system in app/globals.css (cream #fbf6e9 on accent blue #3b6fe0).
import { Buffer } from "node:buffer";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// --- artwork pieces (512x512 canvas) ---------------------------------------

const CREAM = "#fbf6e9";

// A cat paw: one metacarpal pad with four toe beans arced above it. Centred
// horizontally on x=256; sits in the lower-centre of the cover.
function paw() {
  const toe = (cx, cy, rx, ry, rot) =>
    `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" transform="rotate(${rot} ${cx} ${cy})"/>`;
  return `
  <g fill="${CREAM}">
    <ellipse cx="256" cy="324" rx="93" ry="73"/>
    ${toe(160, 252, 28, 39, -22)}
    ${toe(214, 214, 29, 41, -8)}
    ${toe(298, 214, 29, 41, 8)}
    ${toe(352, 252, 28, 39, 22)}
  </g>`;
}

// The spiral binding coil running across the top edge of the cover: a row of
// cream rounded bars that wrap over the top like twin-loop wire.
function coil() {
  const xs = [150, 192, 234, 276, 318, 360];
  const bars = xs
    .map(
      (x) =>
        `<rect x="${x - 7}" y="22" width="14" height="60" rx="7" fill="${CREAM}"/>` +
        `<circle cx="${x}" cy="96" r="6" fill="#2b54b4"/>`,
    )
    .join("");
  return `<g>${bars}</g>`;
}

// `bleed` = full-canvas square background for maskable icons (the OS supplies
// the rounded mask); otherwise a rounded "cover" with transparent corners.
function buildSvg({ bleed = false } = {}) {
  const defs = `
    <linearGradient id="cover" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#4f80ec"/>
      <stop offset="1" stop-color="#3b6fe0"/>
    </linearGradient>`;

  const cover = bleed
    ? `<rect x="0" y="0" width="512" height="512" fill="url(#cover)"/>`
    : `<rect x="32" y="32" width="448" height="448" rx="104" fill="url(#cover)"/>
       <rect x="66" y="66" width="380" height="380" rx="80" fill="none" stroke="#ffffff" stroke-opacity="0.16" stroke-width="6"/>`;

  // Maskable keeps the artwork inside the central safe zone (~80%) so the
  // coil and paw survive an aggressive circular crop.
  const content = bleed
    ? `<g transform="translate(256 256) scale(0.8) translate(-256 -262)">${coil()}${paw()}</g>`
    : `${coil()}${paw()}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="Cat Diary">
  <defs>${defs}</defs>
  ${cover}
  ${content}
</svg>`;
}

// --- ICO assembly (PNG-encoded entries, supported by all modern browsers) ---

function buildIco(pngs) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(pngs.length, 4);

  const entries = [];
  let offset = 6 + pngs.length * 16;
  for (const { size, data } of pngs) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // width (0 => 256)
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // height
    entry.writeUInt8(0, 2); // palette
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // colour planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;
    entries.push(entry);
  }
  return Buffer.concat([header, ...entries, ...pngs.map((p) => p.data)]);
}

// --- render -----------------------------------------------------------------

const master = buildSvg();
const maskable = buildSvg({ bleed: true });

const png = (svg, size) =>
  sharp(Buffer.from(svg)).resize(size, size).png().toBuffer();

async function out(path, data) {
  const full = join(root, path);
  await mkdir(dirname(full), { recursive: true });
  await writeFile(full, data);
  console.log("wrote", path);
}

// SVG favicon / app icon (crisp at any size).
await out("app/icon.svg", master);

// Apple touch icon.
await out("app/apple-icon.png", await png(master, 180));

// PWA icons (regular + maskable, the two sizes the manifest requires).
await out("public/icons/icon-192.png", await png(master, 192));
await out("public/icons/icon-512.png", await png(master, 512));
await out("public/icons/maskable-192.png", await png(maskable, 192));
await out("public/icons/maskable-512.png", await png(maskable, 512));

// Multi-resolution favicon.ico (16/32/48).
const icoSizes = [16, 32, 48];
const icoPngs = await Promise.all(
  icoSizes.map(async (size) => ({ size, data: await png(master, size) })),
);
await out("app/favicon.ico", buildIco(icoPngs));

console.log("done");
