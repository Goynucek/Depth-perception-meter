const path = require('path');

module.exports = {
  port: parseInt(process.env.PORT, 10) || 3000,
  modelPath: process.env.MODEL_PATH || path.join(__dirname, '..', 'models', 'model-small.onnx'),
  inputWidth: 256,
  inputHeight: 256,
  mean: [0.485, 0.456, 0.406],
  std: [0.229, 0.224, 0.225],
  maxFileSize: 10 * 1024 * 1024,
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
};
