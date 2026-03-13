// Generates icon-192.png and icon-512.png without any external dependencies
import { deflateSync } from 'zlib';
import { writeFileSync } from 'fs';

function uint32BE(n) {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n);
  return b;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) {
    c ^= byte;
    for (let i = 0; i < 8; i++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const d = Buffer.isBuffer(data) ? data : Buffer.from(data);
  const crc = uint32BE(crc32(Buffer.concat([t, d])));
  return Buffer.concat([uint32BE(d.length), t, d, crc]);
}

function makePNG(size) {
  // SubmitIt blue #1d4ed8 = 29,78,216
  const BG = [29, 78, 216];
  const FG = [255, 255, 255];

  // Paint solid blue, then draw a white "S" in the center
  const px = (x, y) => {
    // Simple "S" shape using a grid: roughly 40% width/height of the icon
    const cx = size / 2, cy = size / 2;
    const w = size * 0.22, h = size * 0.38;
    const t = size * 0.055; // stroke thickness
    const rx = (x - cx) / w, ry = (y - cy) / h;
    // Top bar
    if (Math.abs(ry + 0.85) < 0.15 && rx > -1 && rx < 1) return true;
    // Bottom bar
    if (Math.abs(ry - 0.85) < 0.15 && rx > -1 && rx < 1) return true;
    // Middle bar
    if (Math.abs(ry) < 0.15 && rx > -1 && rx < 1) return true;
    // Top-left vertical
    if (rx < -0.7 && ry > -1 && ry < 0) return true;
    // Bottom-right vertical
    if (rx > 0.7 && ry > 0 && ry < 1) return true;
    return false;
  };

  const rowSize = 1 + size * 3;
  const raw = Buffer.alloc(size * rowSize);
  for (let y = 0; y < size; y++) {
    raw[y * rowSize] = 0; // filter none
    for (let x = 0; x < size; x++) {
      const [r, g, b] = px(x, y) ? FG : BG;
      raw[y * rowSize + 1 + x * 3] = r;
      raw[y * rowSize + 1 + x * 3 + 1] = g;
      raw[y * rowSize + 1 + x * 3 + 2] = b;
    }
  }

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB

  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

writeFileSync('public/icon-192.png', makePNG(192));
writeFileSync('public/icon-512.png', makePNG(512));
console.log('✓ public/icon-192.png and public/icon-512.png created');
