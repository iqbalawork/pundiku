import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'assets', 'img');

const LIME = [198, 244, 50];
const INK = [14, 17, 22];
const VIOLET = [124, 92, 255];

function sdRoundRect(px, py, x, y, w, h, r) {
  const qx = Math.abs(px - (x + w / 2)) - (w / 2 - r);
  const qy = Math.abs(py - (y + h / 2)) - (h / 2 - r);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}

function sample(u, v, opt) {
  if (!opt.fullBleed && sdRoundRect(u, v, 0, 0, 1, 1, 0.25) > 0) return null;
  const g = opt.glyphScale;
  const x = 0.5 + (u - 0.5) / g;
  const y = 0.5 + (v - 0.5) / g;
  if (sdRoundRect(x, y, 0.3, 0.21, 0.13, 0.58, 0.065) <= 0) return INK;
  const d = Math.hypot(x - 0.52, y - 0.415);
  if (d <= 0.205 && d >= 0.085) return INK;
  if (Math.hypot(x - 0.7, y - 0.71) <= 0.085) return VIOLET;
  return LIME;
}

const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function render(size, opt) {
  const ss = 4;
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let py = 0; py < size; py++) {
    const rowStart = py * (size * 4 + 1);
    raw[rowStart] = 0;
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const c = sample((px + (sx + 0.5) / ss) / size, (py + (sy + 0.5) / ss) / size, opt);
          if (!c) continue;
          r += c[0]; g += c[1]; b += c[2]; a += 1;
        }
      }
      const i = rowStart + 1 + px * 4;
      raw[i] = a ? Math.round(r / a) : 0;
      raw[i + 1] = a ? Math.round(g / a) : 0;
      raw[i + 2] = a ? Math.round(b / a) : 0;
      raw[i + 3] = Math.round((a / (ss * ss)) * 255);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

const targets = [
  { file: 'icon-192.png', size: 192, fullBleed: false, glyphScale: 1 },
  { file: 'icon-512.png', size: 512, fullBleed: false, glyphScale: 1 },
  { file: 'icon-maskable-512.png', size: 512, fullBleed: true, glyphScale: 0.78 },
  { file: 'apple-touch-icon.png', size: 180, fullBleed: true, glyphScale: 0.88 },
  { file: 'favicon-32.png', size: 32, fullBleed: false, glyphScale: 1 }
];

fs.mkdirSync(outDir, { recursive: true });
for (const t of targets) {
  fs.writeFileSync(path.join(outDir, t.file), render(t.size, t));
  console.log(`${t.file} (${t.size}px)`);
}
