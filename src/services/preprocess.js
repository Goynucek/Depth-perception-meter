const sharp = require('sharp');
const ort = require('onnxruntime-node');
const config = require('../config');
const { AppError } = require('../middleware/errorHandler');

async function preprocessImage(imageBuffer) {
  const { inputWidth, inputHeight, mean, std } = config;
  const pixelCount = inputWidth * inputHeight;

  let rawData;
  try {
    const result = await sharp(imageBuffer, { failOn: 'error' })
      .resize(inputWidth, inputHeight, { fit: 'cover' })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    rawData = result.data;
  } catch {
    throw new AppError(400, 'Geçersiz görüntü dosyası');
  }

  const floatData = new Float32Array(3 * pixelCount);

  for (let i = 0; i < pixelCount; i++) {
    const r = rawData[i * 3] / 255;
    const g = rawData[i * 3 + 1] / 255;
    const b = rawData[i * 3 + 2] / 255;

    floatData[i] = (r - mean[0]) / std[0];
    floatData[pixelCount + i] = (g - mean[1]) / std[1];
    floatData[2 * pixelCount + i] = (b - mean[2]) / std[2];
  }

  return new ort.Tensor('float32', floatData, [1, 3, inputHeight, inputWidth]);
}

module.exports = { preprocessImage };
