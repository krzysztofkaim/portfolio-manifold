import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';

const faviconSvg = readFileSync('public/favicon.svg');
const socialSvg = readFileSync('public/social-card.svg');
const icoSizes = [16, 32, 48];

function createIcoFromPngs(images: readonly { data: Buffer; size: number }[]): Buffer {
  const headerSize = 6;
  const entrySize = 16;
  const directorySize = headerSize + images.length * entrySize;
  const totalSize = directorySize + images.reduce((sum, image) => sum + image.data.length, 0);
  const ico = Buffer.alloc(totalSize);

  ico.writeUInt16LE(0, 0);
  ico.writeUInt16LE(1, 2);
  ico.writeUInt16LE(images.length, 4);

  let imageOffset = directorySize;
  for (const [index, image] of images.entries()) {
    const entryOffset = headerSize + index * entrySize;
    ico.writeUInt8(image.size >= 256 ? 0 : image.size, entryOffset);
    ico.writeUInt8(image.size >= 256 ? 0 : image.size, entryOffset + 1);
    ico.writeUInt8(0, entryOffset + 2);
    ico.writeUInt8(0, entryOffset + 3);
    ico.writeUInt16LE(1, entryOffset + 4);
    ico.writeUInt16LE(32, entryOffset + 6);
    ico.writeUInt32LE(image.data.length, entryOffset + 8);
    ico.writeUInt32LE(imageOffset, entryOffset + 12);
    image.data.copy(ico, imageOffset);
    imageOffset += image.data.length;
  }

  return ico;
}

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

const faviconIcoImages = await Promise.all(
  icoSizes.map(async (size) => ({
    size,
    data: await sharp(faviconSvg)
      .resize(size, size)
      .png()
      .toBuffer()
  }))
);

writeFileSync('public/favicon.ico', createIcoFromPngs(faviconIcoImages));

console.log('✓ favicon.ico');

// Generate social card PNG from SVG
await sharp(socialSvg)
  .resize(1200, 630)
  .png()
  .toFile('public/social-card.png');

console.log('✓ social-card.png');

console.log('Done — all rasterized assets generated.');
