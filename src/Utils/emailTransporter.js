// utils/emailTransporter.js
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();


export const emailTransporter = nodemailer.createTransport({
    service: 'Gmail', // Replace with 'SendGrid', 'Mailgun' etc. if needed
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },



});
