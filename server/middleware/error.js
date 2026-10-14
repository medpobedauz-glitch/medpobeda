// MedPobeda — error handling + JSON "safe" responses.
// We never leak raw database errors or stack traces to users.

export function httpError(res, status, message, details) {
  return res.status(status).json({ error: message, details: details || undefined });
}

// Final error handler for the Express app.
export function errorHandler(err, req, res, next) {
  const isProd = process.env.NODE_ENV === 'production';
  const status = err.status || err.statusCode || 500;
  // Multer errors carry .code/.field; surface friendly messages.
  let message = 'An unexpected error occurred.';
  if (err && err.code === 'LIMIT_FILE_SIZE') message = 'The uploaded file is too large.';
  else if (err && err.name === 'MulterError') message = 'Upload failed: ' + (err.message || 'invalid file.');
  if (status >= 500) {
    // Log full error server-side for diagnosis, but never send internals.
    if (!isProd) console.error(err);
    else console.error('Server error:', err.message);
  }
  if (res.headersSent) return next(err);
  if (req.accepts('json')) {
    return res.status(status).json({ error: message });
  }
  return res.status(status).send(message);
}