import mongoose from "mongoose";
import crypto from "crypto";
import Razorpay from "razorpay";
import SellerListing from "../../Modal/sales/SellerListing.js";
import CommonSeller from "../../Modal/sales/commonseller.js";
import ListingPlan from "../../Modal/sales/ListingPlan.js";
import SellerListingPayment from "../../Modal/sales/SellerListingPayment.js";
import { uploadToCloudinary } from "../../Utils/imageUpload.js";
import { sendListingPaymentSuccessEmails, sendListingPaymentFailedEmail } from "../../Utils/services/sendListingEmails.js";

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_API_KEY,
    key_secret: process.env.RAZORPAY_API_SECRET,
});

const generateInvoiceNo = async () => {
    const now = new Date();
    const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    const count = await SellerListingPayment.countDocuments({ invoiceNo: { $regex: `^SL-${datePart}` } });
    return `SL-${datePart}-${String(count + 1).padStart(4, "0")}`;
};

const getPlanPrice = (plan) =>
    plan.discount > 0 ? plan.price - (plan.price * plan.discount) / 100 : plan.price;

const validateListingOwnership = (listing, userId) => {
    if (!listing) {
        return { error: { status: 404, message: "Listing not found" } };
    }
    if (listing.userId.toString() !== userId.toString()) {
        return { error: { status: 403, message: "Not authorized for this listing" } };
    }
    return { error: null };
};

const getOrValidatePlan = async (actionType) => {
    const plan = await ListingPlan.findOne({ actionType, isActive: true, isDeleted: false }).lean();
    if (!plan) {
        return { error: { status: 404, message: `No active ${actionType} plan configured` } };
    }
    return { plan };
};

const finalizeCompletedPayment = async (payment) => {
    const listing = await SellerListing.findById(payment.listingId);
    if (!listing) {
        return { error: "Listing not found while finalizing payment" };
    }

    const plan = await ListingPlan.findById(payment.planId).lean();
    if (!plan) {
        return { error: "Plan not found while finalizing payment" };
    }

    const durationMs = plan.durationDays * 24 * 60 * 60 * 1000;

    if (payment.actionType === "update") {
        const base = listing.expiredAt && listing.expiredAt > new Date() ? listing.expiredAt : new Date();
        listing.expiredAt = new Date(base.getTime() + durationMs);
        if (payment.updateData) {
            Object.keys(payment.updateData).forEach((key) => {
                if (payment.updateData[key] !== undefined) {
                    listing[key] = payment.updateData[key];
                }
            });
        }
    } else {
        listing.expiredAt = new Date(Date.now() + durationMs);
    }

    listing.status = "active";
    await listing.save();

    const seller = await CommonSeller.findOne({ userId: payment.userId });

    await sendListingPaymentSuccessEmails(payment, listing, seller || {
        fullName: listing.fullName,
        email: listing.email,
        phoneNumber: listing.phoneNumber,
    });

    return { error: null };
};

export const createListingOrder = async (req, res) => {
    try {
        const userId = req.user._id;
        const { listingId, actionType } = req.body;

        if (!mongoose.Types.ObjectId.isValid(listingId)) {
            return res.status(400).json({ success: false, message: "Invalid listing ID" });
        }

        if (!["create", "update", "renew"].includes(actionType)) {
            return res.status(400).json({ success: false, message: "actionType must be 'create', 'update' or 'renew'" });
        }

        const listing = await SellerListing.findById(listingId);
        const { error: ownerError } = validateListingOwnership(listing, userId);
        if (ownerError) {
            return res.status(ownerError.status).json({ success: false, message: ownerError.message });
        }

        if (actionType === "create" && !["pending", "inactive"].includes(listing.status)) {
            return res.status(400).json({ success: false, message: "Listing is not in pending state, cannot pay for creation" });
        }
        if (actionType === "update" && listing.status !== "active") {
            return res.status(400).json({ success: false, message: "Listing is not active, please renew it first" });
        }
        if (actionType === "renew" && listing.status === "pending") {
            return res.status(400).json({ success: false, message: "Listing is not yet active, use actionType 'create'" });
        }

        const { plan, error: planError } = await getOrValidatePlan(actionType);
        if (planError) {
            return res.status(planError.status).json({ success: false, message: planError.message });
        }

        await SellerListingPayment.updateMany(
            { listingId, actionType, status: "pending" },
            { $set: { status: "failed", failureReason: "Replaced by a new payment attempt" } }
        );

        const finalPrice = getPlanPrice(plan);
        const receipt = `sl_${listingId.toString().slice(-8)}_${Date.now().toString().slice(-6)}`;

        const options = {
            amount: Math.round(finalPrice * 100),
            currency: plan.currency || "INR",
            receipt,
            notes: {
                userId: userId.toString(),
                listingId: listingId.toString(),
                planId: plan._id.toString(),
                actionType,
            },
        };

        const order = await razorpay.orders.create(options);

        const paymentRecord = await SellerListingPayment.create({
            userId,
            listingId,
            planId: plan._id,
            actionType,
            amount: finalPrice,
            currency: plan.currency || "INR",
            razorpayOrderId: order.id,
            status: "pending",
        });

        console.log(`Razorpay order created: ${order.id} | user: ${userId} | listing: ${listingId} | action: ${actionType}`);

        return res.status(200).json({
            success: true,
            paymentId: paymentRecord._id,
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            key: process.env.RAZORPAY_API_KEY,
        });
    } catch (error) {
        console.error("Create listing order error:", error);
        return res.status(500).json({ success: false, message: "Internal server error", error: error.message });
    }
};

export const verifyListingPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, listingId } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !listingId) {
            return res.status(400).json({ success: false, message: "Missing payment verification fields" });
        }

        const payment = await SellerListingPayment.findOne({ razorpayOrderId: razorpay_order_id, listingId });
        if (!payment) {
            return res.status(404).json({ success: false, message: "Payment record not found" });
        }
        if (payment.status === "completed") {
            return res.status(200).json({ success: true, message: "Payment already verified" });
        }

        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_API_SECRET)
            .update(body)
            .digest("hex");

        if (expectedSignature !== razorpay_signature) {
            await SellerListingPayment.updateOne(
                { _id: payment._id },
                { $set: { status: "failed", failureReason: "Invalid payment signature" } }
            );
            return res.status(400).json({ success: false, message: "Invalid payment signature" });
        }

        payment.status = "completed";
        payment.razorpayPaymentId = razorpay_payment_id;
        payment.razorpaySignature = razorpay_signature;
        payment.paymentDate = new Date();
        payment.invoiceNo = await generateInvoiceNo();
        await payment.save();

        const { error: finalizeError } = await finalizeCompletedPayment(payment);
        if (finalizeError) {
            console.error(finalizeError);
            return res.status(500).json({ success: false, message: "Payment verified but activation failed" });
        }

        return res.json({
            success: true,
            message: "Payment verified, listing activated",
            invoiceNo: payment.invoiceNo,
            listingId: payment.listingId.toString(),
        });
    } catch (error) {
        console.error("Verify listing payment error:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export const razorpayWebhook = async (req, res) => {
    try {
        const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
        const signature = req.headers["x-razorpay-signature"];

        const body = Buffer.isBuffer(req.body) ? JSON.parse(req.body.toString()) : req.body;

        const expectedSignature = crypto
            .createHmac("sha256", secret)
            .update(JSON.stringify(body))
            .digest("hex");

        if (signature !== expectedSignature) {
            return res.status(400).json({ message: "Invalid webhook signature" });
        }

        const event = body.event;

        if (event === "payment.captured") {
            const paymentEntity = body.payload.payment.entity;
            const orderId = paymentEntity.order_id;

            const paymentRecord = await SellerListingPayment.findOne({ razorpayOrderId: orderId });
            if (paymentRecord && paymentRecord.status === "pending") {
                paymentRecord.status = "completed";
                paymentRecord.razorpayPaymentId = paymentEntity.id;
                paymentRecord.paymentDate = new Date();
                paymentRecord.invoiceNo = await generateInvoiceNo();
                await paymentRecord.save();

                const { error } = await finalizeCompletedPayment(paymentRecord);
                if (error) console.error("Webhook finalize error:", error);
            }
        } else if (event === "payment.failed") {
            const paymentEntity = body.payload.payment.entity;
            const orderId = paymentEntity.order_id;

            const paymentRecord = await SellerListingPayment.findOne({ razorpayOrderId: orderId });
            if (paymentRecord && paymentRecord.status === "pending") {
                paymentRecord.status = "failed";
                paymentRecord.failureReason = paymentEntity.error_description || "Payment failed";
                await paymentRecord.save();

                const listing = await SellerListing.findById(paymentRecord.listingId);
                if (listing) {
                    await sendListingPaymentFailedEmail(paymentRecord, listing);
                }
            }
        }

        return res.json({ status: "ok" });
    } catch (error) {
        console.error("Listing payment webhook error:", error);
        return res.status(500).json({ status: "error" });
    }
};

export const getListingPlans = async (req, res) => {
    try {
        const plans = await ListingPlan.find({ isActive: true, isDeleted: false }).lean();
        return res.status(200).json({ success: true, count: plans.length, data: plans });
    } catch (error) {
        console.error("Error fetching listing plans:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export const updateSellerListing = async (req, res) => {
    try {
        const userId = req.user._id;
        const { listingId, fullName, idDetails, phoneNumber, email, shopName, heading, description, short_description, advertisementDetails, address, status } = req.body;

        if (!mongoose.Types.ObjectId.isValid(listingId)) {
            return res.status(400).json({ success: false, message: "Invalid listing ID" });
        }

        const listing = await SellerListing.findById(listingId);
        const { error: ownerError } = validateListingOwnership(listing, userId);
        if (ownerError) {
            return res.status(ownerError.status).json({ success: false, message: ownerError.message });
        }

        if (listing.status === "pending") {
            return res.status(400).json({ success: false, message: "Listing payment is still pending, please complete payment first" });
        }

        const updateData = {};
        const updatableFields = { fullName, idDetails, phoneNumber, email, shopName, heading, description, short_description, advertisementDetails, address };
        Object.keys(updatableFields).forEach((key) => {
            if (updatableFields[key] !== undefined) {
                updateData[key] = updatableFields[key];
            }
        });
        if (status && ["active", "inactive"].includes(status)) {
            updateData.status = status;
        }

        if (req.files && req.files.length > 0) {
            const uploadedImages = [];
            for (const file of req.files) {
                const uploadResult = await uploadToCloudinary(file.buffer, "seller-listings");
                uploadedImages.push(uploadResult.secure_url);
            }
            updateData.advertisementImages = uploadedImages;
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ success: false, message: "No fields provided to update" });
        }

        const actionType = listing.status === "active" ? "update" : "renew";
        const { plan, error: planError } = await getOrValidatePlan(actionType);
        if (planError) {
            return res.status(planError.status).json({ success: false, message: planError.message });
        }

        await SellerListingPayment.updateMany(
            { listingId, actionType, status: "pending" },
            { $set: { status: "failed", failureReason: "Replaced by a new payment attempt" } }
        );

        const finalPrice = getPlanPrice(plan);
        const receipt = `sl_${listingId.toString().slice(-8)}_${Date.now().toString().slice(-6)}`;

        const options = {
            amount: Math.round(finalPrice * 100),
            currency: plan.currency || "INR",
            receipt,
            notes: {
                userId: userId.toString(),
                listingId: listingId.toString(),
                planId: plan._id.toString(),
                actionType,
            },
        };

        const order = await razorpay.orders.create(options);

        const paymentRecord = await SellerListingPayment.create({
            userId,
            listingId,
            planId: plan._id,
            actionType,
            amount: finalPrice,
            currency: plan.currency || "INR",
            razorpayOrderId: order.id,
            status: "pending",
            updateData,
        });

        return res.status(200).json({
            success: true,
            message: `Changes will be applied after ${actionType} payment succeeds`,
            paymentId: paymentRecord._id,
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            key: process.env.RAZORPAY_API_KEY,
        });
    } catch (error) {
        console.error("Update seller listing error:", error);
        return res.status(500).json({ success: false, message: "Internal server error", error: error.message });
    }
};
