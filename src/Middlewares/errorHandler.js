import multer from 'multer';

export const errorHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      error: {
        message: err.message,
        code: err.code
      }
    });
  } else if (err) {
    return res.status(500).json({
      error: {
        message: err.message
      }
    });
  }
  next();
};