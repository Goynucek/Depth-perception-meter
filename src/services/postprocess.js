const sharp = require('sharp');

async function postprocessDepth(depthData, width, height) {
  let min = Infinity;
  let max = -Infinity;

  for (let i = 0; i < depthData.length; i++) {
    if (depthData[i] < min) min = depthData[i];
    if (depthData[i] > max) max = depthData[i];
  }

  const range = max - min || 1;
  const grayData = new Uint8Array(width * height);

  for (let i = 0; i < depthData.length; i++) {
    grayData[i] = Math.round(((depthData[i] - min) / range) * 255);
  }

  const pngBuffer = await sharp(Buffer.from(grayData), {
    raw: { width, height, channels: 1 },
  })
    .png()
    .toBuffer();

  return {
    pngBuffer,
    base64: pngBuffer.toString('base64'),
  };
}

module.exports = { postprocessDepth };
