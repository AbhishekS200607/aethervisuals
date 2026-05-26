const sharp = require('sharp');

async function applyWatermark(imageBuffer, lines = [process.env.WATERMARK_TEXT || 'PREVIEW']) {
  const { width, height } = await sharp(imageBuffer).metadata();

  const fontSize = Math.max(14, Math.floor(width / 18));
  const lineHeight = fontSize * 1.6;

  // Build repeated diagonal tiles across the image
  const tileW = width;
  const tileH = height;

  const textRows = [];
  // Repeat watermark rows across the image
  for (let y = -tileH; y < tileH * 2; y += lineHeight * (lines.length + 2)) {
    lines.forEach((line, i) => {
      textRows.push(`<text x="50%" y="${y + i * lineHeight}"
        text-anchor="middle"
        fill="rgba(255,255,255,0.28)"
        font-size="${fontSize}"
        font-family="Arial, sans-serif"
        font-weight="bold"
        letter-spacing="2"
      >${escXml(line)}</text>`);
    });
  }

  const svg = `
    <svg width="${tileW}" height="${tileH}" xmlns="http://www.w3.org/2000/svg">
      <g transform="rotate(-25, ${tileW / 2}, ${tileH / 2})">
        ${textRows.join('\n')}
      </g>
    </svg>`;

  return sharp(imageBuffer)
    .composite([{ input: Buffer.from(svg), gravity: 'center' }])
    .webp({ quality: 82 })
    .toBuffer();
}

function escXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = { applyWatermark };
