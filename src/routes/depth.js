const express = require('express');
const multer = require('multer');
const config = require('../config');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const { preprocessImage } = require('../services/preprocess');
const { runInference } = require('../services/inference');
const { postprocessDepth } = require('../services/postprocess');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxFileSize },
  fileFilter: (_req, file, cb) => {
    if (config.allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Sadece image/jpeg, image/png, image/webp desteklenir'));
    }
  },
});

router.post(
  '/',
  upload.single('image'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new AppError(400, 'image alanı zorunludur');
    }

    const start = Date.now();

    const inputTensor = await preprocessImage(req.file.buffer);
    const { data, width, height } = await runInference(inputTensor);
    const { pngBuffer, base64 } = await postprocessDepth(data, width, height);

    const processingMs = Date.now() - start;
    const format = req.query.format === 'png' ? 'png' : 'json';

    if (format === 'png') {
      res.set('Content-Type', 'image/png');
      res.set('X-Processing-Ms', String(processingMs));
      return res.send(pngBuffer);
    }

    res.json({
      success: true,
      depthMap: base64,
      width,
      height,
      processingMs,
    });
  })
);

module.exports = router;
