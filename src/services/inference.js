const fs = require('fs');
const ort = require('onnxruntime-node');
const config = require('../config');
const { AppError } = require('../middleware/errorHandler');

let session = null;

async function loadModel() {
  if (!fs.existsSync(config.modelPath)) {
    throw new AppError(
      503,
      `Model dosyası bulunamadı: ${config.modelPath}. Lütfen model-small.onnx dosyasını indirin.`
    );
  }

  session = await ort.InferenceSession.create(config.modelPath, {
    executionProviders: ['cpu'],
    graphOptimizationLevel: 'all',
  });

  const dummy = new ort.Tensor(
    'float32',
    new Float32Array(1 * 3 * config.inputHeight * config.inputWidth),
    [1, 3, config.inputHeight, config.inputWidth]
  );
  await session.run({ [session.inputNames[0]]: dummy });

  return session;
}

function isModelLoaded() {
  return session !== null;
}

async function runInference(inputTensor) {
  if (!session) {
    throw new AppError(503, 'Model henüz yüklenmedi');
  }

  try {
    const feeds = { [session.inputNames[0]]: inputTensor };
    const results = await session.run(feeds);
    const output = results[session.outputNames[0]];
    const dims = output.dims;

    let height;
    let width;

    if (dims.length === 4) {
      height = dims[2];
      width = dims[3];
    } else if (dims.length === 3) {
      height = dims[1];
      width = dims[2];
    } else {
      throw new Error(`Beklenmeyen çıktı boyutu: [${dims.join(', ')}]`);
    }

    return {
      data: output.data,
      width,
      height,
    };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, `Inference hatası: ${err.message}`);
  }
}

module.exports = { loadModel, isModelLoaded, runInference };
