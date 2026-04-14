// Generates icon-192.png and icon-512.png without any external dependencies.
// NEXIUM brand: purple gradient background with a gold "N" mark.
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

// Linear interpolation between two RGB colors
function lerp(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

function makePNG(size) {
  // NEXIUM palette
  const BG_TOP = [124, 58, 237];   // violet-600 #7c3aed
  const BG_MID = [107, 33, 168];   // purple-800 #6b21a8
  const BG_BOT = [76, 29, 149];    // violet-900 #4c1d95
  const GOLD_LIGHT = [253, 230, 138]; // amber-200 #fde68a
  const GOLD_MID   = [251, 191, 36];  // amber-400 #fbbf24
  const GOLD_DEEP  = [217, 119, 6];   // amber-600 #d97706

  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.215; // rounded corner radius (matches SVG rx=110/512)

  // "N" geometry — big gold N occupying the middle 50%
  const nW = size * 0.44;
  const nH = size * 0.5;
  const nLeft = cx - nW / 2;
  const nRight = cx + nW / 2;
  const nTop = cy - nH / 2;
  const nBot = cy + nH / 2;
  const stroke = size * 0.095;

  // Distance from point to line segment (for the diagonal of N)
  function distSeg(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const len2 = dx * dx + dy * dy;
    let t = ((px - x1) * dx + (py - y1) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    const ix = x1 + t * dx, iy = y1 + t * dy;
    return Math.hypot(px - ix, py - iy);
  }

  // Rounded rectangle mask — returns true if pixel is inside the rounded square
  function insideRounded(x, y) {
    if (x >= radius && x <= size - radius) return y >= 0 && y <= size;
    if (y >= radius && y <= size - radius) return x >= 0 && x <= size;
    // Corners
    const corners = [
      [radius, radius],
      [size - radius, radius],
      [radius, size - radius],
      [size - radius, size - radius],
    ];
    for (const [cxr, cyr] of corners) {
      const inCornerBox = Math.abs(x - cxr) < radius && Math.abs(y - cyr) < radius;
      if (inCornerBox) {
        return Math.hypot(x - cxr, y - cyr) <= radius;
      }
    }
    return true;
  }

  // Is pixel inside the N shape?
  function insideN(x, y) {
    // Two vertical bars
    if (y >= nTop && y <= nBot) {
      if (Math.abs(x - nLeft) < stroke / 2) return true;
      if (Math.abs(x - nRight) < stroke / 2) return true;
    }
    // Diagonal from top-left to bottom-right
    if (y >= nTop && y <= nBot && x >= nLeft && x <= nRight) {
      if (distSeg(x, y, nLeft, nTop, nRight, nBot) < stroke / 2) return true;
    }
    return false;
  }

  // Background gradient (vertical)
  function bgColor(y) {
    const t = y / size;
    if (t < 0.5) return lerp(BG_TOP, BG_MID, t * 2);
    return lerp(BG_MID, BG_BOT, (t - 0.5) * 2);
  }

  // Gold gradient across N (top-light → bottom-deep)
  function goldColor(y) {
    const t = Math.max(0, Math.min(1, (y - nTop) / nH));
    if (t < 0.5) return lerp(GOLD_LIGHT, GOLD_MID, t * 2);
    return lerp(GOLD_MID, GOLD_DEEP, (t - 0.5) * 2);
  }

  const rowSize = 1 + size * 3;
  const raw = Buffer.alloc(size * rowSize);

  for (let y = 0; y < size; y++) {
    raw[y * rowSize] = 0; // filter none
    for (let x = 0; x < size; x++) {
      let r, g, b;
      if (!insideRounded(x, y)) {
        // Outside the rounded square: transparent-equivalent (we use RGB without alpha, so paint deep violet)
        [r, g, b] = BG_BOT;
      } else if (insideN(x, y)) {
        [r, g, b] = goldColor(y);
      } else {
        [r, g, b] = bgColor(y);
      }
      const i = y * rowSize + 1 + x * 3;
      raw[i] = r;
      raw[i + 1] = g;
      raw[i + 2] = b;
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
console.log('✓ NEXIUM icons regenerated: public/icon-192.png and public/icon-512.png');
