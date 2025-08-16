/**
 * Generate a scalable OTP
 * @param {number} length - Length of OTP (default: 6)
 * @param {'numeric' | 'alphanumeric' | 'alphabetic'} type - Type of OTP (default: 'numeric')
 * @returns {string} - Generated OTP
 */
export const generateOTP = (length = 6, type = 'numeric') => {
    let characters = '';

    switch (type) {
        case 'alphanumeric':
            characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            break;
        case 'alphabetic':
            characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
            break;
        case 'numeric':
        default:
            characters = '0123456789';
            break;
    }

    let otp = '';
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        otp += characters[randomIndex];
    }

    return otp;
};

export const setOtpExpiry = (minutes = 10) => {
    return new Date(Date.now() + minutes * 60 * 1000);
};