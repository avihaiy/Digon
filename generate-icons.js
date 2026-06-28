import sharp from 'sharp';
import fs from 'fs';

const width = 512;
const height = 512;

const text = "איזור אישי";

const svgText = `
  <svg width="${width}" height="${height}">
    <rect x="0" y="380" width="512" height="132" fill="rgba(255, 255, 255, 0.90)" />
    <text x="256" y="470" font-family="Arial, sans-serif" font-size="75" font-weight="bold" fill="#1a1a2e" text-anchor="middle">${text}</text>
  </svg>
`;

async function main() {
  try {
    await sharp('public/brit-shalom-logo.jpeg')
      .resize(512, 512, { fit: 'cover' })
      .composite([
        { input: Buffer.from(svgText), top: 0, left: 0 }
      ])
      .png()
      .toFile('public/pwa-personal-512x512.png');

    await sharp('public/pwa-personal-512x512.png')
      .resize(192, 192)
      .toFile('public/pwa-personal-192x192.png');
      
    console.log("Successfully generated personal icons");
  } catch (err) {
    console.error("Error generating images:", err);
  }
}

main();
