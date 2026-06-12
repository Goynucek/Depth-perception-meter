class AppError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

function errorHandler(err, req, res, _next) {
  const multerErr = resolveMulterError(err);
  if (multerErr) {
    return res.status(multerErr.statusCode).json({ success: false, error: multerErr.message });
  }

  const statusCode = err.statusCode || 500;
  const response = {
    success: false,
    error: err.isOperational ? err.message : 'Sunucu hatası oluştu',
  };

  if (process.env.NODE_ENV === 'development' && !err.isOperational) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

function resolveMulterError(err) {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return new AppError(413, 'Dosya boyutu 10 MB sınırını aşıyor');
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return new AppError(400, 'Beklenmeyen dosya alanı. "image" alan adını kullanın');
  }
  if (err.message && err.message.includes('Sadece')) {
    return new AppError(400, err.message);
  }
  return null;
}

module.exports = { AppError, asyncHandler, errorHandler };
