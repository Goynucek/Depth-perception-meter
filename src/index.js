require('dotenv').config();

const express = require('express');
const config = require('./config');
const depthRouter = require('./routes/depth');
const { errorHandler } = require('./middleware/errorHandler');
const { loadModel, isModelLoaded } = require('./services/inference');

const app = express();
const startTime = Date.now();

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    modelLoaded: isModelLoaded(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
  });
});

app.use('/api/depth', depthRouter);
app.use(errorHandler);

async function bootstrap() {
  try {
    console.log('Model yükleniyor...');
    await loadModel();
    console.log('Model başarıyla yüklendi.');

    app.listen(config.port, () => {
      console.log(`Sunucu http://localhost:${config.port} adresinde çalışıyor`);
    });
  } catch (err) {
    console.error('Başlatma hatası:', err.message);
    process.exit(1);
  }
}

bootstrap();
