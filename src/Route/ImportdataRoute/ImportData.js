import express from 'express';
import { importUsersFromExcel } from '../../Controller/Import_User_data/importUser.js';
import multer from 'multer';
import upload from '../../Middlewares/Uploadcsv/Uploadcsv.js';
const router = express.Router();

router.post('/import', upload.single('file'), importUsersFromExcel);  


export default router;