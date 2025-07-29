import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { promises as fs } from 'fs';

// Configure storage
const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    const uploadPath = path.join(process.cwd(), 'temp/uploads');
    try {
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (err) {
      cb(err);
    }
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, WEBP, or GIF images are allowed!'), false);
  }
};

// Configure multer
const uploadProductImages = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 5 // Max 5 files
  }
}).array('images', 5); // Field name 'images', max 5 files

export default uploadProductImages;