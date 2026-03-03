/**
 * Convert build/icon.png → build/icon.ico
 * ICO format wrapping a PNG image (supported by Windows Vista+).
 * Run: node scripts/png-to-ico.js
 */
const fs = require("fs");
const path = require("path");

const pngPath = path.join(__dirname, "..", "build", "icon.png");
const icoPath = path.join(__dirname, "..", "build", "icon.ico");

const png = fs.readFileSync(pngPath);

// Read PNG dimensions from IHDR chunk (bytes 16-23)
const width = png.readUInt32BE(16);
const height = png.readUInt32BE(20);

// ICO header (6 bytes)
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);     // reserved
header.writeUInt16LE(1, 2);     // type = 1 (ICO)
header.writeUInt16LE(1, 4);     // number of images = 1

// ICO directory entry (16 bytes)
const entry = Buffer.alloc(16);
entry[0] = width >= 256 ? 0 : width;    // width (0 = 256)
entry[1] = height >= 256 ? 0 : height;  // height (0 = 256)
entry[2] = 0;                            // color palette
entry[3] = 0;                            // reserved
entry.writeUInt16LE(1, 4);              // color planes
entry.writeUInt16LE(32, 6);             // bits per pixel
entry.writeUInt32LE(png.length, 8);     // size of PNG data
entry.writeUInt32LE(6 + 16, 12);        // offset to PNG data (after header + 1 entry)

const ico = Buffer.concat([header, entry, png]);
fs.writeFileSync(icoPath, ico);
console.log(`✓ ICO written to ${icoPath} (${ico.length} bytes, ${width}x${height})`);
