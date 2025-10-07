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

// 📩 Super Admin gets full info
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


