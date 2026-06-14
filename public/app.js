const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const analyzeBtn = document.getElementById('analyzeBtn');
const clearBtn = document.getElementById('clearBtn');
const fileName = document.getElementById('fileName');
const results = document.getElementById('results');
const originalImg = document.getElementById('originalImg');
const depthImg = document.getElementById('depthImg');
const processingMs = document.getElementById('processingMs');
const dimensions = document.getElementById('dimensions');
const loading = document.getElementById('loading');
const alertBox = document.getElementById('alert');
const statusEl = document.getElementById('status');

const tabFile = document.getElementById('tabFile');
const tabWebcam = document.getElementById('tabWebcam');
const panelFile = document.getElementById('panelFile');
const panelWebcam = document.getElementById('panelWebcam');

const startWebcamBtn = document.getElementById('startWebcamBtn');
const stopWebcamBtn = document.getElementById('stopWebcamBtn');
const webcamStatus = document.getElementById('webcamStatus');
const webcamVideo = document.getElementById('webcamVideo');
const webcamDepthImg = document.getElementById('webcamDepthImg');
const captureCanvas = document.getElementById('captureCanvas');
const webcamResults = document.getElementById('webcamResults');
const webcamLoading = document.getElementById('webcamLoading');
const webcamAlert = document.getElementById('webcamAlert');
const webcamProcessingMs = document.getElementById('webcamProcessingMs');
const webcamFps = document.getElementById('webcamFps');
const webcamDimensions = document.getElementById('webcamDimensions');
const webcamPlaceholder = document.getElementById('webcamPlaceholder');
const depthPlaceholder = document.getElementById('depthPlaceholder');
const webcamDepthSpinner = document.getElementById('webcamDepthSpinner');

let selectedFile = null;
let previewUrl = null;

let stream = null;
let loopActive = false;
let isProcessing = false;

async function checkHealth() {
  try {
    const res = await fetch('/health');
    const data = await res.json();
    statusEl.className = 'status ok';
    statusEl.innerHTML =
      '<span class="status-dot"></span> Model hazır · uptime ' + data.uptime + 's';
  } catch {
    statusEl.className = 'status error';
    statusEl.innerHTML =
      '<span class="status-dot"></span> Sunucuya bağlanılamıyor';
  }
}

function showAlert(box, message) {
  box.textContent = message;
  box.classList.add('visible');
}

function hideAlert(box) {
  box.classList.remove('visible');
}

function showError(message) {
  showAlert(alertBox, message);
}

function hideError() {
  hideAlert(alertBox);
}

function showWebcamError(message) {
  showAlert(webcamAlert, message);
}

function hideWebcamError() {
  hideAlert(webcamAlert);
}

function setLoading(active) {
  loading.classList.toggle('visible', active);
  analyzeBtn.disabled = active || !selectedFile;
}

function setWebcamLoading(active) {
  webcamLoading.classList.toggle('visible', active);
  webcamDepthSpinner.classList.toggle('visible', active);
}

function switchTab(targetPanel) {
  const isFile = targetPanel === 'panelFile';

  if (!isFile) {
    stopWebcam();
  }

  tabFile.classList.toggle('active', isFile);
  tabWebcam.classList.toggle('active', !isFile);
  tabFile.setAttribute('aria-selected', String(isFile));
  tabWebcam.setAttribute('aria-selected', String(!isFile));

  panelFile.classList.toggle('active', isFile);
  panelWebcam.classList.toggle('active', !isFile);
}

tabFile.addEventListener('click', () => switchTab('panelFile'));
tabWebcam.addEventListener('click', () => switchTab('panelWebcam'));

function updateFile(file) {
  if (!file) return;

  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowed.includes(file.type)) {
    showError('Sadece JPEG, PNG ve WebP desteklenir.');
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    showError('Dosya boyutu 10 MB sınırını aşıyor.');
    return;
  }

  hideError();
  selectedFile = file;
  fileName.textContent = file.name;

  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = URL.createObjectURL(file);
  originalImg.src = previewUrl;

  analyzeBtn.disabled = false;
}

dropzone.addEventListener('click', () => fileInput.click());

dropzone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropzone.classList.add('dragover');
});

dropzone.addEventListener('dragleave', () => {
  dropzone.classList.remove('dragover');
});

dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropzone.classList.remove('dragover');
  updateFile(e.dataTransfer.files[0]);
});

fileInput.addEventListener('change', () => {
  updateFile(fileInput.files[0]);
});

analyzeBtn.addEventListener('click', async () => {
  if (!selectedFile) return;

  hideError();
  setLoading(true);
  results.classList.remove('visible');

  const formData = new FormData();
  formData.append('image', selectedFile);

  try {
    const res = await fetch('/api/depth', { method: 'POST', body: formData });
    const contentType = res.headers.get('content-type') || '';

    if (!res.ok) {
      const err = contentType.includes('json')
        ? await res.json()
        : { error: 'İstek başarısız oldu' };
      throw new Error(err.error || 'İstek başarısız oldu');
    }

    const data = await res.json();
    depthImg.src = 'data:image/png;base64,' + data.depthMap;
    processingMs.textContent = data.processingMs + ' ms';
    dimensions.textContent = data.width + ' × ' + data.height;
    results.classList.add('visible');
  } catch (err) {
    showError(err.message);
  } finally {
    setLoading(false);
  }
});

clearBtn.addEventListener('click', () => {
  selectedFile = null;
  fileInput.value = '';
  fileName.textContent = 'Dosya seçilmedi';
  analyzeBtn.disabled = true;
  results.classList.remove('visible');
  hideError();

  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
    previewUrl = null;
  }

  originalImg.removeAttribute('src');
  depthImg.removeAttribute('src');
});

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Kare yakalanamadı'));
      },
      'image/jpeg',
      0.8
    );
  });
}

async function analyzeFrame(blob) {
  const formData = new FormData();
  formData.append('image', blob, 'frame.jpg');

  const res = await fetch('/api/depth', { method: 'POST', body: formData });
  const contentType = res.headers.get('content-type') || '';

  if (!res.ok) {
    const err = contentType.includes('json')
      ? await res.json()
      : { error: 'İstek başarısız oldu' };
    throw new Error(err.error || 'İstek başarısız oldu');
  }

  return res.json();
}

async function captureAndAnalyze() {
  if (!loopActive || isProcessing) return;

  if (webcamVideo.readyState < 2) {
    requestAnimationFrame(captureAndAnalyze);
    return;
  }

  isProcessing = true;
  setWebcamLoading(true);
  hideWebcamError();

  try {
    const width = webcamVideo.videoWidth;
    const height = webcamVideo.videoHeight;

    captureCanvas.width = width;
    captureCanvas.height = height;

    const ctx = captureCanvas.getContext('2d');
    ctx.drawImage(webcamVideo, 0, 0, width, height);

    const blob = await canvasToBlob(captureCanvas);
    const data = await analyzeFrame(blob);

    webcamDepthImg.src = 'data:image/png;base64,' + data.depthMap;
    webcamDepthImg.classList.add('visible');
    depthPlaceholder.classList.add('hidden');

    webcamProcessingMs.textContent = data.processingMs + ' ms';
    webcamFps.textContent = (1000 / data.processingMs).toFixed(1);
    webcamDimensions.textContent = data.width + ' × ' + data.height;
  } catch (err) {
    showWebcamError(err.message);
    loopActive = false;
    updateWebcamControls(false);
  } finally {
    isProcessing = false;
    setWebcamLoading(false);

    if (loopActive) {
      requestAnimationFrame(captureAndAnalyze);
    }
  }
}

function updateWebcamControls(active) {
  startWebcamBtn.disabled = active;
  stopWebcamBtn.disabled = !active;
  webcamStatus.textContent = active ? 'Canlı analiz çalışıyor' : 'Kamera kapalı';
  webcamPlaceholder.classList.toggle('hidden', active);
  webcamVideo.classList.toggle('visible', active);
}

function getCameraErrorMessage(err) {
  switch (err.name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return (
        'Kamera izni reddedildi. Adres çubuğundaki kilit/kamera simgesinden ' +
        'bu siteye izin verin, ardından sayfayı yenileyip tekrar deneyin.'
      );
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'Kamera bulunamadı. Webcam bağlı ve etkin olduğundan emin olun.';
    case 'NotReadableError':
    case 'TrackStartError':
      return (
        'Kamera okunamıyor. Başka bir uygulama (Zoom, Teams vb.) ' +
        'kamerayı kullanıyor olabilir — kapatıp tekrar deneyin.'
      );
    case 'SecurityError':
      return (
        'Güvenli bağlam gerekli. http://localhost:3001 veya ' +
        'http://127.0.0.1:3001 adresini kullanın; IP adresi çalışmaz.'
      );
    default:
      return 'Kamera açılamadı: ' + (err.message || err.name || 'bilinmeyen hata');
  }
}

async function requestCameraStream() {
  const attempts = [
    { video: { width: { ideal: 640 }, height: { ideal: 480 } }, audio: false },
    { video: true, audio: false },
  ];

  let lastError = null;

  for (const constraints of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      lastError = err;
      if (
        err.name === 'NotAllowedError' ||
        err.name === 'PermissionDeniedError' ||
        err.name === 'NotFoundError' ||
        err.name === 'NotReadableError' ||
        err.name === 'SecurityError'
      ) {
        throw err;
      }
    }
  }

  throw lastError || new Error('Kamera açılamadı');
}

async function startWebcam() {
  hideWebcamError();

  if (!navigator.mediaDevices?.getUserMedia) {
    showWebcamError('Tarayıcınız kamera erişimini desteklemiyor. Chrome veya Edge kullanın.');
    return;
  }

  const host = window.location.hostname;
  const isLocal =
    host === 'localhost' || host === '127.0.0.1' || host === '[::1]';

  if (!window.isSecureContext && !isLocal) {
    showWebcamError(
      'Kamera yalnızca güvenli bağlamda çalışır. ' +
        'http://localhost:' +
        window.location.port +
        ' adresini kullanın (ör. 192.168.x.x değil).'
    );
    return;
  }

  try {
    stream = await requestCameraStream();

    webcamVideo.srcObject = stream;
    webcamVideo.muted = true;
    await webcamVideo.play();

    webcamResults.classList.add('visible');
    loopActive = true;
    updateWebcamControls(true);

    depthPlaceholder.classList.remove('hidden');
    webcamDepthImg.classList.remove('visible');
    webcamDepthImg.removeAttribute('src');

    requestAnimationFrame(captureAndAnalyze);
  } catch (err) {
    console.error('Kamera hatası:', err);
    showWebcamError(getCameraErrorMessage(err));
    stopWebcam();
  }
}

function stopWebcam() {
  loopActive = false;
  isProcessing = false;

  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
    stream = null;
  }

  webcamVideo.srcObject = null;
  updateWebcamControls(false);
  setWebcamLoading(false);
}

startWebcamBtn.addEventListener('click', startWebcam);
stopWebcamBtn.addEventListener('click', stopWebcam);

checkHealth();
