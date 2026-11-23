// Draws every TV Edition icon from one vector mark (a mint play mark on a dark
// rounded square), so Samsung, LG and Android match and nothing is upscaled:
//   apps/tv/public/icon.png, large-icon.png   LG sizes (80, 130) and the shared default
//   apps/tv/tizen/icon.png                    Samsung, 512 px (tizen-package.mjs)
//   tv-shell/tvapp/res/…                      Android launcher icons and Fire TV banner
//                                             (copied by tv-shell/scripts/bundle-tv-app.sh)
//   node apps/tv/make-icons.mjs
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '../../tv-shell/tvapp/res');
const BG = '#101d16';
const MINT = '#8ee5c2';
const play = 'M39 31 L100 64.5 L39 98 Z'; // same proportions as icon.png (130 px)

const square = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 130 130">
<rect width="130" height="130" rx="26" fill="${BG}"/><path d="${play}" fill="${MINT}"/></svg>`;
const round = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 130 130">
<circle cx="65" cy="65" r="65" fill="${BG}"/><path d="M45 37 L96 65 L45 93 Z" fill="${MINT}"/></svg>`;
// Adaptive icon foreground: 108 dp canvas, mark inside the 66 dp safe zone.
const foreground = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108">
<path d="M42 35 L75 54 L42 73 Z" fill="${MINT}"/></svg>`;
const banner = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180">
<rect width="320" height="180" fill="${BG}"/>
<path d="M36 62 L86 90 L36 118 Z" fill="${MINT}"/>
<text x="108" y="88" font-family="Helvetica, Arial, sans-serif" font-size="34" font-weight="700" fill="#eef3f1">IPTVnator</text>
<text x="110" y="118" font-family="Helvetica, Arial, sans-serif" font-size="18" letter-spacing="4" fill="${MINT}">TV EDITION</text></svg>`;

async function png(svg, size, file, root = out) {
    const path = join(root, file);
    mkdirSync(dirname(path), { recursive: true });
    const [w, h] = Array.isArray(size) ? size : [size, size];
    await sharp(Buffer.from(svg), { density: 600 })
        .resize(w, h)
        .png()
        .toFile(path);
}

const densities = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
for (const [name, size] of Object.entries(densities)) {
    await png(square, size, `mipmap-${name}/ic_launcher.png`);
    await png(round, size, `mipmap-${name}/ic_launcher_round.png`);
}
await png(foreground, 432, 'drawable-nodpi/iptvnator_launcher_foreground.png');
await png(banner, [320, 180], 'drawable/banner.png');
await png(square, 80, 'public/icon.png', here);
await png(square, 130, 'public/large-icon.png', here);
await png(square, 512, 'tizen/icon.png', here);
console.log('TV Edition icons written');
