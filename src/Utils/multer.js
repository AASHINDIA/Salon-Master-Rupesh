// utils/multer.js
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Create tempUploads directory if it doesn't exist
const tempUploadPath = './tempUploads';
if (!fs.existsSync(tempUploadPath)) {
    fs.mkdirSync(tempUploadPath);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, tempUploadPath),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `${file.fieldname}-${unique}${ext}`);
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed!'), false);
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
});

export default upload;
