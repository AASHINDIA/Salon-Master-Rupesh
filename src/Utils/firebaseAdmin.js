import admin from 'firebase-admin';
import dotenv from 'dotenv';
dotenv.config();

// Parse the service account JSON from environment variable
// console.log("process.env.serviceAccount",process.env.serviceAccount)
const serviceAccount =process.env.service

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export default admin;