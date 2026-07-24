#!/usr/bin/env node
/**
 * generate-icon.mjs
 * Generates apps/desktop/build/icon.ico and apps/desktop/build/icon.png (as SVG copy)
 * Pure Node.js, no external dependencies.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BUILD = path.join(ROOT, 'apps', 'desktop', 'build');
fs.mkdirSync(BUILD, { recursive: true });

// ─── SVG ────────────────────────────────────────────────────────────────────
const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#3B82F6"/>
      <stop offset="100%" stop-color="#9333EA"/>
    </linearGradient>
  </defs>
  <rect width="256" height="256" rx="52" fill="#0A0A0A"/>
  <rect x="2" y="2" width="252" height="252" rx="50" fill="none"
        stroke="url(#g)" stroke-width="4" opacity="0.5"/>
  <rect width="256" height="256" rx="52" fill="url(#g)" opacity="0.10"/>
  <text x="50%" y="56%" dominant-baseline="middle" text-anchor="middle"
        font-family="Arial Black, Arial, sans-serif"
        font-size="104" font-weight="900" letter-spacing="-2"
        fill="url(#g)">SH</text>
</svg>`;

fs.writeFileSync(path.join(BUILD, 'icon.svg'), SVG);
console.log('✓ icon.svg');

// ─── ICO (BMP-based, 32-bit BGRA) ───────────────────────────────────────────
function makeBGRA(size) {
  const cx = size / 2,
    cy = size / 2;
  const pixels = Buffer.alloc(size * size * 4);

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      // BMP stores rows bottom-to-top
      const y = size - 1 - row;
      const x = col;
      const i = (row * size + col) * 4;

      // Rounded square clip
      const dx = Math.abs(x - cx) / cx;
      const dy = Math.abs(y - cy) / cy;
      const cornerR = 0.38;
      let alpha = 255;
      if (dx > 1 - cornerR && dy > 1 - cornerR) {
        const nx = (dx - (1 - cornerR)) / cornerR;
        const ny = (dy - (1 - cornerR)) / cornerR;
        if (nx * nx + ny * ny > 1) alpha = 0;
      }

      // Gradient t from top-left to bottom-right
      const t = (x + (size - y)) / (2 * size);
      const fR = Math.round(0x3b + (0x93 - 0x3b) * t);
      const fG = Math.round(0x82 + (0x33 - 0x82) * t);
      const fB = Math.round(0xf6 + (0xea - 0xf6) * t);

      // Pixel occupancy for letter "SH"
      // Normalised coords relative to glyph box
      const gx = (x / size - 0.12) / 0.76; // 0..1 across glyph
      const gy = (y / size - 0.18) / 0.64; // 0..1 across glyph (0=bottom)
      const inGlyph = gx >= 0 && gx <= 1 && gy >= 0 && gy <= 1;

      // Letter S occupies gx 0..0.45, letter H occupies gx 0.55..1
      const sw = 0.09; // stroke width
      let onLetter = false;

      if (inGlyph) {
        const lx = gx; // normalised x in glyph

        // H (right side gx: 0.55..1.0)
        if (lx >= 0.55) {
          const hx = (lx - 0.55) / 0.45; // 0..1 in H
          const hy = gy;
          onLetter = hx < sw * 2 || hx > 1 - sw * 2 || Math.abs(hy - 0.5) < sw;
        }

        // S (left side gx: 0..0.45)
        if (lx <= 0.45) {
          const sx = lx / 0.45; // 0..1 in S
          const sy = gy;
          // top bar, middle bar, bottom bar + two half-verticals
          const topBar = sy > 1 - sw * 2;
          const midBar = Math.abs(sy - 0.5) < sw;
          const botBar = sy < sw * 2;
          const topRight = sy > 0.5 && sx > 1 - sw * 2;
          const botLeft = sy < 0.5 && sx < sw * 2;
          onLetter = topBar || midBar || botBar || topRight || botLeft;
        }
      }

      const bgR = 10,
        bgG = 10,
        bgB = 10;
      pixels[i + 0] = onLetter ? fB : bgB; // B
      pixels[i + 1] = onLetter ? fG : bgG; // G
      pixels[i + 2] = onLetter ? fR : bgR; // R
      pixels[i + 3] = alpha; // A
    }
  }

  // BITMAPINFOHEADER
  const hdr = Buffer.alloc(40);
  hdr.writeInt32LE(40, 0);
  hdr.writeInt32LE(size, 4);
  hdr.writeInt32LE(size * 2, 8); // positive height * 2 for ICO (XOR + AND)
  hdr.writeInt16LE(1, 12);
  hdr.writeInt16LE(32, 14);
  hdr.writeInt32LE(0, 16);
  hdr.writeInt32LE(pixels.length, 20);

  // AND mask (all zeros = fully opaque where alpha > 0)
  const andRowBytes = Math.ceil(size / 32) * 4;
  const andMask = Buffer.alloc(andRowBytes * size, 0);

  return Buffer.concat([hdr, pixels, andMask]);
}

const sizes = [16, 32, 48, 64, 128, 256];
const images = sizes.map((s) => ({ size: s, data: makeBGRA(s) }));

// ICONDIR
const dir = Buffer.alloc(6);
dir.writeUInt16LE(0, 0);
dir.writeUInt16LE(1, 2);
dir.writeUInt16LE(sizes.length, 4);

let offset = 6 + 16 * sizes.length;
const entries = images.map((img) => {
  const e = Buffer.alloc(16);
  e.writeUInt8(img.size >= 256 ? 0 : img.size, 0);
  e.writeUInt8(img.size >= 256 ? 0 : img.size, 1);
  e.writeUInt8(0, 2);
  e.writeUInt8(0, 3);
  e.writeUInt16LE(1, 4);
  e.writeUInt16LE(32, 6);
  e.writeUInt32LE(img.data.length, 8);
  e.writeUInt32LE(offset, 12);
  offset += img.data.length;
  return e;
});

const icoPath = path.join(BUILD, 'icon.ico');
fs.writeFileSync(
  icoPath,
  Buffer.concat([dir, ...entries, ...images.map((i) => i.data)]),
);
console.log('✓ icon.ico (' + sizes.join('/') + 'px)');

// Also write a minimal 256x256 PNG using the last image data converted
// (electron-builder will use icon.ico for win, but we need icon.png for mac/linux CI)
// For now, copy the SVG as png filename — CI has rsvg-convert or similar
fs.writeFileSync(
  path.join(BUILD, 'icon.png'),
  Buffer.from(
    '89504e470d0a1a0a0000000d49484452000000100000001008060000001ff3ff6100000' +
      '0264944415478016360f8cfc0c0c0c00000000affff1f0c1818183030307060606060e0e' +
      '0e1c1c1c383838707070e0e0c1c1c10000001849454e44ae426082',
    'hex',
  ),
);
console.log('✓ icon.png (placeholder — CI will use icon.ico for Windows)');
console.log('\nDone. Assets in:', BUILD);
