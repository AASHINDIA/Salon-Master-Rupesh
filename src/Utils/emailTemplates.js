// utils/emailTemplates.js

export const otpEmailTemplate = (otp, name = '') => ({
    subject: 'Your OTP Code',
    text: `Hello ${name || ''},\n\nYour OTP code is: ${otp}\n\nThis OTP will expire in 10 minutes.`,
    html: `
        <div style="font-family: Arial, sans-serif; color: #333;">
            <h2>Hello ${name || 'User'},</h2>
            <p>Your OTP code is: <strong>${otp}</strong></p>
            <p>This OTP will expire in <strong>10 minutes</strong>.</p>
        </div>
    `
});




// 📩 Company gets minimal info
export const companyCartEmailTemplate = (user, product) => {
    const subject = `New Cart Alert - ${user.name} added ${product.name}`;
    const text = `${user.name} added ${product.name} to their cart. WhatsApp: ${user.whatsapp_number}`;
    const html = `
        <h2>Cart Alert</h2>
        <p><strong>User:</strong> ${user.name}</p>
        <p><strong>Product:</strong> ${product.name}</p>
        <p><strong>WhatsApp:</strong> ${user.whatsapp_number}</p>
    `;

    return { subject, text, html };
};

// 📩 Seller Listing Payment Success (invoice to seller)
export const sellerListingPaymentSuccessTemplate = (payment, listing, plan) => {
    const actionLabels = { create: "Listing Created", update: "Listing Updated", renew: "Listing Renewed" };
    const label = actionLabels[payment.actionType] || payment.actionType;
    const subject = `${label} - Payment Successful (Invoice ${payment.invoiceNo})`;
    const expiryDate = payment.expiresAt ? new Date(payment.expiresAt).toLocaleDateString("en-IN") : "N/A";
    const text = `
Hello ${listing.fullName},

Your payment of ${payment.currency} ${payment.amount} for "${listing.heading}" has been received successfully.

Invoice No: ${payment.invoiceNo}
Transaction ID: ${payment.razorpayPaymentId}
Shop Name: ${listing.shopName}
Listing Valid Until: ${expiryDate}

Your listing is now live. Thank you for selling with Salon Master!
`;
    const html = `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
            <div style="background: #2563eb; color: #fff; padding: 16px 24px;">
                <h2 style="margin: 0;">${label} - Payment Successful</h2>
            </div>
            <div style="padding: 24px;">
                <p>Hello <strong>${listing.fullName}</strong>,</p>
                <p>Your payment has been received successfully. Here are your invoice details:</p>
                <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                    <tr><td style="padding: 8px; border: 1px solid #eee;"><strong>Invoice No</strong></td><td style="padding: 8px; border: 1px solid #eee;">${payment.invoiceNo}</td></tr>
                    <tr><td style="padding: 8px; border: 1px solid #eee;"><strong>Amount Paid</strong></td><td style="padding: 8px; border: 1px solid #eee;">${payment.currency} ${payment.amount}</td></tr>
                    <tr><td style="padding: 8px; border: 1px solid #eee;"><strong>Transaction ID</strong></td><td style="padding: 8px; border: 1px solid #eee;">${payment.razorpayPaymentId}</td></tr>
                    <tr><td style="padding: 8px; border: 1px solid #eee;"><strong>Shop Name</strong></td><td style="padding: 8px; border: 1px solid #eee;">${listing.shopName}</td></tr>
                    <tr><td style="padding: 8px; border: 1px solid #eee;"><strong>Listing Heading</strong></td><td style="padding: 8px; border: 1px solid #eee;">${listing.heading}</td></tr>
                    <tr><td style="padding: 8px; border: 1px solid #eee;"><strong>Valid Until</strong></td><td style="padding: 8px; border: 1px solid #eee;">${expiryDate}</td></tr>
                </table>
                <p>Your listing is now <strong style="color: #16a34a;">live</strong>. Thank you for selling with Salon Master!</p>
            </div>
        </div>
    `;
    return { subject, text, html };
};

// 📩 Seller Listing Payment Failed
export const sellerListingPaymentFailedTemplate = (payment, listing) => {
    const subject = "Listing Payment Failed";
    const text = `
Hello ${listing.fullName},

Unfortunately your payment of ${payment.currency} ${payment.amount} for "${listing.heading}" could not be completed.

Order ID: ${payment.razorpayOrderId}
${payment.failureReason ? `Reason: ${payment.failureReason}` : ""}

Your listing is still pending payment and will not be published until the payment succeeds.
Please try again or contact support.
`;
    const html = `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
            <div style="background: #dc2626; color: #fff; padding: 16px 24px;">
                <h2 style="margin: 0;">Listing Payment Failed</h2>
            </div>
            <div style="padding: 24px;">
                <p>Hello <strong>${listing.fullName}</strong>,</p>
                <p>Unfortunately your payment of <strong>${payment.currency} ${payment.amount}</strong> for "${listing.heading}" could not be completed.</p>
                <p><strong>Order ID:</strong> ${payment.razorpayOrderId}</p>
                ${payment.failureReason ? `<p><strong>Reason:</strong> ${payment.failureReason}</p>` : ""}
                <p>Your listing is still <strong>pending payment</strong> and will not be published until the payment succeeds.</p>
                <p>Please try again or contact support.</p>
            </div>
        </div>
    `;
    return { subject, text, html };
};

// 📩 Admin notification for seller listing payment
export const sellerListingAdminNotificationTemplate = (payment, listing, seller) => {
    const actionLabels = { create: "Created", update: "Updated", renew: "Renewed" };
    const label = actionLabels[payment.actionType] || payment.actionType;
    const subject = `[Admin] Seller Listing ${label} - Payment Received (${payment.invoiceNo})`;
    const text = `
Seller: ${seller.fullName}
Email: ${seller.email}
Phone: ${seller.phoneNumber}
Shop: ${listing.shopName}
Heading: ${listing.heading}
Action: ${label}
Amount: ${payment.currency} ${payment.amount}
Invoice No: ${payment.invoiceNo}
Transaction ID: ${payment.razorpayPaymentId}
`;
    const html = `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
            <div style="background: #111827; color: #fff; padding: 16px 24px;">
                <h2 style="margin: 0;">Seller Listing ${label} - Payment Received</h2>
            </div>
            <div style="padding: 24px;">
                <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                    <tr><td style="padding: 8px; border: 1px solid #eee;"><strong>Seller</strong></td><td style="padding: 8px; border: 1px solid #eee;">${seller.fullName}</td></tr>
                    <tr><td style="padding: 8px; border: 1px solid #eee;"><strong>Email</strong></td><td style="padding: 8px; border: 1px solid #eee;">${seller.email}</td></tr>
                    <tr><td style="padding: 8px; border: 1px solid #eee;"><strong>Phone</strong></td><td style="padding: 8px; border: 1px solid #eee;">${seller.phoneNumber}</td></tr>
                    <tr><td style="padding: 8px; border: 1px solid #eee;"><strong>Shop</strong></td><td style="padding: 8px; border: 1px solid #eee;">${listing.shopName}</td></tr>
                    <tr><td style="padding: 8px; border: 1px solid #eee;"><strong>Heading</strong></td><td style="padding: 8px; border: 1px solid #eee;">${listing.heading}</td></tr>
                    <tr><td style="padding: 8px; border: 1px solid #eee;"><strong>Action</strong></td><td style="padding: 8px; border: 1px solid #eee;">${label}</td></tr>
                    <tr><td style="padding: 8px; border: 1px solid #eee;"><strong>Amount</strong></td><td style="padding: 8px; border: 1px solid #eee;">${payment.currency} ${payment.amount}</td></tr>
                    <tr><td style="padding: 8px; border: 1px solid #eee;"><strong>Invoice No</strong></td><td style="padding: 8px; border: 1px solid #eee;">${payment.invoiceNo}</td></tr>
                    <tr><td style="padding: 8px; border: 1px solid #eee;"><strong>Transaction ID</strong></td><td style="padding: 8px; border: 1px solid #eee;">${payment.razorpayPaymentId}</td></tr>
                </table>
            </div>
        </div>
    `;
    return { subject, text, html };
};
export const superAdminCartEmailTemplate = (user, product, company) => {
    const subject = `Super Admin Alert - ${user.name} added a product`;
    const text = `
        User: ${user.name} (${user.email})
        WhatsApp: ${user.whatsapp_number}
        Product: ${product.name}, Qty: ${product.quantity}
        Company: ${company.name}, Email: ${company.email}
    `;
    const html = `
        <h2>New Cart Activity (Super Admin)</h2>
        <p><strong>User Name:</strong> ${user.name}</p>
        <p><strong>User Email:</strong> ${user.email}</p>
        <p><strong>User WhatsApp:</strong> ${user.whatsapp_number}</p>
        <hr/>
        <p><strong>Product Name:</strong> ${product.name}</p>
        <p><strong>Quantity:</strong> ${product.quantity}</p>
        <hr/>
        <p><strong>Company Name:</strong> ${company.name}</p>
        <p><strong>Company Email:</strong> ${company.email}</p>
        <p><strong>Company Address:</strong> ${company.address}</p>
    `;

    return { subject, text, html };
};


