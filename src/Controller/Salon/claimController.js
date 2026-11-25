import Salon from '../../Modal/Salon/Salon.js';
import User from '../../Modal/Users/User.js';
import SalonClaim from '../../Modal/Salon/SalonClaim.js';
import { generateOTP, setOtpExpiry } from '../../Utils/generateOtp.js';
import { sendWhatsAppOtp } from '../../Utils/whatsapp.js';
import { normalizePhone } from '../../services/jobPostingImport.service.js';

const MAX_ATTEMPTS = 5;
const RESEND_WINDOW_MS = 2 * 60 * 1000;

const maskPhone = (number) => {
    const digits = String(number || '').replace(/\D/g, '');
    if (!digits) return '';
    if (digits.length <= 4) return '*'.repeat(digits.length);
    return '*'.repeat(digits.length - 4) + digits.slice(-4);
};

const findSalonFromRequest = async (req) => {
    const { salonId, salon_id, contact_no, whatsapp_number } = req.body;

    const id = salonId || salon_id;
    if (id) {
        return Salon.findById(id);
    }

    const phone = normalizePhone(contact_no || whatsapp_number);
    if (!phone.variants.length) return null;

    const matches = await Salon.find({
        $or: [
            { contact_number: { $in: phone.variants } },
            { whatsapp_number: { $in: phone.variants } },
        ],
    }).sort({ is_claimed: 1, createdAt: 1 });

    return matches[0] || null;
};

const getSalonPhone = (salon, user) =>
    salon?.whatsapp_number || salon?.contact_number || user?.whatsapp_number || '';

const sendOtpToSalon = async (req, res) => {
    try {
        const salon = await findSalonFromRequest(req);

        if (!salon) {
            return res.status(404).json({ success: false, message: 'Salon not found' });
        }

        if (salon.is_claimed) {
            return res.status(409).json({
                success: false,
                message: 'This business has already been claimed. Please log in instead.',
            });
        }

        const user = await User.findById(salon.user_id);

        if (!user) {
            return res.status(422).json({
                success: false,
                message: 'Salon profile has no owner account. Contact support.',
            });
        }

        const rawPhone = getSalonPhone(salon, user);
        if (!rawPhone) {
            return res.status(400).json({
                success: false,
                message: 'No phone number is available for this salon. Contact support.',
            });
        }

        const phone = normalizePhone(rawPhone).normalized || rawPhone;

        const recent = await SalonClaim.findOne({
            salon_id: salon._id,
            status: 'pending',
            otp_sent_at: { $gt: new Date(Date.now() - RESEND_WINDOW_MS) },
        }).sort({ createdAt: -1 });

        if (recent) {
            return res.status(429).json({
                success: false,
                message: 'OTP already sent recently. Please wait before requesting another.',
            });
        }

        const otp = generateOTP(4, 'numeric');
        const otpResponse = await sendWhatsAppOtp(phone, otp);

        if (!otpResponse?.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to send OTP via WhatsApp',
                error: process.env.NODE_ENV === 'development' ? otpResponse?.error : undefined,
            });
        }

        await SalonClaim.updateMany(
            { salon_id: salon._id, status: 'pending' },
            { $set: { status: 'expired' } }
        );

        await SalonClaim.create({
            salon_id: salon._id,
            whatsapp_number: phone,
            whatsapp_uid: otpResponse.uid || undefined,
            otp_code: otp,
            otp_sent_at: new Date(),
            otp_expires_at: setOtpExpiry(),
            otp_attempts: 0,
            status: 'pending',
        });

        return res.status(200).json({
            success: true,
            message: 'Claim OTP sent via WhatsApp',
            data: {
                salonId: salon._id,
                salon_name: salon.salon_name || '',
                whatsapp_number: maskPhone(phone),
                otpSent: true,
                expiresIn: 600,
            },
        });
    } catch (error) {
        console.error('Claim send OTP error:', error);
        return res.status(500).json({
            success: false,
            message: 'Unable to send claim OTP',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
};

export const sendClaimOtp = sendOtpToSalon;
export const resendClaimOtp = sendOtpToSalon;

export const verifyClaimOtp = async (req, res) => {
    try {
        const { otp, password, name, email } = req.body;

        if (!otp || !/^\d{4,6}$/.test(String(otp))) {
            return res.status(422).json({ success: false, message: 'Invalid OTP format' });
        }

        if (!password || String(password).length < 6) {
            return res.status(422).json({
                success: false,
                message: 'A password of at least 6 characters is required to claim the business',
            });
        }

        const salon = await findSalonFromRequest(req);

        if (!salon) {
            return res.status(404).json({ success: false, message: 'Salon not found' });
        }

        if (salon.is_claimed) {
            return res.status(409).json({
                success: false,
                message: 'This business has already been claimed. Please log in instead.',
            });
        }

        const claim = await SalonClaim.findOne({
            salon_id: salon._id,
            status: 'pending',
        }).sort({ createdAt: -1 });

        if (!claim) {
            return res.status(404).json({
                success: false,
                message: 'No active OTP request. Please request a new OTP.',
            });
        }

        if (claim.otp_expires_at && new Date() > claim.otp_expires_at) {
            claim.status = 'expired';
            await claim.save();
            return res.status(400).json({
                success: false,
                message: 'OTP expired. Request a new one.',
            });
        }

        if (claim.otp_attempts >= MAX_ATTEMPTS) {
            claim.status = 'expired';
            await claim.save();
            return res.status(429).json({
                success: false,
                message: 'Too many invalid attempts. Request a new OTP.',
            });
        }

        if (String(claim.otp_code) !== String(otp)) {
            claim.otp_attempts += 1;
            await claim.save();
            return res.status(400).json({
                success: false,
                message: 'Invalid OTP. Please check and try again',
                attempts: claim.otp_attempts,
            });
        }

        const user = await User.findById(salon.user_id);

        if (!user) {
            return res.status(422).json({
                success: false,
                message: 'Salon profile has no owner account. Contact support.',
            });
        }

        user.password = password;
        user.imported = false;
        user.otp_verified = true;
        user.otp_attempts = 0;
        user.otp_expires_at = null;
        if (name && String(name).trim()) user.name = String(name).trim();
        if (email && String(email).trim()) user.email = String(email).trim();

        const { accessToken, refreshToken } = user.generateTokens();
        user.access_token = accessToken;
        user.refresh_token = refreshToken;
        await user.save();

        salon.is_claimed = true;
        salon.claimed_at = new Date();
        salon.source = salon.source || 'app';
        await salon.save();

        claim.status = 'verified';
        claim.verified_at = new Date();
        await claim.save();

        return res.status(200).json({
            success: true,
            message: 'Business claimed successfully',
            data: {
                accessToken,
                refreshToken,
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    whatsapp_number: user.whatsapp_number,
                    domain_type: user.domain_type,
                },
                salon: {
                    id: salon._id,
                    salon_name: salon.salon_name,
                    brand_name: salon.brand_name,
                    is_claimed: salon.is_claimed,
                    claimed_at: salon.claimed_at,
                },
            },
        });
    } catch (error) {
        console.error('Claim verify OTP error:', error);
        return res.status(500).json({
            success: false,
            message: 'Unable to verify claim OTP',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
};

export const getClaimStatus = async (req, res) => {
    try {
        const salon = await findSalonFromRequest({
            body: { ...req.query },
        });

        if (!salon) {
            return res.status(404).json({ success: false, message: 'Salon not found' });
        }

        const user = await User.findById(salon.user_id).select('whatsapp_number');
        const phone = getSalonPhone(salon, user);

        return res.status(200).json({
            success: true,
            data: {
                salonId: salon._id,
                salon_name: salon.salon_name || '',
                is_claimed: Boolean(salon.is_claimed),
                claimed_at: salon.claimed_at || null,
                can_claim: !salon.is_claimed && Boolean(phone),
                whatsapp_number: maskPhone(phone),
            },
        });
    } catch (error) {
        console.error('Claim status error:', error);
        return res.status(500).json({ success: false, message: 'Unable to fetch claim status' });
    }
};
