import sharp from 'sharp';
import { readFileSync } from 'fs';

const faviconSvg = readFileSync('public/favicon.svg');
const socialSvg = readFileSync('public/social-card.svg');

// Generate PWA icons from favicon SVG
await sharp(faviconSvg)
  .resize(192, 192)
  .png()
  .toFile('public/icons/icon-192.png');

console.log('✓ icon-192.png');

await sharp(faviconSvg)
  .resize(512, 512)
  .png()
  .toFile('public/icons/icon-512.png');

console.log('✓ icon-512.png');

// Generate social card PNG from SVG
await sharp(socialSvg)
  .resize(1200, 630)
  .png()
  .toFile('public/social-card.png');

console.log('✓ social-card.png');

console.log('Done — all rasterized assets generated.');
