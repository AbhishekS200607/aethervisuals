const sharp = require('sharp');
const TextToSVG = require('text-to-svg');
const path = require('path');

const textToSVG = TextToSVG.loadSync(path.join(__dirname, '../assets/Inter-Regular.ttf'));

async function applyWatermark(imageBuffer, lines = [process.env.WATERMARK_TEXT || 'PREVIEW']) {
  const { width, height } = await sharp(imageBuffer).metadata();

  const fontSize = Math.max(14, Math.floor(width / 18));
  const lineHeight = fontSize * 1.6;
  const fill = 'rgba(255,255,255,0.28)';

  // Build path-based text rows (no system fonts needed)
  const textRows = [];
  for (let y = -height; y < height * 2; y += lineHeight * (lines.length + 2)) {
    lines.forEach((line, i) => {
      const svgPath = textToSVG.getPath(line, {
        x: width / 2,
        y: y + i * lineHeight,
        fontSize,
        anchor: 'center top',
        attributes: { fill },
      });
      textRows.push(svgPath);
    });
  }

  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <g transform="rotate(-25, ${width / 2}, ${height / 2})">
      ${textRows.join('\n')}
    </g>
  </svg>`;

  return sharp(imageBuffer)
    .composite([{ input: Buffer.from(svg), gravity: 'center' }])
    .webp({ quality: 82 })
    .toBuffer();
}

module.exports = { applyWatermark };
