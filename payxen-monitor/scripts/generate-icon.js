/**
 * Generate a 256×256 PNG icon for electron-builder.
 * electron-builder will auto-convert PNG → ICO on Windows.
 * Run: node scripts/generate-icon.js
 */
const fs = require("fs");
const path = require("path");

// Minimal PNG encoder — creates a valid 256×256 RGBA PNG
function createPng(width, height, pixels) {
  // Helper: CRC32
  const crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crcTable[n] = c;
  }
  function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }

  // Adler32
  function adler32(buf) {
    let a = 1, b = 0;
    for (let i = 0; i < buf.length; i++) {
      a = (a + buf[i]) % 65521;
      b = (b + a) % 65521;
    }
    return ((b << 16) | a) >>> 0;
  }

  // Raw image data with filter byte (0 = None) per row
  const rawLen = height * (1 + width * 4);
  const raw = Buffer.alloc(rawLen);
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 4)] = 0; // filter = None
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4;
      const dstIdx = y * (1 + width * 4) + 1 + x * 4;
      raw[dstIdx] = pixels[srcIdx];
      raw[dstIdx + 1] = pixels[srcIdx + 1];
      raw[dstIdx + 2] = pixels[srcIdx + 2];
      raw[dstIdx + 3] = pixels[srcIdx + 3];
    }
  }

  // Deflate (store blocks — no compression, simple but valid)
  const blocks = [];
  let offset = 0;
  while (offset < raw.length) {
    const remaining = raw.length - offset;
    const blockLen = Math.min(remaining, 65535);
    const isLast = offset + blockLen >= raw.length;
    const header = Buffer.alloc(5);
    header[0] = isLast ? 1 : 0;
    header[1] = blockLen & 0xff;
    header[2] = (blockLen >>> 8) & 0xff;
    header[3] = (~blockLen) & 0xff;
    header[4] = ((~blockLen) >>> 8) & 0xff;
    blocks.push(header, raw.slice(offset, offset + blockLen));
    offset += blockLen;
  }
  const deflated = Buffer.concat(blocks);
  const adler = adler32(raw);

  // zlib wrapper: CMF + FLG + deflated + adler32
  const zlibHeader = Buffer.from([0x78, 0x01]); // CMF=deflate, FLG=no dict
  const zlibFooter = Buffer.alloc(4);
  zlibFooter.writeUInt32BE(adler, 0);
  const compressedData = Buffer.concat([zlibHeader, deflated, zlibFooter]);

  // PNG chunks
  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeAndData = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(typeAndData), 0);
    return Buffer.concat([len, typeAndData, crc]);
  }

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const chunks = [
    signature,
    makeChunk("IHDR", ihdr),
    makeChunk("IDAT", compressedData),
    makeChunk("IEND", Buffer.alloc(0)),
  ];
  return Buffer.concat(chunks);
}

// Draw the PayXen icon: dark rounded-rect background with "P" letter
const SIZE = 256;
const pixels = Buffer.alloc(SIZE * SIZE * 4);

// Background color: #09090b
const bgR = 9, bgG = 9, bgB = 11;
// Letter color: #c4b5fd (violet)
const fgR = 196, fgG = 181, fgB = 253;
// Accent: #a78bfa
const acR = 167, acG = 139, acB = 250;

const cornerRadius = 48;

function inRoundedRect(x, y, w, h, r) {
  if (x >= r && x < w - r) return y >= 0 && y < h;
  if (y >= r && y < h - r) return x >= 0 && x < w;
  // Corners
  let cx, cy;
  if (x < r && y < r) { cx = r; cy = r; }
  else if (x >= w - r && y < r) { cx = w - r; cy = r; }
  else if (x < r && y >= h - r) { cx = r; cy = h - r; }
  else if (x >= w - r && y >= h - r) { cx = w - r; cy = h - r; }
  else return false;
  const dx = x - cx, dy = y - cy;
  return dx * dx + dy * dy <= r * r;
}

// Simple bitmap font for "P" — draw a bold P centered
function drawP(pixels, size) {
  const cx = size / 2;
  const cy = size * 0.42;
  const letterH = size * 0.5;
  const letterW = size * 0.35;
  const strokeW = size * 0.07;
  const bowlR = letterW * 0.55;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let isLetter = false;

      // Vertical stem
      const stemX = cx - letterW * 0.4;
      const stemTop = cy - letterH * 0.5;
      const stemBot = cy + letterH * 0.5;
      if (x >= stemX - strokeW && x <= stemX + strokeW && y >= stemTop && y <= stemBot) {
        isLetter = true;
      }

      // Top horizontal bar
      if (y >= stemTop && y <= stemTop + strokeW * 2 && x >= stemX - strokeW && x <= stemX + letterW * 0.6) {
        isLetter = true;
      }

      // Bowl (arc)
      const bowlCx = stemX + letterW * 0.3;
      const bowlCy = stemTop + bowlR * 0.95;
      const dx = x - bowlCx;
      const dy = y - bowlCy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dx >= 0 && dist >= bowlR - strokeW && dist <= bowlR + strokeW && y >= stemTop && y <= bowlCy + bowlR * 0.3) {
        isLetter = true;
      }

      // Middle horizontal (closes the bowl)
      const midY = bowlCy + bowlR * 0.25;
      if (y >= midY - strokeW && y <= midY + strokeW && x >= stemX - strokeW && x <= stemX + letterW * 0.6) {
        isLetter = true;
      }

      if (isLetter) {
        const idx = (y * size + x) * 4;
        pixels[idx] = fgR;
        pixels[idx + 1] = fgG;
        pixels[idx + 2] = fgB;
        pixels[idx + 3] = 255;
      }
    }
  }
}

// Fill background
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const idx = (y * SIZE + x) * 4;
    if (inRoundedRect(x, y, SIZE, SIZE, cornerRadius)) {
      pixels[idx] = bgR;
      pixels[idx + 1] = bgG;
      pixels[idx + 2] = bgB;
      pixels[idx + 3] = 255;
    } else {
      pixels[idx + 3] = 0; // transparent
    }
  }
}

// Draw letter
drawP(pixels, SIZE);

// Add small "PayXen" text indicator at bottom (simple pixel dots won't look great,
// but at small icon sizes it's the "P" that matters)

const png = createPng(SIZE, SIZE, pixels);
const outDir = path.join(__dirname, "..", "build");
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, "icon.png");
fs.writeFileSync(outPath, png);
console.log(`✓ Icon written to ${outPath} (${png.length} bytes)`);
