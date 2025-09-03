import { createAcademy, getAllAcademy } from "../../Controller/FTC/Accadmy.js";
import express from 'express'
import { app } from "firebase-admin";
import multer from "multer";
import { protect } from "../../Middlewares/authMiddleware/auth.js";
const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

app.use('/createAcademy', upload('image_academy', 4), upload('leflate_image', 4), protect, createAcademy);
app.use('/getAllAcademy', getAllAcademy);

export default express