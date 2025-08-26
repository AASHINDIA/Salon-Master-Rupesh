import multer from "multer";

// ✅ Store in memory
const storage = multer.memoryStorage();

// ✅ File filter (only CSV allowed)
const fileFilter = (req, file, cb) => {
    if (file.mimetype === "text/csv" || file.originalname.endsWith(".csv")) {
        cb(null, true); // Accept file
    } else {
        cb(new Error("Only CSV files are allowed!"), false);
    }
};

// ✅ Multer middleware
const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5 MB
    },
    fileFilter
});

export default upload;
